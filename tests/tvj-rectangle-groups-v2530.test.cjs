'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),acorn=require('acorn');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('app/modules/tvj-gof-035.v632.js');
const tvj=JSON.parse(read('forms/forms.registry.json')).forms.find(f=>f.id==='tvj_gof_035');
assert.ok(tvj&&tvj.fields.length===128,'TVJ registry must have 128 fields');
const ast=acorn.parse(source,{ecmaVersion:'latest'}),fn={};let regionNode=null;
function visit(node){
 if(!node||typeof node!=='object')return;
 if(node.type==='FunctionDeclaration'&&node.id)fn[node.id.name]=source.slice(node.start,node.end);
 if(node.type==='VariableDeclarator'&&node.id?.name==='TVJ_REGIONS')regionNode=node.init;
 for(const v of Object.values(node))if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);
}
visit(ast);
assert.ok(regionNode&&fn.sectionOf&&fn.buildSections,'explicit physical section map must be present');
const regions=Function('return ('+source.slice(regionNode.start,regionNode.end)+')')();
const ids=['header','arrival','departure','bag_unload','bag_load','cargo_unload','cargo_load','equipment','final','irregular','offloaded','inspection','departure_service','unverified'];
assert.deepEqual(regions.map(r=>r.id),ids);
assert.equal(regions.filter(r=>!r.provisional).length,13,'header + 12 printed operational rectangles');
assert.equal(regions.filter(r=>r.provisional).length,1,'unverified fields are not guessed into a printed rectangle');
const S=v=>String(v??'').trim();
const sectionOf=Function('TVJ_REGIONS','S',fn.sectionOf+';return sectionOf')(regions,S);
const byKey=new Map(tvj.fields.map(x=>[x.key,x]));
const counts=[15,8,8,7,7,7,8,6,11,1,8,18,20,4];
assert.deepEqual(regions.map(r=>r.keys.length),counts);
const referenced=regions.flatMap(r=>r.keys);
assert.equal(referenced.length,128);
assert.equal(new Set(referenced).size,128,'no field appears twice across zones');
assert.deepEqual([...referenced].sort(),[...byKey.keys()].sort(),'every field mapped exactly once');
for(const q of tvj.fields){
 const idx=sectionOf(q);
 assert.ok(idx>=0&&idx<regions.length,'no unmapped field: '+q.key);
 assert.ok(regions[idx].keys.includes(q.key),'section must use explicit key membership: '+q.key);
}
const group=key=>regions[sectionOf(byKey.get(key))]?.id;
for(const [id,keys] of Object.entries({
 header:['flightNumber','date','ata','atd'],
 arrival:['arrCoordinatorStandby','totalPaxLdm','arrCargoLoadedIn'],
 departure:['depCoordinatorStandby','finalCargoPcs','notocYes','notocNo','wheelchairBattery','dangerousGoodsCargo','flightCrewArrive'],
 bag_unload:['baggageUnloadStart','baggageUnloadFirstTractor','baggageUnloadCartNo'],
 bag_load:['baggageLoadFinish','baggageLoadLastTractor','baggageLoadCartNo'],
 cargo_unload:['cargoUnloadStart','cargoUnloadLastTractor','cargoUnloadCartNo'],
 cargo_load:['cargoLoadStart','cargoLoadLastTractor','cargoDocumentsReceived'],
 equipment:['loaderRampStaffTotal','loaderRampStaffTime','passengerStepStandbyTotal','passengerStepStandbyTime'],
 final:['finalTotalPax','checkinClosed','zone0C','actualLoadedBaggagePcs'],
 irregular:['irregularityReport'],
 offloaded:['offloadStandbyTime','offloadConfirmTime','offloadBagTags','offloadDeliveryTime'],
 inspection:['fwdDividerNet','fwdDividerNetTime','aftPlacard','aftPlacardTime','damageFound','damageFoundTime'],
 departure_service:['lirPresent','refuelingStart','cabinDoorClosed','pushbackTruckStandby','gpuStart','acuComplete'],
 unverified:['fodInspectionChecked','fodInspectionTime','Name','STAFF_ID']
})){for(const k of keys)assert.equal(group(k),id,k+' must be inside its parent area')}
assert.ok(!regions.find(r=>r.id==='equipment').keys.some(x=>x.startsWith('fod')),'FOD not silently treated as a printed Equipment row');
assert.ok(!regions.find(r=>r.id==='departure_service').keys.includes('Name'),'Name cannot be assumed to belong to covered service table');
assert.match(source,/sections=TVJ_REGIONS\.map\(\(\)=>\[\]\)/);
assert.match(source,/TVJ_REGIONS\[i\]\.keys/,'section entries must follow explicit field order');
assert.match(source,/const leftovers=\(form\?\.fields\|\|\[\]\)\.filter/,'new/unmatched fields never disappear');
assert.match(source,/if\(leftovers\.length\)console\.warn/,'unknown fields must be signaled');
assert.match(source,/provisional\?'⚠ ĐỐI CHIẾU'/,'unverified section clearly labeled');
assert.match(source,/role="note"/,'review warning displayed to user');
assert.match(source,/const choices=sections\.map/,'select any section');
assert.match(source,/window\.vz632JumpGroup=value=>/,'direct jump to a chosen region');
assert.match(source,/tab<sections\.length-1\)moveRegion\(tab\+1,true\)/,'Next cannot stop halfway through a printed region');
assert.match(source,/\.quickTimeRows \.quickTimeInput,#quickTimeBody \.quickTimeRows \.vz632Toggle/,'Next must account for checkboxes within a region');
assert.match(source,/if\(next>tab\)defaultSlashOnNext\(lastFocusedKey\)/,'TVJ slash-on-Next preserved');
assert.doesNotMatch(source,/y>=\.145&&x<\.5|cx>=r\.x0/,'no coordinate-based area guessing');
assert.match(source,/function save\(\)/,'TVJ save remains available');
console.log('TVJ verified boxes PASS: 13 approved visible areas (header + 12), 4 unverified fields isolated; all 128 preserved');
