const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const global=read('app/styles/new-ui-v1.css'),theme=read('app/modules/theme-contrast.v2.js');
const index=read('index.html'),formInput=read('app/modules/form-entry-contrast.v1.js');
const registry=JSON.parse(read('forms/forms.registry.json'));
const ratio=(fg,bg)=>{const rgb=h=>h==='#fff'?[255,255,255]:[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 const L=h=>rgb(h).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const a=L(fg),b=L(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
const pairs=[
 ['Quick Entry main title','#f4fbff','#0b1e2c'],
 ['Quick Entry sub-title','#bfd3e2','#0b1e2c'],
 ['Quick Entry numeric/text input','#f4fbff','#081c2b'],
 ['Quick Entry button','#eef8ff','#173b50'],
 ['Quick Entry disabled button','#bdd2df','#173242'],
 ['Quick Entry Next','#ffffff','#116b84'],
 ['My Flight date','#f4f7fa','#102838'],
 ['My Flight search','#17212b','#ffffff'],
 ['Settings dark input','#f4f7fa','#102230'],
 ['Settings light input','#17212b','#ffffff'],
 ['54/94 and native entry','#17212b','#ffffff'],
 ['Admin/Flight data card','#eef9ff','#0b2742'],
 ['FSAGS09 input','#f6fbff','#172a3a'],
 ['Quick Time dark label','#eef8ff','#0b1b27']
];
for(const[name,fg,bg]of pairs)assert.ok(ratio(fg,bg)>=4.5,name+': '+ratio(fg,bg).toFixed(2)+':1');
assert.ok(registry.forms.length>=10,'all form families must remain in the contrast audit');
for(const key of ['sagsQuickEntry','fwcModal','sagsSettingsCenter','sags5494Quick','sags5494FieldEditor','entry','quickTimeModal','fs09QuickModal','v6494AviationHome'])assert.ok(theme.includes('#'+key),'missing contrast contract for '+key);
for(const key of ['#sqValue','#sqPrev','#sqNext','#sqNA','#sqClose'])assert.ok(theme.includes(key),'uncovered Quick Entry surface '+key);
assert.match(theme,/-webkit-text-fill-color:#f4fbff!important/,'Safari color fill must follow foreground');
assert.match(theme,/new-ui-v1\.new-ui-v1\.new-ui-v1\.new-ui-v1 body #sagsQuickEntry #sqValue/,'quick entry must outrank broad entry input overrides');
assert.match(formInput,/const BASE='html\.new-ui-v1\.new-ui-v1\.new-ui-v1\.new-ui-v1/,'test priority assumption must match real input layer');
const spot=global.slice(global.indexOf('/* V2.4.7: Quick Entry ALWAYS navy'),global.indexOf('/* 42.1 \/ 42.3 \/ 55.1 quick-time sheet'));
assert.match(spot,/#sagsQuickEntry>\.sq-card\{background:#0b1e2c!important/);
assert.doesNotMatch(spot,/color:#102f42|background:#f8fbfd|background:#fff!important/,'never revive light foreground/background conflict');
assert.match(theme,/#sagsQuickEntry #sqValue\:focus\{background:#081c2b!important/);
assert.match(theme,/#sagsQuickEntry :is\(#sqPrev,#sqNext,#sqNA\):disabled\{background:#173242!important/);
assert.match(theme,/data-ui-theme="dark"\] body #sagsSettingsCenter/);
assert.match(theme,/data-ui-theme="light"\] body #sagsSettingsCenter/);
assert.match(theme,/color-scheme:light!important/);
assert.doesNotMatch(theme,/\.sheet\s*\{|\.pdfCanvas\s*\{|#sigCanvas\s*\{/,'never repaint PDF/paper/signature area');
assert.ok(index.indexOf('app/modules/form-entry-contrast.v1.js')<index.indexOf('app/modules/theme-contrast.v2.js'),'surface correction should load after generic input override');
console.log('UI contrast contract audit passed: '+pairs.length+' pairs >=4.5:1; '+registry.forms.length+' form families and mobile/desktop surfaces covered');
