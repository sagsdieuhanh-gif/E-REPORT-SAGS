(function(){
  if(window.__SAGS_V1121_IOS_TIME_FOOTER)return;
  window.__SAGS_V1121_IOS_TIME_FOOTER=true;
  const root=document.documentElement;
  const modalFor=el=>el?.closest?.('#quickTimeModal,#fs09QuickModal')||null;
  let frame=0;
  function resyncActive(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;const modal=modalFor(document.activeElement);if(!modal)return;
      const vv=window.visualViewport;
      root.style.setProperty('--v1121-vv-height',Math.max(220,Math.round(vv?.height||window.innerHeight))+'px');
      root.style.setProperty('--v1121-vv-top',Math.max(0,Math.round(vv?.offsetTop||0))+'px');
      modal.classList.add('v1121IosTimeFocus');
    });
  }
  // Let the browser keep the focused input visible. Forced centering fights keyboard animation.
  document.addEventListener('focusin',e=>{if(modalFor(e.target))resyncActive();},true);
  document.addEventListener('focusout',e=>{const m=modalFor(e.target);if(!m)return;requestAnimationFrame(()=>{if(!m.contains(document.activeElement))m.classList.remove('v1121IosTimeFocus');});},true);
  window.visualViewport?.addEventListener('resize',resyncActive,{passive:true});
  window.visualViewport?.addEventListener('scroll',resyncActive,{passive:true});
})();
