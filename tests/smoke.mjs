import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const dir=path.resolve('dist');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const vendor=fs.readFileSync(path.join(dir,'fontkit-browser.js'),'utf8');
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const checks=[
 ['Arabic RTL document',()=>assert.match(html,/<html lang="ar" dir="rtl">/)],
 ['stylesheet self-hosted',()=>assert.match(html,/href="\.\/styles\.css"/)],
 ['vendor self-hosted',()=>assert.match(html,/src="\.\/fontkit-browser\.js"/)],
 ['app self-hosted',()=>assert.match(html,/src="\.\/app\.js"/)],
 ['no inline executable script',()=>assert.doesNotMatch(html,/<script>\s*[\s\S]+?<\/script>/)],
 ['Fontkit engine included',()=>assert.match(vendor,/window\.fontkit=/)],
 ['app includes vector export',()=>assert.match(app,/downloadOutlinedLogo/)],
 ['recovery draft supported',()=>assert.match(app,/alwasiti-recovery-draft-v1/)],
 ['font resources restricted',()=>assert.match(app,/raw\.githubusercontent\.com/)],
 ['nosniff',()=>assert.match(JSON.stringify(config),/nosniff/)],
 ['CSP self-hosted scripts',()=>assert.match(JSON.stringify(config),/script-src 'self'/)],
 ['legal pages exist',()=>['privacy.html','terms.html','CONTENT-LICENSES.md'].forEach(x=>assert.ok(fs.existsSync(path.join(dir,x))))],
 ['JavaScript syntax valid',()=>['app.js','fontkit-browser.js'].forEach(x=>execFileSync('node',['--check',path.join(dir,x)]))],
];
for(const [name,fn] of checks){fn();console.log('PASS',name);}
console.log('PASS',checks.length,'structural checks. E2E acceptance required before release.');
