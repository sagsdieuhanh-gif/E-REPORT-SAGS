const fs=require('node:fs'),assert=require('node:assert/strict'),acorn=require('acorn');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
function declarations(path,name){const s=fs.readFileSync(path,'utf8');let result;(function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id.name===name)result=s.slice(n.start,n.end);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)})(acorn.parse(s,{ecmaVersion:'latest'}));return result}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME||'/tmp/sags-chrome-shell/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--in-process-gpu']});
 try{
 const context=await browser.newContext();await context.route('**/*',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><body></body>'}));
 const page=await context.newPage();await page.goto('https://storage-fixture.invalid/');
 await page.evaluate(()=>{
  window.count=1;Object.defineProperty(navigator,'serviceWorker',{value:{controller:{postMessage(message,ports){ports[0].postMessage({ok:true,count:window.count})}},addEventListener(){}}});
  window.physicalGet=Storage.prototype.getItem;window.physicalSet=Storage.prototype.setItem;
  // Deterministic pseudo-random base64 approximates a photo payload rather than repeated notes.
  let seed=42;const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let payload='';
  for(let i=0;i<1100000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;payload+=chars[seed>>>26]}
  window.flightValue=JSON.stringify({state:{notes:'NGUYỄN NGỌC ÁNH\nĐANG NHẬP',sig:'data:image/png;base64,aBcD+/==',attachments:['data:image/jpeg;base64,'+payload]}});
  for(let i=0;i<4;i++)localStorage.setItem('sagsFlightSessionV1:TEST:old-'+i,flightValue);
  for(const size of [16384,128,1]){let n=0;while(n<20000){try{localStorage.setItem('filler-'+size+'-'+n,'x'.repeat(size));n++}catch(_){break}}}
  window.wasFull=false;try{localStorage.setItem('cannot-write','x'.repeat(4096))}catch(e){window.wasFull=e.name==='QuotaExceededError'}
 });
 assert.equal(await page.evaluate(()=>wasFull),true);
 for(const p of ['app/vendor/lz-string-1.5.0.js','app/modules/storage-capacity.v1.js'])await page.addScriptTag({content:fs.readFileSync(p,'utf8')});
 const start=Date.now();await page.evaluate(()=>SAGSStorageCapacity.check());
 assert.equal(await page.evaluate(()=>localStorage.getItem('sagsFlightSessionV1:TEST:old-0')===flightValue),true);
 assert.equal(await page.evaluate(()=>physicalGet.call(localStorage,'sagsFlightSessionV1:TEST:old-0').startsWith('~SAGS-LZ1~')),true);
 // Run the actual legacy storage wrappers against the new underlying codec.
 const runtime=fs.readFileSync('app/core/runtime.v503hf2.bundle.js','utf8');
 await page.evaluate(()=>{window.flightSessionStorageKey=id=>'sagsFlightSessionV1:TEST:'+id;window.currentFlightSessionMeta=()=>({id:'new'});});
 for(const tag of ['V2.2.5-SIGNATURE-EXPORT-STORAGE-FIX-R2','V2.2.6-SIGNATURE-LEGACY-QUOTA-FIX']){
  const at=runtime.indexOf('const BUILD="'+tag+'"'),begin=runtime.lastIndexOf('(function(root)',at),end=runtime.indexOf('\n(function(root)',at);await page.addScriptTag({content:runtime.slice(begin,end)});
 }
 await page.evaluate(()=>{
  window.S=x=>String(x??'').trim();window.canonicalFormGroup=x=>x;window.hash=()=> 'new';window.me=()=> 'TEST';window.startPage=()=>6;window.manualSeed=()=>({f421_fltBefore:'KE467'});window.list=[];
  window.root=window;window.readFlightSessionList=()=>JSON.parse(localStorage.getItem('sagsFlightSessionsV1:TEST')||'[]');window.writeFlightSessionList=x=>localStorage.setItem('sagsFlightSessionsV1:TEST',JSON.stringify(x));window.readFlightSessionEnvelope=id=>JSON.parse(localStorage.getItem(flightSessionStorageKey(id))||'{}');
 });
 await page.addScriptTag({content:declarations('app/core/phases/core-control.js','ensureLocalSession')});
 const meta=await page.evaluate(()=>ensureLocalSession({assignmentId:'KE467-TEST',formGroup:'fsags421'}));assert.equal(meta.id,'roster-new');
 assert.equal(await page.evaluate(()=>readFlightSessionEnvelope('roster-new').state.f421_fltBefore),'KE467');
 assert.equal(await page.evaluate(()=>localStorage.getItem('sagsFlightSessionV1:TEST:old-0')===flightValue),true);
 // Clear memory and re-run the early decoder in a fresh document with the same physical storage.
 const expected=await page.evaluate(()=>flightValue);await page.reload();
 for(const p of ['app/vendor/lz-string-1.5.0.js','app/modules/storage-capacity.v1.js'])await page.addScriptTag({content:fs.readFileSync(p,'utf8')});
 assert.equal(await page.evaluate(()=>localStorage.getItem('sagsFlightSessionV1:TEST:old-0')),expected);
 console.log('Real-browser quota recovery passed: full localStorage → compact photos losslessly → actual My Flight session initialization with legacy wrappers → reload; elapsed '+(Date.now()-start)+'ms. Network fully intercepted.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
