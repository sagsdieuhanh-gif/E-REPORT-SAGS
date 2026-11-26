const fs=require('node:fs'),assert=require('node:assert/strict');
const js=fs.readFileSync(__dirname+'/../app/modules/mobile-form-dock.v2.js','utf8'),css=fs.readFileSync(__dirname+'/../app/styles/new-ui-v1.css','utf8');
const slots={v1134QuickTimeBtn:['1 / 2','1 / 2'],v324PdfBtn:['2 / 3','1 / 2']};
for(const [id,[column,row]]of Object.entries(slots)){assert(js.includes('buttonLayout(document.getElementById("'+id+'"),"'+column+'","'+row+'")'),'semantic action '+id+' has its canonical slot');assert(css.includes('#'+id+'{'),'stylesheet owns '+id)}
assert(js.includes('buttonLayout(send,"1 / 2","2 / 3")'),'FSAGS 208 sends in second row');
assert(js.includes('sendVisible?"2 / 3":"1 / 3"'),'signature spans second row when no Send action');
assert(css.includes('#kh208SendBtn{')&&css.includes('#v163SignBtn{'),'CSS owns Send and Sign slots');
assert(!js.includes('v324HandoverBtn')&&!css.includes('#v324HandoverBtn'),'retired completion action must not return');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');assert(html.includes('mobile-form-dock.v2.js'));assert(!html.includes('mobile-form-dock.v1.js'),'legacy semantic-label controller must not run');
console.log('Semantic mobile dock: Quick/PDF/Send/Sign retained, no completed button, legacy owner excluded');
