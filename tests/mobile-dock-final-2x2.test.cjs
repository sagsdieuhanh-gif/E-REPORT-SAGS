const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync(__dirname+'/../app/styles/new-ui-v1.css','utf8'),js=fs.readFileSync(__dirname+'/../app/modules/mobile-form-dock.v2.js','utf8');
assert.match(css,/CANONICAL MOBILE FORM DOCK/);
assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
assert.match(css,/grid-template-rows:44px 44px!important/);
assert.match(js,/force\(actions,"display",actions.classList.contains\("show"\)\?"contents":"none"\)/);
assert.match(js,/force\(operation,"display","contents"\)/);
assert.doesNotMatch(js,/last-child|nth-child/,'canonical layout must not depend on DOM order');
console.log('Mobile dock final 2x2: canonical grid and parent display contract passed');
