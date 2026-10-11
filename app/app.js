
'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const STORAGE_KEY = 'alwasiti-design-studio-v1';
  const PROJECTS_KEY = 'alwasiti-projects-v1';
  const DRAFT_KEY = 'alwasiti-recovery-draft-v1';
  let draftTimer = null;
  let draftStorageWarningShown = false;
  const ALLOWED_FONTS = ['Alexandria','Cairo','Tajawal','IBM Plex Sans Arabic','Noto Kufi Arabic','Amiri'];
  const fontCatalog = [
    {name:"Alexandria",category:"عصري ومرن",license:'OFL-1.1',source:"https://github.com/google/fonts/blob/main/ofl/alexandria/OFL.txt"},
    {name:"Cairo",category:"واضح في الواجهات",license:'OFL-1.1',source:"https://github.com/google/fonts/blob/main/ofl/cairo/OFL.txt"},
    {name:"Tajawal",category:"هادئ للنصوص",license:'OFL-1.1',source:"https://github.com/google/fonts/blob/main/ofl/tajawal/OFL.txt"},
    {name:"IBM Plex Sans Arabic",category:"احترافي للمحتوى",license:'OFL-1.1',source:"https://github.com/google/fonts/blob/main/ofl/ibmplexsansarabic/OFL.txt"},
    {name:"Noto Kufi Arabic",category:"كوفي للعناوين",license:'OFL-1.1',source:"https://github.com/google/fonts/blob/main/ofl/notokufiarabic/OFL.txt"},
    {name:"Amiri",category:"كلاسيكي للتحرير",license:'OFL-1.1',source:"https://github.com/google/fonts/blob/main/ofl/amiri/OFL.txt"}
  ];
  const palettes = [
    {name:'بنفسجي مشرق', primary:'#5947D9', secondary:'#F49C6B', accent:'#F3D998', ink:'#282842'},
    {name:'أزرق متجدد', primary:'#295BCF', secondary:'#FF925E', accent:'#F8D67E', ink:'#202C4C'},
    {name:'مرجاني', primary:'#D85861', secondary:'#F4A06C', accent:'#F7D9BA', ink:'#44313D'},
    {name:'أخضر طبيعي', primary:'#246D55', secondary:'#F3A451', accent:'#DBD9A6', ink:'#243D39'}
  ];
  const initialState = {
    projectName:'هوية مشروع جديد', brandName:'مدار', tagline:'مساحة لأفكار أكثر وضوحًا', cta:'ابدأ الآن',
    primary:'#5947D9', secondary:'#F49C6B', accent:'#F3D998', ink:'#282842',
    headingFont:'Alexandria', bodyFont:'IBM Plex Sans Arabic', headingWeight:700,
    logoType:'symbol', symbolLetter:'م', markShape:'rounded',markSize:108,wordSize:61,markX:590,markY:185,wordX:286,wordY:205,markRotation:0,wordRotation:0,radius:16, buttonStyle:'filled', shadow:true,
    vectorFont:'noto',theme:'light', device:'desktop',fontPreviewText:'جمال الحرف العربي يبدأ من هنا'
  };
  const state = {...initialState};
  let toastTimeout;
  let activeProjectId = null;
  let dirty = false;
  const id = (name) => document.getElementById(name);
  const textValue = (v) => String(v || '').trim();

  function toast(message) {
    const el = id('toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('visible'), 3100);
  }
  function validHex(value, fallback) { return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback; }
  function htmlSafe(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function svgSafe(value) { return htmlSafe(value); }
  function setDirty() {
    dirty=true;
    id('saveStatus').textContent = 'تعديلات غير محفوظة — تُنسخ احتياطيًا على الجهاز';
    clearTimeout(draftTimer);
    draftTimer=setTimeout(persistDraft,650);
  }
  function persistDraft(){
    if(!dirty)return;
    try{
      const data=normalizeProjectData(state);
      localStorage.setItem(DRAFT_KEY,JSON.stringify({projectId:activeProjectId,savedAt:Date.now(),data}));
    }catch(_){
      if(!draftStorageWarningShown){toast('تعذر نسخ المسودة احتياطيًا. صدّر مشروعك بصيغة JSON.');draftStorageWarningShown=true;}
    }
  }
  function clearDraft(){clearTimeout(draftTimer);try{localStorage.removeItem(DRAFT_KEY);}catch(_){} }
  window.addEventListener('beforeunload',event=>{
    if(!dirty)return;
    persistDraft();
    event.preventDefault();event.returnValue='';
  });
  window.addEventListener('pagehide',persistDraft);
  function openStudio() {
    id('landing').classList.remove('active'); id('studio').classList.add('active');
    document.body.style.overflow = 'hidden';
    window.scrollTo(0,0);
  }
  function closeStudio() {
    id('studio').classList.remove('active'); id('landing').classList.add('active');
    document.body.style.overflow = '';
  }
  $$('[data-open-studio]').forEach(b => b.addEventListener('click',openStudio));
  id('backHome').addEventListener('click',closeStudio);
  function renderPalettes() {
    ['paletteChoices','paletteChoicesAlt'].forEach(containerId => {
      const root = id(containerId);
      root.replaceChildren();
      palettes.forEach((p) => {
        const button = document.createElement('button');
        button.className = 'palette-pick'+(p.primary.toUpperCase() === state.primary.toUpperCase() ? ' active' : '');
        button.innerHTML = `<b>${htmlSafe(p.name)}</b><span class="palette-dots"><i style="background:${p.primary}"></i><i style="background:${p.secondary}"></i><i style="background:${p.accent}"></i><i style="background:${p.ink}"></i></span>`;
        button.addEventListener('click',() => {['primary','secondary','accent','ink'].forEach(key=>state[key]=p[key]);render();setDirty();});
        root.appendChild(button);
      });
    });
  }
  function logoHTML() {
    const text = htmlSafe(state.brandName || 'علامتك');
    const letter = htmlSafe(state.symbolLetter || 'م');
    if (state.logoType === 'wordmark') return `<span>${text}</span>`;
    return `<span class="pv-logo-icon${state.logoType==='monogram'?' monogram':''}">${letter}</span>${state.logoType==='symbol'?`<span>${text}</span>`:''}`;
  }
  function render() {
    id('projectName').value = state.projectName;
    id('brandName').value = state.brandName;
    id('brandTagline').value = state.tagline;
    id('ctaLabel').value = state.cta;
    [['primary','primaryColor','primaryHex'],['secondary','secondaryColor','secondaryHex'],['accent','accentColor','accentHex'],['ink','inkColor','inkHex']].forEach(([key,field,hex]) => {id(field).value=state[key];id(hex).textContent=state[key];});
    id('fontPreviewText').value=state.fontPreviewText;
    id('headingFont').value=state.headingFont;
    id('bodyFont').value=state.bodyFont;
    id('headingWeight').value=state.headingWeight;
    id('fontWeightLabel').textContent=state.headingWeight;
    id('symbolLetter').value=state.symbolLetter;id('vectorFont').value=state.vectorFont;
    id('markShape').value=state.markShape; id('markSize').value=state.markSize; id('markSizeLabel').textContent=state.markSize; id('wordSize').value=state.wordSize; id('wordSizeLabel').textContent=state.wordSize;
    id('markRotation').value=state.markRotation;id('markRotationLabel').textContent=state.markRotation+'°';
    id('wordRotation').value=state.wordRotation;id('wordRotationLabel').textContent=state.wordRotation+'°';
    id('cornerRadius').value=state.radius;
    id('radiusLabel').textContent=state.radius+'px';
    id('buttonStyle').value=state.buttonStyle;
    id('shadowToggle').checked=state.shadow;
    $$('.style-pick').forEach(button=>button.classList.toggle('active',button.dataset.logo===state.logoType));
    $$('[data-device]').forEach(button=>button.classList.toggle('active',button.dataset.device===state.device));
    $$('[data-theme]').forEach(button=>button.classList.toggle('active',button.dataset.theme===state.theme));
    const preview=id('preview');
    preview.style.setProperty('--pv-primary', state.primary);
    preview.style.setProperty('--pv-secondary', state.secondary);
    preview.style.setProperty('--pv-accent', state.accent);
    preview.style.setProperty('--pv-ink', state.ink);
    preview.style.setProperty('--pv-heading',`'${state.headingFont}'`);
    preview.style.setProperty('--pv-body',`'${state.bodyFont}'`);
    preview.style.setProperty('--pv-radius',state.radius+'px');
    preview.style.setProperty('--pv-shadow', state.shadow ? '0 8px 25px #2422390e' : 'none');
    preview.classList.toggle('dark',state.theme==='dark');
    preview.classList.toggle('mobile',state.device==='mobile');
    id('previewLogo').innerHTML=logoHTML();
    id('previewFooterBrand').textContent=state.brandName || 'علامتك';
    id('previewTagline').textContent=state.tagline || 'عبارتك التعريفية هنا';
    id('previewCta').innerHTML=htmlSafe(state.cta || 'ابدأ الآن')+' <span>←</span>';
    id('previewCta').className='preview-cta'+(state.buttonStyle==='filled'?'':` ${state.buttonStyle}`);
    id('graphicLetter').textContent=state.symbolLetter||'م';
    $$('.preview-hero h1,.preview-card h3,.preview-logo,.preview-bottom strong').forEach(el=>el.style.fontWeight=state.headingWeight);
    id('typeSample').style.fontFamily=`'${state.bodyFont}',sans-serif`;
    $('#typeSample h3').style.fontFamily=`'${state.headingFont}',sans-serif`;
    $('#typeSample h3').style.fontWeight=state.headingWeight;
    renderPalettes();
    renderFontCatalog();
    renderLogoCanvas();
  }
  function renderFontCatalog(){
    const root=id('fontCatalog');root.replaceChildren();
    for(const font of fontCatalog){
      const card=document.createElement('article');card.className='font-card';
      const sample=document.createElement('div');sample.className='font-sample';sample.dir='rtl';sample.lang='ar';
      sample.style.fontFamily='"'+font.name+'",sans-serif';
      sample.textContent=state.fontPreviewText||'جمال الحرف العربي يبدأ من هنا';
      const title=document.createElement('div');title.className='font-card-title';
      const bold=document.createElement('b');bold.textContent=font.name;
      const small=document.createElement('small');small.textContent=font.category;
      title.append(bold,small);
      const controls=document.createElement('div');controls.className='font-card-actions';
      for(const [role,label] of [['headingFont','للعناوين'],['bodyFont','للنصوص']]){
        const button=document.createElement('button');button.type='button';
        button.className='font-use'+(state[role]===font.name?' selected':'');button.textContent=label;
        button.setAttribute('aria-label','استخدم '+font.name+' '+label);
        button.addEventListener('click',()=>{state[role]=font.name;render();setDirty();});
        controls.appendChild(button);
      }
      const license=document.createElement('a');license.href=font.source;license.target='_blank';license.rel='noopener noreferrer';license.textContent='الترخيص OFL ↗';license.className='font-license';
      card.append(title,sample,controls,license);root.appendChild(card);
    }
  }
  const LOGO_KEYS=['logoType','brandName','symbolLetter','markShape','markSize','wordSize','markX','markY','wordX','wordY','markRotation','wordRotation','headingFont','headingWeight'];
  const undoStack=[],redoStack=[];
  let selectedPart=null,gridVisible=false,snapEnabled=false;
  function snapshotLogo(){return Object.fromEntries(LOGO_KEYS.map(k=>[k,state[k]]));}
  function sameSnapshot(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function captureLogo(){const current=snapshotLogo();if(!sameSnapshot(undoStack.at(-1),current)){undoStack.push(current);if(undoStack.length>60)undoStack.shift();}redoStack.length=0;syncUndoButtons();}
  function syncUndoButtons(){id('undoLogo').disabled=!undoStack.length;id('redoLogo').disabled=!redoStack.length;}
  function restoreLogo(snapshot){for(const k of LOGO_KEYS)state[k]=snapshot[k];selectedPart=null;render();setDirty();syncUndoButtons();}
  function undoLogo(){if(!undoStack.length)return;redoStack.push(snapshotLogo());restoreLogo(undoStack.pop());}
  function redoLogo(){if(!redoStack.length)return;undoStack.push(snapshotLogo());restoreLogo(redoStack.pop());}
  id('undoLogo').addEventListener('click',undoLogo);id('redoLogo').addEventListener('click',redoLogo);
  const EDITABLE_LOGO_KEYS=new Set(['logoType','brandName','symbolLetter','markShape','markSize','wordSize','markRotation','wordRotation','headingFont','headingWeight']);
  function setValueFrom(idName, key, parser) {
    id(idName).addEventListener('input', event => {
      if(EDITABLE_LOGO_KEYS.has(key))captureLogo();
      state[key] = parser ? parser(event.target.value) : event.target.value;
      // All exportable values use the same validation path as imported projects.
      Object.assign(state,normalizeProjectData(state));
      render(); setDirty();
    });
  }
  [['fontPreviewText','fontPreviewText'],['projectName','projectName'],['brandName','brandName'],['brandTagline','tagline'],['ctaLabel','cta'],['symbolLetter','symbolLetter'],['headingFont','headingFont'],['bodyFont','bodyFont'],['buttonStyle','buttonStyle'],['markShape','markShape']].forEach(([field,key])=>setValueFrom(field,key));
  [['primaryColor','primary'],['secondaryColor','secondary'],['accentColor','accent'],['inkColor','ink']].forEach(([field,key])=>setValueFrom(field,key));
  setValueFrom('headingWeight','headingWeight',Number);
  setValueFrom('cornerRadius','radius',Number);
  setValueFrom('markSize','markSize',Number);
  setValueFrom('wordSize','wordSize',Number);
  setValueFrom('markRotation','markRotation',Number);
  setValueFrom('wordRotation','wordRotation',Number);
  id('shadowToggle').addEventListener('change',e=>{state.shadow=e.target.checked;render();setDirty();});
  $$('.style-pick').forEach(button=>button.addEventListener('click',()=>{captureLogo();state.logoType=button.dataset.logo;render();setDirty();}));
  $$('[data-device]').forEach(button=>button.addEventListener('click',()=>{state.device=button.dataset.device;render();}));
  $$('[data-theme]').forEach(button=>button.addEventListener('click',()=>{state.theme=button.dataset.theme;render();}));
  $$('.side-nav').forEach(button=>button.addEventListener('click',()=>{
    const panel=button.dataset.panel;
    $$('.side-nav').forEach(b=>b.classList.toggle('active',b===button));
    $$('.inspector-panel').forEach(p=>p.classList.toggle('active',p.dataset.inspector===panel));
  }));
  // Browser-only project portfolio. Never interprets imported JSON as HTML or code.
  function normalizeProjectData(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('ملف مشروع غير صالح');
    const data={...initialState};
    for(const [key,defaultValue] of Object.entries(initialState)){
      if(typeof raw[key]===typeof defaultValue)data[key]=raw[key];
    }
    for(const key of ['primary','secondary','accent','ink'])data[key]=validHex(data[key],initialState[key]);
    for(const key of ['headingFont','bodyFont'])if(!ALLOWED_FONTS.includes(data[key]))data[key]=initialState[key];
    for(const key of ['projectName','brandName','tagline','cta','symbolLetter','fontPreviewText']){
      const limits={projectName:56,brandName:30,tagline:100,cta:28,symbolLetter:2,fontPreviewText:90};
      data[key]=data[key].normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e]/g,'').slice(0,limits[key]);
    }
    const clamp=(v,min,max,defaultValue)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):defaultValue;
    for(const [key,min,max] of [['markSize',50,170],['wordSize',24,94],['markRotation',-180,180],['wordRotation',-45,45],['markX',0,760],['wordX',0,760],['markY',0,360],['wordY',0,360],['radius',0,32],['headingWeight',400,800]]){
      data[key]=clamp(data[key],min,max,initialState[key]);
    }
    for(const [key,allowed] of [['logoType',['symbol','wordmark','monogram']],['markShape',['rounded','circle','diamond','outline','hexagon','star']],['buttonStyle',['filled','soft','outlined']],['theme',['light','dark']],['device',['desktop','mobile']],['vectorFont',['noto','amiri']]]){
      if(!allowed.includes(data[key]))data[key]=initialState[key];
    }
    return data;
  }
  function loadPortfolio(){
    try{
      const data=JSON.parse(localStorage.getItem(PROJECTS_KEY)||'null');
      if(!data||typeof data!=='object'||!Array.isArray(data.projects))return {activeId:null,projects:[]};
      const projects=data.projects.slice(0,30).filter(p=>p&&typeof p.id==='string'&&p.id.length<=90&&typeof p.data==='object').map(p=>({id:p.id,name:String(p.name||'مشروع بدون اسم').slice(0,56),updatedAt:String(p.updatedAt||''),data:normalizeProjectData(p.data)}));
      return {activeId:typeof data.activeId==='string'?data.activeId:null,projects};
    }catch(_){return {activeId:null,projects:[]};}
  }
  function persistPortfolio(portfolio){localStorage.setItem(PROJECTS_KEY,JSON.stringify(portfolio));}
  function newIdentifier(){return 'p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);}
  function saveCurrent(asCopy=false){
    try{
      const portfolio=loadPortfolio();
      const entryId=asCopy||!activeProjectId?newIdentifier():activeProjectId;
      const copy=normalizeProjectData(state);
      if(asCopy)copy.projectName=(copy.projectName||'مشروع')+' — نسخة';
      const entry={id:entryId,name:copy.projectName||'مشروع بدون اسم',updatedAt:new Date().toISOString(),data:copy};
      const position=portfolio.projects.findIndex(p=>p.id===entryId);
      if(position>=0)portfolio.projects.splice(position,1);
      portfolio.projects.unshift(entry);
      if(portfolio.projects.length>30)portfolio.projects.length=30;
      portfolio.activeId=entryId;
      persistPortfolio(portfolio);
      activeProjectId=entryId;
      if(asCopy)Object.assign(state,copy);
      // Old-version compatibility is best-effort and must not undo a successful save.
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}
      dirty=false;clearDraft();render();id('saveStatus').textContent='محفوظ محليًا';renderSavedProjects();
      toast(asCopy?'تم إنشاء نسخة مستقلة من المشروع.':'حُفظ المشروع محليًا على هذا الجهاز.');
    }catch(_){toast('تعذر الحفظ. صدّر المشروع كملف JSON للاحتفاظ به.');}
  }
  id('saveProject').addEventListener('click',()=>saveCurrent());
  let dialogOrigin=null;
  function openDialog(el){
    dialogOrigin=document.activeElement;
    el.hidden=false;
    (el.querySelector('button:not([disabled])')||el).focus();
  }
  function closeDialog(el){
    if(el.hidden)return;
    el.hidden=true;
    if(dialogOrigin?.isConnected)dialogOrigin.focus();
    dialogOrigin=null;
  }
  function showProjects(){renderSavedProjects();openDialog(id('projectsModal'));}
  function closeProjects(){closeDialog(id('projectsModal'));}
  id('showProjects').addEventListener('click',showProjects);
  id('closeProjects').addEventListener('click',closeProjects);
  id('projectsModal').addEventListener('click',e=>{if(e.target===id('projectsModal'))closeProjects();});
  function confirmDiscard(){return !dirty||window.confirm('لديك تعديلات غير محفوظة. هل تريد المتابعة دون حفظها؟');}
  function switchProject(entry){
    if(!confirmDiscard())return;
    Object.assign(state,normalizeProjectData(entry.data));activeProjectId=entry.id;
    undoStack.length=0;redoStack.length=0;selectedPart=null;syncUndoButtons();dirty=false;clearDraft();render();id('saveStatus').textContent='تم تحميل المشروع';closeProjects();toast('تم فتح '+entry.name);
  }
  function renderSavedProjects(){
    const root=id('savedProjects');root.replaceChildren();
    const projects=loadPortfolio().projects;
    if(!projects.length){const empty=document.createElement('p');empty.className='empty-projects';empty.textContent='لا توجد مشاريع محفوظة بعد. اختر «حفظ محلي» لإنشاء أول مشروع.';root.append(empty);return;}
    for(const entry of projects){
      const card=document.createElement('article');card.className='saved-project'+(entry.id===activeProjectId?' is-current':'');
      const details=document.createElement('div');details.className='saved-project-meta';
      const name=document.createElement('strong');name.textContent=entry.name;
      const subtitle=document.createElement('small');const date=new Date(entry.updatedAt);
      subtitle.textContent=(entry.id===activeProjectId?'المشروع الحالي · ':'')+(Number.isNaN(date.getTime())?'محفوظ محليًا':date.toLocaleDateString('ar-SA'));
      details.append(name,subtitle);
      const controls=document.createElement('div');controls.className='saved-project-controls';
      const open=document.createElement('button');open.type='button';open.textContent='فتح';open.addEventListener('click',()=>switchProject(entry));
      const remove=document.createElement('button');remove.type='button';remove.textContent='حذف';remove.className='danger';remove.addEventListener('click',()=>{
        if(!window.confirm('هل تريد حذف المشروع المحفوظ «'+entry.name+'» نهائيًا من هذا المتصفح؟'))return;
        try{const portfolio=loadPortfolio();portfolio.projects=portfolio.projects.filter(p=>p.id!==entry.id);if(portfolio.activeId===entry.id)portfolio.activeId=null;persistPortfolio(portfolio);if(activeProjectId===entry.id)activeProjectId=null;renderSavedProjects();toast('حُذف المشروع المحفوظ.');}
        catch(_){toast('تعذر حذف المشروع.');}
      });
      controls.append(open,remove);card.append(details,controls);root.append(card);
    }
  }
  id('newProject').addEventListener('click',()=>{
    if(!confirmDiscard())return;
    clearDraft();Object.assign(state,initialState,{projectName:'مشروع جديد',brandName:'علامتي'});
    undoStack.length=0;redoStack.length=0;selectedPart=null;syncUndoButtons();activeProjectId=null;dirty=true;render();setDirty();closeProjects();toast('مشروع جديد — اختر حفظ محلي عند الانتهاء.');
  });
  id('duplicateProject').addEventListener('click',()=>{saveCurrent(true);closeProjects();});
  id('exportProjectJson').addEventListener('click',()=>{
    const envelope={format:'alwasiti.project',version:1,exportedAt:new Date().toISOString(),data:normalizeProjectData(state)};
    download(JSON.stringify(envelope,null,2),logoFilename()+'.alwasiti.json','application/json;charset=utf-8');
    toast('تم تصدير نسخة مشروع قابلة للاستيراد.');
  });
  id('importProjectJson').addEventListener('click',()=>id('projectFileInput').click());
  id('projectFileInput').addEventListener('change',async(e)=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>1000000){toast('حجم ملف المشروع أكبر من 1 ميغابايت.');return;}
    try{
      const content=JSON.parse(await file.text());
      if(!content||typeof content!=='object'||Array.isArray(content)||content.format!=='alwasiti.project'||content.version!==1)throw Error('صيغة غير مدعومة');
      const imported=normalizeProjectData(content.data);
      if(!confirmDiscard())return;
      clearDraft();Object.assign(state,imported);undoStack.length=0;redoStack.length=0;selectedPart=null;syncUndoButtons();activeProjectId=null;dirty=true;render();setDirty();closeProjects();toast('تم استيراد المشروع. اختر حفظ محلي للاحتفاظ به.');
    }catch(_){toast('تعذر الاستيراد: يجب اختيار ملف مشروع الواسطي JSON صالح.');}
  });
  id('showExport').addEventListener('click',()=>openDialog(id('exportModal')));
  id('closeExport').addEventListener('click',()=>closeDialog(id('exportModal')));
  id('exportModal').addEventListener('click',e=>{if(e.target===id('exportModal'))closeDialog(id('exportModal'));});
  document.addEventListener('keydown',e=>{
    const dialog=[id('exportModal'),id('projectsModal')].find(el=>!el.hidden);
    if(e.key==='Escape'&&dialog){e.preventDefault();closeDialog(dialog);return;}
    if(e.key!=='Tab'||!dialog)return;
    const focusables=Array.from(dialog.querySelectorAll('button:not([disabled]),input:not([disabled]):not([hidden]),a[href]'))
      .filter(el=>el.getClientRects().length);
    if(!focusables.length)return;
    const first=focusables[0],last=focusables.at(-1);
    if(e.shiftKey && (document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey && (document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}
  });
  function designTokens() {
    return {
      $schema:'https://design-tokens.github.io/community-group/format/',
      metadata:{generator:'alWasiti V1.4',projectName:state.projectName,brandName:state.brandName,disclaimer:'Prototype output. Verify accessibility and fonts before production.'},
      color:{brand:{$type:'color',primary:{$value:state.primary},secondary:{$value:state.secondary},accent:{$value:state.accent}},text:{$type:'color',primary:{$value:state.ink}}},
      typography:{fontFamily:{$type:'fontFamily',heading:{$value:state.headingFont},body:{$value:state.bodyFont}},fontWeight:{$type:'fontWeight',heading:{$value:state.headingWeight}}},
      radius:{component:{$type:'dimension',$value:state.radius+'px'}},
      logo:{type:state.logoType,letter:state.symbolLetter},
      buttons:{style:state.buttonStyle},card:{shadow:state.shadow}
    };
  }
  function cssVariables() {
    return `/* Generated by alWasiti V1.4 */\n/* Load or self-host correctly licensed font files separately. */\n:root {\n  --brand-primary: ${state.primary};\n  --brand-secondary: ${state.secondary};\n  --brand-accent: ${state.accent};\n  --text-primary: ${state.ink};\n  --font-heading: "${state.headingFont}", sans-serif;\n  --font-body: "${state.bodyFont}", sans-serif;\n  --heading-weight: ${state.headingWeight};\n  --component-radius: ${state.radius}px;\n  --card-shadow: ${state.shadow?'0 8px 25px rgba(36, 34, 57, 0.08)':'none'};\n}\n`;
  }
  // V1.1 vector logo workbench. Coordinates live in a stable 760 x 360 artboard.
  function logoGeometry(logo=state) {
    const s=logo.markSize;
    const radius=logo.markShape==='circle' ? s/2 : Math.min(24,s*.22);
    if(logo.markShape==='diamond')return `<rect x="${-s/2}" y="${-s/2}" width="${s}" height="${s}" rx="${Math.round(s*.12)}" transform="rotate(45)" fill="${logo.primary}"/>`;
    if(logo.markShape==='hexagon'){const r=s*.55;return `<polygon points="${Array.from({length:6},(_,i)=>{const a=(Math.PI/3*i)-Math.PI/2;return (Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2)}).join(' ')}" fill="${logo.primary}"/>`;}
    if(logo.markShape==='star'){const points=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?s*.27:s*.54;return (Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2)}).join(' ');return `<polygon points="${points}" fill="${logo.primary}"/>`;}
    if(logo.markShape==='outline')return `<rect x="${-s/2}" y="${-s/2}" width="${s}" height="${s}" rx="${radius}" fill="none" stroke="${logo.primary}" stroke-width="8"/>`;
    return `<rect x="${-s/2}" y="${-s/2}" width="${s}" height="${s}" rx="${radius}" fill="${logo.primary}"/>`;
  }
  function svgLogo(interactive=false) {
    const brand=svgSafe(textValue(state.brandName)||'علامتك');
    const letter=svgSafe(textValue(state.symbolLetter)||'م');
    const font=svgSafe(state.headingFont);
    const s=state.markSize;
    const color=state.markShape==='outline' ? state.primary : '#FFFFFF';
    const symbol=state.logoType!=='wordmark' ? `<g class="logo-move" data-part="mark" ${interactive?'role="button" tabindex="0" aria-label="اسحب الرمز أو استخدم الأسهم"':''} transform="translate(${state.markX} ${state.markY}) rotate(${state.markRotation})">${logoGeometry()}<text x="0" y="${Math.round(s*.20)}" fill="${color}" text-anchor="middle" direction="rtl" font-family="${font}, sans-serif" font-size="${Math.round(s*.59)}" font-weight="700">${letter}</text></g>` : '';
    const word=state.logoType!=='monogram' ? `<g class="logo-move" data-part="word" ${interactive?'role="button" tabindex="0" aria-label="اسحب اسم العلامة أو استخدم الأسهم"':''} transform="translate(${state.wordX} ${state.wordY}) rotate(${state.wordRotation})"><text x="0" y="0" direction="rtl" unicode-bidi="plaintext" text-anchor="middle" fill="${state.ink}" font-family="${font}, sans-serif" font-size="${state.wordSize}" font-weight="${state.headingWeight}">${brand}</text></g>` : '';
    return expandedViewBox(`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="360" viewBox="0 0 760 360" role="img" aria-label="${brand}" ${interactive?'id="editableLogoSvg"':''}><title>${brand}</title>${symbol}${word}</svg>`);
  }
  // V1.4: vector export uses Fontkit OpenType layout (Arabic GSUB/GPOS), not SVG <text>.
  // OFL fonts are self-hosted for same-origin vector exports. See LICENSES/.
  const vectorFontSources={
    noto:{name:'Noto Kufi Arabic',url:'./fonts/NotoKufiArabic-wght.ttf'},
    amiri:{name:'Amiri',url:'./fonts/Amiri-Regular.ttf'}
  };
  const vectorFontCache=new Map();
  let vectorPreviewEnabled=false, vectorPreviewCounter=0;
  function statusVector(message,kind='') { const el=id('vectorStatus');el.textContent=message;el.dataset.status=kind; }
  async function getVectorFont(key){
    const src=vectorFontSources[key];
    if(!src)throw Error('الخط المتجهي غير معتمد');
    if(typeof window.fontkit?.create!=='function')throw Error('محرك الخطوط غير متاح، أعد تحميل الصفحة');
    if(!vectorFontCache.has(key)){
      statusVector('جارٍ تحميل '+src.name+' من مكتبة الواسطي المرخصة…','loading');
      const promise=(async()=>{
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),12000);
        let res;
        try{res=await fetch(src.url,{mode:'same-origin',cache:'force-cache',signal:controller.signal});}
        finally{clearTimeout(timeout);}
        if(!res.ok)throw Error('تعذر تحميل الخط: '+res.status);
        const buf=await res.arrayBuffer();
        if(buf.byteLength<10000 || buf.byteLength>8000000)throw Error('حجم ملف الخط غير متوقع');
        const font=window.fontkit.create(new Uint8Array(buf));
        if(!font?.layout||!font?.unitsPerEm)throw Error('الخط غير مدعوم');
        return font;
      })().catch(err=>{vectorFontCache.delete(key);throw err;});
      vectorFontCache.set(key,promise);
    }
    const font=await vectorFontCache.get(key);
    statusVector('جاهز: '+src.name+' — استخراج المسارات فعليًا من الخط المفتوح.','ok');
    return font;
  }
  function glyphPaths(value,font,size,color){
    if(!value||![...value].some(c=>Boolean(c.trim())))throw Error('اكتب نص الشعار أولًا');
    if([...value].length>40)throw Error('النص طويل جدًا للتحويل المتجهي');
    // Warn rather than replacing unsupported characters with .notdef boxes.
    for(const char of value){
      if(char.trim() && !font.hasGlyphForCodePoint(char.codePointAt(0)))throw Error('الخط المتجهي لا يدعم الرمز «'+char+'». جرّب خطًا آخر أو نصًا عربيًا.');
    }
    const shaped=font.layout(value);
    if(!shaped.glyphs.length||shaped.glyphs.some(g=>g.id===0))throw Error('تعذر تشكيل بعض حروف الشعار');
    const scale=size/font.unitsPerEm;
    const width=shaped.positions.reduce((sum,p)=>sum+p.xAdvance,0)*scale;
    if(!Number.isFinite(width)||width>2000)throw Error('أبعاد النص غير مدعومة');
    let cursor=0;
    const elements=[];
    for(let i=0;i<shaped.glyphs.length;i++){
      const glyph=shaped.glyphs[i],pos=shaped.positions[i];
      const path=glyph.path.toSVG();
      // Spaces have advance width but intentionally no outline. Reject only
      // unexpected invisible glyphs that would conceal real letters.
      const isSpace=Array.isArray(glyph.codePoints)&&glyph.codePoints.length>0&&glyph.codePoints.every(cp=>/\s/u.test(String.fromCodePoint(cp)));
      if(!path && pos.xAdvance && !isSpace)throw Error('لا توجد حدود متجهية لأحد الحروف');
      if(path){
        const tx=(cursor+pos.xOffset).toFixed(3),ty=(pos.yOffset||0).toFixed(3);
        elements.push(`<path transform="translate(${tx} ${ty})" d="${path}"/>`);
      }
      cursor+=pos.xAdvance;
    }
    // Glyph outline origin is on the baseline; invert font Y axis once.
    return `<g fill="${color}" transform="translate(${(-width/2).toFixed(3)} 0) scale(${scale.toFixed(7)} ${(-scale).toFixed(7)})">${elements.join('')}</g>`;
  }
  function expandedViewBox(svgMarkup){
    // Expands, but never crops, the canonical 760x360 canvas. getBBox accounts for
    // transformed descendants, and does not require installed fonts for outlined text.
    const mount=document.createElement('div');
    mount.style.cssText='position:absolute;left:-10000px;top:0;width:760px;height:360px;visibility:hidden;pointer-events:none';
    mount.innerHTML=svgMarkup;
    document.body.appendChild(mount);
    try{
      const svg=mount.querySelector('svg');
      const box=svg.getBBox();
      if(![box.x,box.y,box.width,box.height].every(Number.isFinite))throw Error('حدود الرسم غير صالحة');
      const pad=16;
      const x=Math.floor(Math.min(0,box.x-pad));
      const y=Math.floor(Math.min(0,box.y-pad));
      const right=Math.ceil(Math.max(760,box.x+box.width+pad));
      const bottom=Math.ceil(Math.max(360,box.y+box.height+pad));
      const viewBox=`${x} ${y} ${right-x} ${bottom-y}`;
      return svgMarkup.replace('viewBox="0 0 760 360"',`viewBox="${viewBox}"`);
    } finally{mount.remove();}
  }
  async function outlinedLogoSvg(interactive=false){
    const logo=normalizeProjectData(state);
    const font=await getVectorFont(logo.vectorFont);
    const rawBrand=textValue(logo.brandName), rawLetter=textValue(logo.symbolLetter);
    if(logo.logoType!=='monogram'&&!rawBrand)throw Error('اكتب اسم العلامة قبل تصدير الشعار');
    if(logo.logoType!=='wordmark'&&!rawLetter)throw Error('اكتب الحرف الرمزي قبل تصدير الشعار');
    const brand=svgSafe(rawBrand||'شعار');
    const s=logo.markSize;
    // Exclude unused parts from shaping, so an irrelevant unsupported character
    // cannot block the export of a valid wordmark or monogram.
    const markText=logo.logoType==='wordmark'?'':glyphPaths(rawLetter,font,Math.round(s*.59),logo.markShape==='outline'?logo.primary:'#FFFFFF');
    const brandText=logo.logoType==='monogram'?'':glyphPaths(rawBrand,font,logo.wordSize,logo.ink);
    const symbol=logo.logoType!=='wordmark'?`<g class="logo-move" data-part="mark" ${interactive?'role="button" tabindex="0" aria-label="اسحب الرمز"':''} transform="translate(${logo.markX} ${logo.markY}) rotate(${logo.markRotation})">${logoGeometry(logo)}<g transform="translate(0 ${Math.round(s*.20)})">${markText}</g></g>`:'';
    const word=logo.logoType!=='monogram'?`<g class="logo-move" data-part="word" ${interactive?'role="button" tabindex="0" aria-label="اسحب اسم العلامة"':''} transform="translate(${logo.wordX} ${logo.wordY}) rotate(${logo.wordRotation})">${brandText}</g>`:'';
    const rawSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="360" viewBox="0 0 760 360" role="img" aria-label="${brand}" ${interactive?'id="editableLogoSvg"':''}><title>${brand}</title><desc>alWasiti outlined logo, font: ${vectorFontSources[logo.vectorFont].name}. All visible lettering consists of SVG paths.</desc>${symbol}${word}</svg>`;
    return expandedViewBox(rawSvg);
  }
  async function refreshVectorPreview(){
    const seq=++vectorPreviewCounter;
    if(!vectorPreviewEnabled)return;
    try{
      const svg=await outlinedLogoSvg(true);
      if(seq!==vectorPreviewCounter||!vectorPreviewEnabled)return;
      const target=id('logoCanvas');target.innerHTML=svg;
      target.querySelectorAll('[data-part]').forEach(el=>el.classList.toggle('selected',el.dataset.part===selectedPart));
    }catch(err){if(seq===vectorPreviewCounter){vectorPreviewEnabled=false;id('vectorPreview').checked=false;statusVector(err.message,'error');toast('تعذرت المعاينة المتجهية: '+err.message);}}
  }
  async function downloadOutlinedLogo(){
    const button=id('downloadVectorLogo');button.disabled=true;
    try{
      const data=await outlinedLogoSvg(false);
      if(/<text\b/i.test(data))throw Error('كشف نظام التصدير نصًا غير متجه');
      download(data,logoFilename()+'-outlined.svg','image/svg+xml;charset=utf-8');toast('تم تنزيل SVG بمسارات فعلية دون الحاجة لتثبيت الخط.');
    }catch(err){statusVector(err.message,'error');toast('تعذر التحويل: '+err.message);}
    finally{button.disabled=false;}
  }
  id('vectorFont').addEventListener('change',e=>{
    state.vectorFont=e.target.value;setDirty();statusVector('تم اختيار '+vectorFontSources[state.vectorFont].name+'؛ يُحمّل عند التصدير.');
    if(vectorPreviewEnabled)refreshVectorPreview();
  });
  id('vectorPreview').addEventListener('change',e=>{vectorPreviewEnabled=e.target.checked;renderLogoCanvas();});
  id('downloadVectorLogo').addEventListener('click',downloadOutlinedLogo);
  function renderLogoCanvas() {
    id('logoCanvas').innerHTML=svgLogo(true);
    id('logoCanvas').classList.toggle('show-grid',gridVisible);
    id('logoCanvas').querySelectorAll('[data-part]').forEach(el=>el.classList.toggle('selected',el.dataset.part===selectedPart));
    id('logoSelectionStatus').textContent=selectedPart?(selectedPart==='mark'?'الرمز محدد':'الاسم محدد'):'لم يُحدّد عنصر';
    if(vectorPreviewEnabled)refreshVectorPreview();
  }
  function logoCoords(event,svg) {
    // Match the browser's true SVG transformation, including expanded viewBoxes,
    // responsive sizing and the preserveAspectRatio letterbox.
    const point=svg.createSVGPoint();
    point.x=event.clientX;point.y=event.clientY;
    const matrix=svg.getScreenCTM();
    if(!matrix)throw Error('لم تتوفر أبعاد لوحة الرسم');
    const local=point.matrixTransform(matrix.inverse());
    return {x:local.x,y:local.y};
  }
  function moveLogo(part,dx,dy) {
    const xkey=part==='mark'?'markX':'wordX',ykey=part==='mark'?'markY':'wordY';
    const snap=v=>snapEnabled?Math.round(v/10)*10:Math.round(v);
    state[xkey]=snap(Math.max(0,Math.min(760,state[xkey]+dx)));
    state[ykey]=snap(Math.max(0,Math.min(360,state[ykey]+dy)));
    renderLogoCanvas();setDirty();
  }
  let movingPart=null,previousPoint=null;
  const logoCanvas=id('logoCanvas');
  logoCanvas.addEventListener('pointerdown',e=>{
    const target=e.target.closest('[data-part]');
    if(!target)return;
    const svg=id('editableLogoSvg');
    captureLogo();movingPart=target.getAttribute('data-part');selectedPart=movingPart;previousPoint=logoCoords(e,svg);renderLogoCanvas();
    logoCanvas.setPointerCapture(e.pointerId);e.preventDefault();
  });
  logoCanvas.addEventListener('pointermove',e=>{
    if(!movingPart)return;
    const point=logoCoords(e,id('editableLogoSvg'));
    moveLogo(movingPart,point.x-previousPoint.x,point.y-previousPoint.y);
    previousPoint=point;
  });
  logoCanvas.addEventListener('pointerup',()=>{movingPart=null;previousPoint=null;});
  logoCanvas.addEventListener('pointercancel',()=>{movingPart=null;previousPoint=null;});
  logoCanvas.addEventListener('keydown',e=>{
    const part=e.target?.getAttribute('data-part');
    if(!part || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
    const d=e.shiftKey?12:3;
    captureLogo();selectedPart=part;moveLogo(part,(e.key==='ArrowRight'?d:e.key==='ArrowLeft'?-d:0),(e.key==='ArrowDown'?d:e.key==='ArrowUp'?-d:0));
    const newTarget=logoCanvas.querySelector(`[data-part="${part}"]`);newTarget?.focus();e.preventDefault();
  });
  id('resetLogoLayout').addEventListener('click',()=>{
    captureLogo();state.markRotation=0;state.wordRotation=0;
    state.markX=590;state.markY=185;state.wordX=286;state.wordY=205;
    if(state.logoType==='wordmark'){state.wordX=380;state.wordY=198;}
    if(state.logoType==='monogram'){state.markX=380;state.markY=180;}
    renderLogoCanvas();setDirty();
  });
  document.querySelectorAll('[data-logo-layout]').forEach(btn=>btn.addEventListener('click',()=>{
    captureLogo();const kind=btn.dataset.logoLayout;
    state.markRotation=0;state.wordRotation=0;
    if(kind==='horizontal'){state.markX=570;state.markY=175;state.wordX=278;state.wordY=196;}
    if(kind==='vertical'){state.markX=380;state.markY=118;state.wordX=380;state.wordY=276;}
    if(kind==='centered'){state.markX=380;state.markY=177;state.wordX=380;state.wordY=203;}
    // A centered wordmark or monogram has no unused offset.
    if(state.logoType==='wordmark'){state.wordX=380;state.wordY=202;}
    if(state.logoType==='monogram'){state.markX=380;state.markY=180;}
    render();setDirty();toast('تم تغيير توزيع الشعار.');
  }));
  id('logoGrid').addEventListener('change',e=>{gridVisible=e.target.checked;renderLogoCanvas();});
  id('logoSnap').addEventListener('change',e=>{snapEnabled=e.target.checked;});
  document.addEventListener('keydown',e=>{
    if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||!id('studio').classList.contains('active'))return;
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;
    e.preventDefault();if(e.shiftKey)redoLogo();else undoLogo();
  });
  id('quickDownloadLogo').addEventListener('click',()=>{
    if(state.logoType!=='monogram'&&!textValue(state.brandName)){toast('اكتب اسم العلامة أولًا');return;}
    if(state.logoType!=='wordmark'&&!textValue(state.symbolLetter)){toast('اكتب الحرف الرمزي أولًا');return;}
    download(svgLogo(),logoFilename()+'-logo.svg','image/svg+xml;charset=utf-8');toast('تم تجهيز ملف SVG للتنزيل.');
  });
  function logoFilename(){return textValue(state.projectName).replace(/[^\w\u0600-\u06FF\s-]/g,'').replace(/\s+/g,'-').slice(0,40)||'alwasiti';}
  async function downloadLogoPng(){
    // Draw vector shapes and text directly to canvas; background is transparent.
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1520;canvas.height=720;
    const ctx=canvas.getContext('2d');if(!ctx){toast('تعذر إنشاء ملف PNG في المتصفح.');return;}
    ctx.scale(2,2);
    // Respect the same expanded vector drawing bounds to prevent clipped PNGs.
    const vb=svgLogo().match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
    if(vb){
      const [,vx,vy,vw,vh]=vb.map(Number);
      const fit=Math.min(760/vw,360/vh,1);
      ctx.translate((760-vw*fit)/2-vx*fit,(360-vh*fit)/2-vy*fit);
      ctx.scale(fit,fit);
    }
    if(state.logoType!=='wordmark'){
      ctx.save();ctx.translate(state.markX,state.markY);
      const s=state.markSize;ctx.rotate(state.markRotation*Math.PI/180);
      ctx.fillStyle=state.primary;ctx.strokeStyle=state.primary;
      if(state.markShape==='diamond'){
        ctx.rotate(Math.PI/4);ctx.beginPath();ctx.roundRect(-s/2,-s/2,s,s,Math.round(s*.12));ctx.fill();ctx.rotate(-Math.PI/4);
      }else if(state.markShape==='hexagon'||state.markShape==='star'){
        const count=state.markShape==='hexagon'?6:10;ctx.beginPath();
        for(let i=0;i<count;i++){const a=state.markShape==='hexagon'?-Math.PI/2+i*Math.PI/3:-Math.PI/2+i*Math.PI/5;const r=state.markShape==='hexagon'?s*.55:(i%2?s*.27:s*.54);const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
        ctx.closePath();ctx.fill();
      }else{
        ctx.beginPath();ctx.roundRect(-s/2,-s/2,s,s,state.markShape==='circle'?s/2:Math.min(24,s*.22));
        if(state.markShape==='outline'){ctx.lineWidth=8;ctx.stroke();}else ctx.fill();
      }
      ctx.fillStyle=state.markShape==='outline'?state.primary:'#fff';ctx.font=`700 ${Math.round(s*.59)}px "${state.headingFont}", sans-serif`;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.direction='rtl';ctx.fillText(state.symbolLetter||'م',0,Math.round(s*.20));ctx.restore();
    }
    if(state.logoType!=='monogram'){
      ctx.save();ctx.translate(state.wordX,state.wordY);ctx.rotate(state.wordRotation*Math.PI/180);ctx.direction='rtl';ctx.fillStyle=state.ink;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font=`${state.headingWeight} ${state.wordSize}px "${state.headingFont}",sans-serif`;ctx.fillText(state.brandName||'علامتك',0,0);ctx.restore();
    }
    canvas.toBlob(blob=>{
      if(!blob){toast('تعذر إنشاء PNG.');return;}
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=logoFilename()+'-logo.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast('تم تجهيز PNG بخلفية شفافة.');
    },'image/png');
  }
  function download(content, name, mime) {
    const blob = new Blob([content],{type:mime});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; document.body.appendChild(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $$('[data-export]').forEach(button=>button.addEventListener('click',()=>{
    const type=button.dataset.export;
    const filename=logoFilename();
    if(type==='outline'){downloadOutlinedLogo();}
    else if(type==='json')download(JSON.stringify(designTokens(),null,2),`${filename}-tokens.json`,'application/json;charset=utf-8');
    else if(type==='css')download(cssVariables(),`${filename}-variables.css`,'text/css;charset=utf-8');
    else if(type==='svg')download(svgLogo(),`${filename}-logo.svg`,'image/svg+xml;charset=utf-8');
    else if(type==='png')downloadLogoPng();
    closeDialog(id('exportModal'));if(type!=='outline')toast('تم إنشاء الملف للتنزيل.');
  }));
  try {
    const portfolio=loadPortfolio();
    const current=portfolio.projects.find(p=>p.id===portfolio.activeId);
    if(current){Object.assign(state,current.data);activeProjectId=current.id;id('saveStatus').textContent='تم استعادة آخر مشروع';}
    else{
      const legacy=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(legacy&&typeof legacy==='object'){
        Object.assign(state,normalizeProjectData(legacy));
        id('saveStatus').textContent='تم استعادة الحفظ السابق';
      }
    }
    const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    if(draft&&typeof draft==='object'&&draft.data&&draft.projectId===activeProjectId&&
       Number.isFinite(draft.savedAt)&&draft.savedAt>(current?Date.parse(current.updatedAt):0)){
      Object.assign(state,normalizeProjectData(draft.data));
      dirty=true;
      id('saveStatus').textContent='مسودة مستعادة — احفظ المشروع';
    }
  }catch(_) { /* Ignore unavailable or corrupt browser storage. */ }
  render();
})();

