'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const code=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const css=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
for(const marker of [
 'id="radioReportMode"','id="radioRangeFrom"','id="radioRangeTo"',
 'data-radio-range-preset="7"','data-radio-range-preset="30"','data-radio-range-preset="month"',
 "if(!isAdmin(currentUser()))return notify('Chỉ AD được xuất báo cáo bộ đàm theo khoảng ngày.'",
 "limit(RANGE_BATCH_SIZE)","query=query.startAfter(cursor)","get({source:'server'})",
 "if(all.length>RANGE_MAX_EVENTS)throw Error",
 "page.metadata?.fromCache","radioRangeDailyMatrix(rows)",
 "hydrateRangeEvidence(e)","reportMode==='RANGE'?reportFrom",
 "reportFileToken()+'-KEM-ANH.pdf'",
 "pdfStoredPage(pdfPage(pages[i]"
])assert(code.includes(marker),'Missing complete range report requirement: '+marker);
assert(css.includes('.radioReportInputs[hidden]')&&css.includes('.radioRangeInputs .radioRangePresets'),'Mobile range controls must be styled and respect hidden');
assert(code.includes("if(canMonitor(currentUser())&&(!reportReady||!reportVerified))"),'PDF cannot use unverified history');
assert(code.includes("if(rows.length>photoMax)return notify"),'Photo PDF must fail rather than truncate');
const shift=code.slice(code.indexOf('function shiftBounds(day,which){'),code.indexOf('function shift(){'));
const functions=code.slice(code.indexOf('function radioDayAdd('),code.indexOf('function filteredHistory(){'));
const filter=code.slice(code.indexOf('function filteredHistory(){'),code.indexOf('function renderHistory(){'));
assert(shift.startsWith('function shiftBounds')&&functions.includes('async function loadRangeReport()')&&filter.startsWith('function filteredHistory'));
const elements=Object.fromEntries([
 'radioReportMode','radioReportModeWrap','radioShiftInputs','radioRangeInputs','radioRangeFrom','radioRangeTo','radioRangeLoad','radioReportState',
 'radioReportDate','radioReportShift','radioReportLoad','radioHistoryDevice','radioHistoryAction','radioHistorySearch'
].map(id=>[id,{value:'',hidden:false,disabled:false,textContent:''}]));
elements.radioReportMode.value='RANGE';
elements.radioRangeFrom.value='2026-11-18';elements.radioRangeTo.value='2026-11-24';
const notices=[],from=Date.parse('2026-11-18T08:30:00+07:00');
const stamp=ms=>({toMillis:()=>ms});
let docs=Array.from({length:230},(_,i)=>({
 id:'event-'+String(i).padStart(4,'0'),
 data:()=>({at:stamp(from+i*30*60000),deviceCode:'BD01',actorUid:'uid-1',actorName:'Nhân viên',action:'ISSUE',signature:'data:image/jpeg;base64,AAAA'})
}));
let calls=0,queriedBounds=[];
function queryBuilder(){
 let lower=0,upper=Infinity,max=200,after=null;
 return {
  where(field,op,value){assert.equal(field,'at');if(op==='>=')lower=value.getTime();else if(op==='<')upper=value.getTime();else throw Error('bad op');return this},
  orderBy(field,dir){assert.equal(field,'at');assert.equal(dir,'asc');return this},
  limit(value){max=value;return this},
  startAfter(doc){after=doc.id;return this},
  async get(options){
   assert.equal(options.source,'server');calls++;
   queriedBounds.push([lower,upper]);
   const matching=docs.filter(d=>{const ms=d.data().at.toMillis();return ms>=lower&&ms<upper});
   const start=after===null?0:matching.findIndex(d=>d.id===after)+1;
   return {metadata:{fromCache:false},docs:matching.slice(start,start+max)};
  }
 };
}
const ctx={Date,Number,Math,Promise,Map,Set,Intl,navigator:{onLine:true},VN:'Asia/Ho_Chi_Minh',
 S:x=>String(x??'').trim(),connected:true,reportReady:false,reportLoading:false,reportVerified:false,
 reportEvents:[],reportMode:'SHIFT',reportFrom:'',reportTo:'',reportDate:'',reportShift:'AM',reportToken:0,
 RANGE_BATCH_SIZE:200,RANGE_MAX_EVENTS:2400,RANGE_MAX_DAYS:31,REPORT_LIMIT:301,
 currentUser:()=>({role:'AD'}),isAdmin:u=>u.role==='AD',canMonitor:u=>u.role==='AD',
 vnDateKey:()=> '2026-11-24',$:id=>elements[id],fs:()=>({collection:()=>queryBuilder()}),
 notify:(msg,failed)=>notices.push({msg,failed}),errText:e=>String(e?.message||e),
 renderHistory:()=>{},renderSummary:()=>{},dateFilter:'all',events:[]
};
vm.createContext(ctx);
vm.runInContext(shift+functions+filter+
 ';this.loadRangeReport=loadRangeReport;this.radioRangeBounds=radioRangeBounds;this.radioValidDay=radioValidDay;this.applyRadioRangePreset=applyRadioRangePreset;this.filteredHistory=filteredHistory;this.reportScope=reportScope;this.reportFileToken=reportFileToken;this.reportState=()=>({reportReady,reportVerified,reportMode,reportFrom,reportTo,reportEvents});',ctx);
