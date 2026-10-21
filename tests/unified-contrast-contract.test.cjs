'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('app/styles/unified-contrast.v1.css'),idx=read('index.html'),sw=read('service-worker.js');
const ver=JSON.parse(read('version.json')),manifest=JSON.parse(read('asset-manifest.json'));
assert.equal(ver.build,manifest.build);
assert.ok(css.startsWith('/* E-REPORT-SAGS V2.5.20'));
assert.match(css,/@media screen\s*\{/,'only screen presentations may be recolored');
assert.doesNotMatch(css,/(^|\n)\s*(?:\*|svg|canvas|\.sheet|\.pdfCanvas|#sigCanvas|#entryPaperSheet)\s*[{,]/,'official form, PDF and signatures are excluded');
const title=['#csgModal','#csgMgr','#v6494AviationHome','#v157HomeDashboard','#roleLoginModal','#fwcModal','#sagsSettingsCenter','#dailyRosterModal','#fleetManagerModal','#sagsFlightDossierModal'];
for(const id of title)assert.ok(css.includes(id),'missing shared color context: '+id);
for(const key of ['--ec-dark-bg','--ec-dark-card','--ec-dark-control','--ec-dark-fg','--ec-dark-sub','--ec-light-bg','--ec-light-card','--ec-light-soft','--ec-light-fg','--ec-light-sub','--ec-light-label','--ec-action','--ec-action-fg','--ec-warning-bg','--ec-warning-fg'])assert.ok(css.includes(key),'missing token '+key);
for(const key of ['csgKey','csgService span','csgMainValue','csgService strong','csgUnset','csgQuickReview','csgQuickNote','csgMgrPreview','csgCarrier','csgSearch','csgFoot','csgCurrent'])assert.ok(css.includes(key),'unaddressed airline notebook label '+key);
const hex=Object.fromEntries([...css.matchAll(/(--ec-[\w-]+):\s*(#[0-9a-f]{6})/g)].map(x=>[x[1],x[2]]));
function luminance(h){return[1,3,5].map(n=>parseInt(h.slice(n,n+2),16)/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const x=luminance(hex[a]),y=luminance(hex[b]);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const pairs=[
['--ec-dark-fg','--ec-dark-bg'],['--ec-dark-fg','--ec-dark-card'],['--ec-dark-fg','--ec-dark-control'],
['--ec-dark-sub','--ec-dark-bg'],['--ec-dark-sub','--ec-dark-card'],['--ec-dark-sub','--ec-dark-control'],
['--ec-light-fg','--ec-light-bg'],['--ec-light-fg','--ec-light-card'],['--ec-light-fg','--ec-light-soft'],
['--ec-light-sub','--ec-light-bg'],['--ec-light-sub','--ec-light-card'],['--ec-light-sub','--ec-light-soft'],
['--ec-light-label','--ec-light-bg'],['--ec-light-label','--ec-light-card'],['--ec-light-label','--ec-light-soft'],
['--ec-action-fg','--ec-action'],['--ec-warning-fg','--ec-warning-bg']
];
for(const[a,b] of pairs)assert.ok(contrast(a,b)>=4.5,a+' on '+b+': '+contrast(a,b).toFixed(2)+':1');
assert.ok(idx.includes('app/styles/unified-contrast.v1.css?v='+ver.build));
assert.ok(sw.includes('./app/styles/unified-contrast.v1.css'));
assert.ok(idx.indexOf('app/modules/theme-contrast.v2.js')<idx.indexOf('app/styles/unified-contrast.v1.css'),'unified styles must follow runtime theme correction');
assert.ok(manifest.assets['./app/styles/unified-contrast.v1.css'],'missing verified CSS asset');
console.log('Unified contrast: '+pairs.length+' AA text pairs passed; screen-only; shared mobile/desktop roots, print-safe and release-pinned.');
