/* الواسطي: Unified Studio document model, experimental v0.1, local-only */
(function(root){
'use strict';
const FORMATS={square:{name:'منشور مربع',width:1080,height:1080},story:{name:'قصة عمودية',width:1080,height:1920},landscape:{name:'عرض أفقي',width:1920,height:1080},a4:{name:'A4 للطباعة',width:1240,height:1754}};
const FONTS=['Cairo','Tahoma','Arial','Amiri','Noto Kufi Arabic'];
let serial=0;function uid(){return 'aw'+Date.now().toString(36)+(++serial).toString(36)}
function bounded(n,min,max,fallback){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function clean(v,n=200){return String(typeof v==='string'?v:'').normalize('NFC').replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g,'').slice(0,n)}
function hex(v,defaultValue='#253D66'){return typeof v==='string'&&/^#[a-fA-F0-9]{6}$/.test(v)?v.toUpperCase():defaultValue}
function photo(v){return typeof v==='string'&&v.length<3e6&&/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(v)?v:''}
function normLayer(v){
 if(!v||!['text','rect','ellipse','image'].includes(v.type))throw Error('نوع العنصر غير مدعوم');
 return {id:clean(v.id,60)||uid(),name:clean(v.name,60)||'عنصر',type:v.type,text:clean(v.text,250),
 x:bounded(v.x,-9999,9999,120),y:bounded(v.y,-9999,9999,140),w:bounded(v.w,2,9999,400),h:bounded(v.h,2,9999,150),
 fill:hex(v.fill),fontSize:bounded(v.fontSize,10,350,70),fontFamily:FONTS.includes(v.fontFamily)?v.fontFamily:'Cairo',
 radius:bounded(v.radius,0,500,16),opacity:bounded(v.opacity,0,1,1),src:v.type==='image'?photo(v.src):'',
 locked:v.locked===true,visible:v.visible!==false};
}
function normPage(v){
 if(!v||!Array.isArray(v.layers)||v.layers.length>200)throw Error('عدد الطبقات غير صحيح');
 const layers=v.layers.map(normLayer);if(new Set(layers.map(x=>x.id)).size!==layers.length)throw Error('عنصر مكرر');
 return {id:clean(v.id,60)||uid(),name:clean(v.name,60)||'صفحة',width:Math.round(bounded(v.width,200,3000,1080)),height:Math.round(bounded(v.height,200,3000,1080)),background:hex(v.background,'#FBF8F2'),layers};
}
function normProject(v){
 if(!v||v.version!==1||!Array.isArray(v.pages)||v.pages.length<1||v.pages.length>20)throw Error('المشروع غير صالح');
 const pages=v.pages.map(normPage);
 if(new Set(pages.map(x=>x.id)).size!==pages.length)throw Error('صفحة مكررة');
 return {version:1,id:clean(v.id,60)||uid(),title:clean(v.title,80)||'مشروع الواسطي',pageIndex:Math.round(bounded(v.pageIndex,0,pages.length-1,0)),pages};
}
function newLayer(type,override={}){
 const defaults={text:{name:'نص عربي',text:'تفاصيل تصنع الفرق',x:95,y:190,w:860,h:150,fontSize:78,fill:'#253D66'},
 rect:{name:'مستطيل',x:130,y:270,w:500,h:300,fill:'#BE8C57'},
 ellipse:{name:'دائرة',x:240,y:330,w:300,h:300,fill:'#6A508F'},
 image:{name:'صورة',x:160,y:230,w:600,h:400}};
 if(!defaults[type])throw Error('نوع عنصر غير صالح');
 return normLayer({id:uid(),type,...defaults[type],...override});
}
function newPage(format='square'){
 const size=FORMATS[format]||FORMATS.square;
 return normPage({id:uid(),name:size.name,width:size.width,height:size.height,background:'#FBF8F2',layers:[
 newLayer('rect',{name:'شريط علوي',x:0,y:0,w:size.width,h:24,radius:0,fill:'#1B5663'}),
 newLayer('text',{name:'العنوان الرئيسي',text:'تصميم عربي يبدأ من الفكرة',x:Math.floor(size.width*.07),y:Math.floor(size.height*.17),w:Math.floor(size.width*.86),h:160,fontSize:Math.min(80,Math.floor(size.width*.075)),fill:'#1B5663'}),
 newLayer('text',{name:'وصف التصميم',text:'الواسطي — استوديو التصميم العربي',x:Math.floor(size.width*.08),y:Math.floor(size.height*.38),w:Math.floor(size.width*.84),h:90,fontSize:36,fill:'#655243'})
 ]});
}
function newProject(format='square'){return normProject({version:1,id:uid(),title:'مشروع جديد',pageIndex:0,pages:[newPage(format)]});}
function escapeXML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&apos;'}[c]))}
function serializeSVG(page){
 const p=normPage(page);
 const s=['<svg xmlns="http://www.w3.org/2000/svg" width="'+p.width+'" height="'+p.height+'" viewBox="0 0 '+p.width+' '+p.height+'" role="img">','<title>'+escapeXML(p.name)+'</title>','<rect width="'+p.width+'" height="'+p.height+'" fill="'+p.background+'"/>'];
 for(const l of p.layers){
  if(!l.visible)continue;
  const common=' opacity="'+l.opacity+'"';
  if(l.type==='rect')s.push('<rect x="'+l.x+'" y="'+l.y+'" width="'+l.w+'" height="'+l.h+'" rx="'+l.radius+'" fill="'+l.fill+'"'+common+'/>');
  if(l.type==='ellipse')s.push('<ellipse cx="'+(l.x+l.w/2)+'" cy="'+(l.y+l.h/2)+'" rx="'+(l.w/2)+'" ry="'+(l.h/2)+'" fill="'+l.fill+'"'+common+'/>');
  if(l.type==='text')s.push('<text x="'+(l.x+l.w)+'" y="'+(l.y+l.fontSize)+'" fill="'+l.fill+'" font-family="'+escapeXML(l.fontFamily)+'" font-size="'+l.fontSize+'" direction="rtl" unicode-bidi="plaintext" text-anchor="start"' +common+'>'+escapeXML(l.text)+'</text>');
  if(l.type==='image'&&l.src)s.push('<image x="'+l.x+'" y="'+l.y+'" width="'+l.w+'" height="'+l.h+'" href="'+escapeXML(l.src)+'" preserveAspectRatio="xMidYMid meet"'+common+'/>');
 }
 s.push('</svg>');return s.join('\n');
}
function importProject(raw){
 if(typeof raw!=='string'||raw.length>6e6)throw Error('الملف أكبر من الحد المسموح');
 return normProject(JSON.parse(raw));
}
const api={FORMATS,newProject,newLayer,newPage,normLayer,normPage,normProject,serializeSVG,importProject};
root.WasitiUnifiedModel=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
