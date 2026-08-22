/* E-REPORT/SAGS V3.51 · Compact mobile operations toolbar.
 * Presentation-only module: it does not read or write Firebase and it keeps
 * every existing button handler and permission check unchanged.
 */
(function(root){
"use strict";
if(root.__SAGS_V351_COMPACT_TOOLBAR_LOADED)return;
root.__SAGS_V351_COMPACT_TOOLBAR_LOADED=true;

const BUILD="V3.51-20260822-01";

function ensureStyle(){
  if(document.getElementById("v351CompactToolbarStyle"))return;
  const st=document.createElement("style");
  st.id="v351CompactToolbarStyle";
  st.textContent=`
#v351AccountMenuBtn,#v351AccountMenu{display:none}
@media(max-width:760px){
  body.v38-clean-workflow .toolbar.compact-main-toolbar{
    display:flex!important;flex-flow:row nowrap!important;align-items:center!important;
    justify-content:flex-start!important;gap:4px!important;min-height:38px!important;
    max-height:calc(38px + env(safe-area-inset-bottom))!important;
    padding:4px max(5px,env(safe-area-inset-right)) calc(4px + env(safe-area-inset-bottom)) max(5px,env(safe-area-inset-left))!important;
    border-radius:10px 10px 0 0!important;overflow-x:auto!important;overflow-y:hidden!important;
    scroll-snap-type:x proximity;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;
  }
  body.v38-clean-workflow .toolbar.compact-main-toolbar::-webkit-scrollbar{display:none!important}
  body.v38-clean-workflow .toolbar.compact-main-toolbar>.badge,
  body.v38-clean-workflow .toolbar.compact-main-toolbar>.toolbar-row.main-actions{display:none!important}

  body.v38-clean-workflow #roleAccountCluster{
    position:sticky!important;left:0!important;right:auto!important;top:auto!important;bottom:auto!important;
    order:0!important;display:flex!important;flex:0 0 auto!important;align-items:center!important;
    height:29px!important;min-height:29px!important;gap:3px!important;margin:0!important;padding:0 3px 0 0!important;
    border-radius:7px!important;background:#0867aa!important;z-index:5!important;box-shadow:5px 0 7px rgba(7,94,159,.20)!important;
    scroll-snap-align:start;
  }
  body.v38-clean-workflow #roleStatusBadge{
    display:flex!important;max-width:112px!important;height:27px!important;min-height:27px!important;
    padding:0 6px!important;border-radius:7px!important;font:900 9px/1 Arial,sans-serif!important;
    overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;
  }
  body.v38-clean-workflow #roleChangePasswordBtn,
  body.v38-clean-workflow #roleLogoutBtn{display:none!important}
  body.v38-clean-workflow #v351AccountMenuBtn{
    display:inline-flex!important;align-items:center!important;justify-content:center!important;
    width:27px!important;min-width:27px!important;height:27px!important;min-height:27px!important;
    padding:0!important;margin:0!important;border:1px solid rgba(255,255,255,.25)!important;
    border-radius:7px!important;background:#174f78!important;color:#fff!important;
    font:900 17px/1 Arial,sans-serif!important;box-shadow:none!important;
  }

  body.v38-clean-workflow #v324FormActions{order:10!important;flex:0 0 auto!important;width:auto!important;min-width:0!important}
  body.v38-clean-workflow #v324FormActions.show{display:flex!important;grid-template-columns:none!important;gap:4px!important}
  body.v38-clean-workflow #v313QuickContext{order:20!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;padding:0!important;margin:0!important}
  body.v38-clean-workflow #v320NaContext{order:21!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;padding:0!important;margin:0!important}
  body.v38-clean-workflow #v313QuickContext.show,
  body.v38-clean-workflow #v320NaContext.show{display:flex!important;grid-template-columns:none!important}
  body.v38-clean-workflow #v313QuickContextHint,
  body.v38-clean-workflow #v320NaHint{display:none!important}
  body.v38-clean-workflow #v38CleanNav{
    order:30!important;display:flex!important;flex:0 0 auto!important;flex-wrap:nowrap!important;
    width:auto!important;min-width:0!important;gap:4px!important;padding:0!important;margin:0!important;
    overflow:visible!important;scrollbar-width:none!important;align-items:center!important;
  }
  body.v38-clean-workflow #v38CleanNav::-webkit-scrollbar{display:none!important}

  body.v38-clean-workflow #v324FormActions button,
  body.v38-clean-workflow #v313QuickContextBtn,
  body.v38-clean-workflow #v320NaBtn,
  body.v38-clean-workflow #v38CleanNav .v38NavBtn{
    display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto!important;
    width:auto!important;min-width:0!important;height:29px!important;min-height:29px!important;
    max-height:29px!important;padding:0 8px!important;margin:0!important;border-radius:7px!important;
    font:900 9.5px/1 Arial,sans-serif!important;white-space:nowrap!important;box-shadow:none!important;
    scroll-snap-align:start;touch-action:manipulation!important;
  }
  body.v38-clean-workflow #v324HandoverBtn{max-width:105px!important;overflow:hidden!important;text-overflow:ellipsis!important}
  body.v38-clean-workflow #v342Badge{
    min-width:16px!important;height:16px!important;padding:0 4px!important;margin-left:3px!important;
    border-radius:999px!important;font:900 9px/16px Arial,sans-serif!important;
  }
  body.v38-clean-workflow{padding-bottom:calc(48px + env(safe-area-inset-bottom))!important}

  #v351AccountMenu{
    position:fixed;left:max(6px,env(safe-area-inset-left));bottom:calc(44px + env(safe-area-inset-bottom));
    z-index:80000;width:min(210px,72vw);padding:6px;border:1px solid #cbd9e4;border-radius:11px;
    background:#fff;box-shadow:0 8px 26px rgba(0,31,55,.30);box-sizing:border-box;
  }
  #v351AccountMenu.show{display:grid;gap:5px}
  #v351AccountMenu button{width:100%;min-height:36px;border:0;border-radius:8px;padding:7px 10px;font:900 11px Arial,sans-serif;text-align:left}
  #v351AccountChange{background:#e9f4ff;color:#07599d}
  #v351AccountLogout{background:#fff0ee;color:#a61f17}
}
@media print{#v351AccountMenuBtn,#v351AccountMenu{display:none!important}}
`;
  document.head.appendChild(st);
}

function closeMenu(){const m=document.getElementById("v351AccountMenu"),b=document.getElementById("v351AccountMenuBtn");m?.classList.remove("show");b?.setAttribute("aria-expanded","false")}
function toggleMenu(){const m=document.getElementById("v351AccountMenu");if(!m)return;const open=!m.classList.contains("show");m.classList.toggle("show",open);document.getElementById("v351AccountMenuBtn")?.setAttribute("aria-expanded",open?"true":"false")}

function ensureAccountMenu(){
  const cluster=document.getElementById("roleAccountCluster");if(!cluster)return;
  let b=document.getElementById("v351AccountMenuBtn");
  if(!b){b=document.createElement("button");b.id="v351AccountMenuBtn";b.type="button";b.textContent="⋮";b.title="Tài khoản";b.setAttribute("aria-label","Mở công cụ tài khoản");b.setAttribute("aria-expanded","false");b.onclick=e=>{e.stopPropagation();toggleMenu()};cluster.appendChild(b)}
  if(!document.getElementById("v351AccountMenu")){
    const m=document.createElement("div");m.id="v351AccountMenu";m.setAttribute("role","menu");m.innerHTML='<button id="v351AccountChange" type="button" role="menuitem">🔑 ĐỔI MẬT KHẨU</button><button id="v351AccountLogout" type="button" role="menuitem">↪ ĐĂNG XUẤT</button>';document.body.appendChild(m);
    document.getElementById("v351AccountChange").onclick=()=>{closeMenu();document.getElementById("roleChangePasswordBtn")?.click()};
    document.getElementById("v351AccountLogout").onclick=()=>{closeMenu();document.getElementById("roleLogoutBtn")?.click()};
  }
}

function install(){ensureStyle();ensureAccountMenu();document.body.classList.add("v351-compact-toolbar");setTimeout(()=>root.v313QuickTimeRefresh?.(),0)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,250),{once:true});else setTimeout(install,250);
root.addEventListener("pageshow",()=>setTimeout(install,120),{passive:true});
document.addEventListener("click",e=>{if(!e.target.closest?.("#v351AccountMenu,#v351AccountMenuBtn"))closeMenu()},{passive:true});
root.__SAGS_V351_COMPACT_TOOLBAR_BUILD=BUILD;
root.__SAGS_V351_COMPACT_TOOLBAR_HDSD="V3.51: Trên điện thoại, thanh công cụ được gom thành một hàng chip cuộn ngang cao 29px. Tài khoản dùng nút ba chấm để mở ĐỔI MẬT KHẨU/ĐĂNG XUẤT; không đổi quyền, thao tác hay dữ liệu Firebase.";
})(typeof window!=="undefined"?window:globalThis);
