'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
const legacy=fs.readFileSync('app/boot/05-legacy.js','utf8');
const login=html.slice(html.indexOf('<div id="roleLoginModal">'),html.indexOf('<div class="sagsAdminModal" id="accountManagerModal">'));
for(const s of ['id="roleLoginModal"','id="personalLoginUser"','id="roleLoginPass"','id="roleLoginSubmit"','onclick="roleLogin()"','id="roleLoginError"'])
 assert.ok(login.includes(s),'Auth contract changed '+s);
assert.ok(login.includes('autocomplete="username"')&&login.includes('autocomplete="current-password"'));
const style=css.slice(css.indexOf('/* V1.2 MOBILE LOGIN KEYBOARD STABILITY'));
assert.ok(style.length>1700,'Missing login stability CSS at end of source');
for(const s of ['@media screen and (max-width:767px)','height:100svh!important','min-height:100svh!important','max-height:100svh!important','overflow-y:auto!important','justify-content:flex-start!important','align-items:stretch!important','margin-top:auto!important','scroll-behavior:auto!important','font-size:16px!important','@supports not (height:100svh)']){
 assert.ok(style.includes(s),'Keyboard stability contract: '+s);
}
assert.ok(style.includes('background-attachment:scroll!important'),'Avoid background repaint for focused keyboard');
assert.doesNotMatch(style,/transition\s*:[^;]*transform/i,'No focus-driven transform animation');
assert.doesNotMatch(style,/display\s*:\s*(?:flex|block|grid)!important/i,'Existing auth state alone controls modal visibility');
assert.doesNotMatch(style,/#[a-z]+Paper|#sigCanvas|\.sheet\s*\{/i,'Do not modify forms or PDFs');
const start=legacy.indexOf('(function syncSagsVisualViewport()'),end=legacy.indexOf('let entryViewportSnapshot=null;',start);
assert.ok(start>0&&end>start);
const source=legacy.slice(start,end);
const listeners={},vvListeners={};
let rAFs=[],styleWrites=[];
const win={innerWidth:390,innerHeight:790,visualViewport:{width:390,height:790,addEventListener(k,fn){vvListeners[k]=fn}},addEventListener(k,fn){listeners[k]=fn}};
const doc={documentElement:{clientWidth:390,clientHeight:790,style:{setProperty(k,v){styleWrites.push([k,v])}}}};
vm.runInNewContext(source,{window:win,document:doc,requestAnimationFrame(fn){rAFs.push(fn);return rAFs.length},setTimeout(){},Math});
assert.equal(styleWrites.length,2,'Initial dimensions written once');
vvListeners.scroll();vvListeners.scroll();vvListeners.resize();listeners.resize();
assert.equal(rAFs.length,1,'Events within frame coalesce to one layout pass');
rAFs.shift()();assert.equal(styleWrites.length,2,'Scroll-only notifications cannot rewrite unchanged viewport dimensions');
win.visualViewport.height=512;vvListeners.resize();vvListeners.scroll();assert.equal(rAFs.length,1);
rAFs.shift()();assert.equal(styleWrites.length,3,'Keyboard resize changes height exactly once');
assert.deepEqual(styleWrites[2],['--sags-vv-height','512px']);
win.visualViewport.width=420;win.visualViewport.height=512;vvListeners.resize();rAFs.shift()();
assert.equal(styleWrites.length,4,'Width change updates width, not unchanged height');
assert.equal(styleWrites[3][0],'--sags-vv-width');
assert.match(legacy,/function orderedTimeRequirement\(key\)\{return null\}/,'42.1 unrestricted predecessor rules preserved');
assert.match(legacy,/function v22TimeRuleForKey\(key\)\{const k=String\(key\|\|""\);if\(\/\^f421_\/.test\(k\)\)return null/,'42.1 generic pair rules remain disabled');
console.log('V1.2 mobile login: stable keyboard viewport, overflow, no login auth regression, rAF dedupe and 42.1 preserved');
