"""Browser acceptance for isolated unified design studio. No network/back-end needed."""
import json
import unicodedata
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]/'app/creative-studio'
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="./styles.css">','')
html=html.replace('<script src="./model.js"></script><script src="./editor.js"></script>','')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(viewport={'width':1450,'height':920},accept_downloads=True)
 page=context.new_page()
 page.set_default_timeout(13000)
 js_errors=[]
 page.on('pageerror',lambda e:js_errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content(html,wait_until='domcontentloaded')
 page.add_style_tag(content=(root/'styles.css').read_text(encoding='utf-8'))
 page.evaluate("""() => {const storage={};window.__labStorage=storage;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=String(v),removeItem:k=>delete storage[k],clear:()=>Object.keys(storage).forEach(k=>delete storage[k])}})}""")
 page.add_script_tag(content=(root/'model.js').read_text(encoding='utf-8'))
 page.add_script_tag(content=(root/'editor.js').read_text(encoding='utf-8'))
 assert page.locator('html').get_attribute('dir')=='rtl'
 assert page.locator('#artboard [data-layer-id]').count()==3
 assert page.locator('#pages .page-item').count()==1
 assert len(page.evaluate('window.WasitiUnifiedLab.getProject().pages'))==1
 page.locator('[data-action="add-text"]').click()
 assert page.locator('#artboard [data-layer-id]').count()==4
 page.locator('#layers .layer-item').first.click()
 page.locator('#layerText').fill('بناءٌ عربيٌّ أصيل')
 page.locator('#layerText').press('Tab')
 assert unicodedata.normalize('NFC','بناءٌ عربيٌّ أصيل') in page.evaluate('window.WasitiUnifiedLab.getSVG()')
 with page.expect_download() as download:
  page.locator('[data-action="export-svg"]').click()
 exported=download.value.path().read_text(encoding='utf-8')
 assert exported.startswith('<svg') and unicodedata.normalize('NFC','بناءٌ عربيٌّ أصيل') in exported
 with page.expect_download() as download:
  page.locator('[data-action="export-png"]').click()
 png=download.value.path().read_bytes()
 assert png[:8]==b'\x89PNG\r\n\x1a\n' and len(png)>4000,'PNG missing image data'
 page.locator('#format').select_option('story')
 page.locator('[data-action="add-page"]').click()
 assert page.locator('#pages .page-item').count()==2
 assert page.evaluate('window.WasitiUnifiedLab.getProject().pages[1].height')==1920
 page.locator('[data-action="duplicate-page"]').click()
 assert page.locator('#pages .page-item').count()==3
 page.locator('[data-action="undo"]').click()
 assert page.locator('#pages .page-item').count()==2
 page.locator('[data-action="redo"]').click()
 assert page.locator('#pages .page-item').count()==3
 pgs=[]
 for kind in ['poster','invite','sale','quote']:
  page.locator('[data-preset="'+kind+'"]').click()
  project=page.evaluate('window.WasitiUnifiedLab.getProject()')
  current=project['pages'][project['pageIndex']]
  pgs.append((current['background'],tuple((l['type'],l['text']) for l in current['layers'])))
 assert len(set(map(str,pgs)))==4,'Presets were only recolors'
 # Visual test: Arabic RTL line must fit INSIDE the page, not be clipped on the right.
 bounds=page.evaluate("""() => {const svg=document.getElementById('artboard'),p=window.WasitiUnifiedLab.getProject(),pg=p.pages[p.pageIndex];
 return [...svg.querySelectorAll('text')].map(el=>{const box=el.getBBox();return {text:el.textContent,x:box.x,right:box.x+box.width,limit:pg.width}})}""")
 assert bounds and all(x['x']>=-8 and x['right']<=x['limit']+8 for x in bounds),'RTL text overflow: '+str(bounds)
 assert 'text-anchor="start"' in page.evaluate('window.WasitiUnifiedLab.getSVG()'),'RTL SVG export must use correct anchor'
 visual=page.evaluate("""() => {const svg=document.getElementById('artboard'),bar=svg.querySelector('rect[data-layer-id]'),headline=[...svg.querySelectorAll('text[data-layer-id]')].find(x=>x.textContent.includes('الجمال'));
 const x=bar.getBBox(),t=headline.getBBox();return {ornamentEnd:x.x+x.width,textLeft:t.x}}""")
 assert visual['textLeft']>=visual['ornamentEnd']+20,'Quote must not overlap side ornament: '+str(visual)
 with page.expect_download() as download:
  page.locator('[data-action="export-project"]').click()
 backup=json.loads(download.value.path().read_text(encoding='utf-8'))
 assert backup['version']==1 and len(backup['pages'])==3
 assert page.evaluate('Object.keys(window.__labStorage).some(x=>x.includes("unified"))')
 assert not js_errors,'Uncaught JS errors: '+str(js_errors)
 page.screenshot(path='/tmp/alwasiti-unified-studio.png',full_page=True)
 print('PASS: RTL canvas / 4 layers / edit / SVG+PNG / pages / duplicate / undo+redo / 4 structurally different presets / JSON/local save')
 context.close();browser.close()
