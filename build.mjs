import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd();
const dir=path.join(root,'dist');
fs.mkdirSync(dir,{recursive:true});
const parts=Array.from({length:29},(_,i)=>fs.readFileSync(path.join(root,'snapshot',String(i).padStart(2,'0')+'.part'),'utf8'));
const html=parts.join('\n')+'\n';
const sha=crypto.createHash('sha256').update(html).digest('hex');
const EXPECTED='62baa3e5d6b7531d42d978728532234809c1d0c5267219fd489a1cd24f249e10';
if(sha!==EXPECTED)throw new Error('Source integrity mismatch. Expected '+EXPECTED+', got '+sha);
let doc=html;
let styleCount=0,scriptCount=0;
doc=doc.replace(/<style>\n([\s\S]*?)\n<\/style>/g,(_m,css)=>{
 styleCount++;fs.writeFileSync(path.join(dir,'styles.css'),css+'\n','utf8');
 return '<link rel="stylesheet" href="./styles.css">';
});
doc=doc.replace(/<script>([\s\S]*?)<\/script>/g,(_m,js)=>{
 const file=scriptCount++===0?'fontkit-browser.js':'app.js';
 fs.writeFileSync(path.join(dir,file),js+'\n','utf8');
 return '<script src="./'+file+'"></script>';
});
if(styleCount!==1||scriptCount!==2)throw new Error('Unexpected build structure: '+styleCount+' styles, '+scriptCount+' scripts');
fs.writeFileSync(path.join(dir,'index.html'),doc,'utf8');
for(const file of ['privacy.html','terms.html','CONTENT-LICENSES.md','THIRD-PARTY-NOTICES.md']){
 fs.copyFileSync(path.join(root,'static',file),path.join(dir,file));
}
console.log('alWasiti V1.4 hardening assembled and verified:',sha);
