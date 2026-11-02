'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const radio=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const rules=fs.readFileSync('firebase/firestore.rules','utf8');
const shell=fs.readFileSync('app/boot/32-v6494-aviation-shell.js','utf8');
const email=fs.readFileSync('.github/workflows/radio-daily-weekly.yml','utf8');
for(const t of ["swapBattery=$('radioSwapBattery').value","battery:swapBattery","Pin máy thay thế","if(!connected)","s.metadata.fromCache","data:image/png","dateFilter==='today'"]){
 assert(radio.includes(t),t+' signing support missing');
}
assert(radio.includes("if(mode==='ISSUE'&&['LOW','EMPTY'].includes(bat))"));
assert(rules.includes("next.battery in ['FULL','GOOD']"));
assert(rules.includes("d.signature.matches('^data:image/png;base64,"));
assert(shell.includes("if(key==='radio')")&&shell.includes("sags-radio-custody-v1"));
assert(!fs.readFileSync('index.html','utf8').includes('id="sags-radio-custody-v1"'),'radio must load only when selected');
assert(email.includes("vars.SAGS_RADIO_REPORTS_ACTIVE == 'true'"),'SMTP reports disabled unless explicitly activated');
console.log('Radio signing UX, battery separation, iPhone signature and gated SMTP checks PASS');
