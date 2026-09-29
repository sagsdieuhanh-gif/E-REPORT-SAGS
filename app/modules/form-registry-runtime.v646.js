/* SAGS E-REPORT V6.4.6 - one published forms.registry.json layout for live view and PDF. */
(function(root){
'use strict';
if(root.__SAGS_FORM_REGISTRY_UNIFIED_V646)return;
root.__SAGS_FORM_REGISTRY_UNIFIED_V646='V6.4.6-20260929-REGISTRY-WYSIWYG-PC-PDF-QUICK-NA-R2-01';

const BUILD='V6.4.6-20260929-REGISTRY-WYSIWYG-PC-PDF-QUICK-NA-R2-01';
const N_A_TYPES=new Set(['text','number','time','date','textarea']);
const N_A_CRITICAL=/^(?:date|fltBefore|fltAfter|sta|std|eta|etd|ata|atd|regn|acReg|bay|route\d*|booking|totalPax)$|(?:^|_)(?:flight|reg|sta|std|eta|etd|ata|atd|adl|chd|inf|kg|pcs|bag|pax)(?:_|$)/i;
const GROUP_TO_ID={
  fsags:'fsags423',fsags423:'fsags423',fsags42_3:'fsags423',
  fsags421:'fsags421',fsags42_1:'fsags421',
  fsags551:'fsags551',fsags55_1:'fsags551',
  fsags09:'fsags09',fsags9:'fsags09',loading208:'fsags208',fsags208:'fsags208',
  bbbt:'bbbt',fsags56:'bbbt',tvjgof035:'tvj_gof_035',tvj_gof_035:'tvj_gof_035',
  fsags54:'fsags54',clc_checklist:'fsags94',fsags94:'fsags94',fsags94_clc:'fsags94'
};
let registry=null,paintQueued=false,drawWrapped=false,exportWrapped=false,observer=null;

const S=v=>String(v??'').trim();
const U=v=>S(v).toLowerCase().replace(/[\s./-]+/g,'_').replace(/^_+|_+$/g,'');
function G(name){try{if(root[name]!==undefined)return root[name];return eval(name)}catch(_){return root[name]}}
function stateObj(){const s=G('state');return s&&typeof s==='object'?s:{}}
function currentGroup(){return S(G('activeFormGroup')||'fsags')}
function currentFormId(){return GROUP_TO_ID[U(currentGroup())]||U(currentGroup())}
function currentForm(){const id=currentFormId();return registry?.forms?.find(f=>U(f.id)===id)||null}
function refreshRegistry(){
  try{const r=root.sagsV450GetFormRegistry?.();if(r?.forms?.length)registry=r}catch(_){}
  return registry;
}
async function applyPublishedRegistry(){
  if(typeof root.sagsV450ApplyLayout!=='function')throw new Error('Form Manager registry runtime is not ready.');
  await root.sagsV450ApplyLayout();refreshRegistry();
  if(!registry?.forms?.length)throw new Error('forms.registry.json is not loaded.');
  return registry;
}

function managedPages(){
  const out=[];for(let n=1;n<=40;n++)try{if(root.sagsV495ManagedPage?.(n))out.push(n)}catch(_){}
  return out;
}
function visiblePage(page){
  if(!page||page.classList.contains('hide'))return false;
  const st=getComputedStyle(page);return st.display!=='none'&&st.visibility!=='hidden';
}
function registryCanvas(pageNo){
  const page=document.getElementById('page'+pageNo),svg=document.getElementById('svg'+pageNo);if(!page||!svg)return null;
  const info=root.sagsV495PageInfo?.(pageNo)||{},img=page.querySelector(':scope > img');
  if(img&&info.image&&img.getAttribute('src')!==String(info.image))img.setAttribute('src',String(info.image));
  let c=page.querySelector(':scope > canvas.sagsRegistryCanonicalLive');
  if(!c){
    c=document.createElement('canvas');c.className='sagsRegistryCanonicalLive';c.setAttribute('aria-hidden','true');
    c.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;background:transparent;';
    page.appendChild(c);
  }
  const w=Math.max(1,Math.round(Number(info.width)||1241)),h=Math.max(1,Math.round(Number(info.height)||1755));
  if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;
  page.classList.add('sagsRegistryCanonicalPage');
  return c;
}
function paintPage(pageNo){
  if(!root.sagsV495ManagedPage?.(pageNo))return false;
  const page=document.getElementById('page'+pageNo);if(!visiblePage(page))return false;
  const c=registryCanvas(pageNo);if(!c)return false;
  const ctx=c.getContext('2d');if(!ctx)return false;ctx.clearRect(0,0,c.width,c.height);
  root.sagsV495PaintCanonicalPage?.(ctx,pageNo);
  if(Number(pageNo)===16){
    document.querySelectorAll('#svg16 .v621Tri').forEach(el=>{el.style.display='none'});
  }
  return true;
}
function releaseHiddenCanvases(){
  document.querySelectorAll('canvas.sagsRegistryCanonicalLive').forEach(c=>{
    const page=c.parentElement;if(visiblePage(page))return;c.remove();
  });
}
function paintVisible(){
  paintQueued=false;refreshRegistry();
  if(!registry?.forms?.length)return;
  releaseHiddenCanvases();for(const n of managedPages())paintPage(n);
}
function queuePaint(){if(paintQueued)return;paintQueued=true;requestAnimationFrame(()=>{try{paintVisible()}catch(e){console.warn('V6.4.6 registry live paint',e)}})}
function installCanonicalStyle(){
  if(document.getElementById('sagsRegistryCanonicalStyleV646'))return;
  const s=document.createElement('style');s.id='sagsRegistryCanonicalStyleV646';s.textContent=`
  .sagsRegistryCanonicalPage>svg text.value,
  .sagsRegistryCanonicalPage>svg text.tick,
  .sagsRegistryCanonicalPage>svg foreignObject,
  .sagsRegistryCanonicalPage>svg g[data-sags-fm-check],
  .sagsRegistryCanonicalPage>svg g[data-export-field],
  .sagsRegistryCanonicalPage>svg .v373-line-render{opacity:0!important}
  #page16.sagsRegistryCanonicalPage>svg .v621Tri{display:none!important}
  #quickTimeNaBtn{display:inline-flex!important;align-items:center!important;justify-content:center!important}
  .sagsRegistryNaQuick{min-height:42px;border:1px solid #9fc7df;border-radius:10px;padding:9px 13px;background:#eef5ff;color:#16465c;font:900 12px Arial;cursor:pointer}
  `;document.head.appendChild(s);
}
function wrapDraw(){
  const base=G('draw');if(typeof base!=='function'||base.__sagsRegistryUnifiedV646)return false;
  const w=function(){const out=base.apply(this,arguments);queuePaint();return out};
  w.__sagsRegistryUnifiedV646=true;w.__sagsRegistryUnifiedBase=base;root.draw=w;try{draw=w}catch(_){}drawWrapped=true;return true;
}
function observeSvg(){
  if(observer)return;observer=new MutationObserver(()=>queuePaint());
  for(const n of managedPages()){const svg=document.getElementById('svg'+n);if(svg)observer.observe(svg,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','x','y','font-size','transform']})}
}

function isMobileLike(){
  try{
    const ua=S(navigator.userAgent),platform=S(navigator.platform);
    if(/Android|iPhone|iPad|iPod|Mobile|Windows Phone|IEMobile/i.test(ua))return true;
    if(platform==='MacIntel'&&Number(navigator.maxTouchPoints)>1)return true;
    if(Number(navigator.maxTouchPoints)>0&&root.matchMedia?.('(pointer:coarse)')?.matches)return true;
  }catch(_){}
  return false;
}
function isDesktop(){return !isMobileLike()}
function setPrepared(file,name){
  try{preparedPdfFile=file;preparedPdfName=name}catch(_){}
  root.preparedPdfFile=file;root.preparedPdfName=name;try{G('v479ReleasePreparedUrl')?.()}catch(_){}
}
function directDownload(file,name){
  if(!file)return false;let url='';
  try{
    const prepared=G('preparedPdfFile')||root.preparedPdfFile;
    if(file===prepared&&typeof G('v479PreparedUrl')==='function')url=G('v479PreparedUrl')();
    if(!url)url=URL.createObjectURL(file);
    const a=document.createElement('a');a.href=url;a.download=S(name||file.name||'SAGS_REPORT.pdf');a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
    if(!(file===prepared))setTimeout(()=>{try{URL.revokeObjectURL(url)}catch(_){}},5000);
    try{G('closeExportModal')?.()}catch(_){}return true;
  }catch(e){console.error('V6.4.6 desktop PDF download',e);return false}
}
async function presentPdfSmart(file,name,message){
  if(!file)return false;name=S(name||file.name||'SAGS_REPORT.pdf');setPrepared(file,name);
  if(isDesktop())return directDownload(file,name);
  const open=G('openExportModal'),buttons=G('v479ShowPreparedButtons');
  if(typeof open==='function'){
    open(message||'PDF đã sẵn sàng. Bấm CHIA SẺ QUA ỨNG DỤNG để chọn ứng dụng trên thiết bị.');
    try{buttons?.()}catch(_){}return true;
  }
  try{
    const f=(typeof File!=='undefined'&&file instanceof File)?file:new File([file],name,{type:'application/pdf'});
    if(typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare({files:[f]}))){await navigator.share({title:name.replace(/\.pdf$/i,''),files:[f]});return true}
  }catch(e){if(e?.name==='AbortError')return true;console.warn('V6.4.6 mobile share',e)}
  return directDownload(file,name);
}
root.v452IsDesktopExportDevice=isDesktop;
root.v452DesktopDownloadPrepared=function(){return directDownload(G('preparedPdfFile')||root.preparedPdfFile,G('preparedPdfName')||root.preparedPdfName)};
root.sagsRegistryPresentPdf=presentPdfSmart;root.presentPdf=presentPdfSmart;

function safeFile(v){return S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')||'REPORT'}
function flightToken(){const s=stateObj(),keys=['FSAGS54_flightDate','clc94_flightDate','fltAfter','fltBefore','f421_fltAfter','f421_fltBefore','f551_fltAfter','f551_fltBefore'];for(const k of keys){const v=S(s[k]);if(v)return v.split(/[\/]/)[0].trim()}return'FLIGHT'}
async function export5494(){
  const id=currentFormId(),page=id==='fsags54'?16:id==='fsags94'?17:0;if(!page)return false;
  await root.sagsV495BeforeExport?.();await applyPublishedRegistry();
  try{G('draw')?.()}catch(_){}
  const render=G('renderReportPage'),make=G('canvasesToPdfFile');if(typeof render!=='function'||typeof make!=='function')throw new Error('Canonical PDF engine is not ready.');
  const canvas=await render(page),form=currentForm(),code=S(form?.code||(id==='fsags54'?'F/SAGS-CXR/54':'F/SAGS-CXR/94'));
  const name=safeFile(code)+'_'+safeFile(flightToken())+'.pdf',file=await make([canvas],name);
  return presentPdfSmart(file,name,'PDF '+code+' đã sẵn sàng.');
}
function wrapExportChoice(){
  const base=G('openExportChoiceMenu');if(typeof base!=='function'||base.__sagsRegistryUnifiedV646)return false;
  const w=function(){const id=currentFormId();if(id==='fsags54'||id==='fsags94')return export5494().catch(e=>{console.error('V6.4.6 FSAGS54/94 canonical export',e);alert('Không xuất được PDF theo forms.registry.json: '+S(e?.message||e));return false});return base.apply(this,arguments)};
  w.__sagsRegistryUnifiedV646=true;w.__sagsRegistryUnifiedBase=base;root.openExportChoiceMenu=w;try{openExportChoiceMenu=w}catch(_){}exportWrapped=true;return true;
}

function formForGroup(group){const id=GROUP_TO_ID[U(group)]||U(group);return registry?.forms?.find(f=>U(f.id)===id)||null}
function fillRegistryBlankNA(group,options){
  if(options&&typeof options==='object'&&(options.silent===true||U(options.source)==='export'))return 0;
  refreshRegistry();const f=formForGroup(group||currentGroup());if(!f)return 0;const st=stateObj();let count=0;
  for(const fld of f.fields||[]){
    if(!N_A_TYPES.has(U(fld.type)))continue;const key=S(fld.bind||fld.key);if(!key||N_A_CRITICAL.test(key))continue;
    const cur=st[key];if(cur!==undefined&&cur!==null&&S(cur)!=='')continue;st[key]='N/A';count++;
  }
  if(count){try{G('persist')?.()}catch(e){console.warn('V6.4.6 N/A persist',e)}try{G('draw')?.()}catch(_){}queuePaint()}
  return count;
}
root.sagsRegistryFillBlankNA=fillRegistryBlankNA;
root.fillBlankNA=function(options){return fillRegistryBlankNA(currentGroup(),options)};try{fillBlankNA=root.fillBlankNA}catch(_){}
function confirmFill(group){if(!root.confirm('Điền N/A vào các ô nhập còn trống của biểu mẫu hiện tại?\n\nDữ liệu đã nhập sẽ được giữ nguyên.'))return -1;return fillRegistryBlankNA(group)}
function naButton(id,groupFn,after){const b=document.createElement('button');b.type='button';b.id=id;b.className='sagsRegistryNaQuick';b.textContent='N/A · Ô TRỐNG';b.onclick=()=>{const g=groupFn(),n=confirmFill(g);if(n<0)return;try{after?.(g,n)}catch(_){}};return b}
function ensureQuickNA(){
  const fs=document.querySelector('#fs09QuickModal .fs09qFooter');if(fs&&!document.getElementById('sagsRegistryNaFs09'))fs.insertBefore(naButton('sagsRegistryNaFs09',()=> 'fsags09',()=>{root.closeFS09QuickPanel?.();root.openFS09QuickPanel?.()}),fs.firstChild);
  const q=document.querySelector('#sags5494Quick .q-tools')||document.querySelector('#sags5494Quick .q-body');if(q&&!document.getElementById('sagsRegistryNa5494'))q.insertBefore(naButton('sagsRegistryNa5494',()=>currentGroup(),g=>root.sags5494OpenQuickEntry?.(g)),q.firstChild);
  const bb=document.querySelector('#bbbtQuickEntryModal .bq-head')||document.querySelector('#bbbtQuickEntryModal .bq-body');if(bb&&!document.getElementById('sagsRegistryNaBBBT'))bb.insertBefore(naButton('sagsRegistryNaBBBT',()=> 'bbbt',()=>{root.BBBTQuickEntry?.close?.();root.BBBTQuickEntry?.open?.()}),bb.lastElementChild||null);
}
function patchPreparedButtons(){
  const base=G('v479ShowPreparedButtons');if(typeof base!=='function'||base.__sagsRegistryUnifiedV646)return;
  const w=function(){const r=base.apply(this,arguments);if(isDesktop()){const share=document.getElementById('exportShareBtn'),open=document.getElementById('exportOpenBtn'),down=document.getElementById('exportDownloadBtn');if(share)share.style.display='none';if(open)open.style.display='none';if(down){down.style.display='block';down.textContent='TẢI LẠI PDF'}}return r};
  w.__sagsRegistryUnifiedV646=true;root.v479ShowPreparedButtons=w;try{v479ShowPreparedButtons=w}catch(_){}
}

async function boot(){
  installCanonicalStyle();
  try{await applyPublishedRegistry()}catch(e){console.error('V6.4.6 registry apply',e);return}
  wrapDraw();wrapExportChoice();patchPreparedButtons();ensureQuickNA();observeSvg();queuePaint();
  setTimeout(async()=>{try{await applyPublishedRegistry();observeSvg();queuePaint()}catch(_){}},900);
}
const uiObserver=new MutationObserver(()=>{ensureQuickNA();if(registry){if(!drawWrapped)wrapDraw();if(!exportWrapped)wrapExportChoice();queuePaint()}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{uiObserver.observe(document.documentElement,{subtree:true,childList:true});setTimeout(boot,420)},{once:true});
else{uiObserver.observe(document.documentElement,{subtree:true,childList:true});setTimeout(boot,420)}
root.addEventListener('pageshow',()=>setTimeout(async()=>{try{await applyPublishedRegistry();ensureQuickNA();queuePaint()}catch(_){}},250),{passive:true});
})(window);
