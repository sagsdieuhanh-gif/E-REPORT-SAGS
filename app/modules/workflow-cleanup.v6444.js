/* Approved V1 workflow: task tags are the only work entry; no MULTI/manual-flight/QR/usage UI. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id);
 const retired=['v163MultiBtn','v38NavMulti','fwcMultitaskBtn','v38MyFlightToggle','v38MyFlightLabel','v310ShiftNav','v327ReassignNav','v1113QrScanDirect','v1113QrFormBtn','v340CreateFlightBtn','roleBtnNA','roleBtnNew','roleBtnFirebaseUsage','v181FirebaseCard','v476NetworkCard','sagsUiPrefsBtn','sagsUiPrefsModal','flightTypeEditModal','v310ShiftModal','fwcMultitaskModal','v340ManualFlightModal'];
 const visible=id=>{const e=$(id);return e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';};
 function removeRetired(){
  for(const id of retired)$(id)?.remove();
  document.querySelectorAll('[data-retired-action],.fwcMultiBtn,.fwcMultiDone').forEach(e=>e.remove());
  // Never repurpose a manual NHẬN action as a second entry. Task-tag buttons remain owned by My Flight.
  document.querySelectorAll('[onclick]').forEach(e=>{if(/flightWorkspaceClaim\(|sagsV36OpenMultitask\(|v310ShiftOpen\(|sagsV340OpenManualFlight\(|sagsOpenQrScanner\(|fillBlankNA\(|newReport\(|openFlightTypeEdit\(/.test(e.getAttribute('onclick')||''))e.remove();});
 }
 function goStart(){
  document.activeElement?.blur?.();
  root.sagsFlightDossierClose?.();
  for(const name of ['closeQuickTimePanel','closeFS09QuickPanel','closeTimeSkipModal','closeEntry','flightWorkspaceClose']){try{root[name]?.();}catch(e){console.warn('Home close',name,e);}}
  // Close each operational overlay using its existing close control, preserving its reopen behavior.
  for(const e of document.querySelectorAll('[id$="Modal"],[id$="modal"],.sagsAdminModal,.modalOverlay,.modal-overlay,.modal,.sagsManagedOverlay,[role="dialog"]')){
   if(e.id==='roleLoginModal'||e.id==='appUpdateModal'||!visible(e.id))continue;
   const classDriven=e.classList.contains('show')||e.classList.contains('open')||e.classList.contains('active');
   const close=[...e.querySelectorAll('button')].find(b=>/^(Đóng|Hủy|×|✕|← QUAY LẠI AD)$/i.test(b.textContent.trim())||/^(Đóng|Close)$/i.test(b.getAttribute('aria-label')||''));
   if(close){try{close.click();}catch(_){}}
   e.classList.remove('show','open','active');
   if(classDriven){e.style.removeProperty('display');}else if(getComputedStyle(e).display!=='none')e.style.display='none';
  }
  document.body.classList.remove('v157-drawer-open','sags-quicktime-open');
  root.sagsUiClearBackStack?.();root.sagsV479GoHome?.();root.sagsOverlayLayout?.refresh();
 }
 root.sagsGoStart=goStart;
 function install(){
  if(matchMedia('(min-width:900px)').matches)document.body.classList.remove('v157-drawer-open');
  if(!$('sagsWelcome')){
   const welcome=document.createElement('main');welcome.id='sagsWelcome';welcome.setAttribute('aria-label','Trang chủ E-REPORT');
   welcome.innerHTML='<div class="welcomeSky"><svg viewBox="0 0 1200 700" aria-hidden="true"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#063758"/><stop offset="1" stop-color="#0d7b8b"/></linearGradient></defs><rect width="1200" height="700" fill="url(#sky)"/><circle cx="960" cy="150" r="100" fill="#b8f5e3" opacity=".14"/><path d="M0 540 Q300 410 650 530 T1200 490 V700H0Z" fill="#082c49" opacity=".55"/><path d="M0 620 L1200 520" stroke="#b8ede0" stroke-width="2" opacity=".3"/><g transform="translate(840 250) rotate(-18)"><path d="M-180 18 L-35 0 L35 -120 L65 -125 L40 -5 L155 -15 Q195 -16 210 0 Q195 16 155 15 L40 5 L65 125 L35 120 L-35 0 L-180 -18 L-155 -55 L-130 -50 L-135 -10Z" fill="#efffff"/><path d="M-310 18H-220 M-360 45H-210" stroke="#a3dedb" stroke-width="3" opacity=".5"/></g><g fill="#d4f1ef" opacity=".14"><ellipse cx="1000" cy="425" rx="180" ry="28"/><ellipse cx="450" cy="190" rx="150" ry="20"/></g></svg></div><section class="welcomeContent"><div class="welcomeEyebrow">SAGS · CAM RANH</div><h1>Sẵn sàng cho<br>một chuyến bay mới.</h1><p>Chào mừng đến với E-REPORT.<br>Chọn công việc hoặc tra cứu thông tin khai thác để bắt đầu.</p><div class="welcomeFoot">AN TOÀN · CHÍNH XÁC · PHỐI HỢP</div></section>';
   document.body.appendChild(welcome);
   const st=document.createElement('style');st.textContent='#sagsWelcome{display:none;position:fixed;inset:0;z-index:7;overflow:auto;color:#fff;background:#063758;font-family:Arial,sans-serif}body.v157-authenticated.v157-home #sagsWelcome{display:block}.welcomeSky{position:absolute;inset:0;overflow:hidden;pointer-events:none}.welcomeSky svg{width:100%;height:100%;object-fit:cover}.welcomeContent{position:relative;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;box-sizing:border-box;padding:90px max(7vw,28px);max-width:780px}.welcomeEyebrow{font-size:13px;letter-spacing:4px;color:#8ee1d3;font-weight:700}.welcomeContent h1{font-size:clamp(32px,4.5vw,58px);line-height:1.16;margin:24px 0}.welcomeContent p{font-size:17px;line-height:1.7;color:#d2e8ed;margin:0 0 30px}.welcomeActions{display:flex;flex-wrap:wrap;gap:12px}.welcomeActions button{border:1px solid #ffffff55;background:#ffffff15;border-radius:12px;color:white;padding:16px 22px;font:bold 15px Arial;cursor:pointer}.welcomeActions button:first-child{background:#dcfff2;color:#084b57;border-color:#dcfff2}.welcomeFoot{margin-top:50px;font-size:11px;letter-spacing:3px;color:#8dbec8}body.v157-home #sagsV61DraftStatus,body.v157-home #csgBtn{display:none!important}@media(min-width:900px){#sagsWelcome{left:244px}.welcomeContent{padding-left:60px;padding-right:30px;max-width:650px}.welcomeContent h1{font-size:clamp(32px,4vw,50px)}}@media(max-width:640px){.welcomeContent{justify-content:flex-end;padding-bottom:70px;background:linear-gradient(0deg,#063758dd,transparent)}.welcomeSky svg{width:180%;margin-left:-50%;height:65%}.welcomeContent h1{margin-top:20px}.welcomeFoot{margin-top:30px}}';document.head.appendChild(st);
  }

  if(!$('sagsGoStartBtn')){const b=document.createElement('button');b.id='sagsGoStartBtn';b.type='button';b.textContent='⌂ TRANG CHỦ';b.onclick=goStart;b.setAttribute('aria-label','Trang chủ');document.body.appendChild(b);}
  if(!$('sagsGoStartStyle')){const st=document.createElement('style');st.id='sagsGoStartStyle';st.textContent='#sagsGoStartBtn{display:none;position:fixed;right:12px;top:calc(8px + env(safe-area-inset-top));z-index:30000;background:#08788b;color:white;border:2px solid white;border-radius:10px;padding:10px 12px;font:bold 13px Arial;box-shadow:0 2px 8px #0004}body.v157-authenticated #sagsGoStartBtn{display:block}#timeSkipModal>div{max-height:calc(100dvh - 100px);overflow:auto}';document.head.appendChild(st);}

  removeRetired();
  for(const id of ['v174DataHubClose','v181AdminClose']){
   const b=$(id);if(!b||b.dataset.v6444Back)continue;b.dataset.v6444Back='1';
   const base=b.onclick;b.textContent='← QUAY LẠI';b.setAttribute('aria-label','Quay lại Công việc');
   b.onclick=function(e){base?.call(this,e);if(!visible('fwcModal'))root.sagsV479GoHome?.();};
  }
  for(const id of ['v163FlightBtn','v163HomeBtn']){const b=$(id);if(b)b.textContent=id==='v163HomeBtn'?'← CÔNG VIỆC':'☰ MENU';}
  const menu=$('v163FlightBtn');if(menu){menu.onclick=()=>{if(matchMedia('(min-width:900px)').matches)document.body.classList.toggle('sags-menu-collapsed');else document.body.classList.toggle('v157-drawer-open');menu.setAttribute('aria-expanded',String(matchMedia('(min-width:900px)').matches?!document.body.classList.contains('sags-menu-collapsed'):document.body.classList.contains('v157-drawer-open')));};}
  if(!$('sagsNavigationHeader')){const nav=document.createElement('header');nav.id='sagsNavigationHeader';nav.setAttribute('aria-label','Điều hướng chính');nav.innerHTML='<div class="sagsNavBrand">✈ <strong>SAGS</strong><span>E-REPORT</span></div>';document.body.appendChild(nav);const st=document.createElement('style');st.textContent='#sagsNavigationHeader{display:none}body.v157-authenticated #sagsNavigationHeader{display:flex;position:fixed;top:0;left:244px;right:0;z-index:30000;min-height:64px;box-sizing:border-box;padding:calc(8px + env(safe-area-inset-top)) 16px 8px;align-items:center;gap:12px;background:#063047;color:white;border-bottom:1px solid #ffffff25}.sagsNavBrand{display:flex;align-items:center;gap:8px;flex:1;font:14px Arial;letter-spacing:1px}.sagsNavBrand span{font-size:11px;color:#a3cbd4}#sagsNavigationHeader button{position:static!important;display:block!important;min-height:44px;padding:10px 14px;border:1px solid #ffffff55;border-radius:9px;background:#ffffff0c;color:white;font:bold 13px Arial;box-shadow:none!important}#sagsNavigationHeader #v163FlightBtn{display:block!important}#sagsWelcome{padding-top:64px;box-sizing:border-box}.welcomeContent{min-height:calc(100dvh - 64px)}body.v157-authenticated #v163OperationNav #v163HomeBtn{display:none!important}@media(min-width:900px){body.v157-authenticated #v157Drawer#v157Drawer{display:flex!important;flex-direction:column!important;height:100dvh!important;width:280px!important;min-width:280px;max-width:280px;transform:none!important;visibility:visible!important;box-sizing:border-box;overflow:hidden}body.v157-authenticated #sagsNavigationHeader{left:280px}body.v157-authenticated #sagsWelcome{left:280px}body.v157-authenticated.sags-menu-collapsed #v157Drawer#v157Drawer{display:none!important;transform:translateX(-100%)!important;visibility:hidden!important;pointer-events:none}body.sags-menu-collapsed #sagsNavigationHeader,body.sags-menu-collapsed #sagsWelcome{left:0}.v157MenuItem{min-height:56px!important;flex-shrink:0!important;font-size:15px!important}.v157MenuItem strong,.v157MenuItem .v157MenuLabel{font-size:15px!important}#v157MenuBody{flex:1;min-height:0;overflow-y:auto!important}.v157DrawerHead,.v157DrawerFooter{flex-shrink:0!important}}@media(max-width:899px){body.v157-authenticated #sagsNavigationHeader{left:0;padding-left:12px;padding-right:12px}.sagsNavBrand span{display:none}#sagsNavigationHeader #v163FlightBtn{display:block!important}body.v157-authenticated #v157Drawer{position:fixed;left:0;top:0;bottom:0;width:min(320px,calc(100vw - 48px));max-width:calc(100vw - 48px);height:100dvh!important;max-height:100dvh;display:flex!important;transform:translateX(-105%)!important;visibility:hidden;overflow:hidden;padding-top:calc(64px + env(safe-area-inset-top));box-sizing:border-box;z-index:29999}body.v157-drawer-open #v157Drawer{transform:translateX(0)!important;visibility:visible}.v157DrawerHead,.v157DrawerFooter{flex-shrink:0}#v157MenuBody{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}body.v157-drawer-open #v157DrawerBackdrop{z-index:29998!important;top:64px!important;pointer-events:auto!important}#sagsWelcome{left:0}.welcomeContent{padding-top:40px}}';document.head.appendChild(st);}
  const nav=$('sagsNavigationHeader');if(nav&&!nav.__sagsMeasuredHeader){nav.__sagsMeasuredHeader=true;new ResizeObserver(()=>document.body.style.setProperty('--sags-navigation-height',Math.ceil(nav.getBoundingClientRect().height)+'px')).observe(nav);}if(menu&&menu.parentElement!==nav){menu.setAttribute('aria-label','Mở menu chức năng');menu.setAttribute('aria-controls','v157Drawer');nav.prepend(menu);}const home=$('sagsGoStartBtn');if(home&&home.parentElement!==nav)nav.appendChild(home);
  // One measured mobile dock replaces independent fixed bars and their guessed offsets.
  const date=$('fwcDate');if(date&&!$('sagsWorkDatePicker')){const box=document.createElement('div');box.className='sagsWorkDateControl';date.replaceWith(box);box.appendChild(date);date.setAttribute('aria-label','Ngày công việc');const picker=document.createElement('button');picker.id='sagsWorkDatePicker';picker.type='button';picker.setAttribute('aria-label','Chọn ngày công việc');picker.title='Mở lịch chọn ngày';picker.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3"/></svg>';picker.onclick=()=>{try{if(typeof date.showPicker==='function')date.showPicker();else{date.focus();date.click();}}catch(_){date.focus();date.click();}};box.appendChild(picker);}
  const actions=$('v324FormActions'),operation=$('v163OperationNav');
  if(actions&&operation){let dock=$('sagsMobileFormDock');if(!dock){dock=document.createElement('div');dock.id='sagsMobileFormDock';dock.setAttribute('aria-label','Thao tác biểu mẫu');document.body.appendChild(dock);const measure=()=>{const h=Math.ceil(dock.getBoundingClientRect().height);document.body.style.setProperty('--sags-form-dock-height',h+'px');};new ResizeObserver(measure).observe(dock);window.addEventListener('resize',measure,{passive:true});}if(actions.parentElement!==dock)dock.appendChild(actions);if(operation.parentElement!==dock)dock.appendChild(operation);}

 }
 let queued=false;
 const schedule=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;install();},40);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 new MutationObserver(changes=>{if(changes.some(c=>[...c.addedNodes].some(n=>n instanceof HTMLElement&&(n.matches('button,[role=dialog],[id$=Modal],.toolbar-row')||n.querySelector('button,[role=dialog],[id$=Modal],.toolbar-row')))))schedule();}).observe(document.body,{childList:true,subtree:true});
 // Backdrop dismiss returns to the work list only when no other workspace is active.
 $('v157DrawerBackdrop')?.addEventListener('click',()=>{if(!visible('fwcModal')&&!visible('v174DataHub')&&!visible('v181AdminCenter')&&document.body.classList.contains('v157-home'))root.sagsV479GoHome?.();});
 root.__SAGS_WORKFLOW_V6444__={removed:['C04','C06','P01','P03','P04','P05','P06','P07','P08'],merged:['P02']};
 window.addEventListener('resize',()=>{if(matchMedia('(min-width:900px)').matches)document.body.classList.remove('v157-drawer-open');},{passive:true});
})(window);

/* One overlay layer, shared by legacy and registry dialogs. No business state is changed. */
(function(root){
 'use strict';
 const selector='[id$="Modal"],[id$="modal"],[id$="Dialog"],[id$="Popup"],[id$="Prompt"],.sagsAdminModal,[role="dialog"],[role="alertdialog"],#entry,#csgMgr,#v440Fm,#v440CustomRuntime,#v628CatalogPicker,#v174DataHub,#v181AdminCenter,#sagsQuickEntry';
 const managed=new Set(),stack=[],inputFonts=new WeakMap(),normalizedStyles=new Map(),styleProbe=document.createElement("div").style;let queued=false,viewportQueued=false,observer=null,utilityFolder=null;
 const $=id=>document.getElementById(id);
 function exposed(e){const c=getComputedStyle(e);return !e.hidden&&c.display!=='none'&&c.visibility!=='hidden'&&e.getClientRects().length>0;}
 function utilities(){
  const menu=$('v157MenuBody');if(!menu)return;
  let folder=$('sagsUtilities')||utilityFolder;
  if(folder&&folder.parentElement!==menu)menu.appendChild(folder);
  let storage=$('sagsIdbStorageBtn');
  if(!storage&&root.sagsIndexedDbFlightStoreV1?.showStorageReport){storage=document.createElement('button');storage.id='sagsIdbStorageBtn';storage.type='button';storage.textContent='💾 BỘ NHỚ';storage.title='Xem dung lượng lưu E-REPORT trên thiết bị này';storage.onclick=()=>void root.sagsIndexedDbFlightStoreV1.showStorageReport();}
  if(!storage)return;
  if(!folder){folder=document.createElement('details');folder.id='sagsUtilities';folder.innerHTML='<summary>⚙ Tiện ích thiết bị</summary><div class="sagsUtilityItems"></div>';menu.appendChild(folder);}
  utilityFolder=folder;const items=folder.querySelector('.sagsUtilityItems');
  if(storage.parentElement!==items){storage.removeAttribute('style');items.appendChild(storage);}
  if(storage.hidden)storage.hidden=false;if(storage.getAttribute('aria-label')!=='Xem bộ nhớ thiết bị')storage.setAttribute('aria-label','Xem bộ nhớ thiết bị');
 }
 function sync(){
  queued=false;observer?.disconnect();utilities();
  for(const e of document.querySelectorAll(selector)){
   if(!(e instanceof HTMLElement)||['BUTTON','INPUT'].includes(e.tagName)||e.id==='v440Overlay')continue;
   // The dialog role often belongs to a card inside an existing backdrop.
   if(e.parentElement?.closest(selector)&&e.matches('[role=dialog],[role=alertdialog]')&&!/(Modal|Popup|Prompt|Dialog)$/i.test(e.id))continue;
   if(getComputedStyle(e).position!=='fixed'&&!managed.has(e))continue;
   if(!managed.has(e)){
    managed.add(e);e.classList.add('sagsManagedOverlay');
    const children=[...e.children].filter(x=>!['SCRIPT','STYLE'].includes(x.tagName));
    if(children.length===1&&children[0].tagName!=='BUTTON')children[0].classList.add('sagsOverlayCard');
    else e.classList.add('sagsOverlayWorkspace');
   }
  }
  for(const e of managed)if(!e.isConnected){managed.delete(e);const i=stack.indexOf(e);if(i>=0)stack.splice(i,1);}
  const force=(e,props)=>{for(const [key,value] of Object.entries(props)){const token=key+'|'+value;if(!normalizedStyles.has(token)){styleProbe.cssText='';styleProbe.setProperty(key,value,'important');normalizedStyles.set(token,styleProbe.getPropertyValue(key));}const canonical=normalizedStyles.get(token);if(canonical&&(e.style.getPropertyValue(key)!==canonical||e.style.getPropertyPriority(key)!=='important'))e.style.setProperty(key,value,'important');}};
  for(const e of managed){
   const shown=e.isConnected&&exposed(e),index=stack.indexOf(e);
   if(shown&&index<0)stack.push(e);else if(!shown&&index>=0)stack.splice(index,1);
   // Hidden dialogs do not need layout/input normalization on every focus or click.
   // Normalize when they open, so viewport changes and newly added inputs are current.
   if(!shown)continue;
   force(e,{'position':'fixed','left':'0','right':'0','bottom':'auto','top':'var(--sags-overlay-top,0px)','width':'100%','height':'var(--sags-overlay-height,100vh)','max-height':'var(--sags-overlay-height,100vh)','min-height':'0','margin':'0','transform':'none','box-sizing':'border-box','padding':'max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))','align-items':'center','justify-content':'center','overflow':'hidden','z-index':'var(--sags-overlay-layer,2147483000)'});
   // Login and My Flight are viewport workspaces, not centered dialog cards.
   // Keep viewport/keyboard tracking and overlay ordering; let their layout differ.
   if(e.id==='roleLoginModal'){
    const mobile=matchMedia('(max-width:767px)').matches;
    force(e,{'padding':mobile?'calc(20px + env(safe-area-inset-top)) 22px calc(20px + env(safe-area-inset-bottom))':'54px 6vw','align-items':mobile?'stretch':'center','justify-content':'flex-end','overflow':'auto'});
   }else if(e.id==='fwcModal'){
    force(e,{'padding':matchMedia('(max-width:767px)').matches?'0':'20px','align-items':'stretch','justify-content':'center'});
   }else if(['quickTimeModal','fs09QuickModal'].includes(e.id)&&matchMedia('(max-width:767px)').matches){
    force(e,{'padding':'0','align-items':'stretch','justify-content':'center'});
   }
   if(e.id==='sagsQuickEntry'&&matchMedia('(max-width:767px)').matches)force(e,{'padding':'0','align-items':'flex-end','justify-content':'center'});
   const card=e.querySelector(':scope > .sagsOverlayCard');if(card)force(card,{'position':'relative','inset':'auto','transform':'none','margin':'0','min-width':'0','min-height':'0','max-width':'100%','max-height':'100%','box-sizing':'border-box','overflow':'auto'});
   if(card&&['quickTimeModal','fs09QuickModal'].includes(e.id))force(card,{'overflow':'hidden'});
   if(card?.id==='csgPanel'&&matchMedia('(max-width:899px)').matches)force(card,{'height':card.contains(document.activeElement)?'min(760px,calc(var(--sags-overlay-height,100vh) - 24px))':'auto','max-height':'min(100%,760px)'});
   for(const child of e.querySelectorAll('[class*="Footer"],[class*="footer"],[class*="Actions"],.actions'))if(getComputedStyle(child).position==='fixed')force(child,{'position':'static','inset':'auto','width':'100%','box-sizing':'border-box'});
   for(const input of e.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea,select'))if(!input.closest('.v440RuntimeField,.v440Box,#v440Overlay,#v440RuntimeBody')&&!input.hasAttribute('data-v440-bind')){if(!input.classList.contains('sagsDialogInput'))input.classList.add('sagsDialogInput');if(matchMedia('(max-width:899px)').matches){if(!inputFonts.has(input))inputFonts.set(input,{value:input.style.getPropertyValue('font-size'),priority:input.style.getPropertyPriority('font-size')});force(input,{'font-size':'16px'});}else if(inputFonts.has(input)){const saved=inputFonts.get(input);if(saved.value)input.style.setProperty('font-size',saved.value,saved.priority);else input.style.removeProperty('font-size');inputFonts.delete(input);}}
  }
  stack.forEach((e,i)=>{const z=String(2147483000+i*10);if(e.style.getPropertyValue('--sags-overlay-layer')!==z)e.style.setProperty('--sags-overlay-layer',z);});
  for(const node of [document.body,document.documentElement])if(node.classList.contains('sags-overlay-open')!==(stack.length>0))node.classList.toggle('sags-overlay-open',stack.length>0);
  const top=stack[stack.length-1];for(const e of managed)if(e.classList.contains('sagsOverlayTop')!==(e===top))e.classList.toggle('sagsOverlayTop',e===top);observer?.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(sync);}
 function viewport(){if(viewportQueued)return;viewportQueued=true;requestAnimationFrame(()=>{viewportQueued=false;const vv=root.visualViewport,h=Math.max(160,Math.round(vv?.height||root.innerHeight)),top=Math.max(0,Math.round(vv?.offsetTop||0));document.documentElement.style.setProperty('--sags-overlay-height',h+'px');document.documentElement.style.setProperty('--sags-overlay-top',top+'px');});}
 function start(){sync();viewport();observer=new MutationObserver(changes=>{if(changes.some(c=>c.type==='childList'?[...c.addedNodes,...c.removedNodes].some(n=>n instanceof HTMLElement&&(n.matches(selector+',input,textarea,select,#sagsIdbStorageBtn,#v157MenuBody')||n.querySelector(selector+',input,textarea,select,#sagsIdbStorageBtn,#v157MenuBody'))):c.target===document.body||managed.has(c.target)||(c.target instanceof HTMLElement&&c.target.matches(selector))))schedule();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});root.addEventListener('resize',()=>{viewport();schedule();},{passive:true});root.visualViewport?.addEventListener('resize',viewport,{passive:true});root.visualViewport?.addEventListener('scroll',viewport,{passive:true});root.addEventListener('pageshow',schedule,{passive:true});document.addEventListener('focusin',schedule,true);document.addEventListener('focusout',schedule,true);}
 root.sagsOverlayLayout={refresh:schedule};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
