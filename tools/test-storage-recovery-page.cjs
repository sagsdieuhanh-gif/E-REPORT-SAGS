const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const base=process.cwd();const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(base,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return}
  try{const data=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(data)}catch(_){res.writeHead(404).end()}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME||'/tmp/sags-chrome-shell/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--in-process-gpu']});
 try{
 const context=await browser.newContext();await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const old=await context.newPage();await old.goto(origin+'/old-shell-fixture.html');
 await old.evaluate(()=>{localStorage.setItem('sagsFlightSessionV1:TEST:A',JSON.stringify({state:{note:'DỮ LIỆU CŨ',photo:'data:image/png;base64,'+'aBcD+/'.repeat(50000)}}));for(const size of [262144,1024,1]){let i=0;while(i<20000){try{localStorage.setItem('filler-'+size+'-'+i,'x'.repeat(size));i++}catch(_){break}}}});
 const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')console.log('Browser:',m.text())});await page.goto(origin+'/storage-recovery.html');
 await page.locator('#run').click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('CỬA SỔ E-REPORT'),null,{timeout:90000});
 assert.equal(await old.evaluate(()=>localStorage.getItem('sagsFlightSessionV1:TEST:A').startsWith('{')),true,'old reader still sees original JSON while both windows open');
 await old.close();await page.locator('#run').click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('ĐÃ KIỂM TRA GHI THÀNH CÔNG'),null,{timeout:90000});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sagsFlightSessionV1:TEST:A')).state.note),'DỮ LIỆU CŨ');
 assert.equal(await page.locator('#back').getAttribute('hidden'),null);
 const result=await page.evaluate(()=>SAGSStorageCapacity.status());assert.ok(result.converted>=1);assert.ok(result.savedChars>0);
 console.log('Recovery page passed with actual release Service Worker: verifies assets, blocks old second window, preserves old JSON, compacts after closing it, confirms write and exposes return link.');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
