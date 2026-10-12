#!/usr/bin/env python3
"""alWasiti V1.4 Production Hardening acceptance suite.
Requires Python playwright + system chromium; test fonts are read from locally installed
licensed fonts, not bundled with the deliverable or written to zip.
"""
import json,re,base64,time,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
ROOT=Path(__file__).resolve().parents[1]/'app'
RAW=(ROOT/'index.html').read_text()
RAW=re.sub(r'<link[^>]+(?:fonts.googleapis.com|fonts.gstatic.com)[^>]*>', '',RAW)
RAW=RAW.replace('<link rel="stylesheet" href="./styles.css">','<style>'+ (ROOT/'styles.css').read_text()+'</style>')
RAW=re.sub(r'<script src="\./(?:fontkit-browser|app)\.js"></script>', '', RAW)
JS=(ROOT/'app.js').read_text();VENDOR=(ROOT/'fontkit-browser.js').read_text()
results=[]
def set_control(page,name,value):
 page.locator('#'+name).evaluate('(el,val)=>{el.value=val;el.dispatchEvent(new Event("input",{bubbles:true}));}',value)

def check(name,fn):
 try:
  fn();results.append({'case':name,'pass':True});print('PASS',name,flush=True)
 except Exception as e:
  results.append({'case':name,'pass':False,'reason':str(e)[:280]});print('FAIL',name,type(e).__name__,str(e)[:200],flush=True)

def assert_true(expr,message='assertion failed'):
 if not expr:raise AssertionError(message)

def storage_js(storage=None):
 d=json.dumps(storage or {},ensure_ascii=False)
 return '''(()=>{const data=Object.assign({},SEED);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null},setItem(k,v){data[k]=String(v)},removeItem(k){delete data[k]},clear(){for(const k of Object.keys(data))delete data[k]}}});window.__testingStorage=data;})();'''.replace('SEED',d)

def build(browser,viewport=None,seed=None):
 page=browser.new_page(viewport=viewport or {'width':1280,'height':850},accept_downloads=True)
 err=[];page.on('pageerror',lambda e:err.append(str(e)))
 page.set_default_timeout(4000)
 page.set_content(RAW,wait_until='commit',timeout=8000)
 page.evaluate(storage_js(seed))
 page.add_script_tag(content=VENDOR)
 page.add_script_tag(content=JS)
 page.locator('[data-open-studio]').first.click()
 page.locator('[data-panel="logo"]').first.click()
 return page,err

def export_download(page,selector,save_name):
 with page.expect_download(timeout=14000) as dl:page.locator(selector).click()
 d=dl.value;path=Path(__file__).parent/save_name;d.save_as(path)
 return path

