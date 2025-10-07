#!/usr/bin/env python3
"""
Test script to understand the Georgia Legislature website structure
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from bs4 import BeautifulSoup
import time

# Set up Selenium
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)

try:
    # Test URL for Georgia Code Title 16 (Criminal Law)
    url = "https://www.legis.ga.gov/laws/statutes/16"
    
    print(f"Testing URL: {url}")
    driver.get(url)
    
    # Wait for page to load
    time.sleep(3)
    
    # Get page source
    page_source = driver.page_source
    soup = BeautifulSoup(page_source, 'html.parser')
    
    # Save HTML for inspection
    with open('georgia-page-test.html', 'w', encoding='utf-8') as f:
        f.write(soup.prettify())
    
    print("\n✅ Page HTML saved to 'georgia-page-test.html'")
    print(f"📊 Page length: {len(page_source)} characters")
    
    # Look for common patterns
    print("\n🔍 Looking for statute links...")
    
    # Try different link patterns
    all_links = soup.find_all('a', href=True)
    print(f"   Total links found: {len(all_links)}")
    
    statute_links = [link for link in all_links if '/statutes/' in link.get('href', '')]
    print(f"   Links with '/statutes/': {len(statute_links)}")
    
    if statute_links:
        print("\n📝 Sample statute links:")
        for link in statute_links[:10]:
            print(f"   - {link.get('href')} : {link.get_text().strip()[:80]}")
    
    # Look for specific patterns in Georgia site
    code_sections = soup.find_all(['div', 'section', 'article'], class_=lambda x: x and ('code' in x.lower() or 'statute' in x.lower() or 'section' in x.lower()))
    print(f"\n📚 Elements with code/statute classes: {len(code_sections)}")
    
    # Check for JavaScript-heavy content
    scripts = soup.find_all('script')
    print(f"\n⚙️  Script tags found: {len(scripts)}")
    
    # Look for React/Angular/Vue indicators
    if 'react' in page_source.lower():
        print("   ⚛️  React detected")
    if 'angular' in page_source.lower():
        print("   🅰️  Angular detected")
    if 'vue' in page_source.lower():
        print("   🟩 Vue detected")
    
finally:
    driver.quit()
    print("\n✅ Test complete!")
