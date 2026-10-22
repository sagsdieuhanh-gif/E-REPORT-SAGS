'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),acorn=require('acorn');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const src=read('app/modules/tvj-gof-035.v632.js'),registry=JSON.parse(read('forms/forms.registry.json')).forms.find(f=>f.id==='tvj_gof_035');
assert.ok(registry?.fields?.length===128,'TVJ REV06 has 128 registered fields');
const ast=acorn.parse(src,{ecmaVersion:'latest'});
const funcs={};let regionsNode=null;
for(const node of ast.body){/* Source is enclosed in an IIFE: traverse its AST safely. */}
function walk(n){
 if(!n||typeof n!=='object')return;
 if(n.type==='FunctionDeclaration'&&n.id)funcs[n.id.name]=src.slice(n.start,n.end);
 if(n.type==='VariableDeclarator'&&n.id?.name==='TVJ_REGIONS')regionsNode=n.init;
 for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}
}
walk(ast);
assert.ok(regionsNode&&funcs.sectionOf&&funcs.buildSections,'physical regions and registry grouping must be present');
const regions=Function('return ('+src.slice(regionsNode.start,regionsNode.end)+')')();
assert.equal(regions.length,14,'one quick-entry region per printed rectangle');
assert.deepEqual(regions.map(r=>r.id),[
 'header','arrival','departure','bag_unload','bag_load','cargo_unload','cargo_load',
 'equipment','final','irregular','offloaded','inspection','departure_service','confirmation']);
for(const r of regions){
 assert.ok(r.x0>=0&&r.x1<=1&&r.y0>=0&&r.y1<=1&&r.x0<r.x1&&r.y0<r.y1,'valid rectangle '+r.id);
}
const sectionOf=Function('TVJ_REGIONS',funcs.sectionOf+';return sectionOf')(regions);
const groups=regions.map(()=>[]);
for(const q of registry.fields){
 const i=sectionOf(q);
 assert.ok(i>=0&&i<regions.length,'field '+q.key+' must belong to a printed rectangle');
 groups[i].push(q.key);
 const cx=q.x+q.w/2,cy=q.y+q.h/2,r=regions[i];
 assert.ok(cx>=r.x0&&cx<r.x1&&cy>=r.y0&&cy<r.y1,q.key+' must be inside its rectangle');
}
assert.deepEqual(groups.map(g=>g.length),[15,8,8,7,7,7,8,8,11,1,8,18,20,2],'all rectangular group counts');
assert.equal(groups.flat().length,registry.fields.length,'all 128 fields assigned exactly once');
assert.equal(new Set(groups.flat()).size,registry.fields.length,'no duplicate fields');
const getGroup=k=>regions.find((r,i)=>groups[i].includes(k))?.id;
for(const [field,group] of Object.entries({
  date:'header',sta:'header',eta:'header',
  arrCoordinatorStandby:'arrival',arrCargoLoadedIn:'arrival',arrBaggageLoadedIn:'arrival',
  depCoordinatorStandby:'departure',notocYes:'departure',flightCrewArrive:'departure',
  baggageUnloadFirstCart:'bag_unload',baggageUnloadCartNo:'bag_unload',
  baggageLoadLastCart:'bag_load',baggageLoadCartNo:'bag_load',
  cargoUnloadFirstTractor:'cargo_unload',cargoUnloadCartNo:'cargo_unload',
  cargoLoadFirstCart:'cargo_load',cargoDocumentsReceived:'cargo_load',
  loaderRampStaffTotal:'equipment',fodInspectionTime:'equipment',
  finalTotalPax:'final',zone0A:'final',actualLoadedBaggagePcs:'final',
  irregularityReport:'irregular',offloadStandbyTime:'offloaded',offloadDeliveryTime:'offloaded',
  fwdDividerNet:'inspection',noDamageFoundTime:'inspection',damageFoundTime:'inspection',
  lirPresent:'departure_service',refuellingStart:'does-not-exist',
  refuelingStart:'departure_service',acuComplete:'departure_service',
  Name:'confirmation',STAFF_ID:'confirmation'
})){if(group!=='does-not-exist')assert.equal(getGroup(field),group,field+' box membership')}
assert.match(src,/sections=TVJ_REGIONS\.map\(\(\)=>\[\]\)/,'one section for every physical rectangle');
assert.match(src,/if\(missing\.length\)\{sections\.push\(missing\)/,'new fields must never be discarded');
assert.match(src,/const choices=sections\.map\(/,'region chooser must show every region');
assert.match(src,/window\.vz632JumpGroup=value=>/,'jump directly to a printed rectangle');
assert.match(src,/buttonLabels=\['◀ KHU TRƯỚC','CHỌN KHU','KHU TIẾP ▶'\]/,'explicit prev / choose / next controls');
assert.match(src,/tab<sections\.length-1\)moveRegion\(tab\+1,true\)/,'keyboard next keeps traversing all rectangular groups');
assert.match(src,/\.quickTimeRows \.quickTimeInput,#quickTimeBody \.quickTimeRows \.vz632Toggle/,'keyboard next must include checkboxes before leaving a region');
assert.doesNotMatch(src,/const labs=\['ĐẾN · ARRIVAL','ĐI · DEPARTURE','OTHER'\]/,'old three-way split must be fully removed');
assert.match(src,/if\(next>tab\)defaultSlashOnNext\(lastFocusedKey\)/,'slash on Next retained for optional TVJ fields');
assert.match(src,/function save\(\)/,'TVJ save still includes full sections');
console.log('TVJ physical rectangle grouping PASS: '+groups.length+' regions, '+groups.flat().length+' fields, no missing/duplicates');
