'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const rules=fs.readFileSync('firebase/firestore.rules','utf8');
const snippet=fs.readFileSync('firebase/radio-custody.rules.snippet','utf8');
assert(app.includes('HIGH_PROOF_LIMIT=700000,COMPAT_PROOF_LIMIT=235000'));
assert(app.includes('width:{ideal:2560},height:{ideal:1440}'));
assert(app.includes('2048/Math.max(sensorW,sensorH)'));
assert(app.includes("id=\"radioInspectPhoto\""),'Staff can zoom the real captured image before signing');
assert(app.includes("$('radioInspectPhoto')"),'Zoom control should be wired'); // Replaced below if selector style uses double quotation.
assert(app.includes('function inspectCapturedPhoto(){'));
assert(app.includes('usedCompatibleProof=true'),'Legacy server photo mode must be explicit');
assert(app.includes("serverOld=combineFullProof('old',COMPAT_PROOF_LIMIT)"));
assert(app.includes('if((usedCompactOnly||usedCompatibleProof)&&hiOld)'),'Keep full original locally when server rejects large evidence');
assert(app.includes("const local=allowLocal?await readLocalFullProof(e):'';"),'Only actor preview can prefer local full-resolution backup');
assert(app.includes("if(local&&local.length>d.image.length)"),'Show higher-quality local original on recording iPhone');
assert(app.includes("const img=await proofImage(fullProof||await highProofData(e))"),'Official AD PDF MUST use server evidence, not an unverified local photo');
assert(app.includes("const factor=/iPhone|iPad|iPod/.test(navigator.userAgent||'')?1:1.6;"),'Desktop PDF appendix should be rendered at higher DPI');
for(const body of [rules,snippet]){
 assert(body.includes("request.resource.data.image.size() <= 700000"),'Firestore authorizes quality up to 700k characters');
 assert(body.includes("allow update, delete: if false"),'Evidence remains immutable');
}
const begin=app.indexOf('function combineFullProof('),end=app.indexOf('function combineProof(',begin);
assert(begin>=0&&end>begin);
let rendered=0,quantized=0;
function canvas(width=1600,height=1067){
 const c={width,height};
 const ctx={fillRect(){},fillText(){},drawImage(){rendered++},getImageData(){quantized++;throw Error('RGB quantization is prohibited')}};
 c.getContext=()=>ctx;
 c.toDataURL=(mime,q)=>{
  const bytes=c.width>=1400?580000:c.width>=1150?310000:c.width>=1000?220000:130000;
  return 'data:'+mime+';base64,'+'A'.repeat(bytes);
 };
 return c;
}
const vmContext={document:{createElement:()=>canvas()},photos:{old:{canvas:canvas(),at:Date.now(),code:'DH01'}},
 $:()=>canvas(540,150),webpCanvasEncoderSupported:()=>false,Math,Error,HIGH_PROOF_LIMIT:700000};
vm.createContext(vmContext);
vm.runInContext(app.slice(begin,end)+'\nthis.full=combineFullProof;',vmContext);
const sharp=vmContext.full('old');
assert(sharp.length>235000&&sharp.length<=700000,'New server photo must retain materially more detail than 235k');
const compat=vmContext.full('old',235000);
assert(compat.length<=235000,'Older deployed Firestore rules must receive a valid downsized full-colour copy');
assert(rendered>=4,'Both camera frame and signed proof must be drawn');
assert.equal(quantized,0,'Neither variant may quantize colour');
console.log('Hi-Fi iOS proof 700k/235k fallback, local source integrity, pre-sign zoom, high-DPI PC PDF and private immutable evidence PASS');
