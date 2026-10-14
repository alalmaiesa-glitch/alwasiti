import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
const ctx={};vm.runInNewContext(fs.readFileSync('app/creative-studio/model.js','utf8'),ctx);
const m=ctx.WasitiUnifiedModel;
for(const fmt of Object.keys(m.FORMATS)){
 const doc=m.newProject(fmt),page=doc.pages[0];
 assert.equal(page.width,m.FORMATS[fmt].width);
 assert.equal(m.importProject(JSON.stringify(doc)).pages[0].height,page.height);
 assert.match(m.serializeSVG(page),/تصميم عربي يبدأ من الفكرة/);
}
const p=m.newProject();p.pages[0].layers.push(m.newLayer('text',{text:'<script>alert(1)</script> & العالم'}));
const svg=m.serializeSVG(p.pages[0]);
assert.ok(svg.includes('&lt;script&gt;'));assert.ok(!svg.includes('<script>'));
assert.equal(m.normLayer({type:'image',src:'https://attacker.example/track'}).src,'');
assert.throws(()=>m.importProject(JSON.stringify({version:1,pages:[{layers:[{type:'iframe'}]}]})));
assert.throws(()=>m.importProject(JSON.stringify({version:1,pages:[]})));
assert.throws(()=>m.importProject('x'.repeat(6000001)));
console.log('PASS 4 artboards + save roundtrip + SVG Arabic + sanitize + invalid inputs');
