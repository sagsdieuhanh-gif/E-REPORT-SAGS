const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const s=read('app/generated/core-flight.js'),canon=read('app/core/phases/core-flight.js');
const ui=read('app/modules/daily-roster.v502.js');
assert.equal(s,canon,'runtime must match canonical flight publisher source');
const upper=x=>String(x??'').trim().toUpperCase(),S=x=>String(x??'').trim();
const i=s.indexOf('function splitFlights('),j=s.indexOf('function routeParts(',i);
assert.ok(i>0&&j>i,'roster flight parser not found');
const split=new Function('upper',s.slice(i,j)+';return splitFlights')(upper);
assert.deepEqual(split('3U3939 3940'),['3U3939','3U3940'],'3U flight numbers must be accepted with implicit airline prefix');
assert.deepEqual(split('3U3939 / 3U3940'),['3U3939','3U3940']);
const p=s.indexOf('function rosterMailboxUsable('),q=s.indexOf('root.dailyRosterPublish=async function()',p);
assert.ok(p>0&&q>p,'mailbox validation must run before publish');
const valid=new Function('S','normUser','upper',s.slice(p,q)+';return rosterMailboxUsable')(S,upper,upper);
const expected={assignmentId:'RA_TEST_3U',targetUser:'KIENNT',opDate:'2026-10-09',formGroup:'fsags421'};
const original={assignmentId:'RA_TEST_3U',targetUser:'KIENNT',opDate:'2026-10-09',formGroup:'fsags421',flightId:'FLT_TEST_3U',active:true};
assert.equal(valid(original,expected,'FLT_TEST_3U'),true,'valid assignment must be retained');
for(const changed of [{flightId:''},{active:false},{targetUser:'PHUONGDD'},{opDate:'2026-10-08'},{formGroup:'fsags551'},{flightId:'DIFFERENT'}]){
 assert.equal(valid({...original,...changed},expected,'FLT_TEST_3U'),false,'invalid mailbox must be repaired: '+JSON.stringify(changed));
}
assert.ok(s.includes('const mailboxPresent=rosterMailboxUsable(mailByAssignment'),'sameRosterDelta must not skip a broken mailbox');
assert.ok(s.includes('verifyPublished.push({assignmentId'),'changed assignments must be post-write verified');
assert.ok(s.includes('verifyPublished.slice(pos,pos+8)'),'verify mailbox writes in bounded batches');
assert.ok(s.includes('const item=saved[rec.assignmentId]'),'manifest readback must be checked');
assert.ok(s.includes('if(!rosterMailboxUsable(received,rec,rec.flightId))'),'the actual worker mailbox must be read back');
assert.ok(!ui.includes('if(allFlightScope()||!me())return;date=syncQueueDate(queueDate(date));'),'leaders must not be blocked from their personal queue');
assert.ok(ui.includes('if(!me())return;date=syncQueueDate(queueDate(date));'));
console.log('KIENNT 3U3939/3940 mailbox and privileged personal queue regressions passed');
