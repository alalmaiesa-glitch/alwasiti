#!/usr/bin/env python3
"""Twelve truly different editable compositions: original vector marks, scenes and exports."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re

app=Path(__file__).resolve().parents[1]/'app'
html=(app/'index.html').read_text(encoding='utf8')
html=html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+(app/'styles.css').read_text(encoding='utf8')+'</style>')
for name in ['fontkit-browser','templates','app']:
 html=html.replace('<script src="./'+name+'.js"></script>','')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
 page=context.new_page()
 page.set_default_timeout(12000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.set_content(html,wait_until='domcontentloaded')
 for name in ['fontkit-browser','templates','app']:
  page.add_script_tag(content=(app/(name+'.js')).read_text(encoding='utf8'))
 items=page.evaluate('window.AlwasitiTemplates')
 assert len(items)==12
 marks=page.evaluate('window.AlwasitiMotifs')
 assert len(marks)==12
 assert len({tuple(map(str,paths)) for paths in marks.values()})==12, 'Motif geometry must be distinct'
 signatures=set()
 for item in items:
  key=item['id']
  button=page.locator(('#templateGalleryHome' if key==items[0]['id'] else '#templateGalleryStudio')+' [data-template-id="'+key+'"]')
  card=page.locator('#templateGalleryHome .template-card[data-variant="'+key+'"]')
  assert card.count()==1,'No themed gallery card: '+key
  assert card.locator('.template-decor i').count()==3,'Artwork requires geometric construction: '+key
  button.click()
  assert page.locator('#preview').get_attribute('data-variant')==key, 'Editor still uses common layout: '+key
  scene=page.locator('#previewScene .scene-'+key)
  assert scene.count()==1 and scene.is_visible(), 'No independent visual composition for '+key
  assert page.locator('#layoutVariant').input_value()==key
  assert page.locator('#markMotif').input_value()==key
  assert page.locator('#previewHeadline').inner_text()==item['headline']
  assert page.locator('#previewCard1').inner_text()==item['cardOne']
  pathCount=len(marks[key])
  assert pathCount>=2, 'A single recolored geometric shape is not a custom mark'
  sig=(key,scene.evaluate("(el)=>el.outerHTML"),tuple(marks[key]))
  assert sig not in signatures
  signatures.add(sig)
  page.locator('.side-nav[data-panel="logo"]').click()
  with page.expect_download() as dl:
   page.locator('#quickDownloadLogo').click()
  svg=dl.value.path().read_text()
  if item['logoType']!='wordmark':
   assert svg.count('<path') >=pathCount, 'Missing truly distinct original vector symbol '+key
  assert '<script' not in svg.lower(), 'Executable SVG for '+key
  page.locator('.side-nav[data-panel="identity"]').click()
  # Editing the headline must affect that exact art direction, not revert to default.
  page.locator('#heroHeadline').fill('عنوان مختلف '+key)
  assert page.locator('#previewHeadline').inner_text()=='عنوان مختلف '+key
  # Restore the preset, then test next composition.
  page.locator('.side-nav[data-panel="templates"]').click()
  print('PASS individual composition',key,'mark paths',pathCount,flush=True)
 # Test user-controlled layout/style remix and PNG vector rendering.
 page.locator('.side-nav[data-panel="identity"]').click()
 page.locator('#layoutVariant').select_option('architecture')
 assert page.locator('#preview').get_attribute('data-variant')=='architecture'
 page.locator('.side-nav[data-panel="logo"]').click()
 page.locator('#markMotif').select_option('wellness')
 with page.expect_download(timeout=16000) as output:
  page.locator('#quickDownloadLogo').click()
 svg=output.value.path().read_text()
 assert 'M-40 5H-23' in svg,'Changing mark independently must change real SVG export'
 page.locator('#brandName').fill('هوية مستقلة')
 with page.expect_download(timeout=16000) as output:
  page.locator('#quickDownloadLogo').click()
 assert 'هوية مستقلة' in output.value.path().read_text()
 page.locator('#showExport').click()
 with page.expect_download(timeout=16000) as d:
  page.locator('[data-export="png"]').click()
 png=d.value.path().read_bytes()
 assert png[:8]==b'\x89PNG\r\n\x1a\n' and len(png)>8000,'PNG must contain actual graphics'
 page.locator('#saveProject').click()
 saved=page.evaluate('JSON.parse(localStorage.getItem("alwasiti-projects-v1"))')
 assert saved['projects'][0]['data']['layoutVariant']=='architecture'
 assert saved['projects'][0]['data']['markMotif']=='wellness'
 assert saved['projects'][0]['data']['headline'].startswith('عنوان مختلف')
 assert not errors,'Uncaught browser errors: '+str(errors)
 print('PASS all 12 distinct structural layouts / original vector symbols / independently editable brand copy and export',flush=True)
 context.close();browser.close()
