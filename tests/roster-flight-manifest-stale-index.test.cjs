const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/../app/core/phases/core-shared.js','utf8');
const a=src.indexOf('async function manifest(d=opDate(),fid="")'),b=src.indexOf('async function sessionState(',a);
const date='2026-10-21',fid='FLT_VJ835_VJ730',mine={assignmentId:'COR_DUYNT1',flightId:fid,user:'DUYNT1',formGroup:'fsags',active:true};
let raw,queryError=false,reads=[];
const ctx={S:v=>String(v??'').trim(),U:v=>String(v??'').trim().toUpperCase(),norm:v=>String(v??'').trim().toUpperCase(),safe:v=>v,role:()=> 'DH',me:()=> 'DUYNT1',opDate:()=>date,root:{sagsV478ManifestForWorker:async()=>({opDate:date,items:{[mine.assignmentId]:mine}})},db:path=>{
 reads.push(path);
 if(path===`flight_records/${date}/${fid}/assignments`)return {once:async()=>({val:()=>({COR_DUYNT1:{active:true},OLD_94:{active:true},FINAL:{active:true},NEW_94:{active:true}})})};
 assert(path.startsWith(`roster_manifests/${date}/items/`),'only exact flight assignment metadata may be read');
 return {async once(){if(queryError)throw Error('permission denied');return {val:()=>raw[path.split('/').pop()]}}};
}};
vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
(async()=>{
 raw={COR_DUYNT1:mine,OLD_94:{assignmentId:'OLD_94',flightId:fid,user:'OLD',active:false},FINAL:{assignmentId:'FINAL',flightId:fid,user:'TRUNGPT',formGroup:'final'},NEW_94:{assignmentId:'NEW_94',flightId:fid,user:'TRUNGPT',formGroup:'clc_checklist'},OTHER_FLIGHT:{assignmentId:'OTHER_FLIGHT',flightId:'OTHER',user:'OTHER'}};
 const result=await ctx.manifest(date,fid);
 assert.deepEqual(Object.keys(result.items).sort(),['COR_DUYNT1','FINAL','NEW_94']);
 assert.equal(result.items.COR_DUYNT1.user,'DUYNT1');assert.equal(result.peerMetadataForFlight,fid);
 raw.COR_DUYNT1={...mine,user:'OTHER'};await assert.rejects(ctx.manifest(date,fid),/Phân công vừa thay đổi/);
 raw.COR_DUYNT1={...mine,active:false};await assert.rejects(ctx.manifest(date,fid),/Phân công vừa thay đổi/);
 raw.COR_DUYNT1={...mine,formGroup:'final'};await assert.rejects(ctx.manifest(date,fid),/Phân công vừa thay đổi/);
 raw.COR_DUYNT1=mine;delete raw.OLD_94;await assert.rejects(ctx.manifest(date,fid),/Thứ tự phân công/);
 raw.OLD_94={flightId:'OTHER',active:true};await assert.rejects(ctx.manifest(date,fid),/Thứ tự phân công/);
 raw.OLD_94={flightId:fid,active:false};queryError=true;await assert.rejects(ctx.manifest(date,fid),/permission denied/);
 console.log('VJ835/730 regression: stale foreign assignment excluded, new peers retained, own authorization and failed-read guards preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
