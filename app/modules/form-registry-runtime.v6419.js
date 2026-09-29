/* SAGS E-REPORT V6.4.24 - FSAGS54/94 direct canonical PDF, signatures, centered export, task-home return. */
(function(root){
'use strict';
if(root.__SAGS_FORM_REGISTRY_V6419)return;
root.__SAGS_FORM_REGISTRY_V6419='V6.4.24-20260929-CORE-FORM-ENTRY-MYFLIGHT-PDF-01';

const BUILD='V6.4.24-20260929-CORE-FORM-ENTRY-MYFLIGHT-PDF-01';
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
function persistDraw(){try{G('persist')?.()}catch(e){console.warn('V6.4.19 persist',e)}try{G('draw')?.()}catch(e){console.warn('V6.4.19 draw',e)}setTimeout(()=>{try{syncLiveSignatureUi()}catch(_){}},0)}
function activeSession(){try{return S(G('activeFlightSessionId')||G('currentFlightSessionMeta')?.()?.id)}catch(_){return S(G('activeFlightSessionId'))}}
function sigMarker(key){return '__sagsV6410SigSession_'+key}
function sigSource(key){return '__sagsV6410SigSource_'+key}
function markSig(key,source){const s=st(),id=activeSession();if(id)s[sigMarker(key)]=id;s[sigSource(key)]=source||'MANUAL'}
function clearSigScoped(key){
  const s=st(),old=S(s[key]);
  delete s[key];delete s[sigMarker(key)];delete s[sigSource(key)];
  // V6.4.19 defensive cleanup: remove any already-rendered signature image
  // immediately. The normal draw() then rebuilds the page from current state.
  if(old)try{
    const f=runtimeField(key),page=Number(f?.page||(/^FSAGS54_/.test(key)?16:key===SIG94_KEY?17:0)),svg=document.getElementById('svg'+page);
    svg?.querySelectorAll('image').forEach(im=>{
      const href=S(im.getAttribute('href')||im.getAttributeNS('http://www.w3.org/1999/xlink','href'));
      if(href===old)im.remove();
    });
  }catch(_){}
}
function sessionList(){try{const a=G('readFlightSessionList')?.();return Array.isArray(a)?a:[]}catch(_){return[]}}
function sessionEnvelope(id){try{return G('readFlightSessionEnvelope')?.(id)||{}}catch(_){return{}}}
function duplicateKeeper(key,value){const rows=[];for(const m of sessionList()){const id=S(m?.id);if(!id)continue;const e=sessionEnvelope(id),v=S(e?.state?.[key]);if(v&&v===value)rows.push({id,created:Number(m?.createdAt||0),updated:Number(m?.updatedAt||0)})}if(rows.length<=1)return'';rows.sort((a,b)=>(a.created||a.updated||0)-(b.created||b.updated||0)||a.id.localeCompare(b.id));return rows[0].id}
function sessionStateFor(sid){try{return sessionEnvelope(sid)?.state||{}}catch(_){return{}}}
function reconcileSignatureForSession(key,sid){
  const s=st(),val=S(s[key]);if(!val){delete s[sigMarker(key)];delete s[sigSource(key)];return false}
  const marker=S(s[sigMarker(key)]);if(marker===sid)return false;
  const own=sessionStateFor(sid),ownVal=S(own[key]),ownMarker=S(own[sigMarker(key)]);
  // Strict ownership: copied signature data is never enough. The persisted
  // session must explicitly own this signature for this exact flight.
  if(ownVal&&ownMarker===sid){
    s[key]=own[key];
    s[sigMarker(key)]=sid;
    s[sigSource(key)]=S(own[sigSource(key)])||'SESSION';
    return true;
  }
  clearSigScoped(key);return true;
}
function sanitizeSignatureScope(){
  const id=formId(),sid=activeSession();if(!sid||!['fsags54','fsags94'].includes(id))return false;
  const s=st(),tpl=S(savedTemplate()?.signature);let changed=false;
  if(id==='fsags54'){const left=S(s.FSAGS54_sig1),right=S(s.FSAGS54_sig2);if(right&&((tpl&&right===tpl)||(left&&right===left))){clearSigScoped('FSAGS54_sig2');changed=true}}
  const keys=id==='fsags54'?['FSAGS54_sig1','FSAGS54_sig2']:[SIG94_KEY];
  for(const key of keys)if(reconcileSignatureForSession(key,sid))changed=true;
  if(changed)persistDraw();return changed
}
let cleanSign=null;
function restoreCleanSign(p){if(!p)return;const s=st();if(p.had)s[p.key]=p.old;else delete s[p.key];if(p.hadMarker)s[sigMarker(p.key)]=p.oldMarker;else delete s[sigMarker(p.key)];if(p.hadSource)s[sigSource(p.key)]=p.oldSource;else delete s[sigSource(p.key)]}
function prepareCleanSign(key){const s=st(),mk=sigMarker(key),sk=sigSource(key);cleanSign={key,sid:activeSession(),had:Object.prototype.hasOwnProperty.call(s,key),old:s[key],hadMarker:Object.prototype.hasOwnProperty.call(s,mk),oldMarker:s[mk],hadSource:Object.prototype.hasOwnProperty.call(s,sk),oldSource:s[sk],saving:false};delete s[key]}
function patchCleanSignaturePad(){
  const save=G('saveSignature');if(typeof save==='function'&&!save.__sagsV6419Clean){const w=function(){const p=cleanSign;if(!p)return save.apply(this,arguments);p.saving=true;let out;try{out=save.apply(this,arguments)}finally{const s=st(),v=S(s[p.key]);if(v){markSig(p.key,'MANUAL');try{G('persist')?.()}catch(_){}}else{restoreCleanSign(p);persistDraw()}cleanSign=null;setTimeout(sanitizeSignatureScope,0)}return out};w.__sagsV6419Clean=true;w.__sagsV6419Base=save;root.saveSignature=w;try{saveSignature=w}catch(_){}}
  const close=G('closeSignature');if(typeof close==='function'&&!close.__sagsV6419Clean){const w=function(){const p=cleanSign;if(p&&!p.saving){restoreCleanSign(p);cleanSign=null;const r=close.apply(this,arguments);persistDraw();return r}return close.apply(this,arguments)};w.__sagsV6419Clean=true;w.__sagsV6419Base=close;root.closeSignature=w;try{closeSignature=w}catch(_){}}
}
function signatureNeedsCleanStart(f){
  const key=S(f?.key),id=formId();
  return (id==='fsags54'&&(key==='FSAGS54_sig1'||key==='FSAGS54_sig2'))||(id==='fsags94'&&key===SIG94_KEY);
}
function signed54(key){return formId()==='fsags54'&&(key==='FSAGS54_sig1'||key==='FSAGS54_sig2')&&!!S(st()[key])}
function showSigned54Actions(){
  openSignChooser();
  return false
}
function patchCleanOpenSignature(){
  const base=G('openSignature');if(typeof base!=='function'||base.__sagsV6419CleanOpen)return false;
  const w=function(f){
    if(signatureNeedsCleanStart(f)){
      const key=S(f?.key);
      if(signed54(key))return showSigned54Actions();
      if(cleanSign&&cleanSign.key!==key){restoreCleanSign(cleanSign);cleanSign=null}
      if(!cleanSign)prepareCleanSign(key);
    }
    return base.apply(this,arguments)
  };
  w.__sagsV6419CleanOpen=true;w.__sagsV6419Base=base;root.openSignature=w;try{openSignature=w}catch(_){}
  return true
}
function installSignaturePointerGuard(){
  const c=document.getElementById('sigCanvas');if(!c||c.__sagsV6419PrimaryGuard)return;
  c.__sagsV6419PrimaryGuard=true;let activePointer=null;
  const block=e=>{e.preventDefault();e.stopImmediatePropagation()};
  c.addEventListener('pointerdown',e=>{
    if(e.isPrimary===false||activePointer!==null){block(e);return}
    activePointer=e.pointerId;
  },true);
  c.addEventListener('pointermove',e=>{if(activePointer!==null&&e.pointerId!==activePointer)block(e)},true);
  c.addEventListener('pointerup',e=>{if(activePointer!==null&&e.pointerId!==activePointer){block(e);return}activePointer=null},true);
  c.addEventListener('pointercancel',e=>{if(activePointer!==null&&e.pointerId!==activePointer){block(e);return}activePointer=null},true);
  root.addEventListener('blur',()=>{activePointer=null},true);
}

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
  s.FSAGS54_sig1=t.signature;markSig('FSAGS54_sig1','TEMPLATE');
  if(!S(s.FSAGS54_name1)&&S(t.fullname))s.FSAGS54_name1=S(t.fullname);
  persistDraw();return true;
}
function openHand(key,label,page){
  const base=G('openSignature');if(typeof base!=='function'){alert('Chức năng ký tay chưa sẵn sàng.');return false}
  if(signed54(key))return showSigned54Actions();
  if(!base.__sagsV6419CleanOpen)prepareCleanSign(key);
  const f=runtimeField(key,page)||{key,type:'signature',label,page};
  f.key=key;f.type='signature';f.label=label||f.label||'Ký tên';f.page=page||f.page;
  base(f);return true;
}
function clearSig(key){clearSigScoped(key);persistDraw()}
function deleteSig54(key,label){
  if(!S(st()[key]))return false;
  if(!confirm('Xóa chữ ký '+label+' của chuyến hiện tại để ký lại?'))return false;
  clearSig(key);closeSignChooser();return true;
}
function applyTemplate54(){
  if(signed54('FSAGS54_sig1'))return showSigned54Actions();
  const t=savedTemplate();if(!t?.signature){alert('Chưa có mẫu chữ ký. Hãy tạo MẪU CHỮ KÝ trước.');try{G('openSignatureSampleEditor')?.()}catch(_){}return false}
  const s=st();s.FSAGS54_sig1=t.signature;markSig('FSAGS54_sig1','TEMPLATE');if(!S(s.FSAGS54_name1)&&S(t.fullname))s.FSAGS54_name1=S(t.fullname);persistDraw();closeSignChooser();return true;
}

function installCss(){
  if(document.getElementById('sagsV6419Css'))return;
  const e=document.createElement('style');e.id='sagsV6419Css';e.textContent=`
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
  .sagsV6419SigHotspot{position:absolute;z-index:8;border:0;background:transparent;padding:0;margin:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .sagsV6419SigHotspot:focus-visible{outline:2px solid #0b6aa9;outline-offset:-2px}
  #sagsV6419SignModal{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;background:rgba(6,27,40,.64);padding:14px;box-sizing:border-box}
  #sagsV6419SignModal.show{display:flex}
  #sagsV6419SignCard{width:min(94vw,520px);max-height:82dvh;overflow:auto;background:#fff;border-radius:18px;padding:16px;box-shadow:0 20px 55px rgba(0,0,0,.34);font-family:Arial,sans-serif;color:#173b4c}
  #sagsV6419SignCard h3{margin:0 0 8px;text-align:center;color:#0b5cab}.sagsV6419SignSub{text-align:center;color:#587482;font-size:12px;margin-bottom:12px}
  .sagsV6419SignGrid{display:grid;gap:9px}.sagsV6419SignBtn{min-height:52px;border:0;border-radius:11px;padding:10px 12px;font:900 14px Arial;cursor:pointer;background:#eaf5f9;color:#125b6c;text-align:left}
  .sagsV6419SignBtn.primary{background:#0b6aa9;color:#fff}.sagsV6419SignBtn.manual{background:#137333;color:#fff}.sagsV6419SignBtn.supervisor{background:#8a4d14;color:#fff}.sagsV6419SignBtn:disabled{background:#e5eaee!important;color:#61727b!important;cursor:not-allowed;opacity:1}.sagsV6419SignBtn.danger{background:#f8e9e7;color:#a52a20}.sagsV6419SignClose{width:100%;margin-top:11px;min-height:44px;border:0;border-radius:10px;background:#e7edf1;color:#334b58;font-weight:900}
  `;document.head.appendChild(e);
}
function centerExport(){
  const vv=root.visualViewport,vw=Math.max(280,Number(vv?.width||root.innerWidth||document.documentElement.clientWidth||360)),vh=Math.max(320,Number(vv?.height||root.innerHeight||document.documentElement.clientHeight||640)),cx=Number(vv?.offsetLeft||0)+vw/2,cy=Number(vv?.offsetTop||0)+vh/2;
  for(const id of ['exportChoiceModal','exportModal']){
    const m=document.getElementById(id);if(!m)continue;
    m.style.setProperty('position','fixed','important');m.style.setProperty('inset','0','important');m.style.setProperty('align-items','center','important');m.style.setProperty('justify-content','center','important');m.style.setProperty('padding','0','important');m.style.setProperty('z-index','2147482500','important');
    const card=m.firstElementChild;if(!card)continue;
    card.style.setProperty('position','fixed','important');card.style.setProperty('left',cx+'px','important');card.style.setProperty('top',cy+'px','important');card.style.setProperty('right','auto','important');card.style.setProperty('bottom','auto','important');card.style.setProperty('transform','translate(-50%,-50%)','important');card.style.setProperty('margin','0','important');card.style.setProperty('width',Math.min(560,Math.max(280,vw-24))+'px','important');card.style.setProperty('max-height',Math.max(260,vh-28)+'px','important');card.style.setProperty('overflow-y','auto','important');
  }
}
function patchExportOpeners(){
  for(const name of ['openExportModal','v479ShowPreparedButtons']){
    const base=G(name);if(typeof base!=='function'||base.__sagsV6419Centered)continue;
    const w=function(){centerExport();const r=base.apply(this,arguments);centerExport();requestAnimationFrame(centerExport);setTimeout(centerExport,40);return r};w.__sagsV6419Centered=true;w.__sagsV6419Centered=true;w.__sagsV6419Base=base;root[name]=w;
    try{if(name==='openExportChoiceMenu')openExportChoiceMenu=w;else if(name==='openExportModal')openExportModal=w;else v479ShowPreparedButtons=w}catch(_){}
  }
  for(const name of ['sharePreparedPdf','openPreparedPdf','downloadPreparedPdf']){
    const base=G(name);if(typeof base!=='function'||base.__sagsV6419Centered)continue;
    const w=async function(){centerExport();try{return await base.apply(this,arguments)}finally{setTimeout(centerExport,60);setTimeout(centerExport,300)}};w.__sagsV6419Centered=true;w.__sagsV6419Base=base;root[name]=w;
    try{if(name==='sharePreparedPdf')sharePreparedPdf=w;else if(name==='openPreparedPdf')openPreparedPdf=w;else downloadPreparedPdf=w}catch(_){}
  }
}

function ensureSignChooser(){
  if(document.getElementById('sagsV6419SignModal'))return;
  const m=document.createElement('div');m.id='sagsV6419SignModal';m.innerHTML='<div id="sagsV6419SignCard"><h3>KÝ BIỂU MẪU</h3><div class="sagsV6419SignSub" id="sagsV6419SignSub"></div><div class="sagsV6419SignGrid" id="sagsV6419SignGrid"></div><button class="sagsV6419SignClose" type="button">ĐÓNG</button></div>';
  document.body.appendChild(m);m.querySelector('.sagsV6419SignClose').onclick=closeSignChooser;m.onclick=e=>{if(e.target===m)closeSignChooser()};
}
function closeSignChooser(){document.getElementById('sagsV6419SignModal')?.classList.remove('show')}
function button(label,cls,fn,disabled=false){const b=document.createElement('button');b.type='button';b.className='sagsV6419SignBtn '+(cls||'');b.textContent=label;b.disabled=!!disabled;if(fn&&!disabled)b.onclick=fn;return b}
function openSignChooser(){
  ensureSignChooser();const id=formId();if(!['fsags54','fsags94'].includes(id)){try{G('openTemplateMenu')?.()}catch(_){}return}
  const grid=document.getElementById('sagsV6419SignGrid'),sub=document.getElementById('sagsV6419SignSub');grid.innerHTML='';
  if(id==='fsags54'){
    sub.textContent='Mỗi ô chỉ có 1 chữ ký. Bấm vào ô đã ký sẽ mở menu này; nếu ký sai, xóa đúng chữ ký đó rồi ký lại.';
    const t=savedTemplate(),leftSigned=!!S(st().FSAGS54_sig1),rightSigned=!!S(st().FSAGS54_sig2);
    if(leftSigned){
      grid.appendChild(button('✓ LOAD PLANNER · ĐÃ KÝ','manual',null,true));
      grid.appendChild(button('⌫ XÓA CHỮ KÝ LOAD PLANNER','danger',()=>deleteSig54('FSAGS54_sig1','Load Planner')));
    }else{
      if(t?.signature)grid.appendChild(button('⚡ LOAD PLANNER · KÝ TỰ ĐỘNG TỪ MẪU','primary',applyTemplate54));
      grid.appendChild(button('✍ LOAD PLANNER · KÝ TAY','manual',()=>{closeSignChooser();openHand('FSAGS54_sig1','Load Planner Signature',16)}));
    }
    if(rightSigned){
      grid.appendChild(button('✓ SUPERVISOR · ĐÃ KÝ','supervisor',null,true));
      grid.appendChild(button('⌫ XÓA CHỮ KÝ SUPERVISOR','danger',()=>deleteSig54('FSAGS54_sig2','Supervisor')));
    }else{
      grid.appendChild(button('✍ SUPERVISOR · KÝ TAY','supervisor',()=>{closeSignChooser();openHand('FSAGS54_sig2','Supervisor Signature',16)}));
    }
  }else{
    sub.textContent='Checked by gồm 2 field riêng trong Form Manager: tên người kiểm tra và chữ ký. Nếu ký sai, xóa chữ ký trước rồi ký lại.';
    const signed=!!S(st()[SIG94_KEY]);
    if(signed){
      grid.appendChild(button('✓ CHECKED BY · ĐÃ KÝ','manual',null,true));
      grid.appendChild(button('⌫ XÓA CHỮ KÝ CHECKED BY','danger',()=>{if(confirm('Xóa chữ ký Checked by của chuyến hiện tại để ký lại?')){clearSig(SIG94_KEY);closeSignChooser()}}));
    }else{
      grid.appendChild(button('✍ CHECKED BY · KÝ TAY','manual',()=>{closeSignChooser();openHand(SIG94_KEY,'Checked by Signature',17)}));
    }
  }
  document.getElementById('sagsV6419SignModal').classList.add('show');
}

function pct(n){return (Number(n)||0)*100+'%'}
function ensureHotspot(pageNo,key,label,field){
  const page=document.getElementById('page'+pageNo);if(!page||!field)return;
  const id='sagsV6419Hot_'+key;let b=document.getElementById(id);if(!b){b=document.createElement('button');b.type='button';b.id=id;b.className='sagsV6419SigHotspot';b.setAttribute('aria-label',label);page.appendChild(b)}
  b.style.left=pct(field.x);b.style.top=pct(field.y);b.style.width=pct(field.w);b.style.height=pct(field.h);b.onclick=()=>{if(formId()==='fsags54'&&signed54(key))openSignChooser();else openHand(key,label,pageNo)};
}
function sync94LiveSignature(){
  // V6.4.19: signature is a real Form Manager signature field now.
  // Native draw() owns the live <image>; remove any legacy standalone overlay.
  document.getElementById('sagsV6419Sig94Live')?.remove();
}
function syncLiveSignatureUi(){
  sanitizeSignatureScope();
  const id=formId();if(id==='fsags54'){
    const a=fieldByKey('fsags54','FSAGS54_sig1'),b=fieldByKey('fsags54','FSAGS54_sig2');ensureHotspot(16,'FSAGS54_sig1','Ký tay Load Planner',a);ensureHotspot(16,'FSAGS54_sig2','Ký tay Supervisor',b);
  }else if(id==='fsags94'){
    const f=fieldByKey('fsags94',SIG94_KEY);ensureHotspot(17,SIG94_KEY,'Ký tay Checked by',f);sync94LiveSignature();
  }
}
function patchGlobalSignButton(){
  if(root.__SAGS_V6419_SIGN_CAPTURE)return;root.__SAGS_V6419_SIGN_CAPTURE=true;
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
  for(const fld of f.fields||[]){
    if(U(fld.type)!=='signature')continue;
    const key=S(fld.bind||fld.key),src=S(s[key]);if(src)rows.push({fld,src});
  }
  const imgs=await Promise.all(rows.map(x=>loadImageCached(x.src).catch(()=>null)));
  rows.forEach((row,i)=>{const im=imgs[i];if(!im)return;const fld=row.fld,px=Number(fld.x)*w,py=Number(fld.y)*h,pw=Number(fld.w)*w,ph=Number(fld.h)*h;drawImageFit(ctx,im,px,py,pw,ph,Math.min(14,Math.max(4,pw*.035)),Math.min(10,Math.max(3,ph*.075)))})
}
function pageImageReady(img){if(img?.complete&&img.naturalWidth>0)return Promise.resolve();return new Promise((resolve,reject)=>{if(!img)return reject(new Error('Không tìm thấy nền biểu mẫu.'));const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(new Error('Không tải được nền biểu mẫu.'))},cleanup=()=>{img.removeEventListener('load',ok);img.removeEventListener('error',bad)};img.addEventListener('load',ok,{once:true});img.addEventListener('error',bad,{once:true});setTimeout(()=>img.complete&&img.naturalWidth>0?ok():bad(),4000)})}
let lastStrictVerifyAt=0,verifyJob=null;
async function strictVerifyCached(){
  if(Date.now()-lastStrictVerifyAt<120000)return true;if(verifyJob)return verifyJob;
  verifyJob=(async()=>{let refreshError=null;try{if(typeof root.sagsV450ApplyLayout==='function')await root.sagsV450ApplyLayout()}catch(e){refreshError=e}let r=registry();
    if(!r?.forms?.length&&typeof root.sagsV495BeforeExport==='function'){try{await root.sagsV495BeforeExport()}catch(e){const msg=S(e?.message||e);if(!/phát hành|release|manifest|version|service worker|đồng bộ.*máy chủ|tệp.*đồng bộ/i.test(msg))throw e;console.warn('V6.4.24 ignored obsolete release-sync PDF guard; using mutable Form Manager registry.',msg)}r=registry()}
    if(!r?.forms?.length)throw refreshError||new Error('Không có Form Manager registry hợp lệ để dựng PDF.');lastStrictVerifyAt=Date.now();return true})().finally(()=>{verifyJob=null});return verifyJob;
}
function safeFile(v){return S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')||'REPORT'}
function flightToken(){const s=st(),keys=['FSAGS54_flightDate','clc94_flightDate','fltAfter','fltBefore'];for(const k of keys){const v=S(s[k]);if(v)return v.split(/[\/]/)[0].trim()}return'FLIGHT'}
const bgBitmapCache=new Map();
function mobilePdfDevice(){try{const ua=S(navigator.userAgent),p=S(navigator.platform);return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)||(p==='MacIntel'&&Number(navigator.maxTouchPoints)>1)||(Number(navigator.maxTouchPoints)>0&&Math.min(Number(screen?.width||9999),Number(screen?.height||9999))<900)}catch(_){return false}}
async function pageBitmap(img){const src=S(img?.currentSrc||img?.src);if(src&&bgBitmapCache.has(src))return bgBitmapCache.get(src);const p=typeof createImageBitmap==='function'?createImageBitmap(img).catch(()=>img):Promise.resolve(img);if(src){bgBitmapCache.set(src,p);p.catch(()=>bgBitmapCache.delete(src))}return p}
function runtimeCheckField(key,pageNo=17){
  try{const a=G('fields');return Array.isArray(a)?a.find(f=>S(f.key)===S(key)&&Number(f.page)===Number(pageNo)):null}catch(_){return null}
}
function draw94ChecksExact(ctx,w,h){
  const s=st(),sx=w/1241,sy=h/1755,regForm=form('fsags94');ctx.save();
  try{
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#111';
    for(let i=1;i<=21;i++){
      const key='clc94_check_'+String(i).padStart(2,'0');if(!s[key])continue;
      const live=runtimeCheckField(key,17),rf=regForm?.fields?.find(f=>S(f.key)===key||S(f.bind)===key);
      let tx=Number(live?.tickX),ty=Number(live?.tickY);
      if(!(Number.isFinite(tx)&&Number.isFinite(ty))){
        tx=(Number(rf?.x)+Number(rf?.w)/2)*1241;
        ty=(Number(rf?.y)+Number(rf?.h)/2)*1755;
      }
      if(!(Number.isFinite(tx)&&Number.isFinite(ty)))continue;
      ctx.font='900 '+Math.max(10,17*((sx+sy)/2))+'px Arial';
      // Match live SVG: runtime tickX/tickY + 17px check glyph + 1px y offset.
      ctx.fillText('✓',tx*sx,(ty+1)*sy);
    }
  }finally{ctx.restore()}
}
function paintCanonical5494(ctx,id,pageNo,w,h){
  if(id!=='fsags94'){root.sagsV495PaintCanonicalPage?.(ctx,pageNo);return}
  const s=st(),saved={};
  for(let i=1;i<=21;i++){const k='clc94_check_'+String(i).padStart(2,'0');saved[k]=s[k];s[k]=false}
  try{root.sagsV495PaintCanonicalPage?.(ctx,pageNo)}
  finally{for(const[k,v]of Object.entries(saved))s[k]=v}
  draw94ChecksExact(ctx,w,h);
}
async function fastCanvas(id,pageNo){
  let reg=registry();if(!reg?.forms?.length&&typeof root.sagsV450ApplyLayout==='function'){await root.sagsV450ApplyLayout();reg=registry()}
  const page=document.getElementById('page'+pageNo),img=page?.querySelector(':scope > img');if(!page||!img)throw new Error('Không tìm thấy trang biểu mẫu đang nhập.');await pageImageReady(img);
  const info=root.sagsV495PageInfo?.(pageNo)||{},nativeW=Math.max(1,Math.round(Number(info.width)||1241)),nativeH=Math.max(1,Math.round(Number(info.height)||1755)),w=mobilePdfDevice()?Math.min(1000,nativeW):nativeW,h=Math.round(nativeH*w/nativeW);
  const c=document.createElement('canvas');c.width=w;c.height=h;c.__sagsPageNo=pageNo;c.__sagsLayered=false;c.__sagsRegistryWysiwyg=true;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(await pageBitmap(img),0,0,w,h);
  paintCanonical5494(ctx,id,pageNo,w,h);await drawSignatures(ctx,id,w,h);return c;
}
function prewarmFastExport(){const id=formId(),pageNo=id==='fsags54'?16:id==='fsags94'?17:0;if(!pageNo)return;setTimeout(()=>{strictVerifyCached().catch(e=>console.info('V6.4.19 PDF prewarm',S(e?.message||e)));const img=document.getElementById('page'+pageNo)?.querySelector(':scope > img');if(img)pageImageReady(img).then(()=>pageBitmap(img)).catch(()=>{})},220)}
async function present(file,name,message){
  if(typeof root.sagsRegistryPresentPdf==='function')return root.sagsRegistryPresentPdf(file,name,message);
  try{preparedPdfFile=file;preparedPdfName=name}catch(_){}root.preparedPdfFile=file;root.preparedPdfName=name;centerExport();
  if(typeof G('openExportModal')==='function'){G('openExportModal')(message||'PDF đã sẵn sàng.');try{G('v479ShowPreparedButtons')?.()}catch(_){}return true}
  return false;
}
async function fastExport5494(){
  const id=formId(),pageNo=id==='fsags54'?16:id==='fsags94'?17:0;if(!pageNo)return false;
  sanitizeSignatureScope();const guard=strictVerifyCached();const canvas=await fastCanvas(id,pageNo);await guard;
  const make=G('canvasesToPdfFile');if(typeof make!=='function')throw new Error('PDF engine chưa sẵn sàng.');const code=S(form(id)?.code||(id==='fsags54'?'F/SAGS-CXR/54':'F/SAGS-CXR/94')),name=safeFile(code)+'_'+safeFile(flightToken())+'.pdf';
  const file=await make([canvas],name);try{canvas.width=1;canvas.height=1}catch(_){}return present(file,name,'PDF '+code+' đã sẵn sàng.');
}
function unwrapExportChoice(fn){
  let cur=fn,guard=0;
  while(typeof cur==='function'&&guard++<8){
    if(cur.__sagsRegistryUnifiedBase){cur=cur.__sagsRegistryUnifiedBase;continue}
    if(cur.__sags5494Base){cur=cur.__sags5494Base;continue}
    if(cur.__sagsV6419Fast&&cur.__sagsV6419Base){cur=cur.__sagsV6419Base;continue}
    break
  }
  return cur
}
function installUnifiedExport(){
  root.sagsV6419Render5494Page=async pageNo=>{
    const id=Number(pageNo)===16?'fsags54':Number(pageNo)===17?'fsags94':'';
    if(!id)throw new Error('Trang không thuộc F/SAGS-CXR/54 hoặc 94.');
    sanitizeSignatureScope();await strictVerifyCached();return fastCanvas(id,Number(pageNo))
  };
  const shared=()=>['fsags54','fsags94'].includes(formId())?fastExport5494().catch(e=>{console.error('V6.4.24 FSAGS54/94 PDF',e);alert('Không xuất được PDF: '+S(e?.message||e));return false}):false;
  root.sagsV6419Export5494=shared;root.sagsRegistryExport5494=shared;root.sags5494ExportCurrentPdf=shared;
  const current=G('openExportChoiceMenu'),base=unwrapExportChoice(current);
  if(typeof base==='function'&&!current?.__sagsV6419UnifiedChoice){
    const w=function(){centerExport();if(['fsags54','fsags94'].includes(formId()))return fastExport5494().catch(e=>{console.error('V6.4.24 direct 54/94 export',e);alert('Không xuất được PDF: '+S(e?.message||e));return false});const r=base.apply(this,arguments);centerExport();requestAnimationFrame(centerExport);return r};
    w.__sagsV6419UnifiedChoice=true;w.__sagsRegistryUnifiedV647=true;w.__sags5494V622=true;w.__v225SignatureExport=true;w.__sagsV6419Base=base;
    root.openExportChoiceMenu=w;try{openExportChoiceMenu=w}catch(_){}
  }
}

