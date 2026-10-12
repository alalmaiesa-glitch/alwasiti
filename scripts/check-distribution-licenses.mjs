// V1.4 P0 static distribution-license audit. Conservative: not a legal sign-off.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('app');
const files=new Map([
 ['LICENSES/OFL-Amiri.txt',['SIL OPEN FONT LICENSE','Amiri']],
 ['LICENSES/OFL-NotoKufiArabic.txt',['SIL OPEN FONT LICENSE','Noto']],
 ['LICENSES/swc-helpers-APACHE-2.0.txt',['Apache License','Version 2.0','TERMS AND CONDITIONS']],
 ['LICENSES/restructure-LICENSE',['Permission is hereby granted']],
 ['LICENSES/tiny-inflate-LICENSE',['Permission is hereby granted']],
 ['LICENSES/unicode-properties-LICENSE',['Permission is hereby granted']],
 ['LICENSES/unicode-trie-LICENSE',['Permission is hereby granted']],
 ['LICENSES/fast-deep-equal-LICENSE',['Permission is hereby granted']],
 ['LICENSES/clone-LICENSE',['Permission is hereby granted']],
 ['LICENSES/fontkit-MIT.txt',['Permission is hereby granted']],
 ['LICENSES/tslib-LICENSE.txt',['Permission is hereby granted']],
 ['LICENSES/pako-LICENSE',['Permission is hereby granted']],
]);
for (const [name,required] of files){
 const target=path.join(root,name);
 if(!fs.existsSync(target))throw Error('Missing redistribution notice '+name);
 const data=fs.readFileSync(target,'utf8');
 if(data.length<400||!required.every(x=>data.includes(x)))throw Error('Suspicious or incomplete license notice '+name);
}
const notices=fs.readFileSync(path.join(root,'THIRD-PARTY-NOTICES.md'),'utf8');
for(const n of ['fontkit','restructure','@swc/helpers','fast-deep-equal','unicode-properties','unicode-trie','dfa','clone','tiny-inflate','brotli']){
 if(!notices.includes(n))throw Error('Missing dependency in notice inventory: '+n);
}
const expected=JSON.parse(fs.readFileSync(path.join(root,'RELEASE-SHA256.json'),'utf8')).files;
for(const name of files.keys())if(!(name in expected))throw Error('Notice excluded from published release '+name);
for(const name of ['CONTENT-LICENSES.md','THIRD-PARTY-NOTICES.md'])if(!(name in expected))throw Error('Missing published inventory '+name);
console.log('PASS: '+files.size+' license notice files + dependency inventory and distribution manifest');
console.log('OPEN: fontkit/dfa/brotli upstream-versioned author attribution review, legal/privacy approval');
