/* E-REPORT/SAGS V2.2.16 · DATA HUB SEMANTIC ICONS
 * BUILD: V2.2.16-DATAHUB-COMBINED-LIMIT-CLEANING-ICON
 */
(function(root){
  'use strict';
  const BUILD='V2.2.16-DATAHUB-COMBINED-LIMIT-CLEANING-ICON';
  if(root.__SAGS_V2216_DATAHUB===BUILD)return;
  root.__SAGS_V2216_DATAHUB=BUILD;
  const $=id=>document.getElementById(id);
  let observer=null;

  const icons={
    roster:`<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="11" y="9" width="26" height="32" rx="4" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="M19 7h10a2 2 0 0 1 2 2v4H17V9a2 2 0 0 1 2-2Z" fill="#ff9f68" stroke="currentColor" stroke-width="2"/><path d="M17 20h14M17 26h14M17 32h9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    limits:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 22h13l7-12h4l-4 12h8l4-4h2l-2 8-12 3-4 7h-3l2-8-15-3Z" fill="#d9e9ff" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/><path d="M10 5 3 18h14L10 5Z" fill="#fff4cf" stroke="#a46600" stroke-width="1.9" stroke-linejoin="round"/><path d="M10 9v4m0 2.5v.2" stroke="#a46600" stroke-width="2.2" stroke-linecap="round"/><path d="m37 28-8 12" stroke="#087443" stroke-width="3" stroke-linecap="round"/><path d="m25 38 9 5-4 4h-9l4-9Z" fill="#bcebd5" stroke="#087443" stroke-width="1.8" stroke-linejoin="round"/><path d="m40 31 3 3m0-3-3 3" stroke="#f0a000" stroke-width="2" stroke-linecap="round"/></svg>`,
    fleet:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 27h14L28 8h4l-4 19h10l5-6h2l-3 11-14 4-5 8h-4l3-9-17-4Z" fill="#dceaff" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="13" cy="17" r="3" fill="#8fb8ef"/><circle cx="40" cy="11" r="2" fill="#8fb8ef"/></svg>`
  };

  function setIcon(cardId,kind){
    const el=$(cardId)?.querySelector('.v174DataIcon');
    if(!el||el.dataset.v2216Icon===kind)return;
    el.dataset.v2216Icon=kind;el.classList.add('v2216Icon',`v2216-${kind}`);el.innerHTML=icons[kind];
  }
  function css(){
    if($('v2216Style'))return;const s=document.createElement('style');s.id='v2216Style';s.textContent=`
#v174DataHub .v2216Icon{display:grid;place-items:center;color:#183f73;overflow:hidden}
#v174DataHub .v2216Icon svg{width:36px;height:36px;display:block;filter:drop-shadow(0 2px 2px rgba(22,63,115,.10))}
#v174DataHub .v2216-limits{background:linear-gradient(145deg,#fff7d9,#edf5ff)}
#v174DataHub .v2216-roster{background:linear-gradient(145deg,#fff1e7,#edf4ff)}
#v174DataHub .v2216-fleet{background:linear-gradient(145deg,#e8f1ff,#f2f6ff)}
`;document.head.appendChild(s)
  }
  function install(){
    const grid=document.querySelector('#v174DataHub .v174DataHubGrid');
    if(!grid)return false;css();
    const subtitle=document.querySelector('#v174DataHub .v174DataHubHead p');if(subtitle)subtitle.textContent='DAILY ROSTER · A/C LIMITS + LỊCH VỆ SINH · FLEET';
    setIcon('v174RosterCard','roster');setIcon('v174AclCard','limits');setIcon('v174FleetCard','fleet');
    const acl=$('v174AclCard');if(acl){const title=acl.querySelector('b'),note=acl.querySelector('small');if(title)title.textContent='A/C LIMITS + LỊCH VỆ SINH';if(note)note.textContent='Quản lý hạn chế tàu bay và lịch dọn vệ sinh SAGS / VIETSKY'}
    return true;
  }
  function start(){
    if(install())return;
    if(observer||!document.body)return;observer=new MutationObserver(()=>{if(install()){observer.disconnect();observer=null}});observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  setTimeout(start,500);setTimeout(start,1600);root.addEventListener('pageshow',()=>setTimeout(install,100),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,100)},{passive:true});
})(typeof window!=='undefined'?window:globalThis);
