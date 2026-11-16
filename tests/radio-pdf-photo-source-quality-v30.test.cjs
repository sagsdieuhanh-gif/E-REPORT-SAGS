'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const viewer=s.slice(s.indexOf('async function highProofData('),s.indexOf('let proofViewToken=',s.indexOf('async function highProofData(')));
assert(viewer.includes("return e.signature"),'Missing remote proof should remain available only as a compressed receipt');
const exportCode=s.slice(s.indexOf('async function exportPhotoPdf(){'),s.indexOf('async function exportPdf(){'));
assert(exportCode.includes("const batch=rows.slice(i,i+4),full=await Promise.all(batch.map(e=>highProofData(e)))"),
 'Official admin PDF fetches Firebase data, not local unverified image');
assert(exportCode.includes("if(full[j]===batch[j].signature)compactOnly.push"),
 'Audit must distinguish compact evidence from separate server image');
assert(exportCode.includes("if(!batch[j].signature)missingCount++"),'Never count a missing photo as high quality');
assert(exportCode.includes("if(compactOnly.length)"),'No silent 44KB fallback in export');
assert(exportCode.includes("if(!root.confirm(question))"),'Admin explicitly decides whether to include low-quality receipts');
assert(exportCode.includes("originalCount+' ảnh riêng từ Firebase"),'Result must show actual evidence-source counts');

const start=s.indexOf('async function photoPdfPage('),end=s.indexOf('function pdfStoredPage(',start);
assert(start>0&&end>start,'PDF photograph appendix renderer should be present');
const source=s.slice(start,end);
assert(source.includes("const originalAvailable=actualProof!==e.signature"),'Each page must audit actual image source');
assert(source.includes("cv.proofJpeg={data:img.src,width:img.width,height:img.height,x:left,y:top,w,h}"),
 'Keep the original JPEG embedded pixel-for-pixel without PDF thumbnail recompression');
assert(source.includes("x.fillText('Nguồn: '+photoSource"),'Source quality and dimensions must appear in report');

const photo='data:image/jpeg;base64,'+Buffer.from([255,216,1,2,3,255,217]).toString('base64');
const high='data:image/jpeg;base64,'+Buffer.from([255,216,10,11,12,13,255,217]).toString('base64');
const calls=[];
const canvas=()=>{
 const c={width:0,height:0};
 const ctx={fillRect(){},drawImage(){calls.push('draw')},scale(){},fillText(t){calls.push(String(t))}};
 c.getContext=()=>ctx;
 return c;
};
const test={document:{createElement:()=>canvas()},navigator:{userAgent:'Windows'},
 Math,Date,Number,Error,S:v=>String(v??''),label:v=>v,
 ACTS:{ISSUE:'Nhận máy'},fmt:()=> '17/11/2026',
 pdfWrap:()=>[],photoAudit:()=>({status:'Đã xác minh',serverMs:Date.now(),deviceMs:Date.now(),delta:0}),
 proofImage:async data=>({src:data,width:data===photo?220:2000,height:data===photo?170:1500,
  naturalWidth:data===photo?220:2000,naturalHeight:data===photo?170:1500}),
 highProofData:async()=>photo};
vm.createContext(test);
vm.runInContext(source+'\nthis.page=photoPdfPage;',test);
const ev={signature:photo,id:'event123',deviceCode:'DH03',action:'ISSUE',actorName:'Nhân viên',actorUid:'uid',shift:'AM'};
(async()=>{
 let p=await test.page(ev,1,1,high);
 assert.equal(p.proofJpeg.data,high,'Verified original JPEG survives into PDF without recompression');
 assert(calls.some(v=>v.includes('Ảnh lưu riêng trên Firebase')&&v.includes('2000×1500 px')),
  'High-resolution server proof must be explicitly labeled and dimensioned');
 calls.length=0;
 p=await test.page(ev,1,1,photo);
 assert.equal(p.proofJpeg.data,photo,'Existing compact receipt remains printable when explicitly accepted');
 assert(calls.some(v=>v.includes('CHỈ CÓ ẢNH KÝ NHẬN NÉN')&&v.includes('220×170 px')),
  'Low-resolution receipt must be unmistakably labeled in PDF');
 assert(!calls.some(v=>v.includes('Ảnh lưu riêng trên Firebase')),
  'Compact receipt must never be mislabeled as a server original');
 calls.length=0;
 p=await test.page({...ev,signature:''},1,1,'');
 assert.equal(p.proofJpeg,undefined,'No attached photo must not be synthesized');
 assert(calls.some(v=>v.includes('KHÔNG CÓ ẢNH')),'Unphotographed event is explicitly labeled');
 console.log('Radio PDF photo provenance PASS: original server JPEG embedded intact; compact-only and no-image visibly disclosed');
})().catch(err=>{console.error(err);process.exitCode=1});
