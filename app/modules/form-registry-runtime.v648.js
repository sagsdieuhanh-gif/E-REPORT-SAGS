/* SAGS E-REPORT V6.4.8 - FSAGS54/94 signatures, faster canonical PDF, centered export, task-home return. */
(function(root){
'use strict';
if(root.__SAGS_FORM_REGISTRY_V648)return;
root.__SAGS_FORM_REGISTRY_V648='V6.4.8-20260929-FSAGS5494-SIGN-FASTPDF-HOME-01';

const BUILD='V6.4.8-20260929-FSAGS5494-SIGN-FASTPDF-HOME-01';
const GROUP_TO_ID={fsags54:'fsags54',clc_checklist:'fsags94',fsags94:'fsags94',fsags94_clc:'fsags94'};
const SIG94_KEY='clc94_checkedBySig';
const S=v=>String(v??'').trim();
const U=v=>S(v).toLowerCase().replace(/[\s./-]+/g,'_').replace(/^_+|_+$/g,'');
function G(name){try{if(root[name]!==undefined)return root[name];return eval(name)}catch(_){return root[name]}}
function st(){const s=G('state');return s&&typeof s==='object'?s:{}}
function group(){return U(G('activeFormGroup')||'')}
function formId(){return GROUP_TO_ID[group()]||''}
function registry(){try{return root.sagsV450GetFormRegistry?.()||null}catch(_){return null}}
function form(id=formId()){return registry()?.forms?.find(f=>U(f.id)===U(id))||null}
function fieldByKey(id,key){return form(id)?.fields?.find(f=>S(f.key)===S(key)||S(f.bind)===S(key))||null}
function runtimeField(key,page){try{const a=G('fields');return Array.isArray(a)?a.find(f=>S(f.key)===S(key)&&(!page||Number(f.page)===Number(page))):null}catch(_){return null}}
function persistDraw(){try{G('persist')?.()}catch(e){console.warn('V6.4.8 persist',e)}try{G('draw')?.()}catch(e){console.warn('V6.4.8 draw',e)}setTimeout(()=>{try{syncLiveSignatureUi()}catch(_){}},0)}

function savedTemplate(){
  try{const f=G('getSavedTemplate');if(typeof f==='function'){const t=f();if(t?.signature)return t}}catch(_){}
  try{
    const key=typeof G('sagsOwnedKey')==='function'?G('sagsOwnedKey')('rampCoordinatorCOOnlyTemplateV4'):'rampCoordinatorCOOnlyTemplateV4';
    const x=JSON.parse(localStorage.getItem(key)||'null');
    if(x?.signature)return {fullname:S(x.fullname||x.fullnameLeft||x.fullnameRight),signature:S(x.signature||x.uploadedSignature||x.sigLeft||x.sigRight)};
  }catch(_){}
  return null;
}
function autoSign54(){
  if(formId()!=='fsags54')return false;
  const s=st(),t=savedTemplate();if(!t?.signature||S(s.FSAGS54_sig1))return false;
  s.FSAGS54_sig1=t.signature;
  if(!S(s.FSAGS54_name1)&&S(t.fullname))s.FSAGS54_name1=S(t.fullname);
  persistDraw();return true;
}
function openHand(key,label,page){
  const base=G('openSignature');if(typeof base!=='function'){alert('Chức năng ký tay chưa sẵn sàng.');return false}
  const f=runtimeField(key,page)||{key,type:'signature',label,page};
  f.key=key;f.type='signature';f.label=label||f.label||'Ký tên';f.page=page||f.page;
  base(f);return true;
}
function clearSig(key){const s=st();s[key]='';persistDraw()}
function applyTemplate54(){
  const t=savedTemplate();if(!t?.signature){alert('Chưa có mẫu chữ ký. Hãy tạo MẪU CHỮ KÝ trước.');try{G('openSignatureSampleEditor')?.()}catch(_){}return false}
  const s=st();s.FSAGS54_sig1=t.signature;if(!S(s.FSAGS54_name1)&&S(t.fullname))s.FSAGS54_name1=S(t.fullname);persistDraw();closeSignChooser();return true;
}

function installCss(){
  if(document.getElementById('sagsV648Css'))return;
  const e=document.createElement('style');e.id='sagsV648Css';e.textContent=`
  html.new-ui-v1 body #exportChoiceModal,html.new-ui-v1 body #exportModal{
    position:fixed!important;inset:0!important;width:100vw!important;height:var(--sags-vv-height,100dvh)!important;
    display:none;align-items:center!important;justify-content:center!important;
    padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))!important;
    box-sizing:border-box!important;z-index:2147482500!important
  }
  html.new-ui-v1 body #exportChoiceModal[style*="display: flex"],html.new-ui-v1 body #exportModal[style*="display: flex"]{display:flex!important}
  html.new-ui-v1 body #exportChoiceModal>.exportChoiceBox,html.new-ui-v1 body #exportModal>.exportBox{
    position:relative!important;inset:auto!important;transform:none!important;margin:auto!important;
    width:min(560px,calc(100vw - 24px))!important;max-width:560px!important;max-height:min(82dvh,680px)!important;
    overflow:auto!important;overscroll-behavior:contain!important;border-radius:20px!important
  }
  .sagsV648SigHotspot{position:absolute;z-index:8;border:0;background:transparent;padding:0;margin:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .sagsV648SigHotspot:focus-visible{outline:2px solid #0b6aa9;outline-offset:-2px}
  .sagsV648Sig94Live{position:absolute;z-index:7;pointer-events:none;object-fit:contain}
  #sagsV648SignModal{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;background:rgba(6,27,40,.64);padding:14px;box-sizing:border-box}
  #sagsV648SignModal.show{display:flex}
  #sagsV648SignCard{width:min(94vw,520px);max-height:82dvh;overflow:auto;background:#fff;border-radius:18px;padding:16px;box-shadow:0 20px 55px rgba(0,0,0,.34);font-family:Arial,sans-serif;color:#173b4c}
  #sagsV648SignCard h3{margin:0 0 8px;text-align:center;color:#0b5cab}.sagsV648SignSub{text-align:center;color:#587482;font-size:12px;margin-bottom:12px}
  .sagsV648SignGrid{display:grid;gap:9px}.sagsV648SignBtn{min-height:52px;border:0;border-radius:11px;padding:10px 12px;font:900 14px Arial;cursor:pointer;background:#eaf5f9;color:#125b6c;text-align:left}
  .sagsV648SignBtn.primary{background:#0b6aa9;color:#fff}.sagsV648SignBtn.manual{background:#137333;color:#fff}.sagsV648SignBtn.supervisor{background:#8a4d14;color:#fff}.sagsV648SignBtn.danger{background:#f8e9e7;color:#a52a20}.sagsV648SignClose{width:100%;margin-top:11px;min-height:44px;border:0;border-radius:10px;background:#e7edf1;color:#334b58;font-weight:900}
  `;document.head.appendChild(e);
}
function centerExport(){
  for(const id of ['exportChoiceModal','exportModal']){const m=document.getElementById(id);if(!m)continue;m.style.setProperty('align-items','center','important');m.style.setProperty('justify-content','center','important');}
}
function patchExportOpeners(){
  for(const name of ['openExportChoiceMenu','openExportModal']){
    const base=G(name);if(typeof base!=='function'||base.__sagsV648Centered)continue;
    const w=function(){const r=base.apply(this,arguments);centerExport();requestAnimationFrame(centerExport);return r};w.__sagsV648Centered=true;w.__sagsV648Base=base;root[name]=w;
    try{if(name==='openExportChoiceMenu')openExportChoiceMenu=w;else openExportModal=w}catch(_){}
  }
}

function ensureSignChooser(){
  if(document.getElementById('sagsV648SignModal'))return;
  const m=document.createElement('div');m.id='sagsV648SignModal';m.innerHTML='<div id="sagsV648SignCard"><h3>KÝ BIỂU MẪU</h3><div class="sagsV648SignSub" id="sagsV648SignSub"></div><div class="sagsV648SignGrid" id="sagsV648SignGrid"></div><button class="sagsV648SignClose" type="button">ĐÓNG</button></div>';
  document.body.appendChild(m);m.querySelector('.sagsV648SignClose').onclick=closeSignChooser;m.onclick=e=>{if(e.target===m)closeSignChooser()};
}
function closeSignChooser(){document.getElementById('sagsV648SignModal')?.classList.remove('show')}
function button(label,cls,fn){const b=document.createElement('button');b.type='button';b.className='sagsV648SignBtn '+(cls||'');b.textContent=label;b.onclick=fn;return b}
function openSignChooser(){
  ensureSignChooser();const id=formId();if(!['fsags54','fsags94'].includes(id)){try{G('openTemplateMenu')?.()}catch(_){}return}
  const grid=document.getElementById('sagsV648SignGrid'),sub=document.getElementById('sagsV648SignSub');grid.innerHTML='';
  if(id==='fsags54'){
    sub.textContent='Bên trái: người được phân công · Bên phải: Supervisor ký tay.';
    const t=savedTemplate();
    if(t?.signature)grid.appendChild(button('⚡ LOAD PLANNER · KÝ TỰ ĐỘNG TỪ MẪU','primary',applyTemplate54));
    grid.appendChild(button('✍ LOAD PLANNER · KÝ TAY','manual',()=>{closeSignChooser();openHand('FSAGS54_sig1','Load Planner Signature',16)}));
    grid.appendChild(button('✍ SUPERVISOR · KÝ TAY','supervisor',()=>{closeSignChooser();openHand('FSAGS54_sig2','Supervisor Signature',16)}));
    if(S(st().FSAGS54_sig1)||S(st().FSAGS54_sig2))grid.appendChild(button('⌫ XÓA CHỮ KÝ 54','danger',()=>{if(confirm('Xóa các chữ ký đang có trên F/SAGS-CXR/54?')){clearSig('FSAGS54_sig1');clearSig('FSAGS54_sig2');closeSignChooser()}}));
  }else{
    sub.textContent='Checked by: giữ tên người kiểm tra và cho phép ký tay ngay trong cùng ô.';
    grid.appendChild(button('✍ CHECKED BY · KÝ TAY','manual',()=>{closeSignChooser();openHand(SIG94_KEY,'Checked by - chữ ký',17)}));
    if(S(st()[SIG94_KEY]))grid.appendChild(button('⌫ XÓA CHỮ KÝ CHECKED BY','danger',()=>{if(confirm('Xóa chữ ký Checked by?')){clearSig(SIG94_KEY);closeSignChooser()}}));
  }
  document.getElementById('sagsV648SignModal').classList.add('show');
}

function pct(n){return (Number(n)||0)*100+'%'}
function ensureHotspot(pageNo,key,label,field){
  const page=document.getElementById('page'+pageNo);if(!page||!field)return;
  const id='sagsV648Hot_'+key;let b=document.getElementById(id);if(!b){b=document.createElement('button');b.type='button';b.id=id;b.className='sagsV648SigHotspot';b.setAttribute('aria-label',label);page.appendChild(b)}
  b.style.left=pct(field.x);b.style.top=pct(field.y);b.style.width=pct(field.w);b.style.height=pct(field.h);b.onclick=()=>openHand(key,label,pageNo);
}
function sync94LiveSignature(){
  const page=document.getElementById('page17'),fld=fieldByKey('fsags94','clc94_checkedBy');if(!page||!fld)return;
  let im=document.getElementById('sagsV648Sig94Live');const src=S(st()[SIG94_KEY]);if(!src){im?.remove();return}
  if(!im){im=document.createElement('img');im.id='sagsV648Sig94Live';im.className='sagsV648Sig94Live';im.alt='';page.appendChild(im)}
  im.src=src;const x=Number(fld.x),y=Number(fld.y),w=Number(fld.w),h=Number(fld.h);const sigH=h*.42,sigY=y+h-sigH-h*.04;
  im.style.left=pct(x+w*.04);im.style.top=pct(sigY);im.style.width=pct(w*.92);im.style.height=pct(sigH);
}
function syncLiveSignatureUi(){
  const id=formId();if(id==='fsags54'){
    const a=fieldByKey('fsags54','FSAGS54_sig1'),b=fieldByKey('fsags54','FSAGS54_sig2');ensureHotspot(16,'FSAGS54_sig1','Ký tay Load Planner',a);ensureHotspot(16,'FSAGS54_sig2','Ký tay Supervisor',b);autoSign54();
  }else if(id==='fsags94'){
    const f=fieldByKey('fsags94','clc94_checkedBy');ensureHotspot(17,SIG94_KEY,'Ký tay Checked by',f);sync94LiveSignature();
  }
}
function patchGlobalSignButton(){
  if(root.__SAGS_V648_SIGN_CAPTURE)return;root.__SAGS_V648_SIGN_CAPTURE=true;
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#v163SignBtn');if(!b)return;if(!['fsags54','fsags94'].includes(formId()))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openSignChooser()},true);
}

const imageCache=new Map();
function loadImageCached(src){
  src=S(src);if(!src)return Promise.resolve(null);if(imageCache.has(src))return imageCache.get(src);
  const p=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Không đọc được chữ ký.'));im.src=src});imageCache.set(src,p);p.catch(()=>imageCache.delete(src));return p;
}
function drawImageFit(ctx,im,x,y,w,h,padX=6,padY=5){if(!im||!(w>0&&h>0))return;const bw=Math.max(1,w-padX*2),bh=Math.max(1,h-padY*2),iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,r=Math.min(bw/iw,bh/ih),dw=iw*r,dh=ih*r;ctx.drawImage(im,x+padX+(bw-dw)/2,y+padY+(bh-dh)/2,dw,dh)}
async function drawSignatures(ctx,id,w,h){
  const s=st(),f=form(id);if(!f)return;
  const rows=[];
  if(id==='fsags54')for(const fld of f.fields||[])if(U(fld.type)==='signature'&&S(s[S(fld.bind||fld.key)]))rows.push({fld,src:S(s[S(fld.bind||fld.key)])});
  if(id==='fsags94'){
    const fld=fieldByKey('fsags94','clc94_checkedBy'),src=S(s[SIG94_KEY]);if(fld&&src)rows.push({fld,src,checked:true});
  }
  const imgs=await Promise.all(rows.map(x=>loadImageCached(x.src).catch(()=>null)));
  rows.forEach((row,i)=>{const im=imgs[i];if(!im)return;const fld=row.fld,px=Number(fld.x)*w,py=Number(fld.y)*h,pw=Number(fld.w)*w,ph=Number(fld.h)*h;if(row.checked){const sh=ph*.42,sy=py+ph-sh-ph*.04;drawImageFit(ctx,im,px+pw*.04,sy,pw*.92,sh,3,2)}else drawImageFit(ctx,im,px,py,pw,ph,Math.min(14,Math.max(6,pw*.035)),Math.min(10,Math.max(5,ph*.075)))})
}
function pageImageReady(img){if(img?.complete&&img.naturalWidth>0)return Promise.resolve();return new Promise((resolve,reject)=>{if(!img)return reject(new Error('Không tìm thấy nền biểu mẫu.'));const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(new Error('Không tải được nền biểu mẫu.'))},cleanup=()=>{img.removeEventListener('load',ok);img.removeEventListener('error',bad)};img.addEventListener('load',ok,{once:true});img.addEventListener('error',bad,{once:true});setTimeout(()=>img.complete&&img.naturalWidth>0?ok():bad(),4000)})}
let lastStrictVerifyAt=0,verifyJob=null;
async function strictVerifyCached(){
  if(Date.now()-lastStrictVerifyAt<120000)return true;
  if(verifyJob)return verifyJob;
  verifyJob=(async()=>{if(typeof root.sagsV495BeforeExport==='function')await root.sagsV495BeforeExport();lastStrictVerifyAt=Date.now();return true})().finally(()=>{verifyJob=null});
  return verifyJob;
}
function safeFile(v){return S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')||'REPORT'}
function flightToken(){const s=st(),keys=['FSAGS54_flightDate','clc94_flightDate','fltAfter','fltBefore'];for(const k of keys){const v=S(s[k]);if(v)return v.split(/[\/]/)[0].trim()}return'FLIGHT'}
async function fastCanvas(id,pageNo){
  let reg=registry();if(!reg?.forms?.length&&typeof root.sagsV450ApplyLayout==='function'){await root.sagsV450ApplyLayout();reg=registry()}
  const page=document.getElementById('page'+pageNo),img=page?.querySelector(':scope > img');if(!page||!img)throw new Error('Không tìm thấy trang biểu mẫu đang nhập.');await pageImageReady(img);
  const info=root.sagsV495PageInfo?.(pageNo)||{},w=Math.max(1,Math.round(Number(info.width)||1241)),h=Math.max(1,Math.round(Number(info.height)||1755));
  const c=document.createElement('canvas');c.width=w;c.height=h;c.__sagsPageNo=pageNo;c.__sagsLayered=false;c.__sagsRegistryWysiwyg=true;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
  root.sagsV495PaintCanonicalPage?.(ctx,pageNo);await drawSignatures(ctx,id,w,h);return c;
}
async function present(file,name,message){
  if(typeof root.sagsRegistryPresentPdf==='function')return root.sagsRegistryPresentPdf(file,name,message);
  try{preparedPdfFile=file;preparedPdfName=name}catch(_){}root.preparedPdfFile=file;root.preparedPdfName=name;centerExport();
  if(typeof G('openExportModal')==='function'){G('openExportModal')(message||'PDF đã sẵn sàng.');try{G('v479ShowPreparedButtons')?.()}catch(_){}return true}
  return false;
}
async function fastExport5494(){
  const id=formId(),pageNo=id==='fsags54'?16:id==='fsags94'?17:0;if(!pageNo)return false;
  autoSign54();const guard=strictVerifyCached();const canvas=await fastCanvas(id,pageNo);await guard;
  const make=G('canvasesToPdfFile');if(typeof make!=='function')throw new Error('PDF engine chưa sẵn sàng.');const code=S(form(id)?.code||(id==='fsags54'?'F/SAGS-CXR/54':'F/SAGS-CXR/94')),name=safeFile(code)+'_'+safeFile(flightToken())+'.pdf';
  const file=await make([canvas],name);try{canvas.width=1;canvas.height=1}catch(_){}return present(file,name,'PDF '+code+' đã sẵn sàng.');
}
function installFastExport(){
  root.sagsV648Export5494=fastExport5494;root.sagsRegistryExport5494=fastExport5494;root.sags5494ExportCurrentPdf=fastExport5494;
  const base=G('openExportChoiceMenu');if(typeof base==='function'&&!base.__sagsV648Fast){const w=function(){if(['fsags54','fsags94'].includes(formId())){centerExport();return fastExport5494().catch(e=>{console.error('V6.4.8 fast PDF',e);alert('Không xuất được PDF: '+S(e?.message||e));return false})}return base.apply(this,arguments)};w.__sagsV648Fast=true;w.__sagsRegistryUnifiedV647=true;w.__sags5494V622=true;w.__v225SignatureExport=true;w.__sagsV648Base=base;root.openExportChoiceMenu=w;try{openExportChoiceMenu=w}catch(_){}}
}

function patchCompleteToHome(){
  const base=root.v324ConfirmRosterHandover;if(typeof base!=='function'||base.__sagsV648Home)return false;
  const w=async function(){const ok=await base.apply(this,arguments);if(ok===true)setTimeout(()=>{try{root.sagsV479GoHome?.()}catch(_){try{G('showRoleHomeIdle')?.()}catch(__){}}try{root.scrollTo?.({top:0,left:0,behavior:'auto'})}catch(_){}},60);return ok};
  w.__sagsV648Home=true;w.__sagsV648Base=base;root.v324ConfirmRosterHandover=w;return true;
}

function hookShow(){
  for(const name of ['showFormGroup','switchFlightSession']){const base=G(name);if(typeof base!=='function'||base.__sagsV648Sig)continue;const w=function(){const r=base.apply(this,arguments);Promise.resolve(r).catch(()=>{}).finally(()=>setTimeout(()=>{syncLiveSignatureUi();centerExport()},40));return r};w.__sagsV648Sig=true;w.__sagsV648Base=base;root[name]=w;try{if(name==='showFormGroup')showFormGroup=w;else switchFlightSession=w}catch(_){}}
}
function boot(){installCss();patchExportOpeners();patchGlobalSignButton();ensureSignChooser();hookShow();installFastExport();patchCompleteToHome();centerExport();syncLiveSignatureUi();setTimeout(()=>{patchExportOpeners();hookShow();installFastExport();patchCompleteToHome();syncLiveSignatureUi()},700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,150),{once:true});else setTimeout(boot,150);
const mo=new MutationObserver(()=>{patchExportOpeners();if(!root.v324ConfirmRosterHandover?.__sagsV648Home)patchCompleteToHome();syncLiveSignatureUi();centerExport()});
if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true});
root.addEventListener('pageshow',()=>setTimeout(()=>{boot();syncLiveSignatureUi()},180),{passive:true});
})(window);
