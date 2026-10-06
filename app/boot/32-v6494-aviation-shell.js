/* E-REPORT SAGS V6.4.101 · Final Aviation Operations shell
   Presentation/navigation adapter only. Existing business handlers remain authoritative. */
(function(root){
'use strict';
const BUILD='V6.4.101-20261006-MOBILE-UX-SPEED-01';
if(root.__SAGS_V6494_AVIATION_SHELL__===BUILD)return;
root.__SAGS_V6494_AVIATION_SHELL__=BUILD;
const $=id=>document.getElementById(id);
const S=v=>String(v??'').trim();
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS={
 home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z"/></svg>',
 myflight:'<svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-7-7-3 7-2z"/></svg>',
 archive:'<svg viewBox="0 0 24 24"><path d="M4 6h16v14H4zM7 3h10v3M8 10h8M8 14h5"/></svg>',
 guide:'<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5zm0 0V22"/></svg>',
 closeout:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
 final:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></svg>',
 cross:'<svg viewBox="0 0 24 24"><path d="M4 7h12l-3-3m3 3-3 3M20 17H8l3-3m-3 3 3 3"/></svg>',
 datahub:'<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 19v2h16v-2"/></svg>',
 alerts:'<svg viewBox="0 0 24 24"><path d="m12 3 9 17H3L12 3zm0 6v5m0 3h.01"/></svg>',
 notice:'<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
 adcontrol:'<svg viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V7l8-4zm-3 9 2 2 4-4"/></svg>',
 settings:'<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4 2 1-2 3-2-.5a8 8 0 0 1-2 2L16 20h-4l-.5-2.5a8 8 0 0 1-2-1.2L7 17l-2-3 2-2a8 8 0 0 1 .3-2.3L5 8l2-3 2.5.7a8 8 0 0 1 2-1.2L12 2h4l.5 2.5a8 8 0 0 1 2 1.2L21 5l2 3-2.3 1.7A8 8 0 0 1 20 12z"/></svg>',
 logout:'<svg viewBox="0 0 24 24"><path d="M10 4H4v16h6M14 8l4 4-4 4m4-4H9"/></svg>',
 search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'
};
const DEF=[
 {group:'KHAI THÁC',items:[
  {key:'home',label:'Trang chủ',meta:'Tổng quan hoạt động'},
  {key:'myflight',label:'My Flight',meta:'Công việc của tôi'},
  {key:'archive',label:'Hồ sơ chuyến bay',meta:'Hồ sơ theo chuyến'},
  {key:'guide',label:'Sổ tay hãng',meta:'Tài liệu khai thác'}
 ]},
 {group:'NGHIỆP VỤ CHUYẾN',items:[
  {key:'closeout',label:'Kết sổ',meta:'Kết sổ theo chuyến'},
  {key:'final',label:'FINAL',meta:'Biểu mẫu cuối chuyến'},
  {key:'cross',label:'Crosscheck',meta:'Công việc cần kiểm tra'}
 ]},
 {group:'HỆ THỐNG',items:[
  {key:'datahub',label:'Dữ liệu khai thác',meta:'Roster · A/C Limits · Fleet'},
  {key:'alerts',label:'Cảnh báo khai thác',meta:'A/C Limits'},
  {key:'notice',label:'Thông báo',meta:'Thông tin nghiệp vụ'},
  {key:'adcontrol',label:'AD Control Center',meta:'Quản trị hệ thống'},
  {key:'settings',label:'Cài đặt',meta:'Giao diện & tùy chọn'}
 ]}
];
let syncing=false,stateObserver=null,lastMenuSignature='',syncFrame=0;
function session(){try{return root.__sagsGetSession?.()||{}}catch(_){return{}}}
function profile(){const s=session();return s.profile||root.currentUserProfile||{}}
function role(){const s=session(),p=profile();return S(s.role||p.role||root.currentRole).toUpperCase()}
function isShown(el){if(!el)return false;try{const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)!==0}catch(_){return true}}
function loginVisible(){return isShown($('roleLoginModal'))}
function auth(){return document.body.classList.contains('v157-authenticated')&&!loginVisible()}
function overlayVisible(){
 const ids=['fwcModal','v174DataHub','v181AdminCenter','appUpdateModal','roleChangePasswordModal','quickTimeModal','fs09QuickModal','finalPaperModal','flightSessionModal','accountManagerModal','auditManagerModal','activityMonitorModal','fleetManagerModal','kh208ManagerModal','finalSheetManagerModal','fs09SheetManagerModal'];
 return ids.some(id=>{const e=$(id);return !!e&&(e.classList.contains('show')||e.classList.contains('open')||isShown(e)&&id!=='fwcModal'&&e.getAttribute('aria-hidden')==='false')});
}
function homeState(){return auth()&&document.body.classList.contains('v157-home')&&!overlayVisible()}
function legacyButton(key){return document.querySelector('.v157MenuItem[data-v157-key="'+key+'"]')}
function available(key){
 if(key==='home')return true;
 if(key==='settings')return typeof root.sagsOpenSettings==='function'||!!legacyButton('settings');
 const b=legacyButton(key);return !!b&&!b.disabled&&!b.hidden;
}
function trigger(key){
 if(key==='home'){try{root.sagsV479GoHome?.()}catch(_){}sync();return}
 if(key==='notice'&&typeof root.sagsFlightNoticeOpen==='function'){root.sagsFlightNoticeOpen();return}
 if(key==='settings'){
   const b=legacyButton('settings');
   if(b&&!b.disabled){b.click();return}
   try{root.sagsOpenSettings?.()}catch(e){console.error('Settings home action failed',e)}return;
 }
 const b=legacyButton(key);if(b&&!b.disabled){b.click();scheduleSync();setTimeout(scheduleSync,120);return}
}
function todayText(){try{return new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}catch(_){return new Date().toLocaleDateString()}}
function ensure(){
 let el=$('v6494AviationHome');if(el)return el;
 el=document.createElement('div');el.id='v6494AviationHome';el.setAttribute('aria-hidden','true');
 el.innerHTML='<aside class="v6494Side">'+
  '<div class="v6494Brand"><img src="assets/branding/logo.png" alt="SAGS"><div><b>E-REPORT <span>SAGS</span></b><small>AIRPORT GROUND OPERATIONS</small></div></div>'+
  '<div class="v6494Profile"><div class="v6494Avatar" id="v6494Avatar">U</div><div><small>Xin chào,</small><b id="v6494Name">Người dùng</b><span id="v6494Role">—</span></div></div>'+
  '<nav class="v6494Nav" id="v6494Nav"></nav>'+
  '<div class="v6494Account"><button type="button" data-v6494-account="settings">'+ICONS.settings+'<span>Cài đặt</span></button><button type="button" data-v6494-account="logout">'+ICONS.logout+'<span>Đăng xuất</span></button></div>'+
 '</aside>'+
 '<section class="v6494Main">'+
  '<header class="v6494Top"><div class="v6494MobileBrand"><b>E-REPORT <span>SAGS</span></b><small>AIRPORT GROUND OPERATIONS</small></div><label class="v6494Search">'+ICONS.search+'<input id="v6494Search" type="search" placeholder="Tìm chuyến bay, số hiệu, sân bay..." autocomplete="off"></label><button class="v6494Notice" type="button" data-v6494-key="notice" aria-label="Thông báo">'+ICONS.notice+'</button><div class="v6494TopUser"><div class="v6494TopAvatar" id="v6494TopAvatar">U</div><div class="v6494TopIdentity"><b id="v6494TopName">Người dùng</b><small id="v6494TopRole">—</small></div></div></header>'+
  '<div class="v6494Scroll">'+
   '<div class="v6494MobileProfile"><div class="v6494Avatar" id="v6494MobileAvatar">U</div><div class="v6494MobileIdentity"><small>Xin chào,</small><b id="v6494MobileName">Người dùng</b><span id="v6494MobileRole">—</span></div><button class="v6494MobileLogout" type="button" data-v6494-account="logout" aria-label="Đăng xuất">'+ICONS.logout+'<span>Đăng xuất</span></button></div>'+
   '<div class="v6494Hero"><div><small>E-REPORT SAGS</small><h1>E-REPORT <span>SAGS</span></h1><p class="v6494HeroDesktop">Đồng hành cùng<br>mỗi chuyến bay an toàn.</p><p class="v6494HeroMobile">VÌ MỘT SÂN BAY<br>AN TOÀN VÀ HIỆU QUẢ HƠN</p><button type="button" data-v6494-key="myflight">'+ICONS.myflight+'<span>Mở My Flight</span></button></div></div>'+
   '<div class="v6494QuickHead"><div><small>HÔM NAY</small><h2 id="v6494Date"></h2></div><span>OPERATIONS CONSOLE</span></div>'+
   '<div class="v6494QuickGrid">'+
    '<button type="button" data-v6494-key="myflight"><i>'+ICONS.myflight+'</i><span><small>CÔNG VIỆC</small><b>My Flight</b><em>Chuyến được phân công</em></span></button>'+
    '<button type="button" data-v6494-key="archive"><i>'+ICONS.archive+'</i><span><small>HỒ SƠ</small><b>Hồ sơ chuyến</b><em>Theo dõi hồ sơ nghiệp vụ</em></span></button>'+
    '<button type="button" data-v6494-key="cross"><i>'+ICONS.cross+'</i><span><small>KIỂM TRA</small><b>Crosscheck</b><em>Việc cần đối chiếu</em></span></button>'+
   '</div>'+
   '<section class="v6494Work"><div class="v6494SectionHead"><div><small>MENU CHỨC NĂNG</small><h2>Không gian làm việc</h2></div><p>Hiển thị theo đúng quyền của tài khoản</p></div><div class="v6494MobileMenu" id="v6494MobileMenu"></div></section>'+
  '</div>'+
  '<nav class="v6494Bottom"><button class="active" type="button" data-v6494-key="home">'+ICONS.home+'<span>Trang chủ</span></button><button type="button" data-v6494-key="myflight">'+ICONS.myflight+'<span>My Flight</span></button><button type="button" data-v6494-key="notice">'+ICONS.notice+'<span>Thông báo</span></button></nav>'+
 '</section>';
 document.body.appendChild(el);
 el.addEventListener('click',e=>{
   const b=e.target.closest('[data-v6494-key]');if(b){e.preventDefault();trigger(b.dataset.v6494Key);return}
   const a=e.target.closest('[data-v6494-account]');if(a){e.preventDefault();if(a.dataset.v6494Account==='logout'){$('v157LogoutBtn')?.click()}else trigger('settings')}
 });
 const search=el.querySelector('#v6494Search');
 search?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=S(search.value);trigger('myflight');if(q)setTimeout(()=>{const x=$('sagsFlightSearch')||$('fwcFlightSearch')||document.querySelector('#fwcModal input[type="search"]');if(x){x.value=q;x.dispatchEvent(new Event('input',{bubbles:true}))}},260)});
 return el;
}
function menuCard(item,compact=false){
 const icon=ICONS[item.key]||ICONS.home;
 return '<button type="button" data-v6494-key="'+esc(item.key)+'" class="'+(item.key==='home'?'active ':'')+(compact?'compact':'')+'"><i>'+icon+'</i><span><b>'+esc(item.label)+'</b><small>'+esc(item.meta||'')+'</small></span><em>›</em></button>';
}
function renderMenus(){
 const el=ensure(),nav=el.querySelector('#v6494Nav'),mobile=el.querySelector('#v6494MobileMenu');
 let navHtml='',mobileHtml='';
 for(const sec of DEF){
  const items=sec.items.filter(x=>available(x.key));
  if(!items.length)continue;
  navHtml+='<section><h3>'+esc(sec.group)+'</h3>'+items.map(x=>menuCard(x,true)).join('')+'</section>';
  mobileHtml+='<div class="v6494MobileGroup"><h3>'+esc(sec.group)+'</h3><div>'+items.map(x=>menuCard(x,false)).join('')+'</div></div>';
 }
 const sig=navHtml+'\u0000'+mobileHtml;if(sig===lastMenuSignature)return;lastMenuSignature=sig;
 nav.innerHTML=navHtml;mobile.innerHTML=mobileHtml;
}
function syncIdentity(){
 const p=profile(),r=role()||'—';let pref={};try{pref=typeof root.sagsGetSettings==='function'?root.sagsGetSettings()||{}:{}}catch(_){}
 const name=S(pref.displayName||p.name||p.fullName||p.displayName||p.username||p.userName||r||'Người dùng'),photo=S(pref.avatarData);
 const initial=(name.match(/[A-ZÀ-Ỹ0-9]/iu)?.[0]||'U').toUpperCase(),put=(id,v)=>{const e=$(id);if(e&&e.textContent!==v)e.textContent=v};
 const avatar=id=>{const e=$(id);if(!e)return;const has=!!photo;e.dataset.sagsAvatar=has?'image':'initial';e.dataset.sagsUserAvatar='1';e.style.backgroundImage=has?'url("'+photo.replace(/"/g,'%22')+'")':'';e.textContent=has?'':initial;e.title=name};
 for(const id of['v6494Name','v6494TopName','v6494MobileName'])put(id,name);
 for(const id of['v6494Role','v6494TopRole','v6494MobileRole'])put(id,r);
 for(const id of['v6494Avatar','v6494TopAvatar','v6494MobileAvatar'])avatar(id);
 put('v6494Date',todayText());
}
function sync(){
 if(syncing)return;syncing=true;
 try{
  const el=ensure();renderMenus();syncIdentity();
  const show=homeState(),wasShown=el.classList.contains('show');
  el.classList.toggle('show',show);const hidden=show?'false':'true';if(el.getAttribute('aria-hidden')!==hidden)el.setAttribute('aria-hidden',hidden);
  document.body.classList.toggle('v6494-home-active',show);
  if(show)document.body.classList.remove('v157-drawer-open');
  if(show&&!wasShown)root.dispatchEvent(new Event('sags:home-shown'));
 }finally{syncing=false}
}
function scheduleSync(){
 if(syncFrame)return;
 syncFrame=requestAnimationFrame(()=>{syncFrame=0;sync()});
}
function observeStateTargets(){
 try{stateObserver?.disconnect()}catch(_){}
 stateObserver=new MutationObserver(scheduleSync);
 const cfg={attributes:true,attributeFilter:['class','style','aria-hidden','hidden']};
 try{stateObserver.observe(document.body,{attributes:true,attributeFilter:['class']})}catch(_){}
 const ids=['roleLoginModal','fwcModal','v174DataHub','v181AdminCenter','appUpdateModal','roleChangePasswordModal','quickTimeModal','fs09QuickModal','finalPaperModal','flightSessionModal','accountManagerModal','auditManagerModal','activityMonitorModal','fleetManagerModal','kh208ManagerModal','finalSheetManagerModal','fs09SheetManagerModal'];
 for(const id of ids){const el=$(id);if(el)try{stateObserver.observe(el,cfg)}catch(_){}}
}
function boot(){
 ensure();sync();observeStateTargets();
 window.addEventListener('pageshow',()=>{observeStateTargets();scheduleSync()},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){observeStateTargets();scheduleSync()}},{passive:true});
 ['sags:login','sags:logout','sags:rolechange','sags:profilechange','sags:ui-ready','sags:profile-display-updated'].forEach(name=>root.addEventListener?.(name,()=>{observeStateTargets();scheduleSync()}));
 document.addEventListener('click',e=>{if(e.target?.closest?.('[data-v6494-key],[data-v6494-account],#v157LogoutBtn,.fwcHead button,.sagsAdminTopActions button'))setTimeout(scheduleSync,0)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
