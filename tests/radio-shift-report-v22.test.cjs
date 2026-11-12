'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const radio=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const css=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
assert(radio.includes('id="radioReportDate" type="date"'),'Date selector missing');
assert(radio.includes('id="radioReportShift"'),'AM/PM shift selector missing');
assert(radio.includes('id="radioReportLoad"'),'Load-from-server button missing');
assert(radio.includes('id="radioPdfIncludePhotos"'),'Keep optional evidence photos');
assert(radio.includes("get({source:'server'})"),'Shift report must not read stale cached Firestore result');
assert(radio.includes("limit(REPORT_LIMIT)"),'bounded full-day server query');
assert(radio.includes("if(rows.docs.length>=REPORT_LIMIT)throw Error"),'never silently truncate large shift reports');
assert(radio.includes('reportReady?reportEvents:events'),'report must not be replaced by 120 most-recent records');
assert(radio.includes('!reportReady||!reportVerified'),'block export until verified report loaded');
assert(radio.includes('if(!at||at<startMs||at>=endMs)return false'),'filter by Firebase timestamps, not potentially incorrect old shift labels');
assert(radio.includes("which==='AM'?'08:30:00':'19:01:00'"),'correct Vietnam shift boundaries');
assert(radio.includes("reportReady?reportEvents:events).find("),'photo preview must use selected report events');
assert(css.includes('.radioReportControl'),'date and shift must be visible in UI');
assert(radio.includes("const historyLimit=/iPad|iPhone|iPod/"),'iOS history should not preload 120 image blobs');
const a=radio.indexOf('function radioShiftAt('),b=radio.indexOf('function renderHistory(){',a);
assert(a>0&&b>a);
const boxes={
 radioReportDate:{value:'2026-11-05'},radioReportShift:{value:'AM'},
 radioReportLoad:{disabled:false},radioReportState:{textContent:''},
 radioHistoryDevice:{value:''},radioHistoryAction:{value:''},radioHistorySearch:{value:''}
};
let user='AD',online=true,connected=true,fromServer=false,events=[],actions=[],error=null;
const mockDoc=(id,shift,at)=>({id,data:()=>({id,shift,action:'ISSUE',deviceCode:'DH01',actorName:'A',at:{toMillis:()=>Date.parse(at)}})});
// Intentionally wrong historical shift labels: report must trust Firebase timestamp.
let docs=[mockDoc('morning','PM','2026-11-05T01:30:00Z'),mockDoc('night','AM','2026-11-05T12:01:00Z')];
const query={where(field,op,value){actions.push(['where',field,op,value.toISOString()]);return this},
 orderBy(field,direction){actions.push(['orderBy',field,direction]);return this},
 limit(n){actions.push(['limit',n]);return this},
 async get(options){fromServer=options?.source==='server';if(error)throw error;return {docs}}};
const c={
 Intl,Date,Math,Object,Number,String,console,navigator:{get onLine(){return online}},
 connected,REPORT_LIMIT:301,events,reportReady:false,reportLoading:false,reportEvents:[],
 reportDate:'',reportShift:'AM',reportToken:0,reportVerified:false,dateFilter:'all',
 $:id=>boxes[id]||null,S:v=>String(v??'').trim(),VN:'Asia/Ho_Chi_Minh',
 currentUser:()=>({uid:'admin',role:user}),isAdmin:u=>['AD','ADMIN'].includes(u.role),
 fs:()=>({collection:()=>query}),EVENTS:'sags_radio_events_v1',
 renderHistory(){},renderSummary(){},notify(msg,fail){actions.push(['notify',msg,fail])},
 errText:e=>String(e.message),ACTS:{ISSUE:'Nhận máy'},REASON_TEXT:{}
};
vm.createContext(c);
vm.runInContext(radio.slice(a,b)+'\nthis.load=loadShiftReport;this.filter=filteredHistory;this.clearReport=clearShiftReport;',c);
(async()=>{
 await c.load();
 assert(fromServer,'must query live Firebase');
 assert.equal(c.reportReady,true);assert.equal(c.reportVerified,true);
 assert.equal(c.filter().length,1);assert.equal(c.filter()[0].id,'morning');
 assert.deepEqual(actions.filter(x=>x[0]==='where').map(x=>[x[1],x[2],x[3]]),[
  ['at','>=','2026-11-05T01:30:00.000Z'],['at','<','2026-11-05T12:01:00.000Z']
 ]);
 assert(actions.some(x=>x[0]==='limit'&&x[1]===301));
 assert.match(boxes.radioReportState.textContent,/Ca sáng.*1 sự kiện/);
 c.clearReport();boxes.radioReportShift.value='PM';await c.load();
 assert.equal(c.filter()[0].id,'night','Night shift is selected by real time, ignoring old AM label');
 assert.deepEqual(actions.filter(x=>x[0]==='where').slice(-2).map(x=>[x[1],x[2],x[3]]),[
  ['at','>=','2026-11-05T12:01:00.000Z'],['at','<','2026-11-06T01:30:00.000Z']
 ]);
 c.clearReport();docs=Array.from({length:301},(_,i)=>mockDoc('r'+i,'PM','2026-11-05T12:30:00Z'));await c.load();
 assert.equal(c.reportReady,false,'300+ events must not create truncated report');
 assert.match(boxes.radioReportState.textContent,/trên 300 sự kiện/);
 c.clearReport();user='DH';docs=[mockDoc('x','AM','2026-11-05T02:00:00Z')];await c.load();
 assert.equal(c.reportReady,false,'staff must not fetch all users photograph evidence');
 console.log('Radio date+AM/PM report, VN timezone, server query, anti-truncation, authorization, and optional photos PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
