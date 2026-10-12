/**
 * Quality gate for the 60 generated concepts: structural diversity, not SHA uniqueness.
 * Runs AFTER prototype.mjs and writes a report before intentionally failing low-quality output.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve('spikes/sigilgen-arabic/output');
const sheet=await sharp(path.join(root,'contact-sheet.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
const {data,info}=sheet;
if(info.width!==1680||info.height!==1400)throw Error('Unexpected 6x10 image grid');
const masks=[];
const symbols=new Set();
let layoutCount=0;
for(let row=0;row<10;row++){
 for(let col=0;col<6;col++){
  const name='brand-'+(row+1)+'-'+(col+1)+'.svg';
  const svg=fs.readFileSync(path.join(root,name),'utf8');
  if(svg.includes('<g transform="translate(43 65) scale(.51)">'))layoutCount++;
  const icon=svg.match(/<g transform="translate\(43 65\) scale\(\.51\)">([\s\S]*?)<\/g>/)?.[1]||'';
  const fill=icon.match(/fill="(#[0-9a-fA-F]{6})"/)?.[1];
  if(fill)symbols.add(fill.toLowerCase());
  const pixels=new Uint8Array(100*140);
  let minx=100,miny=140,maxx=-1,maxy=-1;
  for(let y=0;y<140;y++)for(let x=0;x<100;x++){
    const ofs=((row*140+y)*info.width+col*280+x)*info.channels;
    const dark=data[ofs]<150&&data[ofs+1]<150&&data[ofs+2]<150;
    if(dark){pixels[y*100+x]=1;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);}
  }
  if(maxx<0)throw Error('Blank logo icon '+name);
  const w=maxx-minx+1,h=maxy-miny+1,size=Math.max(w,h)+8;
  const patch=new Uint8Array(size*size);
  const offx=Math.floor((size-w)/2),offy=Math.floor((size-h)/2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)patch[(offy+y)*size+offx+x]=pixels[(y+miny)*100+x+minx];
  const normalized=new Uint8Array(64*64);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const sx=Math.min(size-1,Math.floor((x+0.5)*size/64)),sy=Math.min(size-1,Math.floor((y+0.5)*size/64));
    normalized[y*64+x]=patch[sy*size+sx];
  }
  masks.push(normalized);
 }
}
let similar80=0,similar90=0;
const examples=[];
for(let i=0;i<masks.length;i++)for(let j=i+1;j<masks.length;j++){
 const a=masks[i],b=masks[j];
 let both=0,either=0;
 for(let k=0;k<a.length;k++){
  if(a[k]||b[k])either++;
  if(a[k]&&b[k])both++;
 }
 const score=both/either;
 if(score>=0.8){similar80++;if(examples.length<12)examples.push({first:[Math.floor(i/6)+1,i%6+1],second:[Math.floor(j/6)+1,j%6+1],IoU:Number(score.toFixed(3))});}
 if(score>=0.9)similar90++;
}
const result={
 method:'Threshold near-dark foreground, crop each 100x140 icon, normalize to 64x64, mask Intersection-over-Union across all 1770 symbol pairs',
 tested:60,
 similarPairsAt80Percent:similar80,
 similarPairsAt90Percent:similar90,
 oneFixedSymbolAndWordmarkLayout:layoutCount===60,
 uniqueMarkColors:symbols.size,
 examples,
 acceptance:{maxSimilarPairsAt80Percent:4,requireMultipleLayoutFamilies:true},
 verdict:(similar80<=4&&layoutCount!==60)?'PASS':'FAIL',
 warning:'Visual similarity is a proxy, not proof of originality, brand relevance, Arabic readability or design quality.'
};
fs.writeFileSync(path.join(root,'visual-diversity-audit.json'),JSON.stringify(result,null,2));
console.log('SIGILGEN_VISUAL_GATE '+JSON.stringify(result));
if(result.verdict!=='PASS')process.exitCode=1;
