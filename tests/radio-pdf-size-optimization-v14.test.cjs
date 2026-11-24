'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const start=code.indexOf('async function photoPdfPage(');
const end=code.indexOf('function pdfStoredPage(',start);
assert(start>=0&&end>start);
const renderer=code.slice(start,end);
assert(code.includes('[[Math.min(2560,longest),.89],[Math.min(2048,longest),.86],[Math.min(1600,longest),.83]]'),'New camera archive should be slightly smaller without lowering photo dimensions');
assert(renderer.includes("const reencode=!directJpeg||img.src.length>700000"),'Only large original JPEGs should be recompressed for PDF');
assert(renderer.includes('Math.min(1,1800/maxEdge)'), 'PDF image should have safe high-detail pixel cap');
assert(renderer.includes("hi.toDataURL('image/jpeg',.84)"),'PDF JPEG quality should be moderate, not aggressively blurred');
assert(renderer.includes('if(directJpeg&&jpeg.length>=img.src.length)'), 'Never make the original JPEG bigger by recompressing');
assert(renderer.includes('if(directJpeg)cv.proofJpeg={data:img.src'), 'Failed compression must preserve original JPEG rather than remove evidence');
const small='data:image/jpeg;base64,'+'A'.repeat(18000);
const big='data:image/jpeg;base64,'+'A'.repeat(880000);
const optimized='data:image/jpeg;base64,'+'B'.repeat(170000);
const conversions=[],textCalls=[];
let actual=big;
const canvas=()=>{
 const obj={width:0,height:0};
 const ctx={scale(){},fillRect(){},fillText(t){textCalls.push(String(t))},drawImage(){},};
 obj.getContext=()=>ctx;
 obj.toDataURL=(mime,quality)=>{conversions.push({mime,quality,width:obj.width,height:obj.height});return optimized};
 return obj;
};
const scope={
 root:{SAGSRadioPhotoVaultV1:null},document:{createElement:()=>canvas()},
 navigator:{userAgent:'Windows'},Math,Date,Number,Error,
 S:v=>String(v??''),label:x=>x,ACTS:{ISSUE:'Nhận máy'},fmt:()=> '24/11/2026 10:00',
 photoAudit:()=>({serverMs:Date.now(),deviceMs:Date.now(),status:'ĐÃ KIỂM TRA',delta:0,estimated:false}),
 proofImage:async source=>({src:source,width:2560,height:1700,naturalWidth:2560,naturalHeight:1700}),
 highProofData:async()=>actual,pdfWrap:()=>[]
};
vm.createContext(scope);
vm.runInContext(renderer+'\nthis.page=photoPdfPage;',scope);
const event={id:'proof123',deviceCode:'DH01',action:'ISSUE',actorName:'A',actorUid:'user1',shift:'AM',signature:small};
(async()=>{
 let p=await scope.page(event,1,1,small);
 assert.equal(p.proofJpeg.data,small,'Small JPEG stays pixel-identical in PDF');
 assert.equal(conversions.length,0,'Small original JPEG avoids unnecessary re-encoding');
 actual=big;
 p=await scope.page(event,1,1,big);
 assert.equal(p.proofJpeg.data,optimized,'Large JPEG embedded in PDF must use smaller version');
 assert(p.proofJpeg.width<=1800&&p.proofJpeg.height<=1800,'Keep optimized dimensions legible');
 assert(conversions.some(c=>c.mime==='image/jpeg'&&c.quality===.84),'Use specified JPEG quality for PDF only');
 assert.equal(actual,big,'Original server JPEG must never be overwritten');
 assert(textCalls.some(t=>t.includes('Ảnh PDF tối ưu dung lượng')),'Report must disclose optimized PDF evidence');
 scope.document.createElement=()=>{const c=canvas();c.toDataURL=()=>big+'EXTRA';return c};
 p=await scope.page(event,1,1,big);
 assert.equal(p.proofJpeg.data,big,'No replacement with a larger JPEG');
 console.log('Radio PDF photo optimization PASS: small original untouched; large PDF-only JPEG shrinks; fallback safe; source verified');
})().catch(e=>{console.error(e);process.exitCode=1});