/* Canonical business text, shared by entry, drafts, persistence and rendering.
 * Never walk arbitrary objects: field keys, identities and binary data are opaque. */
(function(root){
 'use strict';
 if(root.SAGSBusinessText)return;
 const policies=new Map(),protectedFields=new Set(),seen=new WeakMap(),composing=new WeakSet();
 const textTypes=new Set(['text','textarea','number','time','timenow','timelocked','date','dateauto','display','computed']);
 const controls='input,textarea,[contenteditable="true"]';
 function technical(el){
  const type=String(el.type||'text').toLowerCase();
  if(!['text','search','tel'].includes(type)&&el.tagName!=='TEXTAREA'&&!el.isContentEditable)return true;
  if(el.closest?.('[data-sags-case="preserve"],[data-code-editor]'))return true;
  if(/(?:^|\s)(?:username|current-password|new-password)(?:\s|$)/.test(el.autocomplete||''))return true;
  return /password|passwd|credential|secret|token|api.?key|(?:^|[_-])(?:uid|json|url|email)(?:$|[_-])|json|(?:email|url|docid)$/i.test([el.id,el.name].filter(Boolean).join('_'));
 }
 function upper(value){
  if(typeof value!=='string')return value;
  // Preserve an actual resource address/email, not an entire object or payload.
  if(/^(?:data:|blob:|https?:\/\/)/i.test(value)||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return value;
  return value.toLocaleUpperCase('vi-VN');
 }
 function register(fields){
  if(!Array.isArray(fields)||seen.get(fields)===fields.length)return;
  seen.set(fields,fields.length);
  for(const f of fields){
   if(!f)continue;
   const type=String(f.sourceType||f.type||'').toLowerCase(),allowed=textTypes.has(type);
   for(const key of new Set([f.key,f.bind].filter(Boolean))){
    // Some old forms reuse a checkbox key as a text column elsewhere.
    // Booleans remain booleans; only a signature/image binding is always opaque.
    if(['signature','image'].includes(type))protectedFields.add(key);
    if(protectedFields.has(key))policies.set(key,false);
    else if(allowed||policies.get(key)!==true)policies.set(key,allowed);
   }
  }
 }
 function normalizeState(state,fields){
  register(fields);
  if(!state||typeof state!=='object')return state;
  for(const key of Object.keys(state))if(policies.get(key)===true)state[key]=upper(state[key]);
  return state;
 }
 function draft(field,value){return policies.get(field)===false?value:upper(value)}
 function normalizeControl(el){
  if(!el?.matches?.(controls)||technical(el)||composing.has(el))return false;
  // Leave rich HTML editors alone; plain contenteditable notes have only text.
  if(el.isContentEditable&&el.children?.length)return false;
  const old=el.isContentEditable?el.textContent:el.value,next=upper(old);if(next===old)return false;
  const start=el.selectionStart,end=el.selectionEnd,direction=el.selectionDirection;
  if(el.isContentEditable){
   const selection=root.getSelection?.(),node=el.firstChild;
   const anchor=selection?.anchorNode===node?selection.anchorOffset:old.length;
   const focus=selection?.focusNode===node?selection.focusOffset:old.length;
   el.textContent=next;
   try{selection?.setBaseAndExtent(el.firstChild,upper(old.slice(0,anchor)).length,el.firstChild,upper(old.slice(0,focus)).length)}catch(_){}
   return true;
  }
  el.value=next;
  if(Number.isInteger(start)&&Number.isInteger(end))try{el.setSelectionRange(upper(old.slice(0,start)).length,upper(old.slice(0,end)).length,direction)}catch(_){}
  return true;
 }
 root.SAGSBusinessText=Object.freeze({upper,register,normalizeState,draft,normalizeControl});
 // Native alert/confirmation dialogs do not inherit application CSS. Change only
 // their message, preserving prompt defaults, return values and credentials.
 for(const name of ['alert','confirm','prompt']){
  const original=root[name];if(typeof original!=='function')continue;
  root[name]=function(message,...rest){return original.call(root,typeof message==='string'?message.toLocaleUpperCase('vi-VN'):message,...rest)};
 }

 // Capture before inline/target handlers copy values into their private drafts.
 document.addEventListener('input',e=>{if(!e.isComposing)normalizeControl(e.target)},true);
 document.addEventListener('change',e=>normalizeControl(e.target),true);
 document.addEventListener('focusin',e=>{if(normalizeControl(e.target))e.target.dispatchEvent(new Event('input',{bubbles:true}))},true);
 document.addEventListener('compositionstart',e=>{if(e.target?.matches?.(controls))composing.add(e.target)},true);
 document.addEventListener('compositionend',e=>{
  composing.delete(e.target);
  if(normalizeControl(e.target))e.target.dispatchEvent(new Event('input',{bubbles:true}));
 },true);
})(window);
