'use strict';
// Pure, dependency-free normalization of Firebase data into private Supabase
// mirror records. Never call this in a browser; credentials belong server-side.
const {createHash}=require('node:crypto');
const hash=x=>createHash('sha256').update(x).digest('hex');
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object'){
  if(value instanceof Date)return value.toISOString();
  if(typeof value.toJSON==='function')return canonical(value.toJSON());
  const out={};
  for(const key of Object.keys(value).sort()){
   const v=value[key];
   if(v===undefined||typeof v==='function')continue;
   out[key]=canonical(v);
  }
  return out;
 }
 if(typeof value==='bigint')return value.toString();
 if(!Number.isFinite(value)&&typeof value==='number')throw Error('Non-finite Firebase number');
 return value;
}
function stable(value){return JSON.stringify(canonical(value))}
function safeKey(value){const str=String(value);if(!str||str.length>3000)throw Error('Source key invalid');return str}
function makeRow(origin,namespace,key,value,batchId,options={}){
 if(!['rtdb','firestore'].includes(origin))throw Error('Invalid source');
 if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,199}$/.test(namespace))throw Error('Invalid namespace');
 const record_key=safeKey(key),payload=canonical(value);
 const text=stable(payload);
 const len=Buffer.byteLength(text||'');
 if(len>Number(options.maxPayloadBytes||1800000))throw Error('Source document exceeds mirror row limit: '+namespace+'/'+key+' ('+len+' bytes)');
 return {origin,namespace,key_hash:hash(record_key),record_key,payload,
  content_sha256:hash(text),source_version:null,deleted:false,batch_id:batchId};
}
function proofBinary(raw){
 if(typeof raw!=='string')return null;
 const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(raw);
 if(!m)throw Error('Unsupported or invalid photo data URL');
 const bytes=Buffer.from(m[2],'base64');
 if(!bytes.length||bytes.length>20*1024*1024||bytes.toString('base64').replace(/=+$/,'')!==m[2].replace(/=+$/,''))throw Error('Invalid or oversized base64 evidence');
 const mime='image/'+m[1],digest=hash(bytes),ext=m[1]==='jpeg'?'jpg':m[1];
 return {bytes,mime,sha256:digest,path:'firestore/sags_radio_proofs_v22/'+digest.slice(0,2)+'/'+digest+'.'+ext};
}
function redactEvidence(data){
 if(!data||typeof data!=='object'||typeof data.image!=='string')return {value:data,proof:null};
 const proof=proofBinary(data.image);
 return {proof,value:{...data,image:{_sags_storage_v1:{bucket:'sags-standby-evidence',
  path:proof.path,sha256:proof.sha256,mime:proof.mime,bytes:proof.bytes.length,
  originalEncoding:'data-url'}}}};
}
function summarizeRows(rows){
 const keys=rows.map(r=>r.key_hash+':'+r.content_sha256+':'+String(r.deleted)).sort();
 return {count:rows.filter(x=>!x.deleted).length,fingerprint:hash(keys.join('\n'))};
}
module.exports={canonical,stable,hash,makeRow,proofBinary,redactEvidence,summarizeRows};
