'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app/modules/signature-template-reset.v1.js','utf8');
const legacy=fs.readFileSync('app/boot/05-legacy.js','utf8'),html=fs.readFileSync('index.html','utf8');
assert(html.includes('id="sagsClearSavedSignature"'),'Personal signature menu must expose clear button');
assert(html.includes("import('./app/modules/signature-template-reset.v1.js?v="),'Reset code must load only on demand');
assert(html.includes('Không xóa chữ ký đã lưu trong các report'),'Never imply existing signed reports are deleted');
const start=legacy.indexOf('async function signatureImageToDataURL(');
const end=legacy.indexOf('document.getElementById("signatureImageInput")?.addEventListener',start);
assert(start>0&&end>start);
const compressor=legacy.slice(start,end);
assert(compressor.includes('const maxSide=1600;'),'Reduce full-size signature sample upload work');
assert(compressor.includes('out.width=960;out.height=252;'),'New signature PNG raster must be significantly lighter');
assert(!compressor.includes('out.width=1600;out.height=420;'));
function harness({cloud=true,network=true,failCloud=false,staleCloud=false,approved=true}={}){
 const storage=new Map([
  ['signature::USER1',JSON.stringify({fullname:'A',signature:'data:image/png;base64,OLD'})],
  ['signature::USER2',JSON.stringify({fullname:'B',signature:'data:image/png;base64,OTHER'})],
  ['draft::USER1',JSON.stringify({sigArr:'data:image/png;base64,FORM_SIGNED'})]
 ]);
 const result={confirmed:[],alerts:[],writes:[],reads:0,editor:0,updated:0,files:0};
 const elements=new Map([
  ['sagsClearSavedSignature',{disabled:false}],
  ['signatureSampleStatus',{textContent:''}],
  ['signatureTemplatePreview',{src:'data:image/png;base64,OLD',style:{display:'block'},removeAttribute(key){delete this[key]}}],
  ['signatureImageInput',{value:'photo.png'}],
  ['signatureFullNameInput',{value:'A'}],
  ['templateModal',{style:{display:'flex'}}]
 ]);
 const doc={
  set:async(value,opts)=>{
   result.writes.push({value,opts});
   if(failCloud)throw Error('permission-denied');
  },
  get:async(opts)=>{
   result.reads++;assert.equal(opts.source,'server');
   return {metadata:{fromCache:false},data:()=>staleCloud?{signatureTemplateData:'old'}:{}};
  }
 };
 const c={Promise,Error,String,Date,console,
  SIGN_TEMPLATE_KEY:'signature',
  currentUserProfile:cloud?{docId:'user1'}:{},
  sagsOwnedKey:base=>base+'::USER1',
  getSavedTemplate:()=>storage.has('signature::USER1')?JSON.parse(storage.get('signature::USER1')):null,
  initHandoverFirebase:()=>({collection:(name)=>{assert.equal(name,'sags_handovers');return{doc:id=>{assert.equal(id,'user1');return doc}}}}),
  HANDOVER_COLLECTION:'sags_handovers',
  pendingSignatureImage:'data:image/png;base64,OLD',
  localStorage:{removeItem:k=>storage.delete(k),getItem:k=>storage.get(k)??null},
  navigator:{onLine:network},
  window:{firebase:{auth:()=>({currentUser:{uid:'auth1'}}),firestore:{FieldValue:{delete:()=>({__deleted:true})}}}},
  document:{getElementById:id=>elements.get(id)},
  confirm:msg=>{result.confirmed.push(msg);return approved},
  alert:msg=>result.alerts.push(msg),
  updateTemplateStatus:()=>result.updated++,
  openSignatureSampleEditor:()=>result.editor++
 };
 vm.createContext(c);
 vm.runInContext(source.replace('export async function clearSavedSignatureTemplate','async function clearSavedSignatureTemplate')+'\nthis.reset=clearSavedSignatureTemplate;',c);
 return {c,result,storage,elements};
}
(async()=>{
 const ok=harness();assert.equal(await ok.c.reset(),true);
 assert.equal(ok.storage.has('signature::USER1'),false);
 assert.equal(ok.storage.has('signature::USER2'),true,'Do not erase other user signature');
 assert.equal(ok.storage.has('draft::USER1'),true,'Do not erase existing signed report');
 assert.equal(ok.c.pendingSignatureImage,'');
 assert.equal(ok.result.updated,1);assert.equal(ok.result.editor,1);
 assert.equal(ok.result.reads,1);assert.equal(ok.result.writes.length,1);
 assert.equal(ok.result.writes[0].value.signatureTemplateData.__deleted,true);
 assert.equal(ok.result.writes[0].value.signatureTemplateFullName.__deleted,true);
 assert.equal(ok.result.writes[0].opts.merge,true);
 assert.equal(ok.elements.get('signatureTemplatePreview').style.display,'none');
 assert.equal(ok.elements.get('signatureImageInput').value,'');
 assert.equal(ok.result.alerts.length,0);
 const cancel=harness({approved:false});assert.equal(await cancel.c.reset(),false);
 assert.equal(cancel.storage.has('signature::USER1'),true);assert.equal(cancel.result.writes.length,0);
 const offline=harness({network:false});assert.equal(await offline.c.reset(),false);
 assert.equal(offline.storage.has('signature::USER1'),true,'Offline should never falsely claim full deletion');
 const blocked=harness({failCloud:true});assert.equal(await blocked.c.reset(),false);
 assert.equal(blocked.storage.has('signature::USER1'),true,'Permission failure retains existing local signature');
 const stale=harness({staleCloud:true});assert.equal(await stale.c.reset(),false);
 assert.equal(stale.storage.has('signature::USER1'),true,'Do not erase local if server still has old signature');
 const local=harness({cloud:false});assert.equal(await local.c.reset(),true);
 assert.equal(local.storage.has('signature::USER1'),false);assert.equal(local.result.writes.length,0);
 console.log('Account-scoped signature reset, Firestore deletion receipt, no-touch signed reports and lighter transparent PNG sample PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
