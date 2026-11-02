'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const canonical=fs.readFileSync('app/core/runtime.v503hf2.bundle.js','utf8');
const generated=fs.readFileSync('app/generated/runtime-1.js','utf8');
const shell=fs.readFileSync('app/boot/32-v6494-aviation-shell.js','utf8');
const rootSegment=/function overlayOpen\(\)\{const ids=\[[^\]]+\];return ids\.some\(id=>shown\(\$\(id\)\)\)\}/;
const match=generated.match(rootSegment);
assert(match,'legacy root overlay detector must be available');
for(const id of ['sagsRadioPanel','sagsSettingsCenter','sagsHistoryOverlay','csgModal','fwcModal']){
 assert(match[0].includes('"'+id+'"'),'legacy overlay detector misses '+id);
}
assert(canonical.includes(match[0]),'generated navigation must match canonical source');
const modules={};
const context={$:id=>modules[id],shown:e=>!!e&&!e.hidden&&!!e.visible};
vm.createContext(context);
vm.runInContext(match[0]+'\nthis.check=overlayOpen;',context);
assert.equal(context.check(),false,'No false modal at startup');
for(const id of ['sagsRadioPanel','sagsSettingsCenter','sagsHistoryOverlay','csgModal','fwcModal']){
 modules[id]={hidden:false,visible:true};
 assert.equal(context.check(),true,id+' must prevent home/My Flight takeover');
 modules[id].hidden=true;
 assert.equal(context.check(),false,'Closed '+id+' must permit home');
 delete modules[id];
}
assert(generated.includes('isCargo()&&matchMedia("(max-width:899px)").matches'),'cargo My Flight auto-open must be mobile-only');
assert(canonical.includes('isCargo()&&matchMedia("(max-width:899px)").matches'),'canonical cargo guard absent');
assert(!generated.includes('if(k)setTimeout(restoreWorkspace,0)'),'reopening remembered workspace on every UI sync causes menu hijack');
assert(generated.includes('workspaceRestoredFor!==(profile.username||profile.uid||role)'),'workspace restoration must be one-shot per authenticated owner');
assert(shell.includes("id==='sagsRadioPanel'"),'fixed aviation shell must respect radio custody overlay');
assert(shell.includes("e.stopPropagation();trigger(b.dataset.v6494Key)"),'PC navigation must stop bubbling into legacy handlers');
console.log('PC navigation source: standalone overlays, mobile-only cargo auto-open, restore-once PASS');
