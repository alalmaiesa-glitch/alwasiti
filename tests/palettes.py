#!/usr/bin/env python3
"""24 complete, unique, curated Arabic brand palettes, independently editable in current studio."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json

app=Path(__file__).resolve().parents[1]/'app'
html=(app/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+(app/'styles.css').read_text(encoding='utf-8')+'</style>')
for name in ['fontkit-browser','templates','app']:
 html=html.replace('<script src="./'+name+'.js"></script>','')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1280,'height':850},accept_downloads=True)
 page.on('dialog',lambda dlg:dlg.accept())
 errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate("""() => {const bag={};window.__testStorage=bag;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>bag[k]??null,setItem:(k,v)=>bag[k]=String(v),removeItem:k=>delete bag[k],clear:()=>Object.keys(bag).forEach(k=>delete bag[k])}})}""")
 for name in ['fontkit-browser','templates','app']:
  page.add_script_tag(content=(app/(name+'.js')).read_text(encoding='utf-8'))
 page.locator('[data-open-studio]').first.click()
 expected=['مؤسسية','تقنية','تجارية','ثقافية','طبيعية','جريئة']
 assert page.locator('#paletteChoices .palette-pick').count()==24
 assert page.locator('#paletteChoices .palette-category').count()==7
 def contrast(x,y):
  def l(hexcode):
   ch=[int(hexcode[i:i+2],16)/255 for i in (1,3,5)]
   v=[c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4 for c in ch]
   return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]
  a,b=l(x),l(y)
  return (max(a,b)+0.05)/(min(a,b)+0.05)
 swatches=set()
 for cat in expected:
  page.locator('#paletteChoices [data-palette-category="'+cat+'"]').click()
  assert page.locator('#paletteChoices .palette-pick').count()==4,cat+' requires exactly four curated directions'
  for button in page.locator('#paletteChoices .palette-pick').all():
   ident=button.get_attribute('data-palette-id')
   assert button.get_attribute('aria-label'),ident+' must be named'
   before=page.locator('#paletteChoices .palette-pick[data-palette-id="'+ident+'"]')
   colors=before.locator('.palette-dots i').evaluate_all("(els)=>els.map(el=>getComputedStyle(el).backgroundColor)")
   assert len(colors)==4 and tuple(colors) not in swatches,'four-color swatches must be unique'
   swatches.add(tuple(colors))
   before.click()
   for key in ['primary','secondary','accent','ink']:
    val=page.locator('#'+key+'Color').input_value()
    assert re.fullmatch(r'#[0-9a-fA-F]{6}',val),(ident,key,val)
   primary=page.locator('#primaryColor').input_value()
   accent=page.locator('#accentColor').input_value()
   ink=page.locator('#inkColor').input_value()
   assert contrast(primary,'#FFFFFF')>=4.5,ident+' white-on-primary contrast'
   assert contrast(ink,accent)>=4.5,ident+' ink-on-accent contrast'
   assert contrast(ink,'#FFFFFF')>=4.5,ident+' ink-on-white contrast'
   assert page.locator('#paletteChoices .palette-pick[data-palette-id="'+ident+'"]').get_attribute('aria-pressed')=='true'
  print('PASS four curated accessible palettes in category',cat,flush=True)
 assert len(swatches)==24
 page.locator('.side-nav[data-panel="colors"]').click()
 assert page.locator('#paletteChoicesAlt .palette-pick').count()==24
 page.locator('#paletteChoicesAlt [data-palette-category="تقنية"]').click()
 assert page.locator('#paletteChoicesAlt .palette-pick').count()==4
 page.locator('#paletteChoicesAlt .palette-pick').first.click()
 original=page.locator('#primaryColor').input_value()
 updated='#123456' if original.lower()!='#123456' else '#654321'
 page.locator('#primaryColor').fill(updated)
 assert page.locator('#primaryColor').input_value().lower()==updated
 assert page.locator('#paletteChoicesAlt [aria-pressed="true"][data-palette-id]').count()==0,'customizing one color must clear preset selection'
 page.locator('#saveProject').click()
 saved=json.loads(page.evaluate('window.__testStorage["alwasiti-projects-v1"]'))
 assert saved['projects'][0]['data']['primary'].lower()==updated
 assert not errors,'Browser JS errors: '+str(errors)
 browser.close()
 print('RESULT 24/24 unique high-contrast palettes; 6 filters; 2 studio panels; single-color edit & save PASS',flush=True)
