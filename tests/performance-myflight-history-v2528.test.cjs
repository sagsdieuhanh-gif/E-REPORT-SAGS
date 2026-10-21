'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const history=read('app/modules/form-edit-history.v1.js'),myFlight=read('app/modules/roster-lite.v5.js'),roster=read('app/modules/daily-roster.v502.js');
assert.match(history,/batch\.written=saveLocal\(event\)/,'first history delta must be durable');
assert.match(history,/if\(batch\.dirty\)await saveLocal\(batch\.event\)/,'final history delta persisted on idle');
assert.doesNotMatch(history,/curr\.written=curr\.written\.then\(\(\)=>saveLocal/,'must not write one IndexedDB history record per character');
assert.match(history,/visibilitychange/,'flush history when application is hidden');
assert.match(myFlight,/function scheduleCanonicalCheck\(delay=80\)/,'debounce menu and role UI rendering');
assert.doesNotMatch(myFlight,/\[0,120,500,1400\]\.forEach\(ms=>setTimeout\(assertCanonical/,'no four redundant render passes after every role update');
assert.match(roster,/Date\.now\(\)-cached\.at<1500/,'snapshot reuse short enough not to hide real updates');
assert.match(roster,/cached\.owner===owner&&cached\.date===date/,'queue snapshot must be account and date isolated');
assert.match(roster,/root\.v1199QueueTab=function\(tab\)\{[^}]*renderPersonal\(queueDate\(currentQueueDate\),true\)/,'tab click reuses the recent snapshot');
assert.match(roster,/const result=useCache\?cached\.result:await personalGroups\(date\)/,'real actions must still fetch data');
const events=new Map(),cloud=new Map();let writes=0;
const fake={__sagsGetSession:()=>({role:'DH',profile:{username:'TESTUSER',fullName:'User'}}),currentFlightSessionMeta:()=>({id:'F1',rosterAssignmentId:'A1',name:'Flight 1',initialGroup:'fsags'}),firebase:{auth:()=>({currentUser:{uid:'testUID'}}),database:{ServerValue:{TIMESTAMP:{'.sv':'timestamp'}}}},sagsV470Ref:p=>({set:async data=>{cloud.set(p,data)}}),addEventListener(){},readFlightSessionEnvelope:()=>null};
const listeners={};
const doc={readyState:'loading',body:{classList:{contains:()=>true}},getElementById(){return null},addEventListener:(n,cb)=>{listeners[n]=cb}};
const store={getItem:k=>events.get(k)||null,setItem:(k,v)=>{writes++;events.set(k,v)}};
vm.runInNewContext(history,{window:fake,document:doc,localStorage:store,indexedDB:undefined,navigator:{onLine:true},console,setTimeout,clearTimeout});
const api=fake.SAGSFormEditHistoryV1,session=fake.currentFlightSessionMeta();
assert.ok(api,'history module must expose its tested helpers');
async function check(){
 for(let i=1;i<=25;i++){
  const v=i.toString().padStart(2,'0');
  api.capture(session,{state:{pushback:i===1?'14:00':'14:'+String(i-1).padStart(2,'0')}},{state:{pushback:'14:'+v}},'Lưu biểu mẫu');
 }
 await api.flushBatch('testUID|F1');
 const rows=JSON.parse(events.get('sagsFormHistoryV1')||'[]');
 assert.equal(rows.length,1,'25 keystrokes should produce one history event');
 assert.equal(rows[0].changes[0].before,'14:00');
 assert.equal(rows[0].changes[0].after,'14:25');
 assert.ok(writes<=3,'batch should produce at most 3 localStorage fallback writes; got '+writes);
 assert.equal(cloud.size,1,'single cloud sync per typing burst');
 console.log('Performance regression PASS: 25 edits -> '+writes+' fallback writes / 1 audit event; no role UI fanout; scoped MY FLIGHT snapshot');
}
check().catch(e=>{console.error(e);process.exitCode=1});
