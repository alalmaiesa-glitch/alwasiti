/* الواسطي الشامل: browser-only multi-page editor prototype. */
(function(){
'use strict';
const M=window.WasitiUnifiedModel;
if(!M)throw Error('Document model missing');
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const KEY='alwasiti-unified-lab-v1';
let doc,selected=null,undo=[],redo=[],drag=null;
try{const stored=localStorage.getItem(KEY);doc=stored?M.importProject(stored):M.newProject()}catch{doc=M.newProject()}
let toastTimer;
function toast(s){const x=$('toast');x.textContent=s;x.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>x.classList.remove('show'),3700)}
function page(){return doc.pages[doc.pageIndex]}
function layer(){return page().layers.find(x=>x.id===selected)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(doc));$('saveStatus').textContent='محفوظ محليًا'}catch{$('saveStatus').textContent='تعذر التخزين؛ صدّر JSON';toast('المشروع كبير على تخزين المتصفح؛ احفظه كملف JSON')}}
function capture(){undo.push(JSON.stringify(doc));if(undo.length>60)undo.shift();redo=[]}
function mutate(fn,refresh=true){capture();fn();save();if(refresh)render()}
function svgEl(tag,attrs){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,String(v));return n}
function draw(){
const p=page(),svg=$('artboard');svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+p.width+' '+p.height);svg.style.aspectRatio=p.width+' / '+p.height;
svg.append(svgEl('rect',{width:p.width,height:p.height,fill:p.background}));
for(const l of p.layers){
if(!l.visible)continue;
let node;
const common={opacity:l.opacity,'data-layer-id':l.id,style:'cursor:'+(l.locked?'not-allowed':'move')};
if(l.type==='text'){node=svgEl('text',Object.assign({x:l.x+l.w,y:l.y+l.fontSize,fill:l.fill,'font-size':l.fontSize,'font-family':l.fontFamily,direction:'rtl','unicode-bidi':'plaintext','text-anchor':'start'},common));node.textContent=l.text}
if(l.type==='rect')node=svgEl('rect',Object.assign({x:l.x,y:l.y,width:l.w,height:l.h,rx:l.radius,fill:l.fill},common));
if(l.type==='ellipse')node=svgEl('ellipse',Object.assign({cx:l.x+l.w/2,cy:l.y+l.h/2,rx:l.w/2,ry:l.h/2,fill:l.fill},common));
if(l.type==='image'){node=svgEl('image',Object.assign({x:l.x,y:l.y,width:l.w,height:l.h,href:l.src||'','preserveAspectRatio':'xMidYMid meet'},common));}
if(node)svg.append(node);
}
const current=layer();
if(current&&current.visible)svg.append(svgEl('rect',{x:current.x-7,y:current.y-7,width:current.w+14,height:current.h+14,fill:'none',stroke:'#9671bb','stroke-width':Math.max(3,p.width/370),'stroke-dasharray':'15 9','pointer-events':'none'}));
$('canvasTitle').textContent=p.name;$('canvasDimensions').textContent=p.width+' × '+p.height;
}
function makeButton(text,classes,cb){const b=document.createElement('button');b.type='button';b.className=classes||'';b.textContent=text;b.addEventListener('click',cb);return b}
function renderLists(){
const p=page(),pages=$('pages'),layers=$('layers');pages.replaceChildren();layers.replaceChildren();
doc.pages.forEach((v,i)=>{
 const b=makeButton((i+1)+' · '+v.name,'page-item'+(doc.pageIndex===i?' active':''),()=>{doc.pageIndex=i;selected=null;save();render()});
 b.dataset.pageIndex=i;b.setAttribute('aria-current',doc.pageIndex===i?'page': 'false');pages.append(b);
});
p.layers.slice().reverse().forEach(l=>{
const b=makeButton(l.name+(l.locked?' 🔒':''), 'layer-item'+(selected===l.id?' active':''),()=>{selected=l.id;render()});
b.dataset.layerId=l.id;b.setAttribute('aria-pressed',selected===l.id?'true':'false');layers.append(b);
});
}
function inspect(){
const p=page(),l=layer();
$('projectTitle').value=doc.title;
$('pageBackground').value=p.background;
$('inspectorEmpty').hidden=!!l;$('inspector').hidden=!l;
if(!l)return;
for(const el of document.querySelectorAll('[data-field]')){const k=el.dataset.field;el.value=l[k]===undefined?'':l[k]}
$('textField').hidden=l.type!=='text';$('fontSizeField').hidden=l.type!=='text';$('fontField').hidden=l.type!=='text';
$('layerFill').closest('.field').hidden=l.type==='image';
}
function render(){draw();renderLists();inspect()}
function addLayer(type){mutate(()=>{const l=M.newLayer(type);page().layers.push(l);selected=l.id});toast('أُضيف العنصر؛ اسحبه أو غيّر خصائصه')}
function saveBlob(data,name,type){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
function name(ext){return (doc.title||'alwasiti').replace(/[^a-zA-Z0-9\u0600-\u06ff_ -]/g,'').slice(0,50)||'alwasiti'} 
function svgText(){return M.serializeSVG(page())}
async function exportPNG(){
try{const p=page(),source=svgText(),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});
const canvas=document.createElement('canvas');canvas.width=p.width;canvas.height=p.height;
const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);URL.revokeObjectURL(url);
canvas.toBlob(blob=>{if(!blob){toast('تعذر إنشاء PNG');return;}saveBlob(blob,name()+'.png','image/png');},'image/png');}
catch(e){toast('فشل التصدير: '+String(e.message).slice(0,100))}
}
function starter(kind){
const p=page();const W=p.width,H=p.height;
const text=(content,x,y,w,h,fontSize,fill)=>M.newLayer('text',{name:content.slice(0,28),text:content,x,y,w,h,fontSize,fill});
const rect=(x,y,w,h,fill,radius=0)=>M.newLayer('rect',{name:'تكوين بصري',x,y,w,h,fill,radius});
const ellipse=(x,y,w,h,fill)=>M.newLayer('ellipse',{name:'عنصر دائري',x,y,w,h,fill});
let layers=[],background='#FBF8F2',title='تكوين أصلي';
if(kind==='poster'){background='#25263D';title='ملصق ثقافي';layers=[rect(65,70,W-130,12,'#E4AA69'),text('حروفٌ لها حضور',65,H*.2,W-130,160,88,'#F4EBD8'),rect(65,H*.52,W*.38,H*.25,'#B96B51',18),text('لقاءٌ مع المعنى',W*.44,H*.54,W*.49,100,49,'#F4EBD8')]}
if(kind==='invite'){background='#F7E8E6';title='بطاقة دعوة';layers=[ellipse(W*.11,H*.1,W*.78,H*.8,'#E8D1C6'),rect(W*.17,H*.19,W*.66,H*.62,'#FFF9F0',100),text('يسرّنا حضوركم',W*.23,H*.33,W*.54,150,72,'#7B4961'),text('أمسية استثنائية',W*.25,H*.55,W*.5,90,42,'#7B4961')]}
if(kind==='sale'){background='#FEECDA';title='إعلان تجاري';layers=[rect(0,0,W,H*.3,'#2D5A47'),text('عرض خاص',W*.13,H*.12,W*.74,120,105,'#FFFFFF'),ellipse(W*.16,H*.39,W*.68,H*.45,'#D6AA60'),text('خصم ٣٠٪',W*.22,H*.49,W*.56,160,100,'#273A31')]}
if(kind==='quote'){background='#E0EDF2';title='اقتباس عربي';layers=[rect(W*.09,H*.12,W*.08,H*.76,'#3D7791'),text('«الجمال في وضوح الفكرة»',W*.23,H*.31,W*.65,160,54,'#24465E'),text('الواسطي · من الحرف إلى التصميم',W*.2,H*.64,W*.6,100,34,'#456278')]}
if(!layers.length)return;
mutate(()=>{p.background=background;p.name=title;p.layers=layers;selected=null});toast('تكوين '+title+' جاهز للتعديل')}
function action(key){
const p=page(),l=layer();
switch(key){
case 'add-text':return addLayer('text');case 'add-rect':return addLayer('rect');case 'add-ellipse':return addLayer('ellipse');
case 'upload-photo':return $('photoFile').click();
case 'add-page':if(doc.pages.length>=20)return toast('الحد الأعلى 20 صفحة');mutate(()=>{doc.pages.push(M.newPage($('format').value));doc.pageIndex=doc.pages.length-1;selected=null});return;
case 'duplicate-page':if(doc.pages.length>=20)return toast('الحد الأعلى 20 صفحة');mutate(()=>{const clone=JSON.parse(JSON.stringify(p));clone.id='pg'+Date.now()+Math.random().toString(36).slice(2,6);clone.layers=clone.layers.map(x=>Object.assign(x,{id:'l'+Math.random().toString(36).slice(2,11)}));clone.name+=' — نسخة';doc.pages.splice(doc.pageIndex+1,0,clone);doc.pageIndex++;selected=null});return;
case 'delete-page':if(doc.pages.length===1)return toast('يجب الاحتفاظ بصفحة واحدة');if(!confirm('حذف هذه الصفحة؟'))return;mutate(()=>{doc.pages.splice(doc.pageIndex,1);doc.pageIndex=Math.max(0,Math.min(doc.pageIndex,doc.pages.length-1));selected=null});return;
case 'delete-layer':if(!l)return;mutate(()=>{p.layers=p.layers.filter(x=>x.id!==selected);selected=null});return;
case 'clone-layer':if(!l)return;mutate(()=>{const clone=JSON.parse(JSON.stringify(l));clone.id='l'+Math.random().toString(36).slice(2,11);clone.name+=' نسخة';clone.x+=22;clone.y+=22;p.layers.push(clone);selected=clone.id});return;
case 'layer-up':case 'layer-down':if(!l)return;{const index=p.layers.findIndex(x=>x.id===selected),next=index+(key==='layer-up'?1:-1);if(next<0||next>=p.layers.length)return;mutate(()=>{[p.layers[index],p.layers[next]]=[p.layers[next],p.layers[index]]});return;}
case 'undo':if(!undo.length)return;redo.push(JSON.stringify(doc));doc=M.importProject(undo.pop());selected=null;save();render();return;
case 'redo':if(!redo.length)return;undo.push(JSON.stringify(doc));doc=M.importProject(redo.pop());selected=null;save();render();return;
case 'new-project':if(!confirm('إنشاء مشروع جديد؟ احفظ نسخة JSON من مشروعك الحالي إن أردت الاحتفاظ به.'))return;mutate(()=>{doc=M.newProject($('format').value);selected=null});return;
case 'export-svg':saveBlob(svgText(),name()+'.svg','image/svg+xml');return;
case 'export-png':exportPNG();return;
case 'export-project':saveBlob(JSON.stringify(doc,null,2),name()+'.json','application/json');return;
case 'import-project':$('projectFile').click();return;
}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)action(b.dataset.action);const preset=e.target.closest('[data-preset]');if(preset)starter(preset.dataset.preset)});
$('projectTitle').addEventListener('change',e=>mutate(()=>{doc.title=String(e.target.value).slice(0,80)}));
$('pageBackground').addEventListener('change',e=>mutate(()=>{page().background=e.target.value}));
document.querySelectorAll('[data-field]').forEach(el=>{
el.addEventListener('change',()=>{
const l=layer();if(!l)return;const k=el.dataset.field;
mutate(()=>{let v=el.value;if(['x','y','w','h','fontSize','opacity'].includes(k))v=Number(v);l[k]=v;const clean=M.normLayer(l);Object.assign(l,clean)});
});
});
$('artboard').addEventListener('pointerdown',e=>{
const target=e.target.closest('[data-layer-id]');const l=target&&page().layers.find(x=>x.id===target.getAttribute('data-layer-id'));
if(!l)return;selected=l.id;render();if(l.locked)return;
capture();drag={id:l.id,clientX:e.clientX,clientY:e.clientY,x:l.x,y:l.y};
$('artboard').setPointerCapture(e.pointerId);
});
$('artboard').addEventListener('pointermove',e=>{
if(!drag)return;const l=page().layers.find(x=>x.id===drag.id);if(!l)return;
const p=page(),r=$('artboard').getBoundingClientRect();
l.x=Math.round(drag.x+(e.clientX-drag.clientX)*p.width/r.width);
l.y=Math.round(drag.y+(e.clientY-drag.clientY)*p.height/r.height);
draw();
});
$('artboard').addEventListener('pointerup',()=>{if(drag){drag=null;save();render()}});
$('artboard').addEventListener('pointercancel',()=>{if(drag){drag=null;save();render()}});
$('photoFile').addEventListener('change',async e=>{
const file=e.target.files[0];e.target.value='';if(!file)return;
if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2e6)return toast('الصورة يجب أن تكون PNG أو JPG أو WebP وأقل من 2 ميغابايت');
const reader=new FileReader();
reader.onload=()=>{const l=M.newLayer('image',{src:reader.result,name:file.name.slice(0,45)});if(!M.normLayer(l).src)return toast('صيغة الصورة غير مدعومة');mutate(()=>{page().layers.push(l);selected=l.id});toast('أضيفت الصورة محليًا')};
reader.readAsDataURL(file);
});
$('projectFile').addEventListener('change',e=>{
const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>6e6)return toast('ملف المشروع كبير');
const reader=new FileReader();reader.onload=()=>{try{const next=M.importProject(reader.result);mutate(()=>{doc=next;selected=null});toast('تم استيراد المشروع')}catch(err){toast('تعذّر الاستيراد: '+err.message)}};reader.readAsText(file);
});
document.addEventListener('keydown',e=>{
const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);if(editing)return;
if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();action('undo')}
if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();action('redo')}
if(e.key==='Delete'&&layer()){e.preventDefault();action('delete-layer')}
if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&layer()&&!layer().locked){
e.preventDefault();const n=e.shiftKey?10:1,k=e.key;mutate(()=>{const l=layer();if(k==='ArrowUp')l.y-=n;if(k==='ArrowDown')l.y+=n;if(k==='ArrowLeft')l.x-=n;if(k==='ArrowRight')l.x+=n});
}
});
window.WasitiUnifiedLab={getProject:()=>JSON.parse(JSON.stringify(doc)),getSVG:svgText,setProject:v=>{doc=M.normProject(v);selected=null;render()},getSelected:()=>selected};
render();
})();