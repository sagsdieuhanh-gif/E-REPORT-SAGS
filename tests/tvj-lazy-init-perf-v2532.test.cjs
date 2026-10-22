'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const code=read('app/modules/tvj-gof-035.v632.js'),shell=read('app/boot/32-v6494-aviation-shell.js');
const form=JSON.parse(read('forms/forms.registry.json')).forms.find(f=>f.id==='tvj_gof_035');
assert.equal(form.fields.length,128);
assert.match(code,/if\(!active\(\)\)return;\s*if\(ensurePending\)return ensurePending/,'inactive flights must not initialize TVJ');
assert.match(code,/const hasValidMap=preparedForm===z&&preparedFieldArray===fields&&preparedLength===fields\.length/,'already installed TVJ fields reused across resume');
assert.match(code,/const current=new Map\(\)/,'runtime fields indexed once');
assert.doesNotMatch(code,/fields\.find\(f=>\+f\.page===P/,'do not scan entire field list 128 times');
assert.match(code,/const identityChanged=seedAccountIdentity\(false\)/,'identity update must not redraw independently');
assert.match(code,/if\(migrated\|\|identityChanged\)try\{persist\(\)\}/,'only one persist when values change');
assert.match(code,/if\(geometryChanged\|\|migrated\|\|identityChanged\)try\{draw\(\)\}/,'only one paint when needed');
assert.match(shell,/if\(photo!==cachedAvatarPhoto\)/,'cache avatar transformation on PC and mobile');
assert.match(code,/const TVJ_REGIONS=/,'physical rectangle mappings retained');
assert.match(code,/NIL Ô TRỐNG/);
const listeners={},timers=[],styles=new Map(),runtimeFields=[];
let activeFormGroup='fsags',fetchCount=0,adds=0,persists=0,draws=0,identityName='TESTUSER';
const document={hidden:false,getElementById:id=>styles.get(id)||null,createElement:()=>({id:'',textContent:''}),head:{appendChild:el=>styles.set(el.id,el)},addEventListener:(name,cb)=>{listeners['doc:'+name]=cb},body:{classList:{add(){}}}};
const window={
 addEventListener:(name,cb)=>{listeners['win:'+name]=cb},
 __sagsGetSession:()=>({profile:{username:'TESTUSER',fullName:identityName,employeeCode:'1234'}}),
 SAGSBusinessText:{upper:s=>s.toUpperCase()}
};
runtimeFields.find=()=>{throw Error('O(n²) fields.find cannot be called during optimized setup')};
const context={window,document,fields:runtimeFields,state:{},fetch:async()=>{fetchCount++;return {json:async()=>({forms:[form]})}},setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length},clearTimeout:()=>{},activeFormGroup,
 add:(page,key,x,y,w,h,type,label,opts)=>{adds++;runtimeFields.push({page,key,x,y,w,h,type,label,...opts})},
 persist:()=>{persists++},draw:()=>{draws++},console,Date,confirm:()=>false,requestAnimationFrame:fn=>fn()};
vm.runInNewContext(code,context,{filename:'tvj-gof-035.v632.js'});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function main(){
 assert.ok(timers.length,'module should schedule safe initial readiness check');
 timers.shift().fn();
 await tick();
 assert.equal(fetchCount,0,'non-TVJ flight must not fetch the 1MB registry');
 assert.equal(adds,0,'non-TVJ form must not construct the 128 TVJ fields');
 assert.equal(draws,0);
 assert.equal(persists,0);
 context.activeFormGroup='tvjgof035';
 listeners['win:pageshow']();
 await tick();await tick();
 assert.equal(fetchCount,1,'active TVJ fetches form registry once only');
 assert.equal(adds,128,'TVJ first open still registers all 128 fields');
 assert.equal(draws,1,'TVJ geometry + identity update paints only once');
 assert.equal(persists,1,'TVJ identity saved exactly once');
 assert.equal(runtimeFields.length,128);
 assert.equal(styles.has('tvj632QuickStyle'),true);
 for(let i=0;i<15;i++)listeners['win:pageshow']();
 for(let i=0;i<15;i++)listeners['doc:visibilitychange']();
 await tick();await tick();
 assert.equal(fetchCount,1,'resume events must not repeat network fetch');
 assert.equal(adds,128,'resume events must not duplicate 128 fields');
 assert.equal(draws,1,'resume events without changes must not redraw');
 assert.equal(persists,1,'resume events without changes must not write');
 identityName='UPDATEDUSER';
 listeners['win:pageshow']();await tick();
 assert.equal(draws,2,'an actual account identity change still redraws');
 assert.equal(persists,2,'account identity change is still durable');
 assert.equal(fetchCount,1);
 context.activeFormGroup='fsags';
 listeners['doc:visibilitychange']();await tick();
 assert.equal(fetchCount,1);
 assert.equal(draws,2);
 console.log('TVJ lazy-init performance PASS: 0 registry loads on other forms; 1 fetch/128 fields/1 draw on TVJ first open; 30 resume events cause zero additional loads, paints or writes');
}
main().catch(e=>{console.error(e);process.exitCode=1});
