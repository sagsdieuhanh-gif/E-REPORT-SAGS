'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const css=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
for(const needle of [
 'id="radioOverdueAlert"','id="radioOnlyUnreturned"',
 "pendingToggle.hidden=!administrator","if(!isAdmin(currentUser()))return;",
 "radioOnlyUnreturned=!radioOnlyUnreturned","radioOnlyUnreturned=true;adminAllDevices=false;tab('devices');render()",
 "liveHolds.map(x=>devices.find(d=>d.code===x.deviceCode)).filter(Boolean)",
 "if(d.status==='OUT'&&(mine||administrator&&(allDevices||active)))",
 "if(!radioLiveClock)radioLiveClock=setInterval(",
 "if(radioLiveClock){clearInterval(radioLiveClock);radioLiveClock=null}",
 'function radioStaffStatistics(rows,cutoffMs)',"radioStaffStatisticsHtml(rows)",
 'function radioPdfStaffPageCount(rows,cutoffMs)','function radioPdfStaffPages(rows,scope,cutoffMs,firstPage,totalPages)',
 "overview.count+staffPages+summaryPages+i+j+1",
 "i+(overview?.count||0)+staffPages+1",
 "for(const page of radioPdfStaffPages(rows,scope,cutoffMs,overview.count+1,allPages))"
])assert(s.includes(needle),'Radio realtime/staff requirement missing: '+needle);
assert(css.includes('.radioLiveOverdueList')&&css.includes('.radioStaffReport')&&css.includes('#radioOnlyUnreturned[aria-pressed="true"]'));
const time=s.slice(s.indexOf('function radioShiftAt('),s.indexOf('function shift(){'));
const algorithm=s.slice(s.indexOf('function radioReconcileCustody('),s.indexOf('function radioOutstandingSummaryHtml('));
const liveUI=s.slice(s.indexOf('function renderOverdueAlert('),s.indexOf('function render(){'));
const staffPDF=s.slice(s.indexOf('function radioPdfStaffPageCount('),s.indexOf('function radioPdfOverviewPages('));
assert(time.includes('function shiftBounds')&&algorithm.includes('function radioStaffStatistics'));
const datekey=date=>{
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
};
const events=[],status={};
const canvasText=[];
const canvas=()=>({width:0,height:0,getContext:()=>({
 fillRect(){},fillText(value){canvasText.push(String(value))},measureText:x=>({width:String(x).length*10})})});
const ctx={
 Date,Number,Math,Map,Set,Array,Intl,Promise,document:{hidden:false,createElement:canvas},
 currentUser:()=>({role:'AD',name:'ADMIN'}),isAdmin:u=>u.role==='AD',canMonitor:u=>u.role==='AD',
 VN:'Asia/Ho_Chi_Minh',vnDateKey:datekey,S:x=>String(x??'').trim(),fmt:d=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(d),
 esc:x=>String(x??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),
 label:code=>code,radioHeldSince:d=>d.heldSince||d.updatedAt,
 connected:true,navigator:{onLine:true},devices:[],
 reportReady:true,reportMode:'RANGE',reportFrom:'2026-11-23',reportTo:'2026-11-24',
 reportDate:'',reportShift:'AM',reportAsOfMs:Date.parse('2026-11-25T08:30:00+07:00'),
 $:id=>status[id]||(status[id]={hidden:false,innerHTML:'',replaceChildren(){this.innerHTML=''}})
};
vm.createContext(ctx);
vm.runInContext(time+algorithm+liveUI+staffPDF+'\nthis.staffStats=radioStaffStatistics;this.staffHTML=radioStaffStatisticsHtml;this.pdfStaff=radioPdfStaffPages;this.pageCount=radioPdfStaffPageCount;this.liveList=radioLiveCustody;this.overdueUI=renderOverdueAlert;',ctx);
const at=str=>Date.parse(str);
const e=(id,action,device,dt,holder,extra={})=>({id,action,deviceCode:device,
 actorUid:holder,actorName:holder,personUid:holder,personName:holder,
 deviceVersion:1,at:{toMillis:()=>at(dt),toDate:()=>new Date(at(dt))},...extra});
