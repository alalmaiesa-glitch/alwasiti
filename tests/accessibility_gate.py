#!/usr/bin/env python3
"""Automated focus and accessible name regression checks; not a substitute for an actual screen reader."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1] / 'app'
html = (root / 'index.html').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="./styles.css">', '<style>'+(root/'styles.css').read_text(encoding='utf-8')+'</style>')
html = html.replace('<script src="./fontkit-browser.js"></script>','').replace('<script src="./app.js"></script>','')
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1280,'height':800})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(html, wait_until='domcontentloaded')
    page.add_script_tag(content=(root/'fontkit-browser.js').read_text(encoding='utf-8'))
    page.add_script_tag(content=(root/'app.js').read_text(encoding='utf-8'))

    opener = page.locator('[data-open-studio]').first
    opener.click()
    assert page.evaluate('document.activeElement.id') == 'backHome', 'Focus must enter visible studio controls'
    unlabeled = page.evaluate("""[...document.querySelectorAll('input,select,textarea')].filter(el => el.getClientRects().length && !(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'))).map(el=>el.id)""")
    assert not unlabeled, f'Visible form controls without label: {unlabeled}'
    page.locator('#showExport').click()
    assert page.locator('#exportModal').get_attribute('aria-modal') == 'true'
    assert page.evaluate("document.activeElement.closest('#exportModal') !== null"), 'Dialog must receive focus'
    page.keyboard.press('Escape')
    assert page.evaluate('document.activeElement.id') == 'showExport', 'Dialog exit must restore focus'
    page.locator('#backHome').click()
    assert page.evaluate("document.activeElement === document.querySelector('[data-open-studio]')"), 'Studio close must restore launcher focus'
    assert not errors, f'JS errors: {errors}'
    browser.close()
    print('PASS: visible focus, labeled form controls, modal focus restoration, SPA focus and no JS exceptions')
