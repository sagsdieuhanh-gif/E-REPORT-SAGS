'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const radio=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const rules=fs.readFileSync('firebase/radio-custody.rules.snippet','utf8');
const production=fs.readFileSync('firebase/firestore.rules','utf8');
const style=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
const from=radio.indexOf('function webpCanvasEncoderSupported(){'),until=radio.indexOf('async function highProofData(e,allowLocal=false){',from);
assert(from>0&&until>from);
assert(radio.includes("preview=c.toDataURL('image/jpeg',.94)"),'Safari preview must use high-quality JPEG');
assert(radio.includes('if(!root.PointerEvent)'));
assert(radio.includes("try{c.setPointerCapture?.(e.pointerId)}catch(_){}mark(e)"));
assert(radio.includes('if(!photosReady())throw Error'),'live photo mandatory');
assert(radio.includes("hiNew=combineFullProof('new');sigNew=combineProof('new')"),'swap creates two high-quality images');
assert(radio.includes("sig=combineProof('old','png')"),'old Firestore rules must have one transaction-rejected fallback');
assert(radio.includes("if(mode==='SWAP_OUT')sigNew=combineProof('new','png')"));
assert(radio.includes("!String(legacyError?.code||'').includes('permission-denied')"),'only denied compact JPEG rules may trigger PNG fallback');
assert(radio.includes('await writeRadioTransaction(false);'),'legacy retry remains atomic');
assert(!radio.includes('getImageData(0,0,640,430)'),'never tamper with saved original shot before compositing');
for(const rx of ["(webp|png|jpeg)","image/jpeg;base64"])assert(radio.includes(rx),rx);
assert(radio.includes('id="radioActionMessage"'),'inline save status');
assert(style.includes('env(safe-area-inset-bottom'),'iOS safe area');
for(const source of [rules,production]){
 assert(source.includes("d.signature.matches('^data:image/jpeg;base64,"),'JPEG must be enabled in proposed Firestore rules');
 assert(source.includes("d.signature.matches('^data:image/png;base64,"),'legacy iOS PNG must remain allowed');
 assert(source.includes("d.signature.size() <= 45000"),'event size limit unchanged');
}
function makeHarness(webp){
 let draw=0,reads=0,tries=0;
 function canvas(){
  const c={width:0,height:0};
  const ctx={clearRect(){},fillRect(){},fillText(){},drawImage(){draw++},
   getImageData(){reads++;return {data:new Uint8ClampedArray(c.width*c.height*4)}},putImageData(){}};
  c.getContext=()=>ctx;
  c.toDataURL=(format,quality)=>{
   tries++;
   if(format==='image/webp')return webp?'data:image/webp;base64,'+'X'.repeat(15000):'data:image/png;base64,AA';
   if(format==='image/jpeg')return 'data:image/jpeg;base64,'+(c.width>=600?'X'.repeat(51000):'X'.repeat(27500));
   if(format==='image/png')return 'data:image/png;base64,'+(c.width>240?'X'.repeat(60000):'X'.repeat(23000));
   return '';
  };
  return c;
 }
 const signatureCanvas=canvas();
 const ctx={document:{createElement:tag=>{assert.equal(tag,'canvas');return canvas()}},
  $:()=>signatureCanvas,photos:{old:{canvas:signatureCanvas,code:'DH01',at:Date.now()}},Math,Uint8ClampedArray};
 vm.createContext(ctx);
 vm.runInContext(radio.slice(from,until)+'\nthis.encode=combineProof;this.webpSupport=webpCanvasEncoderSupported;',ctx);
 return {ctx,stats:()=>({draw,reads,tries})};
}
const ios=makeHarness(false);
assert.equal(ios.ctx.webpSupport(),false);
const jpeg=ios.ctx.encode('old');
assert.match(jpeg,/^data:image\/jpeg;base64,/);
assert(jpeg.length<44000,'JPEG must fit Firestore signature cap');
assert(ios.stats().draw>=2,'image and handwritten signature are both embedded');
assert.equal(ios.stats().reads,0,'JPEG must not be posterized by PNG colour quantization');
const fallback=ios.ctx.encode('old','png');
assert.match(fallback,/^data:image\/png;base64,/);
assert(fallback.length<44000&&ios.stats().reads===0,'iOS PNG fallback retains RGB pixels without quantization');
const android=makeHarness(true);assert(android.ctx.webpSupport());assert.match(android.ctx.encode('old'),/^data:image\/webp;base64,/);
assert.equal(android.stats().reads,0,'Chrome/Android still use original WebP workflow');
console.log('Safari JPEG/PNG full-colour proof, no posterization, camera+ink, Android WebP and rules PASS');
