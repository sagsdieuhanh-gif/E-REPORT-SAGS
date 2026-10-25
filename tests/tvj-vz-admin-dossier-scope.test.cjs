'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('app/modules/admin-all-form-viewer.v1.js','utf8');
function decl(name,next){const a=src.indexOf('function '+name+'(');assert(a>=0,'Missing '+name);const b=src.indexOf('function '+next+'(',a+1);assert(b>a);return src.slice(a,b)}
const U=v=>String(v||'').trim().toUpperCase(),S=v=>String(v??'').trim();
const detect=new Function('U',decl('flightCodes','docsFor')+'return isVzFlightForDossier;')(U);
for(const flight of ['VZ123','VZ 123 / VZ 124','TVJ 135','VZ123A'])
 assert.equal(detect({arrFlight:flight},[]),true,'VZ flight should expose TVJ: '+flight);
for(const flight of ['VJ123','QH123','VN0001','3U898','KE 412','RF123'])
 assert.equal(detect({flightName:flight},[{arrFlight:'VZ123'}]),false,'authoritative non-VZ must hide TVJ: '+flight);
assert.equal(detect({arrFlight:'VJ101',depFlight:'VZ999'},[]),false,'mixed/non-authoritative airline must not leak TVJ');
assert.equal(detect({flightName:'VJ100'},[{arrFlight:'VZ123'}]),false,'stale assignment VZ must not override flight');
assert.equal(detect({flightName:'VZ123'},[{arrFlight:'VJ100'}]),true,'authoritative VZ must override stale roster');
assert.equal(detect({},[{arrFlight:'VZ123',depFlight:'VZ124'}]),true,'VZ roster fallback');
assert.equal(detect({},[{arrFlight:'QH100',depFlight:'QH101'}]),false,'non-VZ roster fallback');
assert.equal(detect({},[{arrFlight:'VZ123'},{arrFlight:'VJ100'}]),false,'mixed roster must fail closed');
assert.equal(detect({},[]),false,'missing flight identity must fail closed');
assert.equal(detect({airlineCode:'VZ'},[]),true,'explicit VZ code fallback');
assert.equal(detect({airlineCode:'VJ'},[{arrFlight:'VZ100'}]),false,'explicit non-VZ code must deny');
const canonGroup=v=>String(v||'').trim().toLowerCase(), meaningful=v=>v!==undefined&&v!==null&&v!=='';
const registry={forms:[{id:'ramp',group:'fsags',code:'FSAGS42.3',fields:[{key:'a'},{key:'b'},{key:'c'}]},{id:'tvj',group:'tvjgof035',code:'TVJ-GOF-035',fields:[{key:'a'},{key:'b'},{key:'c'}]}]};
const docsFor=new Function('S','canonGroup','envelopeInfo','stateOf','formFor','formValueCount','meaningful','labelFallback','statusText',src.slice(src.indexOf('function docsFor('),src.indexOf('function openFinalSpecial('))+'return docsFor;')(
 S,canonGroup,st=>({env:st.envelope,kind:'ĐANG LÀM',at:0}),env=>env?.state||{},
 (reg,g)=>reg.forms.find(f=>f.group===g)||null,(form,state)=>form.fields.filter(f=>meaningful(state[f.key])).length,
 meaningful,v=>v,()=> 'ĐANG LÀM');
const assigned={formGroup:'fsags',assignmentId:'aid1',user:'QUOCT'};
const st={envelope:{state:{a:'A',b:'B',c:'C'}},formGroup:'fsags'};
const nonVz=docsFor(assigned,st,registry,false);
assert.deepEqual(nonVz.map(x=>x.group),['fsags'],'non-VZ cannot infer TVJ from overlapping field keys');
assert.deepEqual(docsFor(assigned,st,registry,true).map(x=>x.group),['fsags','tvjgof035'],'VZ can see actual TVJ form');
assert.equal(docsFor({...assigned,formGroup:'tvjgof035'},{...st,formGroup:'tvjgof035'},registry,false).length,0,'even explicit stale TVJ assignment hidden on non-VZ');
assert.match(src,/rows=await Promise\.all\(items\.filter\(item=>showTvj\|\|canonGroup\(item\.formGroup\)!=='tvjgof035'\)/);
assert.match(src,/!showTvj&&canonGroup\(item\.formGroup\)==='tvjgof035'/);
assert.doesNotMatch(src,/db\([^\n;]*\)\.set\s*\(/,'viewer remains read-only');
console.log('TVJ-GOF-035 AD dossier only VZ: authoritative flight, stale state, inactive display and legacy fallback protected');