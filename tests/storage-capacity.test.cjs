const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup({count=1,limit=6000000,initial=new Map(),reply=true}={}){
 class Store{constructor(map=new Map()){this.map=map}get length(){return this.map.size}key(i){return [...this.map.keys()][i]??null}getItem(k){return this.map.get(String(k))??null}setItem(k,v){k=String(k);v=String(v);const n=[...this.map].reduce((n,[a,b])=>n+(a===k?0:a.length+b.length),0)+k.length+v.length;if(n>limit)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});this.map.set(k,v)}removeItem(k){this.map.delete(k)}}
 const local=new Store(initial),session=new Store(),events={};let clients=count;
 class Channel{constructor(){this.port1={close(){}};this.port2={send:data=>this.port1.onmessage?.({data})}}}
 const worker={postMessage(msg,ports){if(reply)queueMicrotask(()=>ports[0].send({ok:true,count:clients}))}};
 const c={Storage:Store,localStorage:local,sessionStorage:session,console,MessageChannel:Channel,CustomEvent:class{},navigator:{serviceWorker:{controller:worker,addEventListener(){}}},document:{hidden:false,addEventListener(){}},addEventListener(n,fn){events[n]=fn},dispatchEvent(){},setTimeout,clearTimeout};c.window=c;vm.createContext(c);for(const p of ['app/vendor/lz-string-1.5.0.js','app/modules/storage-capacity.v1.js'])vm.runInContext(fs.readFileSync(p,'utf8'),c);
 return {c,local,session,raw:initial,setCount:n=>clients=n,ready:()=>c.SAGSStorageCapacity.check()};
}
(async()=>{
 const key='sagsFlightSessionV1:USER:A';const value=JSON.stringify({state:{name:'NGUYỄN NGỌC ÁNH',notes:'ĐÃ NHẬP\n'.repeat(10000),sig:'data:image/png;base64,'+'AbCd+/='.repeat(20000),photos:['data:image/jpeg;base64,'+'aXbYcZ'.repeat(40000)],boolean:true,count:123,emoji:'🛫'},rosterAssignmentId:'aBcD'});
 const initial=new Map([[key,value],['sagsPersonalAccountSessionV1','MiXeD-CREDENTIAL'],['unrelated',value]]);const a=setup({initial});await a.ready();assert.match(a.raw.get(key),/^~SAGS-LZ1~/);assert.equal(a.local.getItem(key),value);assert.equal(a.raw.get('unrelated'),value);assert.equal(a.raw.get('sagsPersonalAccountSessionV1'),'MiXeD-CREDENTIAL');
 // Cached raw bytes have already passed checksum verification. An unchanged
 // save needs no decompression; a changed save verifies only the new packet.
 let decoded=0;const decode=a.c.LZString.decompressFromUTF16;
 a.c.LZString.decompressFromUTF16=function(v){decoded++;return decode(v)};
 a.local.setItem(key,value);assert.equal(decoded,0,'cached previous record is not decompressed again');
 const edited=value.replace('NGUYỄN NGỌC ÁNH','NGUYỄN TRUNG KIÊN');
 a.local.setItem(key,edited);assert.equal(decoded,1,'new packet verified once');assert.equal(a.local.getItem(key),edited);
 a.local.setItem(key,value);a.c.LZString.decompressFromUTF16=decode;
 a.session.setItem(key,value);assert.equal(a.session.map.get(key),value);
 const restarted=setup({initial,count:2});await restarted.ready();assert.equal(restarted.local.getItem(key),value,'decoder works even with migration blocked');
 const blocked=setup({initial:new Map([[key,value]]),count:2});assert.equal(await blocked.ready(),false);assert.equal(blocked.raw.get(key),value,'old second tab prevents conversion');blocked.setCount(1);await blocked.ready();assert.match(blocked.raw.get(key),/^~SAGS-LZ1~/);
 const full=setup({initial:new Map([[key,value]]),limit:value.length+key.length+2});await full.ready();full.local.setItem('new-session-list','x'.repeat(10000));assert.equal(full.local.getItem(key),value,'reclaims real quota without deleting flight');
 full.local.setItem(key,JSON.stringify({state:{note:'THÊM MỚI'}}));assert.equal(full.local.getItem(key),JSON.stringify({state:{note:'THÊM MỚI'}}));
 const corrupt=setup({initial:new Map([[key,'~SAGS-LZ1~10:dead:bad']])});await corrupt.ready();assert.throws(()=>corrupt.local.getItem(key),/DAMAGED/);assert.throws(()=>corrupt.local.setItem(key,'{}'),/DAMAGED/);assert.equal(corrupt.raw.get(key),'~SAGS-LZ1~10:dead:bad');
 const denied=setup({initial:new Map([[key,value]]),limit:100});await denied.ready();assert.equal(denied.raw.get(key),value,'failed atomic shrinking write leaves original intact');
 console.log('Storage capacity: exact Unicode/photo/signature round trip, restart, old-tab guard, quota recovery, session/auth isolation, atomic failure and corruption guards passed');
})().catch(e=>{console.error(e);process.exitCode=1});
