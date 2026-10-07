(function(root){'use strict';
if(root.__SAGS_UNIFIED_ENTRY_CONTRAST_V1)return;root.__SAGS_UNIFIED_ENTRY_CONTRAST_V1=true;
const STYLE_ID='sagsUnifiedEntryContrastV1';
// Keep background, foreground and Safari fill coupled; no business wrappers.
const CONTROL='input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]):not([type="color"]):not([type="image"]),textarea,select,[contenteditable="true"]';
const BASE='html.new-ui-v1.new-ui-v1.new-ui-v1.new-ui-v1 :is(body,#sagsContrastRoot) :is(#sagsContrastControl,'+CONTROL+')';
function install(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`
 ${BASE}{--sags-entry-bg:#071c28;--sags-entry-fg:#ffffff;--sags-entry-placeholder:#c0d5df;
 background-color:var(--sags-entry-bg)!important;background-image:none!important;
 color:var(--sags-entry-fg)!important;-webkit-text-fill-color:var(--sags-entry-fg)!important;
 caret-color:var(--sags-entry-fg)!important;color-scheme:dark!important;opacity:1!important}
 ${BASE}::placeholder{color:var(--sags-entry-placeholder)!important;-webkit-text-fill-color:var(--sags-entry-placeholder)!important;opacity:1!important}
 ${BASE}:focus-visible{outline:2px solid #1680a0!important;outline-offset:1px!important}
 ${BASE}:is(:disabled,[readonly]){opacity:1!important}
 ${BASE}:is(:-webkit-autofill,:autofill){-webkit-box-shadow:0 0 0 1000px var(--sags-entry-bg) inset!important;-webkit-text-fill-color:var(--sags-entry-fg)!important;caret-color:var(--sags-entry-fg)!important}
 html.new-ui-v1.new-ui-v1.new-ui-v1.new-ui-v1[data-ui-theme="light"] :is(body,#sagsContrastRoot) :is(#sagsContrastControl,${CONTROL}),
 ${BASE}[data-sags-entry-surface="light"]{--sags-entry-bg:#ffffff;--sags-entry-fg:#111111;--sags-entry-placeholder:#595959;color-scheme:light!important}
 ${BASE}[data-sags-entry-surface="dark"]{--sags-entry-bg:#071c28;--sags-entry-fg:#ffffff;--sags-entry-placeholder:#c0d5df;color-scheme:dark!important}
 ${BASE}[data-sags-entry-surface="blue"]{--sags-entry-bg:#075568;--sags-entry-fg:#ffffff;--sags-entry-placeholder:#d7eef4;color-scheme:dark!important}
 /* Paper stays black on white in either theme. */
 html.new-ui-v1.new-ui-v1.new-ui-v1.new-ui-v1 :is(body,#sagsContrastRoot) :is(#entryPaperSheet,.sheet,#v440Overlay,#v440RuntimeBody) :is(#sagsContrastControl,${CONTROL}){
 --sags-entry-bg:#ffffff;--sags-entry-fg:#111111;--sags-entry-placeholder:#595959;color-scheme:light!important}
 `;document.head.appendChild(style);
}
root.sagsSyncUnifiedEntryContrast=install;install();
})(window);
