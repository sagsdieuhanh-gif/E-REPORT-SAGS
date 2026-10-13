const assert=require('node:assert/strict'),fs=require('node:fs');
const fake=require('./helpers/retention-firestore.cjs'),W=require('../firebase/functions/actions-worker'),P=require('../firebase/functions/policy');
const at=1800000000000,key='FS09|20261012|VJ123|VN123|CXR';
function archive(id,time,closed=true){return {kind:'sags_flight_archive_v488',retentionTracksDoor:true,dateToken:'20261012',flights:['VJ123'],acRegToken:'VN123',matchKeys:[key],updatedAtMs:time,retention48h:closed?P.transition(null,{h21Start:'12:34'},time):null};}
(async()=>{
 const seed={};for(let i=0;i<130;i++)seed['sags_handovers/A'+String(i).padStart(3,'0')]=archive('A'+i,at+i);
 const db=fake(seed),initial=JSON.stringify([...db.rows]);
 const dry=await W.scanChanges(db,{},at+10000,true);assert.equal(dry.counts.scanned,100);assert.equal(JSON.stringify([...db.rows]),initial,'dry run never writes even lifecycle/cursors');
 const first=await W.scanChanges(db,{},at+10000,false);assert(first.streams.updatedAtMs.backlog);assert.equal(first.counts.observed,100);
 const second=await W.scanChanges(db,{streams:first.streams},at+11000,false);assert.equal(second.counts.observed,30);assert(!second.streams.updatedAtMs.backlog);
 assert.equal([...db.rows.keys()].filter(x=>x.startsWith('sags_flight_retention_v1/')).length,130);
 const changed=fake({'sags_handovers/A':archive('A',at)});
 await W.scanChanges(changed,{},at+10,false);assert.equal(changed.rows.get('sags_flight_retention_v1/A').completedAtMs,at);
 changed.rows.set('sags_handovers/A',archive('A',at+5000,false));
 await W.scanChanges(changed,{},at+6000,false);assert(!changed.rows.has('sags_flight_retention_v1/A'),'reopen cancels queued expiry without Firestore triggers');
 const retired=fake({'sags_handovers/LATE':{kind:'airline_final_paper_photo',parentDocId:'FINAL',updatedAtMs:at},'sags_flight_retention_v1/A':{status:'purged',matchKeys:[key],documentIds:['FINAL']}});
 const late=await W.scanChanges(retired,{},at+1,false);assert.equal(late.counts.resurrections,1);assert(!retired.rows.has('sags_handovers/LATE'));
 const other=fake({'sags_handovers/SYS':{kind:'system',matchKeys:[key],updatedAtMs:at},'sags_flight_retention_v1/A':{status:'purged',matchKeys:[key]}});await W.scanChanges(other,{},at+1,false);assert(other.rows.has('sags_handovers/SYS'));
 const noop=fake({}),summary=await W.runWorker(noop,{},{now:at,dryRun:true});assert.equal(summary.mode,'dry-run');assert.equal(noop.rows.size,0);
 const workflow=fs.readFileSync('.github/workflows/flight-retention-48h.yml','utf8');assert(workflow.includes("cron: '7,22,37,52 * * * *'"));assert(workflow.includes('NOT ACTIVE'));assert(!workflow.includes('pull_request'));assert(workflow.includes('FIREBASE_SERVICE_ACCOUNT_JSON'));assert(workflow.includes('cancel-in-progress: false'));
 console.log('Spark worker PASS: bounded backfill/resume, dry-run isolation, reopen cancellation, late-child cleanup, unrelated data and missing-auth workflow guards');
})().catch(error=>{console.error(error);process.exitCode=1});
