const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../app/modules/aviation-reference.v1.js'),'utf8');
assert.match(src,/function builtinCarriers\(\)/,'built-in carrier fallback must exist');
assert.match(src,/catch\(\(\) => builtinCarriers\(\)\)/,'carrier guide failure must not blank airline identity');
assert.match(src,/loading="eager"/,'MyFlight logos must not stay blank behind lazy loading');
assert.match(src,/new MutationObserver/,'MyFlight card rerenders must be observed locally');
assert.match(src,/workspaceBrandRetryDelays=\[0,80,200,450,900,1500\]/,'bounded retries must cover delayed card rendering');
console.log('MyFlight airline logo stability contract passed');
