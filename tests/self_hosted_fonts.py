#!/usr/bin/env python3
"""Integration: real same-origin licensed font files, no mocked fetch."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
from lxml import etree
root=Path(__file__).resolve().parents[1]/'dist'
assert (root/'fonts/Amiri-Regular.ttf').stat().st_size>100000
assert (root/'fonts/NotoKufiArabic-wght.ttf').stat().st_size>100000
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  page=browser.new_page(accept_downloads=True)
  page.set_default_timeout(15000)
  page.route('https://fonts.googleapis.com/**',lambda route:route.fulfill(status=200,body=''))
  page.route('https://fonts.gstatic.com/**',lambda route:route.fulfill(status=200,body=''))
  errors=[];fonts=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:fonts.append((r.status,r.url)) if '/fonts/' in r.url and r.url.endswith('.ttf') else None)
  page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded',timeout=30000)
  page.locator('[data-open-studio]').first.click()
  page.locator('[data-panel="logo"]').first.click()
  for key,suffix in [('amiri','Amiri-Regular.ttf'),('noto','NotoKufiArabic-wght.ttf')]:
   page.locator('#vectorFont').select_option(key)
   with page.expect_download(timeout=20000) as x:
    page.locator('#downloadVectorLogo').click()
   body=x.value.path().read_bytes()
   doc=etree.fromstring(body)
   assert len(doc.xpath('//*[local-name()="path"]'))>=2,key
   assert not doc.xpath('//*[local-name()="text"]'),key
   assert any(code==200 and url.endswith(suffix) for code,url in fonts), (key,fonts)
   print('PASS',key,'real same-origin font HTTP 200 and text-free vector SVG',flush=True)
  assert not errors,errors
  browser.close()
finally: server.shutdown()
