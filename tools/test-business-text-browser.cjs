/* Offline input/render behavior; requires Playwright and AUDIT_CHROME if needed. */
const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/':'')+'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--in-process-gpu']});
 try{
  const page=await browser.newPage();await page.route('**/*',r=>r.abort());
  await page.setContent('<html class="new-ui-v1"><body><label id="label">Họ tên người phục vụ</label><input id="admFullName"><textarea id="entryText"></textarea><input id="sqValue"><textarea data-q-field="FSAGS54_handlingNotes"></textarea><input class="quickTimeInput" data-vzk="notes"><input id="password" type="password"><input id="login" autocomplete="username"><input id="email" type="email"><input id="url" type="url"><textarea id="configJson"></textarea><div contenteditable="true" id="plainNote"></div><div class="sheet"><span id="original">Original form title</span><svg><text>Original SVG text</text></svg></div><button id="save">Lưu dữ liệu</button></body></html>');
  await page.addStyleTag({content:fs.readFileSync('app/styles/new-ui-v1.css','utf8')});await page.addScriptTag({content:fs.readFileSync('app/modules/business-text.v1.js','utf8')});
  await page.evaluate(()=>{window.received={};document.querySelectorAll('input,textarea').forEach(e=>e.addEventListener('input',()=>{received[e.id||e.dataset.qField||e.dataset.vzk]=e.value}));});
  for(const selector of ['#admFullName','#entryText','#sqValue','[data-q-field]','[data-vzk]']){
   await page.locator(selector).fill('Nguyễn Trung Kiên / bx787');
   assert.equal(await page.locator(selector).inputValue(),'NGUYỄN TRUNG KIÊN / BX787',selector);
   const actual=await page.locator(selector).evaluate(e=>received[e.id||e.dataset.qField||e.dataset.vzk]);assert.equal(actual,'NGUYỄN TRUNG KIÊN / BX787','downstream draft must receive uppercase');
  }
  await page.locator('#entryText').fill('aßcd');await page.locator('#entryText').evaluate(e=>{e.value='aßcd';e.setSelectionRange(2,2);e.dispatchEvent(new InputEvent('input',{bubbles:true,data:'ß'}));});
  assert.deepEqual(await page.locator('#entryText').evaluate(e=>[e.value,e.selectionStart]),['ASSCD',3]);
  await page.locator('#entryText').evaluate(e=>{e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.value='tiếng Việt';e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});
  assert.equal(await page.locator('#entryText').inputValue(),'tiếng Việt');
  await page.locator('#entryText').evaluate(e=>e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'tiếng Việt'})));
  assert.equal(await page.locator('#entryText').inputValue(),'TIẾNG VIỆT');assert.equal(await page.evaluate(()=>received.entryText),'TIẾNG VIỆT');
  // A recovery/autofill assignment without an input event is synchronized on focus.
  await page.locator('#save').focus();await page.locator('#entryText').evaluate(e=>{e.value='nội dung khôi phục'});await page.locator('#entryText').focus();assert.equal(await page.evaluate(()=>received.entryText),'NỘI DUNG KHÔI PHỤC');
  for(const [selector,value]of [['#password','CaseSensitive'],['#login','CaseSensitiveUser'],['#email','Someone@Example.com'],['#url','https://example.com/aBcD'],['#configJson','{"Case":"Sensitive"}']]){await page.locator(selector).fill(value);assert.equal(await page.locator(selector).inputValue(),value,selector);}
  await page.locator('#plainNote').fill('ghi chú tiếng Việt');assert.equal(await page.locator('#plainNote').textContent(),'GHI CHÚ TIẾNG VIỆT');
  assert.equal(await page.locator('#original').evaluate(e=>getComputedStyle(e).textTransform),'none');assert.equal(await page.locator('svg text').evaluate(e=>getComputedStyle(e).textTransform),'none');
  assert.equal(await page.locator('#label').evaluate(e=>getComputedStyle(e).textTransform),'uppercase');assert.equal(await page.locator('#save').evaluate(e=>getComputedStyle(e).textTransform),'uppercase');
  await page.screenshot({path:'/tmp/sags-uppercase-browser.png'});
  console.log('Browser uppercase: real input/capture/draft values, Vietnamese IME, Unicode caret, recovered input, plain contenteditable, UI labels, original paper and credentials passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
