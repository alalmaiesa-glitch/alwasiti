/** Sigilgen Arabic geometry proof; NOT a production integration. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),fontkit=require('fontkit'),sharp=require('sharp');
const {generateLogos}=await import(pathToFileURL(path.resolve('_sigilgen/dist/index.js')).href);
const fonts=[fontkit.openSync('app/fonts/NotoKufiArabic-wght.ttf'),fontkit.openSync('app/fonts/Amiri-Regular.ttf')];
const brands=[
 ['منارة','education, knowledge','تعليم'],['سحابة','cloud, technology, minimal','تقنية'],
 ['مدار','consulting, strategy, trust','استشارات'],['نبتة','organic, farming, nature','منتجات طبيعية'],
 ['حِرفة','artisan, handmade, craft','حرف'],['بوصلة','navigation, travel, direction','سفر'],
 ['وِصال','community, connection, social','مجتمع'],['إيوان','architecture, geometry, buildings','عمارة'],
 ['ينبوع','wellness, calm, water','عافية'],['إمداد','logistics, supply chain, movement','لوجستيات']
];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function shapeArabic(name,font){
 const r=font.layout(name),width=r.positions.reduce((sum,p)=>sum+p.xAdvance,0);
 if(width<=0||r.glyphs.length===0)throw Error('Arabic shaping failed');
 const size=Math.min(.255,392/width),left=802-width*size;
 let x=0;
 const glyphs=r.glyphs.map((g,i)=>{
  const p=r.positions[i],d=g.path.toSVG().trim();
  // Fontkit Path.toSVG() returns PATH DATA (M/L/C/Q...), not an SVG <path> node.
  // Restrict the drawing language to SVG path operators and numeric syntax.
  if(d && !/^[MmLlHhVvCcSsQqTtAaZz0-9+., Ee-]+$/.test(d))
    throw Error('Unsafe raw glyph path '+name+' '+i+' '+JSON.stringify(d.slice(0,80)));
  const element=d?'<path d="'+d+'"/>':'';
  const z=element?'<g transform="translate('+(x+p.xOffset)+' '+p.yOffset+')">'+element+'</g>':'';
  x+=p.xAdvance;return z;
 });
 return {paths:'<g fill="#193245" transform="translate('+left+' 287) scale('+size+' '+(-size)+')">'+glyphs.join('')+'</g>',glyphs:r.glyphs.length};
}
function composite(item,index,concept,font){
 if(concept.engine!=='abstract')throw Error('non-Arabic Sigilgen engine forbidden');
 if(/<text\b|<script|<image\b|foreignObject|href=|onload=/i.test(concept.svg))throw Error('unsafe upstream SVG');
 const paths=[...concept.svg.matchAll(/<path\b[^>]*\/>/g)].map(x=>x[0]);
 if(paths.length===0||paths.some(x=>/\son\w+=|href=|style=/i.test(x)))throw Error('unsafe/empty path');
 const sh=shapeArabic(item[0],font);
 const title=escape(item[0]+' — تصميم '+index);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 420" width="840" height="420" role="img" aria-labelledby="title">'
 +'<title id="title">'+title+'</title><g transform="translate(43 65) scale(.51)">'+paths.join('')+'</g>'+sh.paths+'</svg>';
 if(/<text\b|<script|<image\b|foreignObject|href=|onload=/i.test(svg))throw Error('unsafe final SVG');
 return {svg,geometry:hash(paths.map(x=>x.match(/\bd="([^"]+)"/)?.[1]||'').join('|')),glyphCount:sh.glyphs,pathCount:(svg.match(/<path\b/g)||[]).length};
}
const out='spikes/sigilgen-arabic/output';fs.mkdirSync(out,{recursive:true});
const uniq=new Set(),tiles=[],rows=[];
for(let i=0;i<brands.length;i++){
 const b=brands[i],seed=parseInt(hash(b[0]+'|'+b[2]).slice(0,8),16);
 const concepts=generateLogos({name:'VECTOR',engine:'abstract',keywords:b[1],variations:6,seed,size:512,palette:'#203C60,#55CCD2,#E9E3D8'});
 if(concepts.length!==6)throw Error('six variations missing');
 const row={brand:b[0],sector:b[2],concepts:[]};
 for(let n=0;n<6;n++){
  const made=composite(b,n+1,concepts[n],fonts[(i+n)%2]);
  if(uniq.has(made.geometry))throw Error('repeated geometry '+b[0]);uniq.add(made.geometry);
  const name='brand-'+(i+1)+'-'+(n+1)+'.svg';
  fs.writeFileSync(path.join(out,name),made.svg);
  const rendered=await sharp(Buffer.from(made.svg)).resize(280,140,{fit:'contain'}).ensureAlpha().png().toBuffer();
  const stat=await sharp(rendered).stats();
  if(stat.channels[3].mean<.8||stat.channels[3].mean>245)throw Error('blank/opaque raster '+name);
  tiles.push({input:rendered,left:n*280,top:i*140});
  row.concepts.push({variant:n+1,pathCount:made.pathCount,shapedArabicGlyphs:made.glyphCount,geometry:made.geometry.slice(0,16),file:name,bytes:Buffer.byteLength(made.svg)});
 }
 rows.push(row);
}
await sharp({create:{width:1680,height:1400,channels:4,background:'#f9f9f6'}}).composite(tiles).png().toFile(path.join(out,'contact-sheet.png'));
const firstSeed=parseInt(hash(brands[0][0]+'|'+brands[0][2]).slice(0,8),16);
const first=generateLogos({name:'VECTOR',engine:'abstract',keywords:brands[0][1],variations:1,seed:firstSeed,size:512,palette:'#203C60,#55CCD2,#E9E3D8'})[0];
if(fs.readFileSync(path.join(out,'brand-1-1.svg'),'utf8')!==composite(brands[0],1,first,fonts[0]).svg)throw Error('non-deterministic SVG');
const totals={brands:10,concepts:60,uniqueGeometries:uniq.size,arabicOutlined:60,rasterPass:60};
fs.writeFileSync(path.join(out,'quality-report.json'),JSON.stringify({upstream:'xianshi3/sigilgen@769499362cbc17e335443346337ebd85f38a29d9',notes:['Only abstract engine; other engines are Latin-only','Mapped sector English keywords, not Arabic natural-language understanding','Geometric uniqueness is NOT equivalent to aesthetic approval'],totals,results:rows},null,2));
console.log('SIGILGEN_ARABIC_PASS '+JSON.stringify(totals));