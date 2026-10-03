/* Coalesce only simultaneous reads. Never retain a completed Firebase result. */
(function(root){'use strict';const pending=new Map();let installed=false,retries=0;
 function install(){if(installed)return;const original=root.sagsV470Ref;if(typeof original!=='function'){if(retries++<40)setTimeout(install,250);return}installed=true;
  root.sagsV470Ref=function(path=''){const ref=original.apply(this,arguments);if(!ref||typeof ref.once!=='function'||ref.__sagsReadCoalesced)return ref;const once=ref.once.bind(ref);ref.once=function(event,...args){if(event!=='value'||args.length)return once(event,...args);const uid=root.firebase?.auth?.().currentUser?.uid||root.__sagsGetSession?.()?.profile?.username||'',key=uid+'|'+String(path);if(pending.has(key))return pending.get(key);const promise=Promise.resolve().then(()=>once(event));pending.set(key,promise);void promise.then(()=>{if(pending.get(key)===promise)pending.delete(key)},()=>{if(pending.get(key)===promise)pending.delete(key)});return promise;};Object.defineProperty(ref,'__sagsReadCoalesced',{value:true});return ref;};
 }
 install();root.sagsFirebaseReadCoalescer={install};
})(window);
