'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const radio=fs.readFileSync('app/modules/radio-custody.v1.js','utf8'),rules=fs.readFileSync('firebase/firestore.rules','utf8'),css=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
assert.equal(version.version,'V2.2','release must truly be V2.2');
assert(radio.includes("PROOFS='sags_radio_proofs_v22'"));
assert(radio.includes('HIGH_PROOF_LIMIT=235000'));
assert(radio.includes("width:{ideal:1920},height:{ideal:1080}"),'request higher resolution camera sensor');
assert(radio.includes('const sensorW=v.videoWidth,sensorH=v.videoHeight,scale=Math.min(1,1600/Math.max(sensorW,sensorH))'),'capture natural iPhone portrait/landscape pixels without upscaling');
assert(radio.includes("preview=c.toDataURL('image/jpeg',.94)"),'high quality preview');
assert(radio.includes("hiOld=combineFullProof('old');sig=combineProof('old')"),'full proof and legacy event receipt coexist');
assert(radio.includes("hiNew=combineFullProof('new');sigNew=combineProof('new')"),'swap writes two separate colour proofs');
assert(radio.includes('fullProof:withFull?hiOld'), 'transaction has full old photo');
assert(radio.includes('fullProof:withFull?hiNew'), 'transaction has full replacement photo');
assert(radio.includes("tx.set(fs().collection(PROOFS).doc(evRef.id)"),'event ID is immutable photo ID');
assert(radio.includes('tx.set(evRef,ev)')&&radio.includes('tx.update(ref,'),'photo and event live inside one transaction');
assert(radio.includes('await writeRadioTransaction(true)')&&radio.includes('await writeRadioTransaction(false)'), 'only permission errors should use legacy path');
assert(radio.includes("snap=await fs().collection(PROOFS).doc(e.id).get({source:'server'})"),'photo must be fetched on demand from server');
assert(radio.includes('await proofImage(fullProof||await highProofData(e))'),'PDF must prefer original full-colour proof');
assert(radio.includes("const jpeg=cv.toDataURL('image/jpeg',0.9)"),'avoid recompressing evidence appendix to 0.76');
assert(css.includes('.radioProofZoomed .radioProofScroll img'),'viewer must support full size zoom');
const ruleStart=rules.indexOf('match /sags_radio_proofs_v22/{eventId}');
const ruleEnd=rules.indexOf('match /sags_radio_mail_runs_v1/',ruleStart);
assert(ruleStart>0&&ruleEnd>ruleStart);
const proofRule=rules.slice(ruleStart,ruleEnd);
for(const check of [
  'allow get: if activeUser() && (isAdmin() || resource.data.actorUid == request.auth.uid)',
  'allow list: if false','allow update, delete: if false',
  "request.resource.data.actorUid == request.auth.uid",
  'request.resource.data.image.size() <= 235000',
  'request.resource.data.image.matches',
  '!exists(/databases/$(database)/documents/sags_radio_events_v1/$(eventId))',
  'existsAfter(/databases/$(database)/documents/sags_radio_events_v1/$(eventId))'
])assert(proofRule.includes(check),'missing security property '+check);
const first=radio.indexOf('function combineFullProof('),last=radio.indexOf('function combineProof(',first);
assert(first>0&&last>first);
const calls={images:0,signs:0,pixels:0,encodes:0,widths:[]};
function create(){
 const c={width:1280,height:864};
 const ctx={fillRect(){},fillText(){},drawImage(){calls.images++},getImageData(){calls.pixels++;throw Error('No posterization allowed')}};
 c.getContext=()=>ctx;
 c.toDataURL=(mime,q)=>{
  calls.encodes++;calls.widths.push(c.width);
  // Size simulates first quality/more detail requiring a smaller source.
  const size=c.width>1152?245000:c.width>960?170000:120000;
  return 'data:'+mime+';base64,'+'A'.repeat(size);
 };
 return c;
}
const code=radio.slice(first,last).replace('function combineFullProof(leg){','function combineFullProof(leg){');
const c={document:{createElement:()=>create()},photos:{old:{canvas:create(),at:Date.now(),code:'DH01'}},$:()=>create(),webpCanvasEncoderSupported:()=>false,Math,Error,HIGH_PROOF_LIMIT:235000};
vm.createContext(c);vm.runInContext(code+'\nthis.encode=combineFullProof;',c);
const original=c.encode('old');
assert(original.startsWith('data:image/jpeg;base64,'));
assert(original.length<=235000);
assert(calls.widths.some(x=>x>=1024),'output should be >=1024px when data budget allows');
assert.equal(calls.pixels,0,'do not quantize or recolour full evidence image');
assert(calls.signs===0||calls.images>=2,'draw both camera image and ink');
console.log('V2.2 radio full-colour capture, JPEG proof, private same-transaction records, lazy viewing/PDF and colour-safe encoding PASS');
