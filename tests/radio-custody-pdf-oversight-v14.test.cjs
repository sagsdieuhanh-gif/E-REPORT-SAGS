'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const code=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const css=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
for(const marker of [
 'function radioReconcileCustody(rows,cutoffMs)',
 "action==='ISSUE'||action==='SWAP_IN'",
 "action==='RETURN'||action==='SWAP_OUT'",
 "personUid:S(e.personUid||e.actorUid)",
 'function radioLiveCustody(list,nowMs=Date.now())',
 'function radioPdfOverviewPages(rows,scope,inventory,cutoffMs,detailPages=0,photoPages=0)',
 'radioOutstandingSummaryHtml(rows)',
 'const rows=reportEvents;',
 'const rows=canMonitor(currentUser())?reportEvents:filteredHistory();',
 'overview.pages.map(pdfStoredPage)',
 "overview.count+summaryPages+i+j+1"
])assert(code.includes(marker),'Missing reconciliation/PDF overview contract: '+marker);
assert(css.includes('.radioOutstandingBox')&&css.includes('.radioOutstandingCards'),'Mobile/PC exception section styles required');

const snip=code.slice(code.indexOf('function radioShiftAt('),code.indexOf('function shift(){'));
const alg=code.slice(code.indexOf('// Reconcile immutable custody events'),code.indexOf('function renderSummary(){'));
const pdf=code.slice(code.indexOf('function radioPdfOverviewPages('),code.indexOf('function pdfBuild('));
assert(snip.includes('function shiftBounds')&&alg.includes('function radioReconcileCustody')&&pdf.includes('function radioPdfOverviewPages'));
const vnday=date=>{
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
};
const calls=[];
const $=id=>({value:'',innerHTML:''});
const ctx={
 Date,Intl,Math,Number,Map,Set,Array,Promise,String,
 VN:'Asia/Ho_Chi_Minh',vnDateKey:vnday,S:x=>String(x??'').trim(),
 esc:x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 $,
 label:code=>code,fmt:d=>d.toISOString().slice(0,16),
 currentUser:()=>({role:'AD',name:'AD'}),reportReady:true,reportMode:'RANGE',reportFrom:'2026-11-21',reportTo:'2026-11-24',
 reportDate:'',reportShift:'AM',reportAsOfMs:Date.parse('2026-11-25T08:30:00+07:00'),
 radioHeldSince:d=>d.heldSince||d.updatedAt,
 devices:[],
 document:{createElement:()=>({width:0,height:0,getContext:()=>({
  fillRect(){},fillText(txt){calls.push(String(txt))},measureText:t=>({width:String(t).length*10})})})}
};
vm.createContext(ctx);
vm.runInContext(snip+alg+pdf+'\nthis.reconcile=radioReconcileCustody;this.live=radioLiveCustody;this.scopeCutoff=radioReportCutoffMs;this.overview=radioPdfOverviewPages;this.summaryHtml=radioOutstandingSummaryHtml;',ctx);
const at=(date)=>Date.parse(date);
const ev=(id,action,device,date,uid='U1',extra={})=>({
 id,action,deviceCode:device,actorUid:uid,actorName:uid,personUid:uid,personName:uid,
 deviceVersion:Number(id.replace(/\D/g,''))||1,
 at:{toMillis:()=>at(date),toDate:()=>new Date(at(date))},...extra
});
const cases=[
 ev('a1','ISSUE','DH01','2026-11-21T18:55:00+07:00','A'),
 ev('a2','RETURN','DH01','2026-11-21T19:15:00+07:00','ADMIN',{personUid:'A',personName:'A'}),
 ev('b1','ISSUE','DH02','2026-11-22T09:20:00+07:00','B'),
 ev('c1','ISSUE','DH03','2026-11-23T19:03:00+07:00','C'),
 ev('c2','SWAP_OUT','DH03','2026-11-24T07:20:00+07:00','C'),
 ev('c3','SWAP_IN','DH04','2026-11-24T07:21:00+07:00','C'),
 ev('z1','RETURN','DH05','2026-11-22T12:00:00+07:00','Z',{personUid:'OLD'}),
 ev('d1','ISSUE','DH06','2026-11-24T09:00:00+07:00','D'),
 ev('d2','RETURN','DH06','2026-11-24T10:00:00+07:00','D')
];
const cutoff=at('2026-11-24T12:00:00+07:00');
const outcome=ctx.reconcile(cases,cutoff);
assert.equal(outcome.outstanding.length,2,'Unreturned B and swapped-in C, not closed A, C on old machine or D');
assert.deepEqual([...outcome.outstanding].map(e=>e.personUid).sort(),['B','C']);
assert(outcome.outstanding.every(x=>x.overdue),'Both active cases must be overdue at noon 24 Nov');
assert.equal(outcome.late.length,1,'A returned late at 19:15; C returned old machine before night shift end');
assert.equal(outcome.late[0].personName,'A','AD signing on behalf must match holder not signing admin');
assert.equal(outcome.orphanReturns.length,1,'Return for a receipt before reporting range is not a new outstanding');
assert.equal(outcome.handoverGaps.length,0,'Legitimate swap must not be counted as duplicate');
const early=ctx.reconcile([cases[7]],at('2026-11-24T09:20:00+07:00'));
assert.equal(early.outstanding.length,1);assert.equal(early.outstanding[0].overdue,false,'Same-day morning receipt is not overdue before 19:01');
assert.equal(ctx.scopeCutoff(),at('2026-11-25T08:30:00+07:00'));
const liveDevices=[
 {code:'DH07',status:'OUT',holderUid:'L',holderName:'L',heldSince:{toMillis:()=>at('2026-11-21T09:00:00+07:00')}},
 {code:'DH06',status:'READY',holderUid:'',holderName:''}
];
ctx.devices=liveDevices;
assert.equal(ctx.live(liveDevices,at('2026-11-24T12:00:00+07:00')).length,1,'Current holder can have received before chosen range');
const html=ctx.summaryHtml(cases);
assert.match(html,/Đối soát chưa trả/);
assert.match(html,/Hiện đang giữ/);
assert.match(html,/A|B|C/);
assert(html.includes('DH07'),'List current holder from device state independently of event range');
assert(html.includes('trả sau mốc chốt'),'Do not imply historical missing return is still ongoing');

