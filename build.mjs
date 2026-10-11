import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const from=path.resolve('app'),to=path.resolve('dist');
const expected=JSON.parse(fs.readFileSync(path.join(from,'RELEASE-SHA256.json'),'utf8')).files;
for (const [name,sha] of Object.entries(expected)) {
  const original=path.join(from,name);
  if (!fs.existsSync(original)) throw new Error('Missing source file: '+name);
  const digest=crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex');
  if (digest!==sha) throw new Error('Source integrity failure: '+name);
  const dest=path.join(to,name);fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(original,dest);
}
console.log('Verified and copied',Object.keys(expected).length,'source files');
