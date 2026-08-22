/* E-REPORT/SAGS V3.50 · Flight dossier shortcuts.
 * Every shortcut opens the same shared flight_records dossier. This module
 * never creates a second document store and never adds a Firebase listener.
 */
(function(root){
"use strict";
if(root.__SAGS_V350_WORKSPACE_DOCUMENTS_LOADED)return;
root.__SAGS_V350_WORKSPACE_DOCUMENTS_LOADED=true;

const BUILD="V3.50-20260822-01";
const S=v=>String(v??"").trim();
const view={date:"",fid:"",label:""};

function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function hasFlightToken(v){return /(?:^|[^A-Z0-9])[A-Z0-9]{2,3}\s*[- ]?\s*\d{1,5}(?:[^A-Z0-9]|$)/i.test(S(v))}
function currentHint(){try{const modal=document.getElementById("finalFormsModal"),r=root.currentFinalSheetRecord?.();if(modal&&getComputedStyle(modal).display!=="none"&&r&&(r.flightId||hasFlightToken(r.flightToken||r.name)))return true}catch(_){}try{const m=root.currentFlightSessionMeta?.(),st=(typeof state!=="undefined"&&state)||root.state||{};return !!(S(m?.rosterFlightId||m?.flightId)||hasFlightToken([m?.name,st.fltBefore,st.fltAfter,st.f421_fltBefore,st.f421_fltAfter,st.f551_fltBefore,st.f551_fltAfter,st.f09_fltBefore,st.f09_fltAfter].filter(Boolean).join(" / ")))}catch(_){return false}}
function workspaceDate(){return S(document.getElementById("fwcDate")?.value||view.date||sessionStorage.getItem("sagsV36FwcDate")||today())}
function parseFid(button){const code=S(button?.getAttribute("onclick")),m=code.match(/flightWorkspaceOpenFlight\(['"]([^'"]+)['"]\)/);return S(m?.[1])}

function ensureStyle(){if(document.getElementById("v350DossierShortcutStyle"))return;const st=document.createElement("style");st.id="v350DossierShortcutStyle";st.textContent=`
  .v350DossierBtn{background:#0f766e!important;color:#fff!important;border-color:#0b5f59!important}
  .v350CardActions{display:grid;gap:6px;align-self:stretch}.v350CardActions>.fwcBtn{width:100%}
  #roleBtnCurrentFlightDossier{order:-118!important;flex:0 0 auto!important;background:#0f766e!important;color:#fff!important;border-color:#0b5f59!important}
  #v350CurrentFlightDossierNav{background:#eafaf6!important;color:#0f6b5d!important;border-color:#a9ddd3!important}
  #v350Fs09DossierBtn{position:absolute;top:5.2%;left:1.8%;z-index:29;min-height:38px;padding:7px 10px;border:0;border-radius:9px;background:#0f766e;color:#fff;font:900 11px Arial,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.25)}
  @media(max-width:620px){#roleBtnCurrentFlightDossier{font-size:10px!important}#v350Fs09DossierBtn{font-size:10px}}
`;document.head.appendChild(st)}

root.sagsV350OpenFlightDossier=function(date,fid,label=""){if(typeof root.sagsV338OpenDossier!=="function")return alert("HỒ SƠ CHUYẾN chưa sẵn sàng.");return root.sagsV338OpenDossier(S(date)||today(),S(fid),S(label),false)};

function injectWorkspaceButtons(){const body=document.getElementById("fwcBody");if(!body)return;const date=workspaceDate();for(const card of body.querySelectorAll(".fwcFlight")){if(card.querySelector(".v350CardDossierBtn"))continue;const open=card.querySelector('button[onclick*="flightWorkspaceOpenFlight"]'),fid=parseFid(open);if(!fid||!open)continue;const label=S(card.querySelector(".fwcFlightTitle")?.textContent),actions=document.createElement("div");actions.className="v350CardActions";open.replaceWith(actions);actions.appendChild(open);const b=document.createElement("button");b.type="button";b.className="fwcBtn v350DossierBtn v350CardDossierBtn";b.textContent="📁 HỒ SƠ";b.title="Hồ sơ chuyến bay này";b.onclick=()=>root.sagsV350OpenFlightDossier(date,fid,label);actions.appendChild(b)}const back=body.querySelector(".fwcBack");if(back&&view.fid&&!back.querySelector(".v350DetailDossierBtn")){const b=document.createElement("button");b.type="button";b.className="fwcBtn v350DossierBtn v350DetailDossierBtn";b.textContent="📁 HỒ SƠ CHUYẾN BAY NÀY";b.onclick=()=>root.sagsV350OpenFlightDossier(view.date||date,view.fid,view.label);back.appendChild(b)}}

function injectFormShortcuts(){ensureStyle();const visible=currentHint(),toolbar=document.querySelector(".compact-main-toolbar .toolbar-row.main-actions")||document.querySelector(".toolbar-row.main-actions");if(toolbar){let b=document.getElementById("roleBtnCurrentFlightDossier");if(!b){b=document.createElement("button");b.id="roleBtnCurrentFlightDossier";b.type="button";b.textContent="📁 HỒ SƠ CHUYẾN";b.title="Hồ sơ chuyến bay này";b.onclick=()=>root.sagsV338OpenCurrentDossier?.();const anchor=document.getElementById("roleBtnFlights");anchor?.insertAdjacentElement("afterend",b)||toolbar.appendChild(b)}b.style.display=visible?"inline-flex":"none"}const nav=document.getElementById("v38CleanNav");if(nav){let b=document.getElementById("v350CurrentFlightDossierNav");if(!b){b=document.createElement("button");b.id="v350CurrentFlightDossierNav";b.type="button";b.className="v38NavBtn";b.textContent="📁 HỒ SƠ CHUYẾN";b.title="Hồ sơ chuyến bay này";b.onclick=()=>root.sagsV338OpenCurrentDossier?.();const anchor=document.getElementById("v38NavFlights");anchor?.insertAdjacentElement("afterend",b)||nav.appendChild(b)}b.style.display=visible?"inline-flex":"none"}const finalBtn=document.getElementById("v338FinalDossierBtn");if(finalBtn){finalBtn.title="Hồ sơ chuyến bay này";finalBtn.setAttribute("aria-label","Hồ sơ chuyến bay này")}const page=document.getElementById("page11");if(page&&!document.getElementById("v350Fs09DossierBtn")){const b=document.createElement("button");b.id="v350Fs09DossierBtn";b.type="button";b.textContent="📁 HỒ SƠ CHUYẾN";b.title="Hồ sơ chuyến bay này";b.onclick=()=>root.sagsV338OpenCurrentDossier?.();page.appendChild(b)}const fs=document.getElementById("v350Fs09DossierBtn");if(fs)fs.style.display=visible?"block":"none"}

function wrapWorkspace(){const list=root.flightWorkspaceOpenList;if(typeof list==="function"&&!list.__v350dossier){const w=function(date){view.date=S(date)||workspaceDate();view.fid="";view.label="";const r=list.apply(this,arguments);Promise.resolve(r).finally(()=>{setTimeout(injectWorkspaceButtons,40);setTimeout(injectWorkspaceButtons,420)});return r};w.__v350dossier=true;w.__v350dossierBase=list;root.flightWorkspaceOpenList=w;try{flightWorkspaceOpenList=w}catch(_){}}const open=root.flightWorkspaceOpenFlight;if(typeof open==="function"&&!open.__v350dossier){const w=function(fid){view.date=workspaceDate();view.fid=S(fid);view.label=S(document.querySelector(`.fwcFlight button[onclick*="${S(fid)}"]`)?.closest(".fwcFlight")?.querySelector(".fwcFlightTitle")?.textContent);const r=open.apply(this,arguments);setTimeout(injectWorkspaceButtons,40);return r};w.__v350dossier=true;w.__v350dossierBase=open;root.flightWorkspaceOpenFlight=w;try{flightWorkspaceOpenFlight=w}catch(_){}}}

function install(){ensureStyle();wrapWorkspace();injectWorkspaceButtons();injectFormShortcuts()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,700),{once:true});else setTimeout(install,700);
setInterval(injectFormShortcuts,1500);
root.addEventListener("pageshow",()=>setTimeout(install,220),{passive:true});
root.__SAGS_V350_WORKSPACE_DOCUMENTS_BUILD=BUILD;
root.__SAGS_V350_WORKSPACE_DOCUMENTS_HDSD="V3.50: Flight Workspace, RAMP, FINAL và KẾT SỔ/PVHK đều có lối tắt HỒ SƠ CHUYẾN BAY NÀY. Mọi nút mở cùng flight_records dossier; không nhân bản hồ sơ, không gắn listener mới và dùng cache 45 giây.";
})(typeof window!=="undefined"?window:globalThis);
