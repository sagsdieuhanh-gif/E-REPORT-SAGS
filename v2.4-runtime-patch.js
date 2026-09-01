/* E-REPORT/SAGS V2.4 · ADMIN CONTROL CENTER STATS UI FIX
 * BUILD: V2.4-STATS-AD-CONTROL-UI-FIX
 * Fix only the visibility/access point for V2.3 daily flight statistics.
 * The V2.3 stats engine and XLSX export remain unchanged.
 */
(function(root){
  'use strict';
  const BUILD='V2.4-STATS-AD-CONTROL-UI-FIX';
  if(root.__SAGS_V24_STATS_UI_FIX===BUILD)return;
  root.__SAGS_V24_STATS_UI_FIX=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function role(){const s=session(),p=s.profile||root.currentUserProfile||{};return U(s.role||p.role||root.currentRole)}
  function isAdmin(){return ['AD','ADMIN'].includes(role())}
  function visible(el){if(!el||!el.isConnected)return false;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0}
  function text(el){return U(el?.innerText||el?.textContent||'')}

  function ensureStyle(){
    if(document.getElementById('v24StatsUiStyle'))return;
    const st=document.createElement('style');st.id='v24StatsUiStyle';st.textContent=`
      .v24StatsCard{width:100%;box-sizing:border-box;border:1px solid #d8e4ef;border-radius:18px;background:#fff;padding:18px 20px;margin:14px 0;box-shadow:0 4px 14px rgba(20,65,105,.08);display:flex;align-items:center;justify-content:space-between;gap:14px;color:#173f67;font-family:Arial,sans-serif;cursor:pointer;text-align:left}
      .v24StatsCard:active{transform:scale(.995)}.v24StatsMain{display:flex;align-items:center;gap:14px;min-width:0}.v24StatsIcon{width:58px;height:58px;border-radius:16px;background:#e5f0ff;color:#0b67b2;display:flex;align-items:center;justify-content:center;font-size:26px;flex:0 0 58px}.v24StatsTitle{font-size:18px;font-weight:900;line-height:1.2}.v24StatsSub{font-size:13px;font-weight:700;color:#71869b;line-height:1.35;margin-top:5px}.v24StatsOpen{flex:0 0 auto;padding:9px 14px;border-radius:999px;background:#e9f8ef;color:#147044;font-weight:900;font-size:13px}
      #v24StatsFloat{position:fixed;right:14px;bottom:max(18px,env(safe-area-inset-bottom));z-index:27500;border:0;border-radius:999px;padding:12px 15px;background:#0b67b2;color:#fff;font:900 13px Arial;box-shadow:0 8px 24px rgba(0,0,0,.28);display:none}
      @media(max-width:600px){.v24StatsCard{padding:15px 16px;border-radius:16px}.v24StatsIcon{width:52px;height:52px;flex-basis:52px}.v24StatsTitle{font-size:17px}.v24StatsSub{font-size:12px}.v24StatsOpen{padding:8px 11px}}
    `;document.head.appendChild(st);
  }

  function openStats(){
    if(typeof root.sagsV23StatsOpen!=='function'){
      alert('Chức năng thống kê V2.3 chưa được nạp. Hãy kiểm tra v2.3-runtime-patch.js.');
      return;
    }
    root.sagsV23StatsOpen();
  }

  function ensureFloat(){
    let b=document.getElementById('v24StatsFloat');
    if(!b){b=document.createElement('button');b.id='v24StatsFloat';b.type='button';b.textContent='📊 THỐNG KÊ CHUYẾN';b.onclick=openStats;document.body.appendChild(b)}
    return b;
  }

  function candidateAccountCards(){
    const all=[...document.querySelectorAll('button,div,section,article,li')].filter(visible);
    return all.filter(el=>{
      const t=text(el);
      return t.includes('TÀI KHOẢN & PHÂN QUYỀN')&&t.includes('RESET MẬT KHẨU')&&t.length<500;
    }).sort((a,b)=>text(a).length-text(b).length);
  }

  function controlCenterVisible(){
    return [...document.querySelectorAll('div,section,article')].some(el=>visible(el)&&text(el).includes('AD CONTROL CENTER')&&text(el).length<6000);
  }

  function injectIntoCurrentControlCenter(){
    if(!isAdmin())return false;
    if(document.getElementById('v24StatsCard'))return true;
    const card=candidateAccountCards()[0];
    if(!card)return false;
    const b=document.createElement('button');b.id='v24StatsCard';b.type='button';b.className='v24StatsCard';
    b.innerHTML='<span class="v24StatsMain"><span class="v24StatsIcon">📊</span><span><span class="v24StatsTitle">THỐNG KÊ SỐ CHUYẾN</span><span class="v24StatsSub">Chọn 1 ngày · xem mỗi tài khoản làm bao nhiêu chuyến · xuất Excel</span></span></span><span class="v24StatsOpen">MỞ</span>';
    b.onclick=openStats;
    card.insertAdjacentElement('afterend',b);
    return true;
  }

  function sync(){
    ensureStyle();
    const admin=isAdmin(),float=ensureFloat();
    if(!admin){float.style.display='none';document.getElementById('v24StatsCard')?.remove();return}
    const injected=injectIntoCurrentControlCenter();
    float.style.display=!injected&&controlCenterVisible()?'block':'none';
  }

  root.sagsV24StatsUiDiagnostics=()=>({build:BUILD,role:role(),admin:isAdmin(),v23Ready:typeof root.sagsV23StatsOpen==='function',card:!!document.getElementById('v24StatsCard'),float:document.getElementById('v24StatsFloat')?.style.display||''});
  root.sagsV24OpenStats=openStats;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,120),{once:true});else setTimeout(sync,120);
  const mo=new MutationObserver(()=>{clearTimeout(root.__v24StatsUiTimer);root.__v24StatsUiTimer=setTimeout(sync,80)});
  const startObserver=()=>{try{mo.observe(document.body,{childList:true,subtree:true})}catch(_){}};
  if(document.body)startObserver();else document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  window.addEventListener('pageshow',()=>setTimeout(sync,80),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sync,80)},{passive:true});
  setTimeout(sync,500);setTimeout(sync,1500);setTimeout(sync,3000);
})(typeof window!=='undefined'?window:globalThis);
