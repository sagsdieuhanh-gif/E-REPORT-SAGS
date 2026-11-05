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
assert(radio.includes("if(reportReady&&e.shift!==reportShift)return false"),'filter by stored AM/PM on signed event, not guessed clock');
assert(radio.includes("day+'T00:00:00+07:00'"),'VN local-day boundaries');
assert(radio.includes("reportReady?reportEvents:events).find("),'photo preview must use selected report events');
assert(css.includes('.radioReportControl'),'date and shift must be visible in UI');
assert(radio.includes("const historyLimit=/iPad|iPhone|iPod/"),'iOS history should not preload 120 image blobs');
const a=radio.indexOf('function vnDateKey('),b=radio.indexOf('function renderHistory(){',a);
assert(a>0&&b>a);
const boxes={
 radioReportDate:{value:'2026-11-05'},radioReportShift:{value:'AM'},
 radioReportLoad:{disabled:false},radioReportState:{textContent:''},
 radioHistoryDevice:{value:''},radioHistoryAction:{value:''},radioHistorySearch:{value:''}
};
let user='AD',online=true,connected=true,fromServer=false,events=[],actions=[],error=null;
const mockDoc=(id,shift)=>({id,data:()=>({id,shift,action:'ISSUE',deviceCode:'DH01',actorName:'A',at:{toMillis:()=>Date.parse('2026-11-05T01:00:00Z')}})});
let docs=[mockDoc('morning','AM'),mockDoc('night','PM')];
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
  ['at','>=','2026-11-04T17:00:00.000Z'],['at','<','2026-11-05T17:00:00.000Z']
 ]);
 assert(actions.some(x=>x[0]==='limit'&&x[1]===301));
 assert.match(boxes.radioReportState.textContent,/Ca sáng.*1 sự kiện/);
 c.clearReport();boxes.radioReportShift.value='PM';await c.load();
 assert.equal(c.filter()[0].id,'night','PM must only show saved PM shift events');
 c.clearReport();docs=Array.from({length:301},(_,i)=>mockDoc('r'+i,'PM'));await c.load();
 assert.equal(c.reportReady,false,'300+ events must not create truncated report');
 assert.match(boxes.radioReportState.textContent,/trên 300 sự kiện/);
 c.clearReport();user='DH';docs=[mockDoc('x','AM')];await c.load();
 assert.equal(c.reportReady,false,'staff must not fetch all users photograph evidence');
 console.log('Radio date+AM/PM report, VN timezone, server query, anti-truncation, authorization, and optional photos PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
