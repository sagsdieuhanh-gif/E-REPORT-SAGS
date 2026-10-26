'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const aviation=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
const shell=fs.readFileSync('app/styles/boot-36-v6494-aviation-final.css','utf8');
const contrast=fs.readFileSync('app/modules/theme-contrast.v2.js','utf8');
let injected='';
vm.runInNewContext(contrast,{window:{},document:{createElement:()=>({}),head:{appendChild:x=>{injected=x.textContent}}}});
function extract(text,query){
 const i=text.indexOf(query);assert.ok(i>=0,'CSS selector missing '+query);
 const k=text.indexOf('{',i),e=text.indexOf('}',k+1);return text.slice(k+1,e)
}
const palettes=[
 ['light','#111827','#ffffff','#f5f7fa'],
 ['dark','#f8fafc','#151d2a','#0c111a']
];
for(const [mode,fg,card,surface] of palettes){
 const vars=extract(aviation,'html.new-ui-v1[data-ui-theme="'+mode+'"]');
 assert.ok(vars.includes('--et-fg:'+fg),'Foreground token for '+mode);
 assert.ok(vars.includes('--et-card:'+card),'Card token for '+mode);
 assert.ok(vars.includes('--et-shell:'+surface),'Shell token for '+mode);
 assert.ok(vars.includes('color-scheme:'+mode),'Native color scheme must follow appearance');
}
const root=extract(aviation,'html.new-ui-v1.new-ui-v1.new-ui-v1{');
for(const [from,to] of [
 ['--ops-bg','--et-shell'],['--ops-panel','--et-card'],['--ops-panel-2','--et-raised'],
 ['--ops-text','--et-fg'],['--ops-muted','--et-sub'],
 ['--a-bg','--et-shell'],['--a-surface','--et-card'],['--a-surface2','--et-raised'],
 ['--a-text','--et-fg'],['--a-muted','--et-sub'],
 ['--v157-text','--et-fg'],['color-scheme','--et-color-scheme']
])assert.ok(root.includes(from+':var('+to),'High-specificity root must map '+from+' to '+to);
assert.match(shell,/color-scheme:var\(--et-color-scheme,dark\)/);
for(const selector of [
 '.v6494Side','.v6494Main','.v6494Top','.v6494Profile',
 '.v6494Search','.v6494Nav button.active','.v6494QuickGrid>button',
 '.v6494MobileMenu button','.v6494MobileMenu button.active',
 '.v6494Bottom','.v6494MobileProfile'
]){
 const b=extract(shell,selector+'{');
 assert.match(b,/(?:background:var\(--a-|background:var\(--et-)/,'Source should not retain forced navy '+selector);
 assert.doesNotMatch(b,/background:(?:linear-gradient|rgba\(|#[0-9a-f]{3,8}\b)/,'Fixed dark background detected '+selector);
}
const caseFor=id=>{
 const pos=injected.indexOf(id);
 assert.ok(pos>=0,'Missing modal selector '+id);
 const selector=injected.slice(pos,pos+900);
 return selector;
};
for(const id of ['#quickTimeModal#quickTimeModal','#fs09QuickModal#fs09QuickModal','#fwcModal #sagsFlightSearch','#sags5494Quick,#sags5494FieldEditor','#entry#entry']){
 const c=caseFor(id);assert.ok(c.includes('var(--et-'),'Modal theme tokens missing '+id);
}
const search=extract(injected,'body #fwcModal #sagsFlightSearch{');
assert.match(search,/background:var\(--et-input,#fff\)!important/,'Avoid white-on-white on My Flight search');
assert.match(search,/color:var\(--et-fg,#17212b\)!important/);
const paper=extract(injected,'body #entry#entry #entryPaperSheet{');
assert.match(paper,/background:#ffffff!important/,'The actual paper preview stays white');
assert.match(paper,/color:#17212b!important/,'Paper writing stays black');
for(const id of ['#quickTimeModal#quickTimeModal','#fs09QuickModal#fs09QuickModal']){
 const pos=injected.indexOf('body '+id+' :is(.');
 const block=injected.slice(pos,pos+1000);
 assert.ok(block.includes('background:var(--et-card')||block.includes('background:var(--et-raised'),'Modal needs shared foreground/background');
}
const invalid=injected.match(/var\([^)]*\)[0-9a-f]{3,6}\b/ig);
assert.equal(invalid,null,'Avoid invalid CSS after changing literal colors');
console.log('V1.6 theme root + aviation desktop/mobile + My Flight/quick editor palette and paper safety verified');
