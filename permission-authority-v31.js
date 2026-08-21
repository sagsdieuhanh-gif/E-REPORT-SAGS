/* E-REPORT/SAGS V3.1 · Permission live-refresh hardening */
(()=>{
  'use strict';
  const norm=o=>{const out={};if(!o||typeof o!=='object')return out;Object.keys(o).sort().forEach(k=>{if(typeof o[k]==='boolean')out[k]=!!o[k];});return out;};
  try{
    const verifyBase=window.verifyPersonalSession;
    if(typeof verifyBase==='function' && !verifyBase.__v31Wrapped){
      const wrapped=async function(force=false){
        const beforeRev=Number(currentUserProfile?.permissionRevV485||0),before=JSON.stringify(norm(currentUserProfile?.featureOverridesV485));
        const out=await verifyBase.call(this,force);
        const afterRev=Number(currentUserProfile?.permissionRevV485||0),after=JSON.stringify(norm(currentUserProfile?.featureOverridesV485));
        if(beforeRev!==afterRev||before!==after){
          try{applyRoleUI?.();}catch(e){}
          try{updateFormMenuForCurrentFlight?.();}catch(e){}
        }
        return out;
      };
      wrapped.__v31Wrapped=true;
      window.verifyPersonalSession=wrapped;
      try{verifyPersonalSession=wrapped;}catch(e){}
    }
  }catch(e){console.info('V3.1 permission verify wrapper',e?.message||e);}
  const restart=()=>{try{if(currentUserProfile?.username&&typeof v485StartPermissionSignal==='function')v485StartPermissionSignal();}catch(e){}};
  setTimeout(restart,700);
  window.addEventListener('pageshow',()=>setTimeout(restart,80),{passive:true});
})();
