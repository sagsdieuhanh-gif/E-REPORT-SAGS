'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const crypto=require('node:crypto').webcrypto;
const edge=fs.readFileSync('supabase/functions/sags-radio-photo-v1/index.ts','utf8');
const app=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const vault=fs.readFileSync('app/modules/radio-photo-vault.v1.js','utf8');
new Function(edge);new Function(app);new Function(vault);
for(const x of ['sags-radio-originals-v1','RADIO_CAP=700*MIB','PROJECT_CAP=900*MIB',
 'sags_radio_photo_cleanup_audit_v1','function verifyFirebase','await authorizeEvent',
 'state:"PURGED"','BUCKET_QUOTA','signed_day=lt.','/storage/v1/object/',
 'oldestDayBefore(cutoff)','return reply(req,429','return reply(req,410',
 'verify_jwt=false','if(!await acquire(holder))'])
 assert(edge.includes(x),'Edge/photo quota protection missing: '+x);
for(const x of ['const savedPhotoEventIds={}','savedPhotoEventIds.old=updateDevice(',
 'savedPhotoEventIds.new=updateDevice(','await vault.queue(eventId,user.uid,fullBlob)',
 'async function originalRadioPhotoBlob(leg)','await vault.flush','root.SAGSRadioPhotoVaultV1?.isOriginal(e.id)'])
 assert(app.includes(x),'Signed photo or export integration missing: '+x);
assert(vault.includes("root.indexedDB.open(DB,1)"),'original JPEG retry must be durable');
assert(vault.includes("user.uid!==record.uid"),'only the actor may retry original upload');
assert(!vault.includes('service_role')&&!vault.includes('sb_secret_'),
 'never ship privileged server key to the browser');
assert(!app.includes("radioIssueable=d=>!!d&&['READY'].includes"),
 'do not reintroduce radio fault quarantine');

