#!/usr/bin/env python3
"""
Find the correct URL structure for Georgia statutes
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time

chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)

try:
    # Try the main laws page
    urls_to_test = [
        "https://www.legis.ga.gov/laws",
        "https://www.legis.ga.gov/api/legislation/search/2024",
        "https://law.justia.com/codes/georgia/2020/title-16/chapter-5/section-16-5-21/",
        "https://codes.findlaw.com/ga/title-16-crimes-and-offenses/"
    ]
    
    for url in urls_to_test:
        print(f"\n{'='*70}")
        print(f"Testing: {url}")
        print('='*70)
        
        try:
            driver.get(url)
            time.sleep(2)
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            title = soup.find('title')
            
            print(f"✅ Status: Success")
            print(f"📄 Title: {title.get_text() if title else 'No title'}")
            
            # Look for statute/code related content
            links = soup.find_all('a', href=True)
            statute_words = ['statute', 'code', 'chapter', 'title', 'section', 'O.C.G.A', 'OCGA']
            relevant_links = []
            
            for link in links:
                href = link.get('href', '')
                text = link.get_text().strip()
                if any(word.lower() in (href + text).lower() for word in statute_words):
                    relevant_links.append((href, text[:100]))
            
            print(f"🔗 Found {len(relevant_links)} relevant links")
            if relevant_links:
                print("\nSample links:")
                for href, text in relevant_links[:5]:
                    print(f"  - {href}")
                    print(f"    {text}")
                    
        except Exception as e:
            print(f"❌ Error: {e}")
    
finally:
    driver.quit()
