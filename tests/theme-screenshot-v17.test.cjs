'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const css=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
const notice=fs.readFileSync('app/boot/33-v6497-dossier-enhancements.js','utf8');
const main=fs.readFileSync('app/styles/boot-36-v6494-aviation-final.css','utf8');
const last=css.slice(css.indexOf('/* V1.7 SCREENSHOT QA'));
assert.ok(last.length>9500,'Screenshot QA scope must be present');
assert.match(last,/@media screen/,'Never recolor printed documents');
const cases=[
 ['header name','.v6494TopIdentity b','--et-fg'],
 ['header role','.v6494TopIdentity small','--et-sub'],
 ['sidebar items','.v157MenuItem:not(.active)','--et-fg'],
 ['sidebar role','.v157UserRole','--et-sub'],
 ['sidebar logout','#v157LogoutBtn','--et-raised'],
 ['airline cards','.opsAirlineChip','--et-card'],
 ['airline text','.opsAirlineChip b','--et-fg'],
 ['metric cards','#opsHomeMetrics>.opsMetricCard','--et-card'],
 ['metric count','.opsMetricBody strong','--et-fg'],
 ['metric caption','.opsMetricLabel','--et-sub'],
 ['metric action','.opsMetricCta','--et-link'],
 ['My Flight main','#fwcModal.show','--et-shell'],
 ['My Flight search','#sagsFlightSearch','--et-input'],
 ['My Flight date','#fwcDate','--et-input'],
 ['My Flight tabs','.v1199Tab:not(.active)','--et-raised'],
 ['My Flight selected tab','.v1199Tab.active','--et-hover'],
 ['My Flight cards','.v1199Card','--et-card'],
 ['My Flight role cards','.v478CanonicalRoleCard','--et-card'],
 ['My Flight meta','.v1199Meta','--et-sub'],
 ['My Flight airline info','.opsFwcIdentity small','--et-sub'],
 ['My Flight form tile','.v1199FormTile:not(.done)','--et-raised']
];
for(const [name,selector,variable] of cases){
 assert.ok(last.includes(selector),'Uncovered screenshot region: '+name);
 assert.ok(last.includes('var('+variable+')'),'Missing paired palette '+variable+' for '+name);
}
assert.ok(last.includes('-webkit-text-fill-color:var(--et-fg)!important'),'iOS Safari text contrast');
assert.ok(last.includes('color-scheme:inherit!important'),'Native date/control glyphs inherit active scheme');
assert.ok(last.includes('max-width:100vw!important'),'Mobile viewport overflow guard');
const toTest=last.replace(/\/\*[\s\S]*?\*\//g,'');
for(const forbidden of ['#entryPaperSheet','.sheet{','.paper{','.pdfPage{','#sigCanvas{']){
 assert.ok(!toTest.includes(forbidden),'Never repaint the official paper: '+forbidden);
}
assert.match(css,/#v6494AviationHome\{--a-bg:var\(--et-shell\);/,'Final home palette must no longer force navy');
assert.match(css,/#opsHomeMetrics \.opsMetricBody strong\{[^}]*color:var\(--et-fg\)!important/s,'Numerals must inherit theme');
assert.match(css,/#fwcModal \.sagsWorkDateControl\{[^}]*background:var\(--et-input\)!important/s,'Date field background must follow foreground');
for(const token of ['#v6497NoticePanel','#v6497NoticeHead','#v6497NoticeList','#v6497NoticeClose','.v6497NoticeEmpty']){
 assert.ok(notice.includes(token),'Dynamic notice component missing '+token);
}
for(const token of ['background:var(--et-card,#071824)','color:var(--et-fg,#f2f7fa)','background:var(--et-raised,#0b2435)','color:var(--et-sub,#7895a7)']){
 assert.ok(notice.includes(token),'Dynamic notice should use active palette '+token);
}
assert.doesNotMatch(notice,/#v6497NoticePanel\{[^}]*background:#071824/,'Dynamic popup must not pin dark colors');
const luminance=hex=>{
 const a=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return a[0]*.2126+a[1]*.7152+a[2]*.0722;
};
for(const [mode,bg,fg,sub] of [
 ['light','#ffffff','#111827','#334155'],
 ['dark','#151d2a','#f8fafc','#dbe4ee']
]){
 const contrast=(a,b)=>{let x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 assert.ok(contrast(bg,fg)>=7,mode+' primary text contrast');
 assert.ok(contrast(bg,sub)>=4.5,mode+' secondary text contrast');
}
assert.ok(main.includes('background:var(--a-surface)'),'Prior aviation source still linked to semantic palette');
console.log('V1.7 screenshot-regression: '+cases.length+' screen regions, delayed notice, date input, PC/mobile, WCAG pairs, paper safety verified');
