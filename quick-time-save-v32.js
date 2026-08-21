/* E-REPORT SAGS · V3.2 QUICK TIME SAVE RELIABILITY
 * 2026-08-21
 * Fixes mobile/iOS cases where the visible quick-entry input value had not yet
 * been committed to the internal draft when UPDATE/tab navigation was tapped.
 */
(function(){
  'use strict';
  const BUILD='V3.2-20260821-01';
  const S=v=>String(v??'').trim();

  function callInputHandler(el,name){
    if(!el)return;
    try{
      const fn=window[name];
      if(typeof fn==='function'){fn(el);return;}
    }catch(_){ }
    try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){ }
  }

  function flushRampQuickDom(){
    try{
      document.querySelectorAll('#quickTimeBody .quickTimeInput[data-key]').forEach(el=>callInputHandler(el,'qteInputChanged'));
    }catch(e){console.warn('[V3.2 QUICK TIME] flush ramp',e);}
  }

  function flushFs09QuickDom(){
    try{
      document.querySelectorAll('#fs09qBody .fs09qInput[data-key]').forEach(el=>callInputHandler(el,'fs09qTimeInput'));
      document.querySelectorAll('#fs09qBody .fs09qDataInput[data-key],#fs09qBody .fs09qTextArea[data-key]').forEach(el=>callInputHandler(el,'fs09qDataChanged'));
    }catch(e){console.warn('[V3.2 QUICK TIME] flush fs09',e);}
  }

  function normalizeTime(v){
    v=S(v);
    if(!v)return '';
    if(v.toUpperCase()==='N/A')return 'N/A';
    let d=v.replace(/\D/g,'').slice(0,4);
    if(d.length===3)d='0'+d;
    if(d.length!==4)return null;
    const h=Number(d.slice(0,2)),m=Number(d.slice(2));
    if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>23||m<0||m>59)return null;
    return d.slice(0,2)+':'+d.slice(2);
  }

  function captureExpected(selector){
    const out=[];
    try{
      document.querySelectorAll(selector).forEach(el=>{
        const key=S(el.dataset?.key);if(!key)return;
        const v=normalizeTime(el.value);
        if(v!==null)out.push([key,v]);
      });
    }catch(_){ }
    return out;
  }

  function repairState(expected,label){
    let changed=false;
    try{
      if(typeof state==='undefined'||!state)return false;
      for(const [key,value] of expected){
        const cur=S(state[key]);
        if(value===''){
          if(Object.prototype.hasOwnProperty.call(state,key)){delete state[key];changed=true;}
        }else if(cur!==value){
          state[key]=value;changed=true;
          try{clearTimeSkipFlag?.(key);}catch(_){ }
        }
      }
      if(changed){
        try{persist?.();}catch(e){console.warn('[V3.2 QUICK TIME] persist repair '+label,e);}
        try{draw?.();}catch(_){ }
      }
    }catch(e){console.warn('[V3.2 QUICK TIME] repair '+label,e);}
    return changed;
  }

  function install(){
    if(window.__SAGS_QUICK_TIME_V32_INSTALLED)return true;
    const qSave=window.qteSaveCompact;
    const qPage=window.qteGoPage;
    const fSave=window.fs09qSave;
    const fPage=window.fs09qGoPage;
    if(typeof qSave!=='function'||typeof fSave!=='function')return false;
    window.__SAGS_QUICK_TIME_V32_INSTALLED=BUILD;

    window.qteSaveCompact=function(){
      flushRampQuickDom();
      const expected=captureExpected('#quickTimeBody .quickTimeInput[data-key]');
      const r=qSave.apply(this,arguments);
      const repaired=repairState(expected,'RAMP');
      if(repaired){
        const st=document.getElementById('quickTimeSaveStatus');
        if(st)st.textContent='ĐÃ CẬP NHẬT';
      }
      return r;
    };

    if(typeof qPage==='function')window.qteGoPage=function(){
      flushRampQuickDom();
      return qPage.apply(this,arguments);
    };

    window.fs09qSave=function(){
      flushFs09QuickDom();
      const expected=captureExpected('#fs09qBody .fs09qInput[data-key]');
      const r=fSave.apply(this,arguments);
      const repaired=repairState(expected,'FSAGS09');
      if(repaired){
        const st=document.getElementById('fs09qStatus');
        if(st)st.textContent='ĐÃ CẬP NHẬT';
      }
      return r;
    };

    if(typeof fPage==='function')window.fs09qGoPage=function(){
      flushFs09QuickDom();
      return fPage.apply(this,arguments);
    };

    // Extra safety for iOS: commit the field on change/blur as well as input.
    document.addEventListener('change',ev=>{
      const el=ev.target;
      if(el?.matches?.('#quickTimeBody .quickTimeInput[data-key]'))callInputHandler(el,'qteInputChanged');
      else if(el?.matches?.('#fs09qBody .fs09qInput[data-key]'))callInputHandler(el,'fs09qTimeInput');
      else if(el?.matches?.('#fs09qBody .fs09qDataInput[data-key],#fs09qBody .fs09qTextArea[data-key]'))callInputHandler(el,'fs09qDataChanged');
    },true);

    return true;
  }

  function boot(){
    if(install())return;
    let n=0;const t=setInterval(()=>{n++;if(install()||n>40)clearInterval(t);},100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
