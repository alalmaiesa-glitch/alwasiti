#!/usr/bin/env python3
"""WCAG 2.0/2.1/2.2 A/AA automated scan. Automated only: manual screen-reader QA remains required."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
app=root/'app'
html=(app/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+(app/'styles.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<script src="./fontkit-browser.js"></script>','').replace('<script src="./app.js"></script>','')
axe_path=root/'node_modules/axe-core/axe.min.js'
assert axe_path.is_file(), 'Install pinned axe-core@4.10.3 in CI first'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1280,'height':850})
 page.set_content(html, wait_until='domcontentloaded')
 page.add_script_tag(content=(app/'fontkit-browser.js').read_text(encoding='utf-8'))
 page.add_script_tag(content=(app/'app.js').read_text(encoding='utf-8'))
 page.add_script_tag(path=str(axe_path))
 failures=[]
 for state in ['landing','studio']:
  if state=='studio':
   page.locator('[data-open-studio]').first.click()
  res=page.evaluate("""async () => await axe.run(document, {runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})""")
  issues=[{'id':v['id'],'impact':v.get('impact'), 'affected':len(v['nodes']),'description':v['help'],'selectors':[node['target'] for node in v['nodes'][:3]]} for v in res['violations']]
  print('AXE',state,json.dumps(issues,ensure_ascii=False),flush=True)
  failures.extend(x for x in issues if x['impact'] in ('critical','serious'))
 browser.close()
 assert not failures, 'WCAG serious/critical: '+json.dumps(failures,ensure_ascii=False)
 print('PASS automated WCAG serious/critical scan on landing and studio')
