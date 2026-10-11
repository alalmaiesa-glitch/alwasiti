#!/usr/bin/env python3
"""Cross-browser acceptance: Chromium, Firefox, WebKit on desktop and mobile."""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]/'app'
html=(root/'index.html').read_text()
html=re.sub(r'<link[^>]+(?:fonts.googleapis.com|fonts.gstatic.com)[^>]*>', '', html)
html=html.replace('<link rel="stylesheet" href="./styles.css">', '<style>'+(root/'styles.css').read_text()+'</style>')
html=re.sub(r'<script src="\\./(?:fontkit-browser|app)\\.js"></script>', '', html)
js=(root/'app.js').read_text();vendor=(root/'fontkit-browser.js').read_text()
count=0
with sync_playwright() as p:
 for engine in ('chromium','firefox','webkit'):
  browser=getattr(p,engine).launch(headless=True,args=['--no-sandbox'] if engine=='chromium' else [])
  for name,viewport in [('desktop',{'width':1280,'height':800}),('mobile',{'width':390,'height':844})]:
   page=browser.new_page(viewport=viewport,accept_downloads=True)
   errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   page.set_default_timeout(6000)
   page.set_content(html,wait_until='commit')
   page.add_script_tag(content=vendor);page.add_script_tag(content=js)
   assert page.locator('html').get_attribute('dir')=='rtl',engine
   page.locator('[data-open-studio]').first.click()
   page.locator('[data-panel="logo"]').first.click()
   assert page.locator('#editableLogoSvg').count()==1,(engine,name,'SVG')
   field=page.locator('#brandName')
   field.evaluate('el=>{el.value="الواسطي";el.dispatchEvent(new Event("input",{bubbles:true}));}')
   assert 'الواسطي' in page.locator('#logoCanvas').inner_text(),(engine,name,'branding')
   with page.expect_download(timeout=15000) as download:
    page.locator('#quickDownloadLogo').click()
   body=download.value.path().read_text()
   assert '<svg' in body and '<script' not in body,(engine,name,'SVG export')
   page.locator('#showExport').click()
   page.keyboard.press('Escape')
   assert page.locator('#exportModal').is_hidden(),(engine,name,'Escape')
   assert not errors,(engine,name,errors)
   print('PASS',engine,name,'RTL editor, Arabic text, SVG, Escape, no JS errors',flush=True)
   count+=1;page.close()
  browser.close()
print('RESULT',count,'of 6 combinations PASS')