assert.equal(new Date(ctx.radioRangeBounds('2026-11-18','2026-11-24').startMs).toISOString(),'2026-11-18T01:30:00.000Z');
assert.equal(new Date(ctx.radioRangeBounds('2026-11-18','2026-11-24').endMs).toISOString(),'2026-11-25T01:30:00.000Z');
assert(Date.parse('2026-11-25T08:29:59+07:00')<ctx.radioRangeBounds('2026-11-18','2026-11-24').endMs,'Last minute of final night shift must be included');
assert(Date.parse('2026-11-25T08:30:00+07:00')===ctx.radioRangeBounds('2026-11-18','2026-11-24').endMs,'Next morning shift must be excluded');

assert.equal(ctx.radioValidDay('2026-02-30'),false,'Invalid calendar day must not be accepted');
ctx.applyRadioRangePreset('month');assert.equal(elements.radioRangeFrom.value,'2026-11-01');
ctx.applyRadioRangePreset('7');assert.equal(elements.radioRangeFrom.value,'2026-11-18');
ctx.applyRadioRangePreset('30');assert.equal(elements.radioRangeFrom.value,'2026-10-26');
elements.radioRangeFrom.value='2026-11-18';elements.radioRangeTo.value='2026-11-24';
(async()=>{
 await ctx.loadRangeReport();
 let state=ctx.reportState();
 assert.equal(state.reportReady,true);assert.equal(state.reportVerified,true);
 assert.equal(state.reportMode,'RANGE');assert.equal(state.reportFrom,'2026-11-18');
 assert.equal(state.reportTo,'2026-11-24');assert.equal(state.reportEvents.length,230);
 assert.equal(calls,2,'230 events must be fully paginated, not cut to first 200');
 assert.equal(new Set(queriedBounds.map(v=>v.join(':'))).size,1,'Each page must stay in exact fixed interval');
 assert(state.reportEvents.every(e=>e.hasSignature&&!e.signature),'Keep large photos out of range list memory');
 assert.equal(ctx.filteredHistory().length,230);
 assert.match(ctx.reportScope(),/2026-11-18.*2026-11-24/);
 assert.equal(ctx.reportFileToken(),'2026-11-18-DEN-2026-11-24');
 // Do not allow role changes to gain access to range-mode queries.
 const oldCalls=calls;ctx.currentUser=()=>({role:'RADIO_MANAGER'});
 await ctx.loadRangeReport();assert.equal(calls,oldCalls,'Manager must not query multi-day report');
 ctx.currentUser=()=>({role:'AD'});
 // Invalid ranges must not hit the server.
 elements.radioRangeFrom.value='2026-10-01';
 await ctx.loadRangeReport();assert.equal(calls,oldCalls,'More than 31 days must be blocked before Firestore');
 // A range with more than the hard cap must be rejected entirely, not silently truncated.
 elements.radioRangeFrom.value='2026-11-18';
 docs=Array.from({length:2401},(_,i)=>({
  id:'large-'+String(i).padStart(4,'0'),
  data:()=>({at:stamp(from+i*100000),actorUid:'uid-1',deviceCode:'BD01',signature:'evidence',action:'ISSUE'})
 }));
 await ctx.loadRangeReport();
 state=ctx.reportState();
 assert.equal(state.reportReady,false);assert.equal(state.reportVerified,false);
 assert.equal(state.reportEvents.length,0,'Do not leave a partial report available for PDF export');
 assert(notices.some(x=>x.failed&&/2.400|thiếu dữ liệu/.test(x.msg)),'Oversize error must be explicit');
 console.log('AD multi-day report: timezone 08:30 boundaries, presets, complete pagination, max 31 days, manager isolation, evidence memory, no partial PDF PASS');
})().catch(error=>{console.error(error);process.exitCode=1});