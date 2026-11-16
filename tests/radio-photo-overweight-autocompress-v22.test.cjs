'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const a=src.indexOf('function encodeProof('),b=src.indexOf('// Optional device-only backup',a);
assert(a>0&&b>a,'Adaptive proof encoder is present');
assert(src.includes("serverOld=combineFullProof('old');"),'Generate the archive before selecting a receipt');
assert(src.includes("serverNew=combineFullProof('new');"),'Swap preserves both original camera photos');
assert(src.includes('serverOld.length<=44000?serverOld'), 'Reuse the entire image when it fits in the event');
assert(!src.includes('writeCompactReceipt'), 'A rejected proof cannot silently commit a thumbnail-only signature');
assert(src.includes('usedCompatibleProof=true'), 'Use a smaller server archive when it fits older rules');
assert(src.includes("if(!photosReady())throw Error"),'Do not sign without real camera photo');
assert(src.includes("signature();if(needsPhoto(mode))"),'Do not sign without actual ink');
assert(src.includes("tx.set(evRef,ev)")&&src.includes("tx.update(ref,"),
 'Receipt and custody change must remain a single transaction');
function build(webp=false,allTooLarge=false){
 let paints=0,encodes=0,smallest=Infinity;
 const input={width:2048,height:1536};
 const make=()=>{
  const c={width:0,height:0};
  c.getContext=()=>({
   fillRect(){},fillText(){},
   drawImage(){paints++}
  });
  c.toDataURL=(mime,q)=>{
   encodes++;smallest=Math.min(smallest,Math.max(c.width,c.height));
   if(mime==='image/webp'&&!webp)return 'data:image/png;base64,AA';
   const pixels=c.width*c.height;
   const len=allTooLarge?850000:
    Math.max(180,Math.ceil(pixels*(mime==='image/png'?.85:.35)*Math.max(.5,Number(q)||1)));
   return 'data:'+mime+';base64,'+'A'.repeat(len);
  };
  return c;
 };
 const scope={document:{createElement:()=>make()},photos:{old:{canvas:input}},
  $:()=>input,webpCanvasEncoderSupported:()=>webp,Error,Math,Set,HIGH_PROOF_LIMIT:700000};
 vm.createContext(scope);
 vm.runInContext(src.slice(a,b)+'\nthis.compact=combineProof;this.full=combineFullProof;',scope);
 return {scope,stats:()=>({paints,encodes,smallest})};
}
const ios=build(false);
const receipt=ios.scope.compact('old');
assert.match(receipt,/^data:image\/jpeg;base64,/);
assert(receipt.length<=44000,'No 45k overflow even for detailed iOS shot');
assert(ios.stats().smallest<640,'Encoder must reduce resolution when 640px still exceeds budget');
const full=ios.scope.full('old');
assert.match(full,/^data:image\/jpeg;base64,/);
assert(full.length<=700000,'Full proof must honour Firestore image cap');
const compatible=ios.scope.full('old',235000);
assert(compatible.length<=235000,'Old V2.2 photo rules have a compatible full-colour fallback');
const png=ios.scope.compact('old','png');
assert.match(png,/^data:image\/png;base64,/);
assert(png.length<=44000,'Legacy PNG proof must shrink instead of rejecting signing');
assert(ios.stats().paints>=4,'Every encoded image contains camera frame and signature');
const android=build(true);
assert.match(android.scope.compact('old'),/^data:image\/webp;base64,/);
assert(android.scope.compact('old').length<=44000);
const corrupt=build(false,true);
assert.throws(()=>corrupt.scope.full('old'),/giới hạn lưu trữ/,'Impossible encoding is reported so evidence stays pending');
assert.throws(()=>corrupt.scope.compact('old'),/giới hạn lưu trữ/,'Never manufacture a successful signature without valid image');
console.log('Radio image-overweight hotfix: auto resize JPEG/WebP/PNG, 44k receipt, 235k/700k proofs, failed archival write keeps evidence pending, camera+ink remain mandatory PASS');
