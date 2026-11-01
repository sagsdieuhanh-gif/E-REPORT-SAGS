const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'app/styles/new-ui-v1.css'),'utf8');
assert.match(html,/app\/boot\/32-v6494-aviation-shell\.js/);
assert.match(css,/SUPERVISOR ALL-FLIGHT HOME \+ AD CONTRAST HARDENING/);
assert.doesNotMatch(html,/id="sagsCanonicalProduction"/);
assert.doesNotMatch(html,/location\.replace\(u\.href\)/);
assert.match(html,/sags-radio-custody-v1/);
console.log('Dashboard preserved; GitHub Pages has no forced redirect');
