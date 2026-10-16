const fs=require('node:fs'),assert=require('node:assert/strict'),acorn=require('acorn');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME||'/tmp/sags-chrome-shell/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--in-process-gpu']});
 try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 const index=fs.readFileSync('index.html','utf8'),input=id=>index.match(new RegExp('<input\\b[^>]*id="'+id+'"[^>]*>'))[0];
 await page.setContent('<html class="new-ui-v1"><body><div id="roleLoginModal"><div class="roleLoginCard"><h2>Login</h2>'+input('personalLoginUser')+input('roleLoginPass')+'</div></div>'+input('ownNewPassword')+'<input id="businessName"></body></html>');
 await page.addStyleTag({content:fs.readFileSync('app/styles/new-ui-v1.css','utf8')});
 await page.addScriptTag({content:fs.readFileSync('app/modules/business-text.v1.js','utf8')});
 const source=fs.readFileSync('app/modules/ui-preferences.v1.js','utf8');let code;
 (function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id.name==='installLogin')code=source.slice(n.start,n.end);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)})(acorn.parse(source,{ecmaVersion:'latest'}));
 await page.addScriptTag({content:code+';installLogin();'});
 for(const id of ['personalLoginUser','roleLoginPass','ownNewPassword']){
  const input=page.locator('#'+id);await input.fill('aBcD@123');await input.blur();
  assert.equal(await input.inputValue(),'aBcD@123');assert.equal(await input.evaluate(el=>getComputedStyle(el).textTransform),'none');
  assert.equal(await input.getAttribute('autocapitalize'),'none');assert.equal(await input.getAttribute('autocorrect'),'off');
 }
 const password=page.locator('#roleLoginPass');
 for(let n=0;n<4;n++){
  await page.locator('.sagsAviationPasswordToggle').click();
  assert.equal(await password.getAttribute('type'),n%2===0?'text':'password');
  assert.equal(await password.evaluate(el=>getComputedStyle(el).textTransform),'none');
  await password.fill('MiXeD-passZ9');await password.press('End');await password.pressSequentially('aB');await password.blur();
  assert.equal(await password.inputValue(),'MiXeD-passZ9aB');
 }
 await page.locator('#businessName').fill('nguyễn trung kiên');assert.equal(await page.locator('#businessName').inputValue(),'NGUYỄN TRUNG KIÊN');
 console.log('Login browser test passed: real show/hide handler, typing/paste/blur preserve exact credentials and visual casing; business text stays uppercase.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
