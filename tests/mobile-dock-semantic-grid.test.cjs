const fs=require('node:fs'),assert=require('node:assert/strict');
const js=fs.readFileSync(__dirname+'/../app/modules/mobile-form-dock.v2.js','utf8'),css=fs.readFileSync(__dirname+'/../app/styles/new-ui-v1.css','utf8');
const slots={v1134QuickTimeBtn:['1 / 2','1 / 2'],v324PdfBtn:['2 / 3','1 / 2'],v324HandoverBtn:['1 / 2','2 / 3'],v163SignBtn:['2 / 3','2 / 3']};
for(const [id,[column,row]]of Object.entries(slots)){assert(js.includes('buttonLayout(document.getElementById("'+id+'"),"'+column+'","'+row+'")'),'semantic action '+id+' has its own canonical slot');assert(css.includes('#'+id+'{'),'stylesheet owns '+id)}
const html=fs.readFileSync(__dirname+'/../index.html','utf8');assert(html.includes('mobile-form-dock.v2.js'));assert(!html.includes('mobile-form-dock.v1.js'),'legacy semantic-label controller must not run');
console.log('Semantic mobile dock: four functional IDs/slots preserved, legacy owner excluded');
