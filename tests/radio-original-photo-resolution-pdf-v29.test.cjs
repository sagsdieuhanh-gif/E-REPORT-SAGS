'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
assert(source.includes("['ISSUE','RETURN'].includes(action)"),'Only signed handover uses the native file picker');
assert(source.includes('/iPhone|iPad|iPod|Android/i'),'iOS and Android must capture full-resolution still photos');
assert(source.includes('[2048,1920,1800,1600,1440,1280'),'Hi-fi encoder starts above 1280px');
assert(source.includes('[[Math.min(longest,2560),.94],[2240,.88],[2048,.84],[1920,.82]'),'iOS fallback retains sharpness beyond 1600px');
assert(source.includes("if(img.src.startsWith('data:image/jpeg;base64,'))"),'PDF must embed the original JPEG for verified AND unverified events');
assert(!source.includes("if(audit.unverified&&img.src.startsWith('data:image/jpeg;base64,'))"),'Do not flatten verified proof in the PDF');
assert(source.includes("const jpeg=hi.toDataURL('image/jpeg',.94)"),'WebP full-proof should convert only once at its own resolution');

const begin=source.indexOf('function encodeProof('),finish=source.indexOf('// Optional device-only backup',begin);
assert(begin>0&&finish>begin);
const draw=[];
function makeEncoderCanvas(){
 const canvas={width:0,height:0};
 canvas.getContext=()=>({fillRect(){},fillText(){},drawImage(...args){draw.push({canvasWidth:canvas.width,args})}});
 canvas.toDataURL=(type,q)=>{
  const longest=Math.max(canvas.width,canvas.height);
  const size=longest>2000?560000:longest>1000?330000:longest>500?140000:28000;
  return 'data:'+type+';base64,'+'A'.repeat(size);
 };
 return canvas;
}
const photographed={width:2048,height:1536},signature={width:540,height:150};
const images={old:{canvas:photographed,at:Date.now(),code:'DH01'}};
const ctx={document:{createElement:()=>makeEncoderCanvas()},photos:images,$:()=>signature,
 webpCanvasEncoderSupported:()=>false,Math,Set,Error,HIGH_PROOF_LIMIT:700000};
vm.createContext(ctx);
vm.runInContext(source.slice(begin,finish)+'\nthis.archive=combineFullProof;this.receipt=combineProof;',ctx);
const archive=ctx.archive('old');
assert(archive.startsWith('data:image/jpeg;base64,'));
assert(archive.length<=700000);
assert(archive.length>235000);
assert(draw.some(x=>x.canvasWidth===2048&&x.args[0]===photographed),
 'Original high-quality proof must be drawn at 2048 pixels from the actual camera frame');
const legacy=ctx.archive('old',235000);
assert(legacy.length<=235000,'Older Firebase limits must still allow fallback');
const receipt=ctx.receipt('old');
assert(receipt.length<=44000,'Compact audit signature must remain small');

// Actual PDF composition: a verified original JPEG must survive byte-for-byte
// rather than being recompressed with the entire 900x1273 page canvas.
const pageStart=source.indexOf('async function photoPdfPage('),pageEnd=source.indexOf('function pdfStoredPage(',pageStart);
assert(pageStart>0&&pageEnd>pageStart);
const jpeg='data:image/jpeg;base64,'+Buffer.from([255,216,4,8,15,16,255,217]).toString('base64');
const webp='data:image/webp;base64,'+Buffer.from([8,9,10]).toString('base64');
const created=[],drawn=[];
let actualProof=jpeg;
function makePdfCanvas(){
 const canvas={width:0,height:0,proofJpeg:null};
 const context={scale(){},fillRect(){},fillText(){},drawImage(){drawn.push('page-resampled')},set imageSmoothingEnabled(_){},set imageSmoothingQuality(_){}};
 canvas.getContext=()=>context;
 canvas.toDataURL=(mime,q)=>jpeg;
 created.push(canvas);
 return canvas;
}
const scope={navigator:{userAgent:'desktop'},document:{createElement:()=>makePdfCanvas()},
 Math,Date,Number,Error,
 S:x=>String(x??''),label:x=>x,ACTS:{ISSUE:'Nhận máy'},fmt:()=> '16/11/2026',
 pdfWrap:()=>[],photoAudit:()=>({serverMs:Date.now(),deviceMs:Date.now(),delta:0,
  status:'Đã xác minh Firebase',estimated:false,unverified:false}),
 proofImage:async data=>({src:data,width:2000,height:1500,naturalWidth:2000,naturalHeight:1500}),
 highProofData:async()=>actualProof};
vm.createContext(scope);
vm.runInContext(source.slice(pageStart,pageEnd)+'\nthis.page=photoPdfPage;',scope);
const event={deviceCode:'DH01',actorName:'Staff',actorUid:'uid',shift:'AM',
 id:'event1',action:'ISSUE',details:'Kiểm tra máy',signature:'signed'};
(async()=>{
 let page=await scope.page(event,1,1);
 assert.equal(page.proofJpeg.data,jpeg,'Exact JPEG bytes must be embedded for a Firebase-verified event');
 assert.equal(page.proofJpeg.width,2000);
 assert.equal(page.proofJpeg.height,1500);
 assert.equal(drawn.length,0,'No page-thumbnail resampling of a genuine JPEG');
 actualProof=webp;
 page=await scope.page(event,1,1);
 assert.equal(page.proofJpeg.data,jpeg,'WebP should get a single native-size JPEG conversion for PDF');
 assert.equal(page.proofJpeg.width,2000);
 assert.equal(page.proofJpeg.height,1500);
 assert.equal(drawn.length,1,'WebP should be converted at source dimensions, not page dimensions');
 console.log('Radio photo fidelity PASS: Android still camera, 2048px originals, 700k/235k archive, 44k receipt, raw JPEG in verified PDF');
})().catch(e=>{console.error(e);process.exitCode=1});
