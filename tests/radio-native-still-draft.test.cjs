'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {IDBFactory}=require('fake-indexeddb');

const source=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const index=source.lastIndexOf('})(window);');
const exposed=source.slice(0,index)+`
 root.test={CAPTURE_EXIF_OPTIONS,captureClock,nativeMode,encodeNativeProof,evidenceDetails,photoAudit,pdfBuild,
  saveNativeDraft,readNativeDraft,removeNativeDraft,radioShiftAt,
  setPhoto(photo,action){photos.old=photo;mode=action}
 };
`+source.slice(index);
const storage=new IDBFactory();
const original={};
const ink={width:540,height:150};
const attempts=[],draws=[],captions=[];
let sizes=[],account='staff';
const ui={radioSignature:ink,radioBattery:{value:'GOOD'},radioReturnReason:{value:'HANDOVER'},radioDetail:{value:'Kiểm tra tem'}};
function harness(navigator={userAgent:'iPhone'}){
 const canvas={
  getContext(type,options){
   assert.equal(type,'2d');
   assert.equal(options.colorSpace,'srgb');
   return {drawImage(...args){draws.push(args)},fillRect(){},fillText(text){captions.push(text)}};
  },
  toBlob(cb,mime,quality){
   attempts.push([this.width,quality]);
   cb(new Blob([Buffer.alloc(sizes.shift()??16000)],{type:mime}));
  }
 };
 const document={currentScript:{src:'http://localhost/app/modules/radio-custody.v1.js'},
  getElementById:id=>ui[id],createElement:()=>canvas};
 class Reader {
  async readAsDataURL(blob){
   this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');
   this.onload();
  }
 }
 const window={indexedDB:storage,firebase:{auth:()=>({currentUser:{uid:account}})}};
 vm.runInNewContext(exposed,{window,document,navigator,FileReader:Reader,Blob,atob,console});
 return {api:window.test,canvas};
}
(async()=>{
 const {api,canvas}=harness();
 assert(api.nativeMode('ISSUE')&&api.nativeMode('RETURN'));
 assert(!api.nativeMode('SWAP_OUT')&&!api.nativeMode('REPORT'));
 assert(!harness({userAgent:'Android',platform:'Linux'}).api.nativeMode('ISSUE'));
 assert(!harness({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:0}).api.nativeMode('RETURN'));
 assert(harness({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5}).api.nativeMode('RETURN'));
 // A real JPEG APP1 block with both EXIF timestamp fields and portrait orientation.
 const jpegExif=Buffer.from('/9j/4QBoRXhpZgAATU0AKgAAAAgAAgESAAMAAAABAAYAAIdpAAQAAAABAAAAJgAAAAAAApADAAIAAAAUAAAARJARAAIAAAAHAAAAWAAAAAAyMDI2OjExOjEyIDE5OjAxOjA1ACswNzowMAAA/9k=','base64');
 const library=fs.readFileSync('app/vendor/exifr-lite-7.1.3.js').toString('base64');
 const exifr=await import('data:text/javascript;base64,'+library);
 const tags=await exifr.parse(jpegExif,JSON.parse(JSON.stringify(api.CAPTURE_EXIF_OPTIONS)));
 // HEIF metadata item using a nonzero iloc base offset and zero relative extent.
 const heifExif=Buffer.from('AAAAHGZ0eXBoZWljAAAAAG1pZjFoZWljbWlhZgAAAJltZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAADRpbG9jAAAAAERAAAIAAQAAAAAEAgABAAAAAAAGkgoAAgAAAAAAvQABAAAAAAAAAGoAAAA4aWluZgAAAAAAAgAAABVpbmZlAgAAAAABAABodmMxAAAAABVpbmZlAgAAAQACAABFeGlmAAAAAHJtZGF0AAAABkV4aWYAAE1NACoAAAAIAAIBEgADAAAAAQAGAACHaQAEAAAAAQAAACYAAAAAAAKQAwACAAAAFAAAAESQEQACAAAABwAAAFgAAAAAMjAyNjoxMToxMiAxOTowMTowNQArMDc6MDAAAA==','base64');
 const heifTags=await exifr.parse(heifExif,JSON.parse(JSON.stringify(api.CAPTURE_EXIF_OPTIONS)));
 assert.equal(heifTags.DateTimeOriginal,tags.DateTimeOriginal);
 assert.equal(heifTags.OffsetTimeOriginal,tags.OffsetTimeOriginal);
 const clock=api.captureClock(tags,0);
 assert.equal(new Date(clock.at).toISOString(),'2026-11-12T12:01:05.000Z');
 assert.equal(clock.offset,'+07:00');
 assert.equal(api.radioShiftAt(clock.at).key,'2026-11-12/PM');
 assert.equal(api.radioShiftAt(Date.parse('2026-11-13T01:29:00Z')).key,'2026-11-12/PM');
 assert.equal(api.radioShiftAt(Date.parse('2026-11-13T01:30:00Z')).key,'2026-11-13/AM');
 const receiptTime=clock.at+12*60000;
 const details=api.evidenceDetails('a'.repeat(500),clock.at,clock);
 assert.equal(details.length,500);
 assert.match(details,/Asia\/Ho_Chi_Minh \| EXIF \+07:00 \| CHƯA XÁC MINH/);
 const audit=api.photoAudit({details,at:{toMillis:()=>receiptTime}});
 assert.equal(audit.deviceMs,clock.at);
 assert.equal(audit.serverMs,receiptTime);
 assert.match(audit.status,/CHƯA XÁC MINH/);
 const estimated=api.captureClock({},receiptTime);
 assert.equal(estimated.source,'picker-return');
 assert(api.photoAudit({details:api.evidenceDetails('',estimated.at,estimated)}).estimated);

 const image={image:original,code:'DH01',captureWidth:3024,captureHeight:4032,at:clock.at,clock};
 api.setPhoto(image,'ISSUE');
 sizes=[700000,600000,540000,320000];
 const evidence=await api.encodeNativeProof(700000);
 assert(evidence.startsWith('data:image/jpeg;base64,')&&evidence.length<=700000);
 assert.deepEqual(attempts,[[1920,.94],[1200,.85],[960,.8],[768,.72]]);
 assert(draws.filter(x=>x[0]===original).every(([,x,y,w,h])=>x===0&&y===0&&w/h===.75));
 assert.equal(draws.filter(x=>x[0]===ink).length,4);
 assert(captions.some(s=>s.includes('NHẬN'))&&captions.some(s=>s.includes('19:01:05')));
 assert.equal(canvas.width,1,'release native canvas backing buffer');
 attempts.length=0;
 api.setPhoto({...image,captureWidth:1200,captureHeight:900},'RETURN');
 sizes=[150000];
 const returned=await api.encodeNativeProof(700000);
 assert.deepEqual(attempts,[[1200,.94]],'a fitting photo keeps its original dimensions and high quality');
 assert(captions.some(s=>s.includes('TRẢ')));

 const jpeg='data:image/jpeg;base64,'+Buffer.from([255,216,1,99,255,217]).toString('base64');
 const page=()=>({width:900,height:1273,toDataURL:()=>jpeg});
 const photoPage=page();
 photoPage.proofJpeg={width:1200,height:900,x:45,y:337,w:810,h:607.5,data:jpeg};
 const photoPdf=Buffer.from(await api.pdfBuild([page(),photoPage]).arrayBuffer());
 assert(photoPdf.includes(Buffer.from([255,216,1,99,255,217])));
 assert.match(photoPdf.toString('latin1'),/\/Im2 9 0 R/);
 const plainPdf=await api.pdfBuild([page()]).text();
 assert(!plainPdf.includes('/Im2'));

 for(const action of ['ISSUE','RETURN']){
  const file=new Blob(['camera bytes'],{type:'image/heic'});
  const draft={id:'event-'+action,uid:'staff',code:'DH01',action,deviceVersion:7,receivedAt:receiptTime,clock};
  await api.saveNativeDraft(file,draft,[]);
  await api.saveNativeDraft(undefined,draft,[[[12,30],[32,50]]]);
  const afterReload=harness().api;
  const saved=await afterReload.readNativeDraft('staff',true);
  assert.equal(saved.action,action);
  assert.equal(saved.clock.at,clock.at);
  assert.equal(saved.fields.radioBattery,'GOOD');
  assert.equal(saved.fields.radioReturnReason,'HANDOVER');
  assert.deepEqual(Array.from(saved.strokes[0][1]),[32,50]);
  assert.equal(await saved.file.text(),'camera bytes');
  assert.equal(await afterReload.readNativeDraft('other'),undefined);
  account='other';
  await assert.rejects(afterReload.saveNativeDraft(file,draft,[]),/Phiên ký nhận/);
  account='staff';
  await assert.rejects(afterReload.saveNativeDraft(file,{...draft,id:'other-tab'},[]),/bản nháp/);
  await afterReload.removeNativeDraft('staff','other-tab');
  assert((await afterReload.readNativeDraft('staff')).id===draft.id);
  await afterReload.removeNativeDraft('staff',draft.id);
  assert.equal(await afterReload.readNativeDraft('staff'),undefined);
 }
 assert(returned.length<700000);
 console.log('Native iOS capture policy, timestamp, single-source fallback, signed proof PDF and reload-safe private drafts PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