const allReports=Array.from({length:13},(_,i)=>ev('x'+i,'ISSUE','X'+i,'2026-11-23T10:00:00+07:00','Worker '+i));
const pages=ctx.overview(allReports,'2026-11-23 – 2026-11-24',liveDevices,cutoff,2,3);
assert(pages.count>=2,'Overflow must paginate unresolved receipts, not truncate at first 8');
assert.equal(pages.audit.outstanding.length,13);
assert(calls.some(x=>x.includes('ĐỐI SOÁT BỘ ĐÀM')),'First PDF page must be an executive reconciliation dashboard');
assert(calls.some(x=>x.includes('Còn 5 trường hợp')),'Cover must disclose overflow');
assert(calls.some(x=>x.includes('PHỤ LỤC')),'Overflow rows must be included on extra PDF pages');
assert(calls.some(x=>x.includes('Trang 1/')),'PDF cover needs page numbering');

const manager=code.slice(code.indexOf('async function exportPhotoPdf(){'),code.indexOf('function stopHistory(){'));
assert(manager.includes('const rows=reportEvents'),'Photo PDF must reconcile full server range not filtered history');
assert(manager.includes('const rows=canMonitor(currentUser())?reportEvents:filteredHistory()'),'Non-photo monitored PDF must use full verified range');
assert(manager.includes('radioPdfOverviewPages(rows,scope,devices,radioReportCutoffMs()'),'First page required for both PDF modes');
console.log('Radio custody oversight PASS: AD return, swap across midnight, overdue boundaries, orphan return, live holders, full-period PDF, overflow pages');