const rows=[
 e('a1','ISSUE','DH01','2026-11-23T08:35:00+07:00','A'),
 e('a2','RETURN','DH01','2026-11-23T12:00:00+07:00','ADMIN',{personUid:'A',personName:'A'}),
 e('b1','ISSUE','DH02','2026-11-23T09:00:00+07:00','B'),
 e('b2','RETURN','DH02','2026-11-23T20:00:00+07:00','B'),
 e('c1','ISSUE','DH03','2026-11-23T18:55:00+07:00','C'),
 e('c2','SWAP_OUT','DH03','2026-11-23T18:56:00+07:00','C'),
 e('c3','SWAP_IN','DH04','2026-11-23T18:57:00+07:00','C'),
 e('d1','ISSUE','DH05','2026-11-24T19:02:00+07:00','D')
];
const cutoff=at('2026-11-24T22:00:00+07:00');
const result=ctx.staffStats(rows,cutoff);
const members=Object.fromEntries(result.staff.map(x=>[x.uid,JSON.parse(JSON.stringify(x))]));
assert.equal(members.A.received,1);assert.equal(members.A.returnedOnTime,1);assert.equal(members.A.returnedLate,0);
assert.equal(members.B.received,1);assert.equal(members.B.returnedLate,1);
assert.equal(members.C.received,2);assert.equal(members.C.returnedOnTime,1);assert.equal(members.C.unreturned,1);assert.equal(members.C.overdue,1);
assert.equal(members.D.received,1);assert.equal(members.D.unreturned,1);assert.equal(members.D.overdue,0);
assert.equal(result.unmatchedReturns,0);
assert.equal(result.duplicateReceipts,0);
const html=ctx.staffHTML(rows);
assert(html.includes('Thống kê theo nhân viên'));
assert(html.includes('Trả đúng ca')&&html.includes('Chưa trả tại mốc chốt'));
assert.equal(ctx.pageCount(rows,cutoff),1);
const pages=ctx.pdfStaff(rows,'23/11 – 24/11',cutoff,2,7);
assert.equal(pages.length,1);assert(canvasText.some(t=>t.includes('THỐNG KÊ NHẬN / TRẢ')));
assert(canvasText.includes('2/7')||canvasText.some(t=>t.includes('Trang 2/7')));
const before=at('2026-11-24T20:00:00+07:00');
const devices=[
 {code:'DH10',status:'OUT',holderUid:'E',holderName:'E',heldSince:{toMillis:()=>at('2026-11-23T09:00:00+07:00')}},
 {code:'DH11',status:'OUT',holderUid:'F',holderName:'F',heldSince:{toMillis:()=>at('2026-11-24T19:20:00+07:00')}},
 {code:'DH12',status:'READY',holderUid:'',holderName:''}
];
ctx.devices=devices;
const current=ctx.liveList(devices,before);
assert.equal(current.length,2);assert.equal(current[0].deviceCode,'DH10');
assert.equal(current[0].overdue,true);assert.equal(current[1].overdue,false);
ctx.overdueUI(before);
assert(status.radioOverdueAlert.innerHTML.includes('1 máy đã quá ca chưa trả'));
assert(status.radioOverdueAlert.innerHTML.includes('DH10'));
assert(!status.radioOverdueAlert.innerHTML.includes('DH12'));
ctx.connected=false;ctx.overdueUI(before);
assert(status.radioOverdueAlert.innerHTML.includes('Chưa xác minh trạng thái'),'Offline data must not masquerade as verified');
ctx.connected=true;ctx.currentUser=()=>({role:'CBTT',name:'STAFF'});ctx.overdueUI(before);
assert.equal(status.radioOverdueAlert.hidden,true,'Admin-only monitoring never leaked to staff');
console.log('Radio realtime oversight/staff statistics PASS: minute clock, AD-only filter, actual holder, swap, AD return, late vs on-time, PDF staff pages and offline guard');
