const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync(__dirname+'/../app/styles/aviation-reference.v1.css','utf8');
const v=JSON.parse(fs.readFileSync(__dirname+'/../version.json','utf8'));
assert.equal(v.build,JSON.parse(fs.readFileSync(__dirname+'/../asset-manifest.json','utf8')).build);
assert.match(css,/QUICK TIME FINAL MOBILE FIELD FIX 16/);
assert.match(css,/quickTimeInput\.dirty,[\s\S]*background:#ffd166!important[\s\S]*-webkit-text-fill-color:#17212b!important/);
assert.match(css,/quickTimeTimeCell,.quickTimeSingleCell[\s\S]*overflow:hidden!important[\s\S]*border-radius:9px!important/);
assert.match(css,/quickTimeInput[\s\S]*border-radius:8px 0 0 8px!important/);
assert.match(css,/quickTimeNow[\s\S]*border-radius:0 8px 8px 0!important/);

const quick=fs.readFileSync(__dirname+'/../app/boot/18-v173-quick-time.js','utf8');
assert.match(quick,/enterkeyhint="next"/,'quick-time keyboard action must advertise Next');
assert.match(quick,/qteHandleNextKey\(event,this\)/,'quick-time inputs must route Enter/Next to the next input');
assert.match(quick,/quickTimeNow" type="button" tabindex="-1"/,'clock buttons must be skipped by keyboard Next/Tab navigation');

const quickNextHtml=fs.readFileSync(__dirname+'/../index.html','utf8');
const quickNextJs=fs.readFileSync(__dirname+'/../app/boot/18-v173-quick-time.js','utf8');
assert.ok(quickNextHtml.includes('id="quickTimeNextBtn"')&&quickNextHtml.includes('onclick="qteMoveNextInput()"'),'visible NEXT button must be present and wired');
assert.ok(quickNextJs.includes('window.qteMoveNextInput=function'),'on-screen NEXT must have a navigation handler');
assert.ok(quickNextJs.includes('qteEditableInputs()'),'NEXT must target input fields and skip clock buttons');
assert.ok(quickNextJs.includes('qteHandleNextKey=function(e,el)'),'keyboard and visible NEXT must share navigation logic');
assert.ok(css.includes('V2.4.1 · Visible NEXT navigation'),'NEXT must have responsive layout and contrast styles');
console.log('Quick Time final-owner mobile field fix passed');
