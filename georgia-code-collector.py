#!/usr/bin/env python3
"""
Georgia Code Data Collector
Systematically collects Georgia statutes from the official Georgia Legislature website (legis.ga.gov).
This ensures we're using authoritative, official sources for legal research.

Usage:
    python georgia-code-collector.py --titles 16 51 19  # Collect specific titles
    python georgia-code-collector.py --all             # Collect all titles (takes time)
    python georgia-code-collector.py --practice criminal # Collect by practice area
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
import argparse
from urllib.parse import urljoin, urlparse
import logging
from typing import Dict, List, Optional
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class GeorgiaCodeCollector:
    def __init__(self, base_url: str = "https://www.legis.ga.gov"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Georgia Law Research Tool - Educational Use',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Referer': 'https://www.legis.ga.gov/',
        })

        # Initialize Selenium webdriver
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        from selenium.webdriver.chrome.service import Service
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)

        # Practice area mappings
        self.practice_areas = {
            'criminal': ['16'],  # Criminal law
            'contract': ['51'],  # Contract law
            'family': ['19'],    # Family law
            'business': ['14', '33'],  # Business, Corporations
            'property': ['44'],  # Property
            'employment': ['34', '45'],  # Employment, Labor
            'traffic': ['40'],   # Traffic, Vehicles
            'tax': ['48'],       # Revenue, Taxation
            'estate': ['53'],    # Wills, Estates
            'tort': ['51'],      # Torts (part of contract title)
        }

    def get_page(self, url: str, retries: int = 3, use_selenium: bool = False) -> Optional[BeautifulSoup]:
        """Fetch a page with retry logic. Use Selenium for JS-heavy sites."""
        if use_selenium or 'legis.ga.gov' in url:
            # Use Selenium for the official Georgia site
            for attempt in range(retries):
                try:
                    logger.info(f"Fetching {url} with Selenium (attempt {attempt + 1})")
                    self.driver.get(url)

                    # Wait for content to load
                    WebDriverWait(self.driver, 10).until(
                        lambda driver: driver.execute_script("return document.readyState") == "complete"
                    )

                    # Additional wait for dynamic content
                    time.sleep(2)

                    page_source = self.driver.page_source
                    return BeautifulSoup(page_source, 'html.parser')

                except Exception as e:
                    logger.warning(f"Selenium attempt {attempt + 1} failed for {url}: {e}")
                    if attempt < retries - 1:
                        time.sleep(2 ** attempt)

            return None
        else:
            # Use requests for other sites
            for attempt in range(retries):
                try:
                    logger.info(f"Fetching {url} with requests (attempt {attempt + 1})")
                    response = self.session.get(url, timeout=10)
                    response.raise_for_status()
                    time.sleep(1)  # Be respectful to the server
                    return BeautifulSoup(response.content, 'html.parser')
                except Exception as e:
                    logger.warning(f"Requests attempt {attempt + 1} failed for {url}: {e}")
                    if attempt < retries - 1:
                        time.sleep(2 ** attempt)
            return None

    def get_title_list(self) -> List[Dict]:
        """Get list of all Georgia Code titles."""
        logger.info("Fetching title list...")
        soup = self.get_page(self.base_url)
        if not soup:
            return []

        titles = []
        # Find title links in the main page
        title_links = soup.find_all('a', href=re.compile(r'/codes/georgia/\d{4}/title-\d+/'))

        for link in title_links:
            href = link.get('href')
            if href:
                # Extract title number from URL
                match = re.search(r'title-(\d+)', href)
                if match:
                    title_num = match.group(1)
                    titles.append({
                        'number': title_num,
                        'name': link.get_text().strip(),
                        'url': urljoin(self.base_url, href)
                    })

        logger.info(f"Found {len(titles)} titles")
        return titles

    def get_chapters_in_title(self, title_url: str) -> List[Dict]:
        """Get all chapters in a title from the official Georgia Legislature site."""
        logger.info(f"Fetching chapters for {title_url}")
        soup = self.get_page(title_url)
        if not soup:
            return []

        chapters = []
        # Look for chapter links - they might be in navigation or content areas
        # Try different patterns for the official site
        chapter_links = soup.find_all('a', href=re.compile(r'/laws/statutes/\d+/\d+'))

        for link in chapter_links:
            href = link.get('href')
            if href:
                # Extract chapter number from URL like /laws/statutes/16/5
                match = re.search(r'/laws/statutes/\d+/(\d+)', href)
                if match:
                    chapter_num = match.group(1)
                    chapters.append({
                        'number': chapter_num,
                        'name': link.get_text().strip() or f"Chapter {chapter_num}",
                        'url': urljoin(self.base_url, href)
                    })

        # Remove duplicates
        seen = set()
        unique_chapters = []
        for chapter in chapters:
            if chapter['number'] not in seen:
                seen.add(chapter['number'])
                unique_chapters.append(chapter)

        return unique_chapters

    def get_sections_in_chapter(self, chapter_url: str) -> List[Dict]:
        """Get all sections in a chapter from the official Georgia Legislature site."""
        logger.info(f"Fetching sections for {chapter_url}")
        soup = self.get_page(chapter_url)
        if not soup:
            return []

        sections = []
        # Find section links on the official site
        section_links = soup.find_all('a', href=re.compile(r'/laws/statutes/\d+/\d+/\d+'))

        for link in section_links:
            href = link.get('href')
            if href:
                # Extract section number from URL like /laws/statutes/16/5/21
                match = re.search(r'/laws/statutes/\d+/\d+/([\d\.\-]+)', href)
                if match:
                    section_num = match.group(1)
                    sections.append({
                        'number': section_num,
                        'name': link.get_text().strip(),
                        'url': urljoin(self.base_url, href)
                    })

        return sections

    def extract_statute_content(self, section_url: str, title_num: str, chapter_num: str, section_num: str) -> Optional[Dict]:
        """Extract the full statute content from a section page."""
        logger.info(f"Extracting content from {section_url}")
        soup = self.get_page(section_url)
        if not soup:
            logger.error(f"Failed to get page for {section_url}")
            return None

        try:
            # Find the main content div
            content_div = soup.find('div', class_='main-content')

            if not content_div:
                logger.warning(f"Could not find main-content div for {section_url}")
                return None

            # Find the statute text in paragraph tags
            p_tags = content_div.find_all('p')
            if not p_tags:
                logger.warning(f"No paragraph tags found in content for {section_url}")
                return None

            logger.info(f"Found {len(p_tags)} paragraph tags")

            # The first paragraph usually contains the main statute text
            full_text = p_tags[0].get_text(separator=' ', strip=True)

            # Clean up the text - remove extra whitespace
            full_text = re.sub(r'\s+', ' ', full_text).strip()

            logger.info(f"Extracted text length: {len(full_text)}")

            # Skip if text is too short (likely not actual statute content)
            if len(full_text) < 20:
                logger.warning(f"Statute text too short for {section_url}: '{full_text}'")
                return None

            # Get section name from title
            section_name = ""
            title_tag = soup.find('title')
            if title_tag:
                title_text = title_tag.get_text().strip()
                # Extract section name from title like "Georgia Code § 16-1-1 (2020) - Short Title"
                match = re.search(r'§ [\d\.\-]+ \(.*?\) - (.+?) ::', title_text)
                if match:
                    section_name = match.group(1).strip()
                else:
                    # Fallback: remove common prefixes
                    section_name = re.sub(r'^(Georgia Code|O\.C\.G\.A\.|§|\d+\.)\s*', '', title_text)
                    section_name = re.sub(r'::.*$', '', section_name).strip()

            logger.info(f"Section name: '{section_name}'")

            # Determine practice area based on title
            practice_area = self.guess_practice_area(title_num)

            statute = {
                'title_number': title_num,
                'chapter_number': chapter_num,
                'section_number': section_num,
                'section_name': section_name,
                'full_text': full_text,
                'source_url': section_url,
                'effective_date': '2020-01-01',  # Default for 2020 code
                'practice_area': practice_area,
            }

            logger.info(f"Successfully extracted statute: {section_num}")
            return statute

        except Exception as e:
            logger.error(f"Error extracting content from {section_url}: {e}")
            return None

    def guess_practice_area(self, title_num: str) -> str:
        """Guess practice area based on title number."""
        title_practice_map = {
            '16': 'criminal',
            '51': 'contract',
            '19': 'family',
            '14': 'business',
            '33': 'business',
            '44': 'property',
            '34': 'employment',
            '45': 'employment',
            '40': 'traffic',
            '48': 'tax',
            '53': 'estate'
        }
        return title_practice_map.get(title_num, 'general')

    def collect_title(self, title_num: str, max_sections: Optional[int] = None) -> List[Dict]:
        """Collect all statutes from a specific title."""
        logger.info(f"Collecting Title {title_num}")

        title_url = f"{self.base_url}/laws/statutes/{title_num}"
        chapters = self.get_chapters_in_title(title_url)

        all_statutes = []
        sections_collected = 0

        for chapter in chapters:
            if max_sections and sections_collected >= max_sections:
                break

            logger.info(f"Processing Chapter {chapter['number']}")
            sections = self.get_sections_in_chapter(chapter['url'])

            for section in sections:
                if max_sections and sections_collected >= max_sections:
                    break

                statute = self.extract_statute_content(
                    section['url'], title_num, chapter['number'], section['number']
                )

                if statute:
                    all_statutes.append(statute)
                    sections_collected += 1

                    # Save progress every 10 statutes
                    if sections_collected % 10 == 0:
                        logger.info(f"Collected {sections_collected} statutes so far")

                # Be respectful to the server
                time.sleep(1)

        logger.info(f"Completed Title {title_num}: {len(all_statutes)} statutes collected")
        return all_statutes

    def collect_by_practice_area(self, practice_area: str, max_sections: Optional[int] = None) -> List[Dict]:
        """Collect statutes for a specific practice area."""
        if practice_area not in self.practice_areas:
            logger.error(f"Unknown practice area: {practice_area}")
            return []

        titles = self.practice_areas[practice_area]
        all_statutes = []

        for title_num in titles:
            statutes = self.collect_title(title_num, max_sections)
            all_statutes.extend(statutes)

            if max_sections and len(all_statutes) >= max_sections:
                break

        return all_statutes

    def save_to_json(self, statutes: List[Dict], filename: str):
        """Save collected statutes to JSON file."""
        # Load existing data if file exists
        existing_data = []
        if os.path.exists(filename):
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            except:
                logger.warning(f"Could not load existing {filename}, starting fresh")

        # Combine existing and new data
        all_data = existing_data + statutes

        # Remove duplicates based on title-chapter-section
        seen = set()
        unique_data = []
        for statute in all_data:
            key = f"{statute['title_number']}-{statute['chapter_number']}-{statute['section_number']}"
            if key not in seen:
                seen.add(key)
                unique_data.append(statute)

        # Save to file
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(unique_data, f, indent=2, ensure_ascii=False)

        logger.info(f"Saved {len(unique_data)} unique statutes to {filename}")

def main():
    parser = argparse.ArgumentParser(description='Collect Georgia Code data from the official Georgia Legislature website')
    parser.add_argument('--titles', nargs='+', help='Specific title numbers to collect (e.g., 16 51)')
    parser.add_argument('--practice', help='Practice area to collect (criminal, contract, family, etc.)')
    parser.add_argument('--all', action='store_true', help='Collect all titles (takes a long time)')
    parser.add_argument('--max-sections', type=int, help='Maximum sections to collect per title/area')
    parser.add_argument('--output', default='georgia-code-expanded.json', help='Output JSON file')

    args = parser.parse_args()

    collector = GeorgiaCodeCollector()

    if args.practice:
        logger.info(f"Collecting statutes for practice area: {args.practice}")
        statutes = collector.collect_by_practice_area(args.practice, args.max_sections)
    elif args.titles:
        logger.info(f"Collecting statutes for titles: {args.titles}")
        statutes = []
        for title in args.titles:
            title_statutes = collector.collect_title(title, args.max_sections)
            statutes.extend(title_statutes)
    elif args.all:
        logger.warning("Collecting ALL titles - this will take a very long time!")
        titles = collector.get_title_list()
        statutes = []
        for title in titles:
            title_statutes = collector.collect_title(title['number'], args.max_sections)
            statutes.extend(title_statutes)
    else:
        logger.info("No collection option specified. Use --help for options.")
        return

    if statutes:
        collector.save_to_json(statutes, args.output)
        logger.info(f"Collection complete! Collected {len(statutes)} statutes.")
    else:
        logger.warning("No statutes were collected.")

if __name__ == '__main__':
    main()