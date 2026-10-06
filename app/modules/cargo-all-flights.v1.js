/* E-REPORT SAGS V6.4.48 · CARGO ALL FLIGHTS AUTHORITY */
(function(root){
'use strict';
const BUILD='V6.4.48-20261002-CARGO-ALL-FLIGHTS-FIX-01',S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase();
function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return{role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
function isCargo(){const s=session(),p=s.profile||{};const r=U(s.role||p.role||root.currentRole),text=U([r,p.roleCode,p.groupCode,p.unit,p.workUnit,p.departmentCode,p.systemDepartment,p.systemDept,p.department,p.group,p.jobTitle].filter(Boolean).join(' '));return r==='KH'||r==='CARGO'||U(p.groupCode)==='KH'||/KHO HÀNG|KHO HANG|CARGO/.test(text)}
function dateNow(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}}
function relabel(){
 if(!isCargo())return;
 const menu=document.querySelector('.v157MenuItem[data-v157-key="myflight"]');
 if(menu){const spans=menu.querySelectorAll('span');if(spans[1]&&spans[1].textContent!=='Tất cả chuyến bay')spans[1].textContent='Tất cả chuyến bay';const meta=menu.querySelector('.meta');if(meta&&meta.textContent!=='Danh sách toàn bộ chuyến khai thác')meta.textContent='Danh sách toàn bộ chuyến khai thác';}
 const title=document.querySelector('#fwcModal .fwcHead h3');if(title&&title.textContent!=='📦 DANH SÁCH CHUYẾN BAY')title.textContent='📦 DANH SÁCH CHUYẾN BAY';
 const toggle=document.getElementById('v38MyFlightLabel');if(toggle)toggle.remove();
}
function openAll(d){relabel();return root.sagsCargoOpenAllFlights(S(d)||dateNow())}
function refreshAll(){relabel();return root.sagsCargoRefreshAllFlights?.()}
function filterFlights(){const input=document.getElementById("sagsFlightSearch"),list=document.getElementById("fwcList");if(!input||!list)return;const q=U(input.value).replace(/\s+/g,"");for(const card of list.querySelectorAll(".fwcFlight,.v1199Card")){const title=card.querySelector(".fwcFlightTitle,.v1199Title");const hay=U(title?.textContent||card.textContent).replace(/\s+/g,"");card.hidden=!!q&&!hay.includes(q)}}
document.addEventListener("input",e=>{if(e.target?.id==="sagsFlightSearch")filterFlights()});document.addEventListener("change",e=>{if(e.target?.id==="fwcDate"&&isCargo())openAll(e.target.value)});
function install(){
 if(!isCargo())return false;
 // MY FLIGHT is owned by roster-lite. Keep cargo all-flight functions available
 // for explicit cargo screens, but never replace the shared MY FLIGHT route/button.
 return true;
}
let installTimers=[];function schedule(){installTimers.forEach(clearTimeout);installTimers=[0,250,1600].map(ms=>setTimeout(install,ms))}
const base=root.applyRoleUI;if(typeof base==='function'&&!base.__sagsCargoAllFlights){const w=function(){const out=base.apply(this,arguments);Promise.resolve(out).finally(schedule);return out};w.__sagsCargoAllFlights=1;w.__base=base;root.applyRoleUI=w;try{applyRoleUI=w}catch(_){}}
window.addEventListener('pageshow',schedule,{passive:true});window.addEventListener('focus',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()},{passive:true});
schedule();
root.__SAGS_CARGO_ALL_FLIGHTS={build:BUILD,isCargo,install};
})(window);
