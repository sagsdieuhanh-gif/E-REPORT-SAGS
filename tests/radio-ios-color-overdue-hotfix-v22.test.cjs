'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const radio=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const gate=fs.readFileSync('app/modules/radio-work-gate.v1.js','utf8');
const from=radio.indexOf('function takePhoto(){'),until=radio.indexOf('async function retakePhoto(){',from);
assert(from>0&&until>from);
assert(!radio.includes('function quantizePngCanvas('),'Never posterize camera RGB to squeeze PNG under Firebase rules');
assert(!radio.includes('ctx.getImageData('),'Evidence image must not pass through colour-channel quantization');
assert(radio.includes('sourceW=source.width||640,sourceH=source.height||480'),'Legacy picture must use source aspect ratio');
assert(radio.includes("const preview=c.toDataURL('image/jpeg',.94)"),'Safari preview uses high JPEG quality');
assert(radio.includes("root.indexedDB.open('sags-radio-photo-local-v22',1)"),'Local high-quality evidence needs a scoped IndexedDB backup');
assert(radio.includes('localProofKey(uid,code,action,photo.at)'),'Backups must be identified by actor, device, action and capture timestamp');
assert(radio.includes('if(!at||!user.uid||user.uid!==e.actorUid)return'), 'Never show another account’s local photo');
assert(radio.includes('const data=await highProofData(e,true)'),'Viewer may show clear device-only picture');
assert(radio.includes("const img=await proofImage(fullProof||await highProofData(e))"),'Official PDF remains server-verified; never use local photo backup in PDF');
assert(!radio.includes('proofReadDenied=true'),'One old missing photo cannot permanently disable all high-quality evidence');
assert(radio.includes('AD thiết bị khác xem ảnh nén'),'Failure to save high-res on Firebase must be disclosed');
assert(gate.includes("SAGS_RADIO_OVERDUE"),'Prior-day radio should be blocked');
assert(gate.includes('minute>=510')===false||gate.includes('clock>=8*60+30'),'New gate must use 08:30 Vietnam boundary');
assert(!gate.includes('WORKDAY_CUTOFF_HOUR=4'),'Obsolete 04:00 cutoff must be removed');
function simulate(w,h){
 const image={hidden:true,src:''},v={readyState:4,videoWidth:w,videoHeight:h,hidden:false};
 const sign={scrollIntoView(){}};
 const ui={radioCameraVideo:v,radioCameraPhoto:image,radioSigWrap:sign};
 const drawn=[];
 let photo=null;
 const canvas={width:0,height:0,getContext(){return{
  imageSmoothingEnabled:true,imageSmoothingQuality:'',
  fillRect(){},fillText(){},drawImage(...args){drawn.push(args)},
  set fillStyle(_){},set textBaseline(_){},set font(_){}
 }},toDataURL:()=> 'data:image/jpeg;base64,'+'A'.repeat(13000)};
 const state={
  document:{createElement:()=>canvas},
  $:name=>ui[name],choice:{code:'DH01'},cameraStream:{},busy:false,cameraLeg:'old',mode:'ISSUE',
  photos:{old:null,new:null},label:x=>x,formatShotTime:()=> '12/11/2026 08:00:00',
  stopCamera(){},updatePhotoUI(){},notify(){},
  Math,Date,console
 };
 vm.createContext(state);vm.runInContext(radio.slice(from,until)+'\nthis.shot=takePhoto;',state);
 state.shot();
 photo=state.photos.old;
 assert(photo,'A photo must exist');
 assert.equal(photo.captureWidth,Math.min(w,Math.round(w*Math.min(1,2048/Math.max(w,h)))));
 assert.equal(photo.captureHeight,Math.min(h,Math.round(h*Math.min(1,2048/Math.max(w,h)))));
 assert.equal(drawn[0][0],v,'Original live camera frame must be drawn, not thumbnail');
 assert.equal(drawn[0][3],photo.captureWidth);assert.equal(drawn[0][4],photo.captureHeight);
 assert.equal(image.src,photo.preview,'Preview displays the unposterized capture');
 return photo;
}
const portrait=simulate(720,1280);
assert.equal(portrait.captureWidth,720);
assert.equal(portrait.captureHeight,1280);
const landscape=simulate(2560,1440);
assert.equal(landscape.captureWidth,2048);
assert.equal(landscape.captureHeight,1152);
const lowRes=simulate(640,480);
assert.equal(lowRes.captureWidth,640,'Never enlarge Safari 640px video into artificial 1280px data');
console.log('iOS portrait/landscape/low-res native capture, unposterized photo, local-only backup privacy, server-only PDF and overnight custody gate PASS');
