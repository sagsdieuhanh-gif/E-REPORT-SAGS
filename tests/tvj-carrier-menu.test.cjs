const fs=require('node:fs'),acorn=require('acorn'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/../app/modules/tvj-gof-035.v630.js','utf8'),ast=acorn.parse(code,{ecmaVersion:'latest'});
const functions={};function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration')functions[n.id.name]=code.slice(n.start,n.end);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}walk(ast);
for(const role of ['AD','DH','VIEWER'])for(const isVz of [false,true]){
 const button={style:{}},refresh=new Function('document','eligible','currentRole','v485Can',functions.refreshMenu+';return refreshMenu')({getElementById:()=>button},()=>isVz,role,()=>role!=='VIEWER');refresh();
 assert.equal(button.style.display,isVz&&role!=='VIEWER'?'':'none',`${role} must respect VZ applicability`);
}
const show=new Function('eligible','liveForm',functions.showVZ+';return showVZ')(()=>false,{});
assert.equal(show(false),false,'direct TVJ open must stop before changing pages for a non-VZ flight');
const looks=new Function('currentEnv','currentMeta','PREFIX','vzText',functions.looksVZ+';return looksVZ')(()=>({}),()=>({}),'vz_',v=>/(^|[\s/,+-])VZ\s*\d+/i.test(String(v||'')));
assert.equal(looks({state:{fltBefore:'VZ999'},rosterSeed:{arrFlight:'VJ123'}},{name:'VJ123'}),false,'authoritative roster wins over stale VZ fields');
assert.equal(looks({rosterSeed:{arrFlight:'VZ123',depFlight:'VZ124'}},{}),true);
console.log('TVJ menu applicability: AD/DH/viewer, stale fields and direct-open guard passed');
