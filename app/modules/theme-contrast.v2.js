(function(root){'use strict';
if(root.__SAGS_THEME_CONTRAST_V2__)return;root.__SAGS_THEME_CONTRAST_V2__=true;
const st=document.createElement('style');st.id='sagsThemeContrastV2';st.textContent=`
html.new-ui-v1{--sags-ui-text-primary:#f4f7fa;--sags-ui-text-secondary:#c4d3de;--sags-ui-text-muted:#93a9b8;--sags-ui-input-light-bg:#fff;--sags-ui-input-light-fg:#17212b;--sags-ui-input-light-ph:#5b6b76;--sags-ui-input-dark-bg:#081c2b;--sags-ui-input-dark-fg:#f4f7fa;--sags-ui-input-dark-ph:#b6cad7}
html.new-ui-v1[data-ui-theme="light"]{--sags-ui-text-primary:#17212b;--sags-ui-text-secondary:#405566;--sags-ui-text-muted:#60778b}
html.new-ui-v1[data-ui-theme="dark"]{--sags-ui-text-primary:#f4f7fa;--sags-ui-text-secondary:#c4d3de;--sags-ui-text-muted:#93a9b8}

/* Dark operational entry surfaces stay dark regardless of global theme. */
html.new-ui-v1 body :is(#sagsQuickEntry,#quickTimeModal,#fs09QuickModal){
 --sags-ui-text-primary:#f4f7fa;--sags-ui-text-secondary:#c4d3de;--sags-ui-text-muted:#9fb6c6;
}
html.new-ui-v1 body #sagsQuickEntry :is(.sq-title){color:var(--sags-ui-text-primary)!important;-webkit-text-fill-color:var(--sags-ui-text-primary)!important}
html.new-ui-v1 body #sagsQuickEntry :is(.sq-overline,.sq-count,.sq-hint,.sq-close){color:var(--sags-ui-text-secondary)!important;-webkit-text-fill-color:var(--sags-ui-text-secondary)!important}
html.new-ui-v1 body #quickTimeModal :is(.quickTimeTitle,.quickTimeLabel,.quickTimePageTitle,.quickTimeTimeSectionHead){color:var(--sags-ui-text-primary)!important;-webkit-text-fill-color:var(--sags-ui-text-primary)!important}
html.new-ui-v1 body #quickTimeModal :is(.quickTimeFlight,.quickTimeSub,.quickTimeColumnHead,.quickTimeSwipeHint,.quickTimeEmpty){color:var(--sags-ui-text-secondary)!important;-webkit-text-fill-color:var(--sags-ui-text-secondary)!important}
html.new-ui-v1 body #fs09QuickModal :is(.fs09qPageTitle,.fs09qLabel,.fs09qDataLabel,.fs09qCloseoutTitle,.fs09qTimeSectionHead){color:var(--sags-ui-text-primary)!important;-webkit-text-fill-color:var(--sags-ui-text-primary)!important}
html.new-ui-v1 body #fs09QuickModal :is(.fs09qHint,.fs09qCloseoutHeadLine){color:var(--sags-ui-text-secondary)!important;-webkit-text-fill-color:var(--sags-ui-text-secondary)!important}

/* Light popup/editor surfaces: 54/94 and native field editor. */
html.new-ui-v1 body :is(#sags5494Quick,#sags5494FieldEditor,#entry) :is(.q-title,.q-label,.fe-title,#entryTitle,label,h3){color:#17313f!important;-webkit-text-fill-color:#17313f!important}
html.new-ui-v1 body :is(#sags5494Quick,#sags5494FieldEditor,#entry) :is(.q-sub,.fe-sub,#entryRowHint){color:#526b78!important;-webkit-text-fill-color:#526b78!important}

/* Settings: theme-aware labels and descriptions on every tab. */
html.new-ui-v1[data-ui-theme="light"] body #sagsSettingsCenter{
 --sags-settings-primary:#17212b;--sags-settings-secondary:#405566;--sags-settings-muted:#60778b;
}
html.new-ui-v1[data-ui-theme="dark"] body #sagsSettingsCenter{
 --sags-settings-primary:#f4f7fa;--sags-settings-secondary:#c4d3de;--sags-settings-muted:#93a9b8;
}
html.new-ui-v1[data-ui-theme="light"] body #sagsSettingsCenter .sagsSettingsPanel{color:#17212b!important;background:#f4f8fb!important}
html.new-ui-v1[data-ui-theme="dark"] body #sagsSettingsCenter .sagsSettingsPanel{color:#f4f7fa!important}
html.new-ui-v1 body #sagsSettingsCenter :is(.sagsSettingsContent h3,.sagsSettingsContent h4,.rows label>span>b,.grid>label,.profile b,.stats b,.release b,.about b){color:var(--sags-settings-primary)!important;-webkit-text-fill-color:var(--sags-settings-primary)!important;opacity:1!important}
html.new-ui-v1 body #sagsSettingsCenter :is(.sagsSettingsContent .desc,.rows label>span>small,.profile span,.profile small,.stats span,.release span,.release small,.about span,.about small,.note,.flow span,.flow em){color:var(--sags-settings-secondary)!important;-webkit-text-fill-color:var(--sags-settings-secondary)!important;opacity:1!important}
html.new-ui-v1[data-ui-theme="light"] body #sagsSettingsCenter .sagsSettingsNav button{color:#294254!important}
html.new-ui-v1[data-ui-theme="light"] body #sagsSettingsCenter .sagsSettingsNav button>span small{color:#60778b!important}
html.new-ui-v1[data-ui-theme="light"] body #sagsSettingsCenter .sagsSettingsNavTitle{color:#526b78!important}

/* Settings controls follow the actual settings surface, including Safari text fill. */
html.new-ui-v1[data-ui-theme="light"] body #sagsSettingsCenter :is(input:not(.sw),select,textarea){
 background:#fff!important;color:#17212b!important;-webkit-text-fill-color:#17212b!important;caret-color:#17212b!important;color-scheme:light!important
}
html.new-ui-v1[data-ui-theme="dark"] body #sagsSettingsCenter :is(input:not(.sw),select,textarea){
 background:#102230!important;color:#f4f7fa!important;-webkit-text-fill-color:#f4f7fa!important;caret-color:#f4f7fa!important;color-scheme:dark!important
}

/* My Flight has mixed surfaces: date is dark, search is deliberately light. */
html.new-ui-v1 body #fwcModal #fwcDate{
 background:#102838!important;color:#f4f7fa!important;-webkit-text-fill-color:#f4f7fa!important;caret-color:#f4f7fa!important;color-scheme:dark!important
}
html.new-ui-v1 body #fwcModal #sagsFlightSearch{
 background:#fff!important;color:#17212b!important;-webkit-text-fill-color:#17212b!important;caret-color:#17212b!important;color-scheme:light!important
}
html.new-ui-v1 body #fwcModal #sagsFlightSearch::placeholder{color:#5b6b76!important;-webkit-text-fill-color:#5b6b76!important;opacity:1!important}

/* Generic UI text safety net, intentionally excludes paper sheets/SVG/PDF rendering. */
html.new-ui-v1 body :is(#sagsQuickEntry,#quickTimeModal,#fs09QuickModal,#sagsSettingsCenter,#fwcModal,#sags5494Quick,#sags5494FieldEditor,#entry) :is(input,textarea,select,button){opacity:1}
`;document.head.appendChild(st);
root.sagsThemeContrastV2Audit=function(){
 const forms=(root.SAGS_FORMS_REGISTRY?.forms||root.formsRegistry?.forms||[]);
 return {theme:document.documentElement.getAttribute('data-ui-theme')||'',forms:Array.isArray(forms)?forms.length:0,style:!!document.getElementById('sagsThemeContrastV2')};
};
})(window);
