const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync(__dirname+'/../app/styles/new-ui-v1.css','utf8');
const v=JSON.parse(fs.readFileSync(__dirname+'/../version.json','utf8'));
assert.equal(v.build,'V2.5-20261007-MOBILE-DOCK-FORM-OPEN-PERF-21');
assert.match(css,/MOBILE FORM DOCK FINAL 2x2/);
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
assert.match(css,/#v324FormActions,[\s\S]*#v163OperationNav\{[\s\S]*display:contents!important/);
assert.match(css,/show\.three>\.v324FormAction:last-child,[\s\S]*grid-column:auto!important/);
console.log('Mobile dock final 2x2 contract passed');
