(function(root){"use strict";
if(root.__SAGS_UNIFIED_ENTRY_CONTRAST_V1)return;root.__SAGS_UNIFIED_ENTRY_CONTRAST_V1=true;
const STYLE_ID="sagsUnifiedEntryContrastV1";
const SCOPES="#entry,#quickTimeModal,#fs09QuickModal,#sagsQuickEntry,#sags5494Quick,#sags5494FieldEditor";
const CONTROLS='input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),textarea';
function installStyle(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement("style");s.id=STYLE_ID;
 s.textContent=`
 html.new-ui-v1 body :is(#entry,#quickTimeModal,#fs09QuickModal,#sagsQuickEntry,#sags5494Quick,#sags5494FieldEditor)
 :is(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),textarea):focus,
 html.new-ui-v1 body :is(#entry,#quickTimeModal,#fs09QuickModal,#sagsQuickEntry,#sags5494Quick,#sags5494FieldEditor)
 :is(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),textarea).sags-entry-has-value{
   background:#FFD166!important;color:#17212B!important;-webkit-text-fill-color:#17212B!important;
   caret-color:#17212B!important;border-color:#D8A52F!important;box-shadow:0 0 0 1px rgba(216,165,47,.34)!important;
 }
 html.new-ui-v1 body :is(#entry,#quickTimeModal,#fs09QuickModal,#sagsQuickEntry,#sags5494Quick,#sags5494FieldEditor)
 :is(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),textarea):focus::placeholder,
 html.new-ui-v1 body :is(#entry,#quickTimeModal,#fs09QuickEntry,#sagsQuickEntry,#sags5494Quick,#sags5494FieldEditor)
 :is(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),textarea).sags-entry-has-value::placeholder{
   color:#5B4A00!important;opacity:.72!important;
 }
 `;document.head.appendChild(s);
}
function eligible(el){return el instanceof Element&&el.matches(CONTROLS)&&!!el.closest(SCOPES)&&!el.disabled&&!el.readOnly}
function syncOne(el){if(eligible(el))el.classList.toggle("sags-entry-has-value",String(el.value??"").trim()!=="")}
function syncAll(){document.querySelectorAll(SCOPES+" input,"+SCOPES+" textarea").forEach(syncOne)}
function later(){setTimeout(syncAll,0);setTimeout(syncAll,80)}
function wrap(name){
 const fn=root[name];if(typeof fn!=="function"||fn.__sagsUnifiedEntryContrastV1)return;
 const w=function(){const out=fn.apply(this,arguments);later();return out};
 try{Object.assign(w,fn)}catch(_){}
 w.__sagsUnifiedEntryContrastV1=true;w.__sagsUnifiedEntryContrastBase=fn;root[name]=w;
}
function patchOpeners(){
 ["sagsQuickTryActivate","openQuickTimePanel","openFS09QuickPanel","sags5494OpenQuickEntry","sagsOpenNativeFieldEditor"].forEach(wrap);
}
document.addEventListener("input",e=>syncOne(e.target),true);
document.addEventListener("change",e=>syncOne(e.target),true);
document.addEventListener("focusin",e=>{syncOne(e.target);later()},true);
document.addEventListener("click",later,true);
root.sagsSyncUnifiedEntryContrast=syncAll;
installStyle();patchOpeners();syncAll();
setTimeout(()=>{patchOpeners();syncAll()},300);
setTimeout(()=>{patchOpeners();syncAll()},1200);
root.addEventListener("pageshow",()=>setTimeout(()=>{patchOpeners();syncAll()},60),{passive:true});
})(window);
