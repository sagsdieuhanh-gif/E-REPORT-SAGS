'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const theme=fs.readFileSync('app/modules/theme-contrast.v2.js','utf8');
const css=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
const ui=fs.readFileSync('app/styles/new-ui-v1.css','utf8');
let injected='';
vm.runInNewContext(theme,{window:{},document:{createElement:()=>({}),head:{appendChild:node=>{injected=node.textContent}}}});
const diagnostic=css.slice(css.indexOf('/* V1.8 · Screenshot-derived source-level cascade repair.'));
assert.ok(diagnostic.length>4000,'Four screenshot classes must be covered by the new source-scoped repair');
assert.match(diagnostic,/@media screen/);
const settingsSource=injected.match(/body #sagsSettingsCenter#sagsSettingsCenter \{([^}]+)\}/);
assert.ok(settingsSource,'Actual injected settings source must exist');
for(const [name,token] of [['--sc-bg','--et-shell'],['--sc-card','--et-card'],['--sc-fg','--et-fg'],['--sc-muted','--et-sub'],['--sc-button','--et-raised'],['--sc-button-fg','--et-fg']]){
 assert.ok(settingsSource[1].includes(name+':var('+token),'Settings must follow active mode: '+name);
}
assert.doesNotMatch(settingsSource[1],/--sc-bg:#0b1e2c|--sc-fg:#f4f7fa/,'Forced dark mode in injected settings root');
assert.match(injected,/#v6494AviationHome#v6494AviationHome[^}]*color:var\(--et-sub/,'Light dashboard text cannot remain pale');
assert.match(diagnostic,/#sagsSettingsCenter#sagsSettingsCenter/,'Settings fixes must compete with double-ID selectors');
assert.match(diagnostic,/#fwcModal#fwcModal \.fwcHead :is\(#v477Close,#v644MyFlightBack,\.fwcBtn.gray\)/);
assert.match(diagnostic,/#opsHomeQueue \.opsQueueHead :is\(h2,strong\)/);
assert.match(diagnostic,/#opsHomeQueue \.opsQueueHead :is\(small,#opsFlightCount\)/);
assert.match(diagnostic,/#fwcList\.v478CanonicalQueue \.v478RoleModules \.fwcBadge\.warn/);
for(const name of ['--et-warn-bg','--et-warn-fg','--et-warn-edge'])assert.ok(css.includes(name+':'),'Missing paired warning variable '+name);
for(const cls of ['.fwcFormChip.warn','.fwcBadge.warn','.v1199FormTile.warn']){
 assert.ok(diagnostic.includes(cls),'Amber status scoped selector missing '+cls);
}
assert.match(diagnostic,/-webkit-text-fill-color:var\(--et-warn-fg\)!important/,'Safari/chrome warning title text cannot inherit navy');
assert.match(ui,/\.fwcFormChip\.warn\{[^}]*background:var\(--et-warn-bg/,'Warning chip source must have paired fill');
assert.match(ui,/\.v478RoleModules \.fwcBadge\.warn\{[^}]*color:var\(--et-warn-fg/,'Unclaimed module label must have paired foreground');
const palettes={
 light:{bg:'#fff3d4',fg:'#654100',card:'#ffffff',primary:'#111827',sub:'#334155'},
 dark:{bg:'#3c2f17',fg:'#ffe3a4',card:'#151d2a',primary:'#f8fafc',sub:'#dbe4ee'}
};
const luminance=hex=>{const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722};
const ratio=(a,b)=>{let x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const [mode,p] of Object.entries(palettes)){
 const root=css.slice(css.indexOf('html.new-ui-v1[data-ui-theme="'+mode+'"] {',css.indexOf('/* V1.1 unified two-theme')));
 for(const [name,value] of [['--et-warn-bg',p.bg],['--et-warn-fg',p.fg]]){
  assert.ok(root.slice(0,1000).includes(name+':'+value),'Wrong '+mode+' semantic '+name);
 }
 assert.ok(ratio(p.bg,p.fg)>=4.5,mode+' amber status must meet WCAG 4.5');
 assert.ok(ratio(p.card,p.primary)>=7,mode+' primary on card contrast');
 assert.ok(ratio(p.card,p.sub)>=4.5,mode+' secondary on card contrast');
}
for(const forbidden of ['#entryPaperSheet','.sheet{','.paper{','canvas{','#sigCanvas']){
 assert.ok(!diagnostic.includes(forbidden),'New contrast rules must never recolor PDF, paper or signature: '+forbidden);
}
assert.equal([...fs.readFileSync('index.html','utf8').matchAll(/<link[^>]+rel="stylesheet"/g)].length,6,'No extra stylesheet network request');
console.log('V1.8 screenshot regressions: dark-on-dark MENU, amber waiting cards, settings root and today heading verified for both modes');
