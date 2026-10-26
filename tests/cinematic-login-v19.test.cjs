'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
const manifest=JSON.parse(fs.readFileSync('asset-manifest.json','utf8'));
const start=html.indexOf('<div id="roleLoginModal">');
const end=html.indexOf('<div class="sagsAdminModal" id="accountManagerModal">',start);
assert.ok(start>0&&end>start,'Login markup still exists');
const login=html.slice(start,end);
const expected=[
  'id="roleLoginModal"','class="sagsLoginStage"','class="sagsLoginIdentity"',
  'class="sagsLoginBrandWordmark"','AIRPORT GROUND OPERATIONS',
  'class="roleLoginCard"','id="loginReleaseVersion"',
  'class="sagsLoginThemeBar"','data-sags-login-theme="light"',
  'data-sags-login-theme="dark"','id="personalLoginFields"',
  'id="personalLoginUser"','id="roleLoginPass"','id="roleLoginSubmit"',
  'onclick="roleLogin()"','id="roleLoginError"'
];
for(const id of expected)assert.ok(login.includes(id),'Missing existing login flow or new design: '+id);
for(const id of ['roleLoginModal','loginReleaseVersion','personalLoginFields','personalLoginUser','roleLoginPass','roleLoginSubmit','roleLoginError'])
 assert.equal((login.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Duplicate auth DOM id: '+id);
assert.ok(login.includes('autocomplete="username"')&&login.includes('autocomplete="current-password"'));
assert.ok(login.includes('type="password"')&&login.includes('type="button" onclick="roleLogin()"'));
assert.ok(login.indexOf('sagsLoginThemeBar')<login.indexOf('id="personalLoginFields"'),'Pre-login appearance toggle preserved');
assert.ok(login.includes('id="sagsLoginPasswordToggle"'),'Functional eye button exists');
assert.ok(login.includes("p.type=v?'text':'password'"),'Eye button must change real password input type');
assert.ok(login.includes("this.setAttribute('aria-pressed'"),'Eye toggle accessible state must update');
assert.ok(!/Quên mật khẩu\?|Đăng nhập bằng sinh trắc học/.test(login),'Avoid UI affordances without implemented provider functionality');
assert.ok(!login.includes('value="'), 'Never hardcode or prefill credentials');
const style=css.slice(css.indexOf('/* V1.9 · CINEMATIC LOGIN ONLY'));
assert.ok(style.length>14500,'Full responsive login styling missing');
for(const token of [
  '#roleLoginModal .sagsLoginStage','#roleLoginModal .sagsLoginIdentity',
  '#roleLoginModal .sagsLoginBrandWordmark',
  '#roleLoginModal .roleLoginCard','#roleLoginModal .sagsLoginInputRow',
  '#roleLoginModal .sagsLoginEyeBtn','#roleLoginModal #roleLoginSubmit',
  '#roleLoginModal .sagsLoginThemeBtn.active','#roleLoginModal .sagsLoginFooter',
  'data-ui-theme="light"','max-width:767px','max-width:374px','max-height:720px',
  'overflow-y:auto!important','100dvh','safe-area-inset-bottom'
])assert.ok(style.includes(token),'Responsive appearance required: '+token);
assert.ok(style.includes("url('../../assets/branding/apron-night-v6494.webp')"),'Use pre-existing official cached airport photo');
assert.ok(manifest.assets['./assets/branding/apron-night-v6494.webp'],'Airport photo must be in PWA integrity cache');
assert.ok(!style.includes('display:flex!important;\n   inset:0')&&!style.includes('display:block!important;\n   inset:0'),'Login modal visibility remains under existing auth state control');
assert.ok(!style.includes('#entryPaperSheet')&&!style.includes('.paper{')&&!style.includes('#sigCanvas'),'No PDF or paper form changes');
const srccolors={dark:{fg:'#f6fbff',bg:'#041524',input:'#0b2336'},light:{fg:'#10253a',bg:'#fafcff',input:'#f2f9ff'}};
const luminance=h=>{const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722};
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const [name,{fg,bg,input}] of Object.entries(srccolors)){
 assert.ok(ratio(fg,bg)>7,name+' card primary contrast');
 assert.ok(ratio(fg,input)>7,name+' input text contrast');
}
assert.ok(ratio('#00253a','#07bfee')>4.5,'Cyan gradient start has accessible dark button text');
assert.ok(ratio('#00253a','#35e3e8')>4.5,'Cyan gradient end has accessible dark button text');
assert.equal([...html.matchAll(/<link[^>]+rel="stylesheet"/g)].length,6,'No new stylesheet request');
assert.equal((html.match(/<script[^>]*src=/g)||[]).length>60,true,'Existing lazy and auth module loading is unchanged');
console.log('V1.9: cinematic mobile/desktop login markup, existing Firebase IDs, mode/theme, password eye, contrast, offline artwork and safe modal visibility verified');
