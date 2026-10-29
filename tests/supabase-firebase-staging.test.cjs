'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const mod=await import(pathToFileURL(path.resolve('supabase/migration/import-v503.mjs')).href);
 const b={schema:'E_REPORT_SAGS_BACKUP_V503',project:'E-REPORT-SAGS',createdAt:'2026-10-29T12:00:00Z',
 data:{rtdb:{sags_live_v470:{'p/~':{data:'✓'.repeat(60000)}},sags_live_v469:null},
 firestore:{users:[{id:'USER01',data:{role:'ADMIN'}}],sags_handovers:[{id:'D/2',data:{big:[...Array(18000)].map((_,i)=>i),flag:{__migrationString:true}}}]}}};
 assert.equal(mod.validateBackup(b).counts.users,1);
 const rows=mod.flatten(b.data);
 assert(rows.some(x=>x.node_kind==='string'));
 assert(rows.some(x=>x.node_kind==='array'));
 assert.deepEqual(mod.reconstruct(rows),b.data);
 assert.throws(()=>mod.validateBackup({...b,project:'SAGS-RNS'}),/Not an E-REPORT/);
 assert.throws(()=>mod.validateBackup({...b,data:{rtdb:{},firestore:{users:[],sags_handovers:[]}}}),/Missing/);
 assert.throws(()=>mod.target('https://ivixjhwghprfxdtaupxc.supabase.co/','bad'),/Refusing/);
 assert.throws(()=>mod.target('https://'+mod.DEST_HOST+'/','sb_publishable_foo'),/service_role/);
 const text=fs.readFileSync('supabase/migration/e_report_snapshot_staging.sql','utf8');
 assert(text.includes('enable row level security')&&text.includes('revoke all')&&text.includes('from public,anon,authenticated'));
 assert(!text.includes('using (true)'));
 console.log('Firebase migration copy-only staging: lossless JSON, Unicode, split fields, RLS isolation PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
