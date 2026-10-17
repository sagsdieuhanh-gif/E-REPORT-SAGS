const assert=require('node:assert/strict');
const P=require('../app/modules/flight-retention-policy.v1.js');
const backend=require('../firebase/functions/policy');
const R=require('../firebase/functions/retention');
const at=1800000000000,day=86400000;
for(const policy of [P,backend]){
 assert.equal(policy.TTL,day);
 const old={schema:1,doorSignature:'h21Start:1234',completedAtMs:at,expiresAtMs:at+2*day};
 assert.equal(policy.due(old,at+day-1),false);
 assert.equal(policy.due(old,at+day),true);
 const migrated=policy.transition(old,{h21Start:'1234'},at+day);
 assert.equal(migrated.completedAtMs,at);
 assert.equal(migrated.expiresAtMs,at+day);
 assert.equal(policy.transition(old,{h21Start:''},at+day),null);
 assert.equal(policy.transition(old,{h21Start:'1300'},at+day).expiresAtMs,at+2*day);
 for(const duration of [0,-day,3*day,day+1])assert.equal(policy.due({...old,expiresAtMs:at+duration},at+10*day),false);
 assert.equal(policy.due({...old,completedAtMs:Infinity},Infinity),false);
}
(async()=>{
 const archive={id:'ARCHIVE',kind:'sags_flight_archive_v488',retentionTracksDoor:true,matchKeys:['FS09|20261017|VJ100|VN123|CXR'],retention48h:P.transition(null,{h21Start:'1234'},at)};
 let record={...R.lifecycle(archive,null,at),expiresAtMs:at+2*day};
 const db={collection:name=>({doc:id=>({name,id})}),runTransaction:async fn=>fn({get:async ref=>({exists:true,data:()=>ref.name===R.LEDGER?record:archive}),set:(_ref,value)=>{record=value}})};
 await R.markArchive(db,archive,at+day);
 assert.equal(record.completedAtMs,at);
 assert.equal(record.expiresAtMs,at+day,'existing server ledger is migrated without restarting the clock');
 console.log('PASS 24h boundary, legacy 48h migration, malformed expiry and reopened flight protection');
})().catch(e=>{console.error(e);process.exitCode=1});
