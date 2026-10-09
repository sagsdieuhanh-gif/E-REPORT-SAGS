const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'app/modules/quick-entry.v1.js'),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,'forms/forms.registry.json'),'utf8'));
const schemas=Object.fromEntries(registry.forms.map(f=>[f.id,f]));
const marker=src.indexOf('  const EQUIPMENT = '),end=src.indexOf('  function parseBag(',marker);
assert.ok(marker>0&&end>marker,'quick navigation helpers must exist');
const getGroup=new Function('fields',src.slice(marker,end)+';return groupFor');
function simulate(form,key){
 const fields=schemas[form].fields;
 const quick=getGroup(fields);
 const field=fields.find(f=>f.key===key);
 const group=quick(key);
 assert.ok(group,'missing group '+form+':'+key);
 const steps=group.steps.filter(x=>fields.some(y=>y.key===x.key&&['number','text'].includes(y.type)));
 assert.ok(steps.some(x=>x.key===key),'clicked key must be in wizard');
 return {group,steps};
}
const loader=simulate('fsags551','f551_porter1');
assert.equal(loader.group.heading,'Ramp Manpower & Equipment · FSAGS 55.1');
assert.deepEqual(loader.steps.map(x=>x.key),[
 'f551_driver1','f551_driver2','f551_porter1','f551_porter2','f551_step1','f551_step2',
 'f551_belt1','f551_belt2','f551_tractor1','f551_tractor2','f551_loader1','f551_loader2'
]);
assert.equal(loader.steps[2].kind,'text','55.1 equipment remains a text field and must not reject letters');
const w=simulate('fsags421','f421_topWCHR');
assert.deepEqual(w.steps.map(x=>x.key),['f421_topWCHR','f421_topUM','f421_topINAD','f421_topSTCH','f421_topVIP']);
const booking=simulate('fsags421','f421_bookingF');
assert.deepEqual(booking.steps.map(x=>x.key),['f421_bookingF','f421_bookingC','f421_bookingY']);
assert.equal(booking.steps[0].kind,'number');
const offload=simulate('fsags421','f421_offPcs1');
assert.equal(offload.steps.length,30);
assert.equal(offload.steps[0].key,'f421_offPcs1');
assert.equal(offload.steps[1].key,'f421_offDest1');
assert.equal(offload.steps[29].key,'f421_offReloadPos6');
assert.equal(simulate('fsags421','f421_b1ADL').group.heading,'Số khách · 1ST · FSAGS 42.1','existing 42.1 bag flow preserved');
assert.ok(src.includes("if(st.kind!=='text' && value"),'text validation must preserve names/codes');
assert.ok(src.includes("ui.value.inputMode=st.kind==='text'?'text':'numeric'"),'keyboard must adapt to field');
assert.ok(src.includes("if(e.key==='Enter'){e.preventDefault();move(1)}"),'next on keyboard must share button flow');
assert.ok(src.includes("ui.next.addEventListener('click',()=>move(1))"),'visible Next must be bound');
assert.ok(src.includes("try{persist();}catch(e)"),'wizard must persist entered value without new schema');
console.log('FSAGS 42.1 and 55.1 quick-entry Next navigation regression passed.');