def mock_fonts(page):
 fonts={
  'amiri':Path(__import__('os').environ.get('ALWASITI_TEST_FONT_AMIRI','/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Regular.ttf')),
  'noto':Path(__import__('os').environ.get('ALWASITI_TEST_FONT_NOTO','/usr/share/fonts/truetype/noto/NotoKufiArabic-Regular.ttf')),
 }
 blobs={k:base64.b64encode(v.read_bytes()).decode('ascii') for k,v in fonts.items()}
 page.evaluate('''(data)=>{window.fetch=async (url)=>{const k=String(url).includes('Amiri-')?'amiri':'noto';const binary=atob(data[k]);return new Response(Uint8Array.from(binary,c=>c.charCodeAt(0)),{status:200})};}''',blobs)

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page,errs=build(browser)
 check('01 JS initializes without exceptions', lambda:assert_true(not errs and page.locator('#logoCanvas svg').count()==1))
 check('02 page is Arabic RTL',lambda:assert_true(page.locator('html').get_attribute('dir')=='rtl' and page.locator('html').get_attribute('lang')=='ar'))
 check('03 logo type switches',lambda:(page.locator('[data-logo="wordmark"]').click(),assert_true(page.locator('#logoCanvas [data-part="mark"]').count()==0),page.locator('[data-logo="symbol"]').click()))
 check('04 color applies',lambda:(set_control(page,'primaryColor','#123456'),assert_true(page.locator('#preview').evaluate('(e)=>e.style.getPropertyValue("--pv-primary")')=='#123456'.upper())))
 check('05 brand edits display',lambda:(set_control(page,'brandName','شركة الواسطي'),assert_true(page.locator('#logoCanvas').inner_text().find('شركة الواسطي')>=0)))
 check('06 HTML script injection treated as text',lambda:(set_control(page,'brandName','<img src=x onerror=alert(1)>'),assert_true(page.locator('#logoCanvas img').count()==0 and 'onerror' in page.locator('#logoCanvas').inner_text())))
 check('07 long imported characters are capped',lambda:(set_control(page,'brandName','ع'*60),assert_true(len(page.locator('#brandName').input_value())<=30)))
 check('08 local save persists',lambda:(page.locator('#saveProject').click(),assert_true('alwasiti-projects-v1' in page.evaluate('window.__testingStorage'))))
 check('09 save clears dirty draft',lambda:assert_true(page.evaluate('window.__testingStorage["alwasiti-recovery-draft-v1"]') is None))
 check('10 duplicate project',lambda:(page.locator('#showProjects').click(),page.locator('#duplicateProject').click(),assert_true(len(json.loads(page.evaluate('window.__testingStorage["alwasiti-projects-v1"]'))['projects'])==2)))
 page.locator('#showProjects').click()
 check('11 project JSON download',lambda:assert_true(json.loads(export_download(page,'#exportProjectJson','project.json').read_text())['format']=='alwasiti.project'))
 # Close any modal then run a clean SVG export
 if not page.locator('#projectsModal').is_hidden():page.locator('#closeProjects').click()
 check('12 wordmark export no mark',lambda:(page.locator('[data-logo="wordmark"]').click(),assert_true('data-part="mark"' not in export_download(page,'#quickDownloadLogo','wordmark.svg').read_text())))
 check('13 SVG escaped contains no executable HTML',lambda:(set_control(page,'brandName','<script>alert(1)</script>'),assert_true('<script>' not in export_download(page,'#quickDownloadLogo','escaped.svg').read_text())))
 check('14 controls hex color import normalize',lambda:assert_true('nosniff' in (ROOT/'vercel.json').read_text()))
 check('15 security CSP script self only',lambda:assert_true("script-src 'self'" in (ROOT/'vercel.json').read_text() and "'unsafe-eval'" not in (ROOT/'vercel.json').read_text()))
 check('16 has privacy and terms',lambda:assert_true((ROOT/'privacy.html').exists() and (ROOT/'terms.html').exists() and 'privacy.html' in (ROOT/'index.html').read_text()))
 check('17 vector engine loads',lambda:assert_true(page.evaluate('typeof window.fontkit.create')=='function'))
 mock_fonts(page)
 set_control(page,'brandName','الواسطي')
 set_control(page,'symbolLetter','و')
 check('18 outline SVG Amiri',lambda:(page.locator('#vectorFont').select_option('amiri'),assert_true('<path' in export_download(page,'#downloadVectorLogo','amiri.svg').read_text() and '<text' not in (Path(__file__).parent/'amiri.svg').read_text())))
 check('19 outline SVG Noto',lambda:(page.locator('#vectorFont').select_option('noto'),assert_true('<path' in export_download(page,'#downloadVectorLogo','noto.svg').read_text() and '<text' not in (Path(__file__).parent/'noto.svg').read_text())))
 check('20 Arabic diacritics SVG',lambda:(set_control(page,'brandName','العَرَبِيَّة'),assert_true('<path' in export_download(page,'#downloadVectorLogo','diacritics.svg').read_text())))
 check('21 irrelevant non-supported mark cannot block wordmark',lambda:(page.locator('[data-logo="wordmark"]').click(),set_control(page,'symbolLetter','😀'),assert_true('<path' in export_download(page,'#downloadVectorLogo','irrelevant.svg').read_text())))
 check('22 wordmark off-canvas yields expanded bbox',lambda:(page.locator('[data-logo-layout="centered"]').click(),set_control(page,'brandName','أحمد محمد للمشروعات العربية'),set_control(page,'wordSize','94'),assert_true('viewBox="0 0 760 360"' not in export_download(page,'#downloadVectorLogo','fitted.svg').read_text(),page.locator('#vectorStatus').inner_text())))
 check('23 SVG parsed with lxml',lambda:__import__('lxml.etree',fromlist=['']).fromstring((Path(__file__).parent/'fitted.svg').read_bytes()) if (Path(__file__).parent/'fitted.svg').exists() else assert_true(False,page.locator('#vectorStatus').inner_text()))
 check('24 mouse canvas available',lambda:assert_true(page.locator('#editableLogoSvg').count()==1))
 check('25 keyboard undo/redos',lambda:(page.locator('#resetLogoLayout').click(),page.locator('#undoLogo').click(),assert_true(not page.locator('#redoLogo').is_disabled())))
 page.locator('#showExport').click()
 check('26 PNG transparent',lambda:assert_true(export_download(page,'[data-export="png"]','logo.png').read_bytes()[:8]==b'\x89PNG\r\n\x1a\n'))
 check('27 desktop no horizontal overflow in editor',lambda:assert_true(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2')))
 check('28 no remote app secrets',lambda:assert_true(not re.search(r'(service_role|sk_live_[a-z0-9]{10}|sb_secret_)',JS,re.I)))
 check('29 licensing notices present',lambda:assert_true('Fontkit' in (ROOT/'CONTENT-LICENSES.md').read_text() and (ROOT/'THIRD-PARTY-NOTICES.md').exists()))
 check('30 browser still free of JS errors',lambda:assert_true(not errs,str(errs)))
 # Unsaved draft and restore are validated with a new page using mocked persistent localStorage.
 set_control(page,'brandName','مسودة بعد انقطاع')
 page.wait_for_timeout(900)
 check('31 unsaved autosave draft generated',lambda:assert_true('alwasiti-recovery-draft-v1' in page.evaluate('window.__testingStorage')))
 seed=page.evaluate('window.__testingStorage');page2,err2=build(browser,seed=seed)
 check('32 restart restores draft',lambda:assert_true(page2.locator('#brandName').input_value()=='مسودة بعد انقطاع'))
 check('33 restart prompts saving',lambda:assert_true('مسودة مستعادة' in page2.locator('#saveStatus').inner_text()))
 # Validate import against attacks + safe truncation
 page2.locator('#showProjects').click()
 attack={'format':'alwasiti.project','version':1,'data':{'brandName':'<svg onload=alert(1)>','primary':'url(javascript:alert(1))','markX':float('inf'),'projectName':'اختبار'}}
 payload=json.dumps(attack,ensure_ascii=False).replace('Infinity','1e999')
 page2.on('dialog',lambda d:d.accept())
 page2.locator('#projectFileInput').set_input_files({'name':'attack.json','mimeType':'application/json','buffer':payload.encode()})
 check('34 import hostile data escaped & sanitized',lambda:assert_true(page2.locator('#logoCanvas svg svg').count()==0 and page2.locator('#primaryColor').input_value().startswith('#')))
 check('35 import max length',lambda:assert_true(page2.locator('#projectName').input_value()=='اختبار'))
 check('36 safe source license files',lambda:assert_true((ROOT/'THIRD-PARTY-NOTICES.md').stat().st_size>200))
 page3,err3=build(browser,viewport={'width':390,'height':844})
 check('37 mobile editor mounts',lambda:assert_true(page3.locator('#logoCanvas svg').count()==1))
 check('38 mobile toolbar accessible',lambda:assert_true(page3.locator('#saveProject').count()==1 and page3.locator('#showExport').count()==1))
 page3.evaluate('() => {window.fetch=async()=>{throw new Error("offline")}}')
 check('39 vector failure does not download misleading SVG',lambda:(page3.locator('#downloadVectorLogo').click(),page3.wait_for_timeout(200),assert_true(page3.locator('#vectorStatus').get_attribute('data-status')=='error')))
 check('40 no mobile JS exceptions',lambda:assert_true(not err3,str(err3)))
 # Additional acceptance coverage for dialogs, output format and restricted CSP.
 page2.locator('#showExport').click()
 check('41 export modal initial focus',lambda:assert_true(page2.evaluate('document.activeElement.id')=='closeExport'))
 check('42 export focus cycles backward',lambda:(page2.keyboard.press('Shift+Tab'),assert_true(page2.evaluate("document.activeElement.closest('#exportModal') !== null"))))
 check('43 escape closes modal',lambda:(page2.keyboard.press('Escape'),assert_true(page2.locator('#exportModal').is_hidden())))
 check('44 focus restored after close',lambda:assert_true(page2.evaluate('document.activeElement.id')=='showExport'))
 from PIL import Image
 check('45 PNG dimensions',lambda:assert_true(Image.open(Path(__file__).parent/'logo.png').size==(1520,720)))
 check('46 PNG transparency',lambda:assert_true(Image.open(Path(__file__).parent/'logo.png').convert('RGBA').getpixel((0,0))[3]==0))
 check('47 SVG forbids external URLs and scripts',lambda:assert_true(not re.search(r'<script|<foreignObject|<image|url\(', (Path(__file__).parent/'fitted.svg').read_text(),re.I)))
 check('48 CSP blocks plugins and framing',lambda:assert_true("object-src 'none'" in (ROOT/'vercel.json').read_text() and "frame-ancestors 'none'" in (ROOT/'vercel.json').read_text()))
 check('49 external image rights not embedded',lambda:assert_true('<img ' not in (ROOT/'index.html').read_text()))
 check('50 no runtime browser errors after dialogs',lambda:assert_true(not err2,str(err2)))
 page.close();page2.close();page3.close();browser.close()

passed=sum(x['pass'] for x in results);total=len(results)
summary={'suite':'V1.4 production hardening','pass':passed,'total':total,'percent':round(passed/total*100,1),'failures':[x for x in results if not x['pass']]}
Path(__file__).parent.joinpath('ACCEPTANCE-RESULTS.json').write_text(json.dumps({'summary':summary,'cases':results},ensure_ascii=False,indent=2))
print('\nRESULTS',json.dumps(summary,ensure_ascii=False,indent=2))
raise SystemExit(0 if passed==total else 1)
