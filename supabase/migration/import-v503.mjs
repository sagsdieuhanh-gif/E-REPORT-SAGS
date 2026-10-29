/* Copy-only Firebase backup -> private Supabase migration staging. NO Firebase writes. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const DEST_HOST='wggirxzdcfnxyjgjvpgh.supabase.co';
const sha=s=>createHash('sha256').update(s).digest('hex');
const bytes=x=>Buffer.byteLength(JSON.stringify(x),'utf8');
const enc=x=>String(x).replaceAll('~','~0').replaceAll('/','~1');
const dec=x=>x.replaceAll('~1','/').replaceAll('~0','~');
const at=parts=>parts.length?'/'+parts.map(enc).join('/'):'@';
const parts=s=>s==='@'?[]:s.slice(1).split('/').map(dec);
const obj=x=>x!==null&&typeof x==='object';
export function validateBackup(b){
 if(b?.schema!=='E_REPORT_SAGS_BACKUP_V503'||b.project!=='E-REPORT-SAGS')throw Error('Not an E-REPORT-SAGS V503 backup');
 if(!Number.isFinite(Date.parse(b.createdAt)))throw Error('Invalid backup creation time');
 if(!b.data||!obj(b.data)||!obj(b.data.rtdb)||!obj(b.data.firestore))throw Error('Missing Firebase backup stores');
 for(const k of ['sags_live_v470','sags_live_v469'])if(!Object.hasOwn(b.data.rtdb,k))throw Error('Missing RTDB '+k);
 for(const k of ['users','sags_handovers']){
  if(!Array.isArray(b.data.firestore[k]))throw Error('Missing Firestore '+k);
  const ids=new Set();
  for(const d of b.data.firestore[k]){
   if(typeof d?.id!=='string'||!d.id||!obj(d.data)||ids.has(d.id))throw Error('Invalid Firebase doc in '+k);
   ids.add(d.id);
  }
 }
 return {createdAt:b.createdAt,build:String(b.build||''),
  sources:{rtdb:['sags_live_v470','sags_live_v469'],firestore:['users','sags_handovers']},
  counts:{users:b.data.firestore.users.length,handovers:b.data.firestore.sags_handovers.length}};
}
export function flatten(value){
 const out=[];
 function record(p,k,v){
  const source_path=at(p),payload={v};
  if(source_path.length>2048)throw Error('Unsafe Firebase path length');
  out.push({source_path,node_kind:k,payload,value_sha256:sha(JSON.stringify({node_kind:k,payload}))});
 }
 function visit(v,p){
  if(typeof v==='string'&&bytes(v)>65536){
   record(p,'string',null);
   for(let i=0,n=0;i<v.length;i+=6000,n++)visit(v.slice(i,i+6000),[...p,String(n)]);
   return;
  }
  if(!obj(v)||bytes(v)<=65536){record(p,'value',v);return;}
  if(Array.isArray(v)){
   record(p,'array',v.length);
   for(let i=0;i<v.length;i++)visit(v[i],[...p,String(i)]);
  }else{
   record(p,'object',Object.keys(v).length);
   for(const [k,x] of Object.entries(v))visit(x,[...p,k]);
  }
 }
 visit(value,[]);return out;
}
export function reconstruct(rows){
 const tag=Symbol('stringChunk'),nodes=new Map();let root;
 for(const r of [...rows].sort((a,b)=>parts(a.source_path).length-parts(b.source_path).length)){
  if(r.value_sha256!==sha(JSON.stringify({node_kind:r.node_kind,payload:r.payload})))throw Error('SHA mismatch in staging row');
  const k=r.node_kind,v=k==='array'?new Array(r.payload.v):k==='object'?{}:k==='string'?{[tag]:true,chunks:[]}:r.payload.v;
  if(r.source_path==='@')root=v;
  else{
   const pp=parts(r.source_path),parent=nodes.get(at(pp.slice(0,-1))),key=pp.at(-1);
   if(parent==null)throw Error('Incomplete staging parent');
   if(Array.isArray(parent))parent[Number(key)]=v;
   else if(parent[tag])parent.chunks[Number(key)]=v;
   else Object.defineProperty(parent,key,{value:v,writable:true,enumerable:true,configurable:true});
  }
  nodes.set(r.source_path,v);
 }
 function unwrap(v){
  if(obj(v)){
   if(v[tag])return v.chunks.join('');
   if(Array.isArray(v))return v.map(unwrap);
   for(const k of Object.keys(v))v[k]=unwrap(v[k]);
  }
  return v;
 }
 return unwrap(root);
}
export async function inspectFile(file){
 const raw=await readFile(file),hash=sha(raw),backup=JSON.parse(raw.toString('utf8'));
 const summary=validateBackup(backup),rows=flatten(backup.data);
 if(sha(JSON.stringify(reconstruct(rows)))!==sha(JSON.stringify(backup.data)))throw Error('Round-trip data integrity failure');
 return {backup,summary,rows,hash,size:raw.length};
}
export function target(url,key){
 let u;try{u=new URL(url)}catch{throw Error('Missing destination URL');}
 if(u.protocol!=='https:'||u.hostname!==DEST_HOST||u.pathname!=='/'||u.search||u.hash)throw Error('Refusing to write outside independent E-REPORT Supabase');
 if(!key||key.startsWith('sb_publishable_')||key.split('.').length!==3)throw Error('Use server-side legacy service_role JWT only');
 let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8'))}catch{throw Error('Invalid server JWT');}
 if(claims.role!=='service_role'||claims.ref!==DEST_HOST.split('.')[0])throw Error('Wrong-project service role');
 return u.origin;
}
export async function importToStaging(prepared,{url,key},fetchImpl=fetch){
 const base=target(url,key),hdr={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const request=async(method,route,body,prefer)=>{
  for(let tries=0;tries<4;tries++){
   const res=await fetchImpl(base+'/rest/v1/'+route,{method,headers:{...hdr,...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});
   if(res.ok)return res.status===204?null:await res.json();
   if((res.status===429||res.status>=500)&&tries<3){await new Promise(done=>setTimeout(done,250*(tries+1)));continue;}
   throw Error('Supabase request rejected, HTTP '+res.status);
  }
 };
 const {backup,rows,hash,summary}=prepared;
 const q=await request('GET','e_report_migration_batches?select=id,status,expected_records&source_sha256=eq.'+hash);
 if(q.length&&q[0].status==='VERIFIED')return {status:'ALREADY_VERIFIED',records:q[0].expected_records,id:q[0].id};
 if(q.length&&q[0].expected_records!==rows.length)throw Error('Existing snapshot size conflict');
 let id=q[0]?.id;
 if(!id){
  const insert=await request('POST','e_report_migration_batches?select=id',{
   source_sha256:hash,source_schema:backup.schema,source_created_at:summary.createdAt,
   source_build:summary.build,scope:summary.sources,expected_records:rows.length,status:'STAGING'
  },'return=representation');
  id=insert[0]?.id;
  if(!id)throw Error('No staging batch ID returned');
 }
 for(let i=0;i<rows.length;i+=40){
  await request('POST','e_report_migration_entries?on_conflict=batch_id,source_path',
    rows.slice(i,i+40).map(r=>({batch_id:id,...r})),'resolution=merge-duplicates,return=minimal');
 }
 const checks=new Map(rows.map(x=>[x.source_path,x.value_sha256]));let count=0;
 while(true){
  const page=await request('GET','e_report_migration_entries?select=source_path,value_sha256&batch_id=eq.'+id+'&order=source_path.asc&limit=500&offset='+count);
  if(!Array.isArray(page))throw Error('Malformed verification reply');
  for(const r of page){
   if(checks.get(r.source_path)!==r.value_sha256)throw Error('Source/destination SHA disagreement');
   if(!checks.delete(r.source_path))throw Error('Duplicate source path');
   count++;
  }
  if(page.length<500)break;
 }
 if(count!==rows.length||checks.size)throw Error('Staging incomplete; not marking snapshot verified');
 const final=await request('PATCH','e_report_migration_batches?select=id,status&id=eq.'+id,{
  status:'VERIFIED',imported_records:count,verified_at:new Date().toISOString()
 },'return=representation');
 if(final.length!==1||final[0].status!=='VERIFIED')throw Error('Snapshot verification did not finalize');
 return {status:'VERIFIED',records:count,id};
}
async function main(){
 const args=process.argv.slice(2),file=args.find(x=>!x.startsWith('--')),apply=args.includes('--apply');
 if(!file)throw Error('Usage: node import-v503.mjs file.json [--apply]');
 const p=await inspectFile(file);
 console.log(JSON.stringify({mode:apply?'IMPORT_STAGING':'DRY_RUN',sha256:p.hash,bytes:p.size,records:p.rows.length,...p.summary,coverage:'PARTIAL: excludes Firebase Auth, local-only drafts, external files, omitted collections'},null,2));
 if(!apply)return;
 if(process.env.E_REPORT_ACK_SCOPE!=='STAGING_ONLY')throw Error('Missing E_REPORT_ACK_SCOPE=STAGING_ONLY');
 const result=await importToStaging(p,{url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY});
 console.log(JSON.stringify({destination:DEST_HOST,...result}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{console.error('Stopped safely: '+e.message);process.exitCode=1});
}
