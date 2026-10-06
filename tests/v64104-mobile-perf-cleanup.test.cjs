const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('app/styles/aviation-reference.v1.css');
const home=read('app/modules/aviation-reference.v1.js');
const loader=read('app/modules/feature-loader.v1.js');
const index=read('index.html');
const sw=read('service-worker.js');

assert.match(css,/V6\.4\.104 · MOBILE METRICS \+ RENDER PERFORMANCE/);
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/,'mobile metrics must stay on one horizontal row');
assert.match(css,/content-visibility:auto/,'offscreen cards should skip rendering when supported');

assert.match(home,/lastFlightRenderKey/,'flight-table render signature missing');
assert.match(home,/workspaceBrandTimer/,'workspace branding debounce missing');
assert.doesNotMatch(home,/decorateWorkspaceFlights\(\);setTimeout\(\(\)=>void decorateWorkspaceFlights\(\),90\);setTimeout/,'old triple branding scan must be removed');

assert.match(loader,/sags-release-build/,'AI loader must use current release build');
assert.doesNotMatch(loader,/V6\.4\.101-20261006-MOBILE-UX-SPEED-01/,'stale AI build token must be removed');

for(const f of [
 'app/styles/boot-19-v502RosterDirectStyle.css',
 'app/styles/boot-20-v503hf1AdControlResetStyle.css',
 'app/styles/boot-21-legacy.css',
 'app/styles/boot-22-sags-v611-update-alert-style.css'
]){
 assert.equal(fs.existsSync(path.join(root,f)),false,f+' should be consolidated/deleted');
 assert.equal(index.includes(f),false,f+' must not be requested by index');
 assert.equal(sw.includes('./'+f),false,f+' must not remain in service-worker bootstrap');
}
assert.equal(fs.existsSync(path.join(root,'previews/final-ui')),false,'generated preview snapshot must stay out of deploy tree');
assert.equal(fs.existsSync(path.join(root,'app/core/app.v503.js')),true,'canonical core app source is still required by regression tests');
assert.equal(fs.existsSync(path.join(root,'app/core/runtime.v503hf2.bundle.js')),true,'canonical core runtime source is still required by regression tests');

const styles=[...index.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)].map(x=>x[1]);
assert(styles.length<=6,'stylesheet requests regressed: '+styles.length);

assert.match(index,/rel="preconnect" href="https:\/\/www\.gstatic\.com"/);
console.log('V6.4.104 mobile-row, cleanup and performance regression passed');
