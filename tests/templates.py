#!/usr/bin/env python3
"""Real 12-template browser acceptance: edit, save and export; independent of imagery."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]/'app'
html=(root/'index.html').read_text(encoding='utf-8').replace('<link rel="stylesheet" href="./styles.css">','<style>'+(root/'styles.css').read_text(encoding='utf-8')+'</style>')
for fn in ('fontkit-browser','templates','app'):
 html=html.replace('<script src="./'+fn+'.js"></script>','')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':850},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.set_default_timeout(9000)
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate("""() => {const values={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>values[k]??null,setItem:(k,v)=>values[k]=String(v),removeItem:k=>delete values[k],clear:()=>Object.keys(values).forEach(k=>delete values[k])}});window.__templateStorage=values;}""")
 for script in ('fontkit-browser','templates','app'):
  page.add_script_tag(content=(root/(script+'.js')).read_text(encoding='utf-8'))
 data=page.evaluate('window.AlwasitiTemplates')
 assert len(data)==12 and len({a['id'] for a in data})==12, 'Exactly twelve originals'
 assert page.locator('#templateGalleryHome .template-card').count()==12,'Public landing has 12 cards'
 page.locator('[data-template-filters="home"] button').filter(has_text='الثقافة').click()
 assert page.locator('#templateGalleryHome .template-card').count()==3,'Category filter works'
 page.locator('[data-template-filters="home"] button').filter(has_text='الكل').click()
 first=data[0]
 page.locator('#templateGalleryHome [data-template-id="'+first['id']+'"]').click()
 assert page.locator('#studio').evaluate('(e)=>e.classList.contains("active")'),'Opening template enters editor'
 assert page.locator('#brandName').input_value()==first['brandName']
 page.locator('#saveProject').click()
 saved=page.evaluate('JSON.parse(window.__templateStorage["alwasiti-projects-v1"])')
 saved_id=saved['activeId'];assert saved_id and saved['projects'][0]['data']['brandName']==first['brandName']
 for item in data:
  page.locator('.side-nav[data-panel="templates"]').click()
  page.locator('#templateGalleryStudio [data-template-id="'+item['id']+'"]').click()
  assert page.locator('#brandName').input_value()==item['brandName'],item['id']+' brand not applied'
  assert page.locator('#primaryColor').input_value().lower()==item['primary'].lower(),item['id']+' palette not applied'
  assert page.locator('#headingFont').input_value()==item['headingFont'],item['id']+' typography not applied'
  assert page.locator('#markShape').input_value()==item['markShape']
  page.locator('.side-nav[data-panel="logo"]').click()
  with page.expect_download() as download:
   page.locator('#quickDownloadLogo').click()
  svg=download.value.path().read_text(encoding='utf-8')
  assert '<svg' in svg and item['brandName'] in svg and '<script' not in svg,item['id']+' SVG'
  page.locator('#showExport').click()
  with page.expect_download() as d:
   page.locator('[data-export="json"]').click()
  tokens=json.loads(d.value.path().read_text())
  assert tokens['color']['brand']['primary']['$value']==item['primary'],item['id']+' JSON token'
  page.locator('#showExport').click()
  with page.expect_download() as d:
   page.locator('[data-export="css"]').click()
  assert '--brand-primary: '+item['primary'] in d.value.path().read_text(),item['id']+' CSS'
  print('PASS',item['id'],'editable + SVG + JSON + CSS',flush=True)
 assert page.evaluate('JSON.parse(window.__templateStorage["alwasiti-projects-v1"]).activeId')==saved_id,'Template must not overwrite saved project ID'
 assert page.evaluate('JSON.parse(window.__templateStorage["alwasiti-projects-v1"]).projects[0].data.brandName')==first['brandName'],'Original must be immutable'
 page.locator('#brandName').fill('تجربة فريدة')
 assert page.locator('#logoCanvas').inner_text().find('تجربة فريدة')>=0,'Template is editable'
 page.locator('#saveProject').click()
 projects=page.evaluate('JSON.parse(window.__templateStorage["alwasiti-projects-v1"]).projects')
 assert len(projects)==2,'Template save generates a new independent project'
 assert projects[0]['data']['brandName']=='تجربة فريدة'
 assert projects[1]['data']['brandName']==first['brandName']
 assert not errors,'Browser JS errors: '+str(errors)
 browser.close()
 print('RESULT: 12/12 original RTL templates + 36 exports + edit/save/isolation + filters PASS',flush=True)