function patchCompleteToHome(){
  const base=root.v324ConfirmRosterHandover;if(typeof base!=='function'||base.__sagsV6419Home)return false;
  const w=async function(){const ok=await base.apply(this,arguments);if(ok===true)setTimeout(()=>{try{root.sagsV479GoHome?.()}catch(_){try{G('showRoleHomeIdle')?.()}catch(__){}}try{root.scrollTo?.({top:0,left:0,behavior:'auto'})}catch(_){}},60);return ok};
  w.__sagsV6419Home=true;w.__sagsV6419Base=base;root.v324ConfirmRosterHandover=w;return true;
}

function hookShow(){
  for(const name of ['showFormGroup','switchFlightSession']){const base=G(name);if(typeof base!=='function'||base.__sagsV6419Sig)continue;const w=function(){const r=base.apply(this,arguments);Promise.resolve(r).catch(()=>{}).finally(()=>setTimeout(()=>{sanitizeSignatureScope();syncLiveSignatureUi();centerExport();prewarmFastExport()},40));return r};w.__sagsV6419Sig=true;w.__sagsV6419Base=base;root[name]=w;try{if(name==='showFormGroup')showFormGroup=w;else switchFlightSession=w}catch(_){}}
}
function boot(){installCss();patchExportOpeners();patchCleanOpenSignature();patchCleanSignaturePad();installSignaturePointerGuard();patchGlobalSignButton();ensureSignChooser();hookShow();installUnifiedExport();patchCompleteToHome();centerExport();sanitizeSignatureScope();syncLiveSignatureUi();prewarmFastExport();setTimeout(()=>{patchExportOpeners();patchCleanOpenSignature();patchCleanSignaturePad();installSignaturePointerGuard();hookShow();installUnifiedExport();patchCompleteToHome();sanitizeSignatureScope();syncLiveSignatureUi();centerExport();prewarmFastExport()},700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,150),{once:true});else setTimeout(boot,150);
let maintainQueued=false;const mo=new MutationObserver(()=>{if(maintainQueued)return;maintainQueued=true;requestAnimationFrame(()=>{maintainQueued=false;patchExportOpeners();patchCleanOpenSignature();patchCleanSignaturePad();installSignaturePointerGuard();if(!root.v324ConfirmRosterHandover?.__sagsV6419Home)patchCompleteToHome();sanitizeSignatureScope();syncLiveSignatureUi();centerExport()})});
if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true});
root.visualViewport?.addEventListener('resize',centerExport,{passive:true});root.visualViewport?.addEventListener('scroll',centerExport,{passive:true});root.addEventListener('resize',centerExport,{passive:true});root.addEventListener('pageshow',()=>setTimeout(()=>{boot();sanitizeSignatureScope();syncLiveSignatureUi();centerExport()},180),{passive:true});
})(window);
