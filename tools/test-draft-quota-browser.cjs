const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME||'/tmp/sags-chrome-shell/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--in-process-gpu']});
 try{
 const context=await browser.newContext();await context.route('**/*',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><body></body>'}));
 const page=await context.newPage();page.on('dialog',d=>d.dismiss());
 await page.addInitScript(()=>{
  window.state={};window.editing=null;window.activeFlightSessionId='A';window.currentUserProfile={username:'TEST'};
  window.__sagsGetSession=()=>({profile:{username:'TEST'}});
  window.currentFlightSessionMeta=()=>({id:window.activeFlightSessionId,rosterAssignmentId:window.activeFlightSessionId});
  window.readFlightSessionEnvelope=()=>({state:{}});window.sagsOwnedPrefix=p=>p+'TEST:';window.persist=()=>{};
 });
 async function boot(){await page.goto('https://draft-fixture.invalid/');for(const p of ['app/modules/stability.v6-core.js','app/modules/cloud-draft-sync.v2.js'])await page.addScriptTag({content:fs.readFileSync(p,'utf8')});}
 await boot();
 const outcome=await page.evaluate(()=>{
  for(const size of [1024*1024,1024,1]){let i=0;while(i<10000){try{localStorage.setItem('quota-'+size+'-'+i,'x'.repeat(size));i++}catch(_){break}}}
  return sagsV61Draft.record('remarks','NỘI DUNG PHẢI CÒN SAU TẢI LẠI','quickTime');
 });
 assert.equal(outcome,false);
 await page.waitForFunction(()=>sagsDraftV2Status().localBackupWrites>0);
 await boot();await page.evaluate(()=>sagsDraftV2RestoreLocal());
 assert.equal(await page.evaluate(()=>sagsV61Draft.read('remarks','quickTime')?.value),'NỘI DUNG PHẢI CÒN SAU TẢI LẠI');
 await page.evaluate(()=>window.activeFlightSessionId='B');assert.equal(await page.evaluate(()=>sagsV61Draft.read('remarks','quickTime')),null);
 console.log('Browser quota test passed: real localStorage full, real IndexedDB backup, reload recovery, flight isolation; all network intercepted.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
