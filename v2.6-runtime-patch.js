/* E-REPORT/SAGS V2.6 · STATS FLICKER FIX
 * BUILD: V2.6-STATS-FLICKER-FIX
 *
 * Root cause: V2.4 and V2.5 UI observers competed over the stats launcher.
 * V2.6 service worker no longer loads V2.4. This runtime only cleans stale
 * V2.4 DOM/style after update and fixes the V2.5 mobile card text layout.
 */
(function(root){
  'use strict';
  const BUILD='V2.6-STATS-FLICKER-FIX';
  if(root.__SAGS_V26_STATS_FLICKER_FIX===BUILD)return;
  root.__SAGS_V26_STATS_FLICKER_FIX=BUILD;

  function cleanupV24(){
    try{document.getElementById('v24StatsCard')?.remove()}catch(_){}
    try{document.getElementById('v24StatsFloat')?.remove()}catch(_){}
    try{document.getElementById('v24StatsUiStyle')?.remove()}catch(_){}
  }

  function ensureStyle(){
    if(document.getElementById('v26StatsFixStyle'))return;
    const s=document.createElement('style');
    s.id='v26StatsFixStyle';
    s.textContent=`
      #v24StatsCard,#v24StatsFloat{display:none!important}
      #v25StatsCard .v25StatsMain{flex:1 1 auto;min-width:0}
      #v25StatsCard .v25StatsMain>span:last-child{display:block;min-width:0;flex:1 1 auto}
      #v25StatsCard .v25StatsTitle{display:block;white-space:normal;word-break:normal}
      #v25StatsCard .v25StatsSub{display:block;white-space:normal;word-break:normal;margin-top:5px}
      #v25StatsCard .v25StatsOpen{margin-left:auto;align-self:center}
      @media(max-width:650px){
        #v25StatsCard{min-height:116px;align-items:center}
        #v25StatsCard .v25StatsTitle{font-size:17px;line-height:1.18}
        #v25StatsCard .v25StatsSub{font-size:12px;line-height:1.28}
      }
    `;
    document.head.appendChild(s);
  }

  function sync(){cleanupV24();ensureStyle()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,40),{once:true});else setTimeout(sync,40);
  window.addEventListener('pageshow',()=>setTimeout(sync,60),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sync,60)},{passive:true});
  setTimeout(sync,500);setTimeout(sync,1500);

  root.sagsV26StatsDiagnostics=()=>({
    build:BUILD,
    v24Loaded:!!root.__SAGS_V24_STATS_UI_FIX,
    v24Card:!!document.getElementById('v24StatsCard'),
    v24Float:!!document.getElementById('v24StatsFloat'),
    v25Ready:typeof root.sagsV25StatsOpen==='function',
    v25Card:!!document.getElementById('v25StatsCard')
  });
})(typeof window!=='undefined'?window:globalThis);
