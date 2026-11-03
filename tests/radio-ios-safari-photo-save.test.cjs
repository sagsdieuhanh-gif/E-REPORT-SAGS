'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const radio=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const rules=fs.readFileSync('firebase/radio-custody.rules.snippet','utf8');
const style=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
const from=radio.indexOf('function webpCanvasEncoderSupported(){'),until=radio.indexOf('function viewProof(id){',from);
assert(from>0&&until>from,'encoder functions exist and are testable');
assert(radio.includes("preview=c.toDataURL('image/jpeg',.68)"),'Safari previews must not default to huge PNG');
assert(radio.includes("if(!root.PointerEvent)"),'old iOS touch signature fallback required');
assert(radio.includes("try{c.setPointerCapture?.(e.pointerId)}catch(_){}mark(e)"),'pointer capture may throw in WebKit but ink recording must continue');
assert(radio.includes('if(!photosReady())throw Error'),'mandatory camera proof remains');
assert(radio.includes("if(mode==='SWAP_OUT')sigNew=combineProof('new')"),'swap still needs two signed proofs');
assert(radio.includes('await new Promise(resolve=>requestAnimationFrame(resolve))'),'save should paint feedback before synchronous encoding');
assert(radio.includes('id="radioActionMessage"'),'errors must be shown beside iOS save control');
assert(style.includes('env(safe-area-inset-bottom'),'iOS Safari browser chrome clearance');
assert(rules.includes("d.signature.matches('^data:image/png;base64,"),'existing Firebase rules must accept native PNG evidence');
assert(!rules.includes("d.signature.matches('^data:image/jpeg;base64,"),'do not rely on undeployed rule changes');
const createHarness=webp=>{
 let imageDraws=0,readbacks=0,tries=0;
 function createCanvas(){
  const c={width:0,height:0};
  const x={fillStyle:'',font:'',clearRect(){},fillRect(){},fillText(){},
   drawImage(){imageDraws++},
   getImageData(){readbacks++;return {data:new Uint8ClampedArray(c.width*c.height*4)}},
   putImageData(){}};
  c.getContext=()=>x;
  c.toDataURL=(format,quality)=>{
   tries++;
   if(format==='image/webp'){
    if(!webp)return 'data:image/png;base64,aaaa';
    return 'data:image/webp;base64,'+'a'.repeat(15000);
   }
   if(format==='image/png'){
    // Simulate a rich photo where large PNGs exceed the immutable event cap.
    const length=c.width>240?60000:18000;
    return 'data:image/png;base64,'+'A'.repeat(length);
   }
   return '';
  };
  return c;
 }
 const rootCanvas=createCanvas(),ctx={
  document:{createElement:tag=>{assert.equal(tag,'canvas');return createCanvas()}},
  $:key=>{assert.equal(key,'radioSignature');return rootCanvas},
  photos:{old:{canvas:rootCanvas,code:'DH01',at:Date.now()},new:null},
  Error,Math,Uint8ClampedArray
 };
 vm.createContext(ctx);
 vm.runInContext(radio.slice(from,until)+'\nthis.combineProofTest=combineProof;this.webpSupportTest=webpCanvasEncoderSupported;',ctx);
 return {ctx,stats:()=>({imageDraws,readbacks,tries})};
};
const safari=createHarness(false);
assert.equal(safari.ctx.webpSupportTest(),false,'iOS Safari must detect unsupported WebP encoder');
const png=safari.ctx.combineProofTest('old');
assert.match(png,/^data:image\/png;base64,/);
assert(png.length<=44000&&png.length>120,'PNG must fit Firestore 45000-char signature contract');
assert(safari.stats().imageDraws>=2,'photo and hand-drawn signature must both be rasterized');
assert(safari.stats().readbacks>0,'Safari PNG proof should use controlled palette compression');
const chromium=createHarness(true);
assert.equal(chromium.ctx.webpSupportTest(),true);
const webp=chromium.ctx.combineProofTest('old');
assert.match(webp,/^data:image\/webp;base64,/);
assert(webp.length<=44000);
assert.equal(chromium.stats().readbacks,0,'WebP-capable browsers retain existing fast encoding path');
const invalid=createHarness(false);
vm.runInContext("document.createElement=()=>{const c={width:1,height:1,toDataURL:t=>t==='image/webp'?'data:image/png;base64,x':'data:image/png;base64,'+'B'.repeat(60000),getContext:()=>({fillRect(){},fillText(){},drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(4)}),putImageData(){}})};return c}",invalid.ctx);
assert.throws(()=>invalid.ctx.combineProofTest('old'),/chưa được ghi nhận/,'never fabricate a successful save when evidence cannot fit');
console.log('Safari PNG/WebP photo signatures, original camera+ink, Firebase 45k rules, and visible iOS save status PASS');