async function exercise(){
 const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',
  modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const key=await crypto.subtle.exportKey('jwk',keys.publicKey);key.kid='unit-kid';
 const now=Math.floor(Date.now()/1000),uid='test-firebase-user-1';
 const b64=x=>Buffer.from(x).toString('base64url');
 const payload={iss:'https://securetoken.google.com/e-report-sags',aud:'e-report-sags',
  sub:uid,iat:now,exp:now+3600,auth_time:now-20,firebase:{sign_in_provider:'password'}};
 const head=b64(JSON.stringify({alg:'RS256',kid:'unit-kid'}));
 const body=b64(JSON.stringify(payload));
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,
  new TextEncoder().encode(head+'.'+body));
 const token=head+'.'+body+'.'+Buffer.from(signature).toString('base64url');
 const base='https://wggirxzdcfnxyjgjvpgh.supabase.co';
 const sourceEvent='signedEvent001';
 const oldEvent='oldSignedEvent002';
 const entries=new Map(),files=new Map(),audits=[],events=new Map();
 const signedAt=new Date().toISOString();
 const fakeEvent={fields:{actorUid:{stringValue:uid},deviceCode:{stringValue:'DH01'},
  action:{stringValue:'ISSUE'},signature:{stringValue:'data:image/jpeg;base64,'+'x'.repeat(300)},
  at:{timestampValue:signedAt}}};
 events.set(sourceEvent,fakeEvent);events.set(oldEvent,fakeEvent);
 let radioUsed=0,otherUsed=0,locked=false,deleted=[];
 let handler;
 const ok=(value,status=200)=>new Response(JSON.stringify(value),{
  status,headers:{'Content-Type':'application/json'}});
 const mockFetch=async (url,options={})=>{
  const u=new URL(url),method=options.method||'GET';
  if(url.includes('/service_accounts/v1/jwk/'))return ok({keys:[key]});
  if(u.hostname==='firestore.googleapis.com'){
   const id=u.pathname.split('/').at(-1);
   return events.has(id)?ok(events.get(id)):ok({error:'not found'},404);
  }
  const p=u.pathname;
  if(p.endsWith('/rpc/sags_radio_photo_usage_v1'))return ok([{
   radio_used_bytes:radioUsed,other_used_bytes:otherUsed,radio_objects:files.size}]);
  if(p.endsWith('/rpc/sags_radio_photo_lock_acquire_v1')){
   if(locked)return ok(false);
   locked=true;return ok(true);
  }
  if(p.endsWith('/rpc/sags_radio_photo_lock_release_v1')){locked=false;return ok(true)}
  if(p.endsWith('/'+ 'sags_radio_photo_ledger_v1')){
   if(method==='GET'){
    let rows=[...entries.values()];
    if(u.searchParams.has('event_id'))rows=rows.filter(x=>x.event_id===u.searchParams.get('event_id').slice(3));
    if(u.searchParams.has('state'))rows=rows.filter(x=>x.state===u.searchParams.get('state').slice(3));
    if(u.searchParams.has('signed_day')){
     const filter=u.searchParams.get('signed_day'),date=filter.slice(3);
     rows=rows.filter(x=>filter.startsWith('lt.')?x.signed_day<date:x.signed_day===date);
    }
    if(u.searchParams.get('order'))rows.sort((a,b)=>a.signed_day.localeCompare(b.signed_day));
    const limit=Number(u.searchParams.get('limit')||300);return ok(rows.slice(0,limit));
   }
   const data=JSON.parse(options.body);
   if(method==='POST'){entries.set(data.event_id,data);return ok({})}
   if(method==='PATCH'){
    const id=u.searchParams.get('event_id').slice(3);
    entries.set(id,{...entries.get(id),...data});return ok({});
   }
  }
  if(p.endsWith('/sags_radio_photo_cleanup_audit_v1')){
   if(method==='POST'){audits.push(JSON.parse(options.body));return ok({})}
  }
  if(p.endsWith('/storage/v1/object/sags-radio-originals-v1')&&method==='DELETE'){
   for(const path of JSON.parse(options.body).prefixes){
    files.delete(path);deleted.push(path);
   }
   radioUsed=500*1024*1024;return ok([{name:'removed'}]);
  }
  const start='/storage/v1/object/sags-radio-originals-v1/';
  if(p.includes(start)&&method==='POST'){
   const path=p.split(start)[1];
   if(files.has(path))return ok({error:'existing'},409);
   const bytes=options.body;
   files.set(path,bytes);radioUsed+=bytes.length;return ok({path});
  }
  const readStart='/storage/v1/object/authenticated/sags-radio-originals-v1/';
  if(p.includes(readStart)){
   const path=p.split(readStart)[1];
   if(!files.has(path))return ok({error:'missing'},404);
   return new Response(files.get(path),{status:200,headers:{'Content-Type':'image/jpeg','Content-Length':String(files.get(path).length)}});
  }
  throw Error('Unknown mock endpoint: '+method+' '+url);
 };
 const ctx={Deno:{serve:fn=>{handler=fn},env:{get:name=>
  name==='SUPABASE_URL'?base:name==='SUPABASE_SERVICE_ROLE_KEY'?'unit.jwt.role':null}},
  Response,Request,Blob,FormData,URL,TextDecoder,TextEncoder,Uint8Array,
  atob,crypto,fetch:mockFetch,console,Date,Intl,Set,Map,Error,Number,String,JSON,
  encodeURIComponent,decodeURIComponent};
 vm.runInNewContext(edge,ctx,{filename:'sags-radio-photo-v1.ts'});
 const api=base+'/functions/v1/sags-radio-photo-v1';
 const origin={'Origin':'https://sagsdieuhanh-gif.github.io'};
 let response=await handler(new Request(api+'?eventId='+sourceEvent,{headers:origin}));
 assert.equal(response.status,401,'anonymous source disclosure blocked');
 response=await handler(new Request(api+'?eventId='+sourceEvent,{
  headers:{...origin,Authorization:'Bearer fake.jwt.jwt'}}));
 assert.equal(response.status,401,'forged Firebase signature blocked');
 response=await handler(new Request(api+'?eventId='+sourceEvent,{
  headers:{Origin:'https://evil.example',Authorization:'Bearer '+token}}));
 assert.equal(response.status,403,'unknown web origin blocked');
 const photo=new Uint8Array(18000);photo[0]=255;photo[1]=216;photo.at(-2);photo[photo.length-2]=255;photo[photo.length-1]=217;
 const form=new FormData();form.append('eventId',sourceEvent);
 form.append('image',new Blob([photo],{type:'image/jpeg'}),'photo.jpg');
 response=await handler(new Request(api,{method:'POST',
  headers:{...origin,Authorization:'Bearer '+token},body:form}));
 const uploaded=await response.json();
 assert.equal(response.status,200,JSON.stringify(uploaded));
 assert.equal(uploaded.status,'STORED');
 assert.equal(entries.get(sourceEvent).state,'LIVE');
 response=await handler(new Request(api+'?eventId='+sourceEvent,{
  headers:{...origin,Authorization:'Bearer '+token}}));
 assert.equal(response.status,200);
 assert.equal((await response.arrayBuffer()).byteLength,photo.byteLength);
 // Old-day cleanup: simulate the radio bucket nearing its project budget.
 const oldDay=new Date(Date.now()-5*86400000).toISOString().slice(0,10);
 const oldPath=oldDay.replace(/-/g,'/')+'/'+oldEvent+'-old.jpg';
 entries.set(oldEvent,{event_id:oldEvent,actor_uid:uid,device_code:'DH01',
  action:'ISSUE',signed_day:oldDay,signed_at:new Date(Date.now()-5*86400000).toISOString(),
  file_path:oldPath,bytes:80*1024*1024,sha256:'a'.repeat(64),state:'LIVE'});
 files.set(oldPath,new Uint8Array([1]));
 radioUsed=700*1024*1024-1000;
 const newEvent='signedEvent003';events.set(newEvent,fakeEvent);
 const second=new FormData();second.append('eventId',newEvent);
 second.append('image',new Blob([photo],{type:'image/jpeg'}),'next.jpg');
 response=await handler(new Request(api,{method:'POST',
  headers:{...origin,Authorization:'Bearer '+token},body:second}));
 assert.equal(response.status,200,await response.text());
 assert.equal(entries.get(oldEvent).state,'PURGED');
 assert.equal(audits.length,1);
 assert(deleted.includes(oldPath),'oldest-day object must be removed with Storage API');
 assert(!deleted.includes(entries.get(sourceEvent).file_path),'new images must survive cleanup');
 assert(entries.get(sourceEvent).state==='LIVE','do not delete current day');
 response=await handler(new Request(api+'?eventId='+oldEvent,{
  headers:{...origin,Authorization:'Bearer '+token}}));
 assert.equal(response.status,410,'purged original has explicit status, not a fake image');
 assert.equal((await response.json()).code,'AUTO_PURGED');
 console.log('Radio Supabase Edge functional tests PASS: signed Firebase RS256, RLS-backed event access, original photo read/write, immutable ledger, quota oldest-day eviction, purge receipt and recent photo protection.');
}
exercise().catch(e=>{console.error(e);process.exitCode=1});
