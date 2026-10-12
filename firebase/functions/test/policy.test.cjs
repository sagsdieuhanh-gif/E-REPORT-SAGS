const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../policy'),R=require('../retention');
const start=1800000000000;
test('only Door Close begins a 48-hour lifecycle; edits do not extend it',()=>{
 const life=P.transition(null,{h21Start:'08:15'},start);
 assert(!P.due(life,start+P.TTL-1));assert(P.due(life,start+P.TTL));
 assert.deepEqual(P.transition(life,{h21Start:'0815'},start+123),life);
 assert.equal(P.transition(life,{h21Start:'N/A'},start+123),null);
 assert.equal(P.transition(null,{h24Start:'08:15'},start),null);
});
test('strong identity prevents same-number flight on another date or aircraft being selected',()=>{
 const job={identity:{dateToken:'20261012',acRegToken:'VN123'},matchKeys:['FS09|20261012|VJ123|VN123|CXR']};
 assert(R.matchRoster({opDate:'2026-10-12',acReg:'VN-123',depFlight:'VJ123'},job));
 assert(!R.matchRoster({opDate:'2026-10-13',acReg:'VN123',depFlight:'VJ123'},job));
 assert(!R.matchRoster({opDate:'2026-10-12',acReg:'VN999',depFlight:'VJ123'},job));
 assert(!R.related({kind:'system',matchKeys:job.matchKeys},job,new Set()));
});
