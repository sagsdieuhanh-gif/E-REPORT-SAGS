'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const radio=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
const style=fs.readFileSync('app/styles/radio-custody.v1.css','utf8');
for(const marker of [
 'id="radioAdminOverview"','id="radioAdminDashboard"','data-radio-go="summary"',
 'function renderAdminOverview(){','function radioShiftDeviceMatrix(rows){',
 "renderAdminOverview();","radioShiftDeviceMatrix(rows)",
 'Không tìm thấy sự kiện trong lịch sử đang hiển thị',
 'ảnh PNG dự phòng (có thể mờ'
])assert(radio.includes(marker),'Radio Admin/iOS enhancement missing: '+marker);
for(const marker of ['.radioAdminOverview','.radioAdminColumns','.radioAdminMatrix','@media(max-width:680px)'])
 assert(style.includes(marker),'Radio dashboard responsive style missing: '+marker);
assert(radio.includes('if(!photosReady())throw Error'),'Camera proof still required before save');
assert(radio.includes('await writeRadioTransaction()'),'Firestore atomic saving must remain intact');
assert(radio.includes('at:fv()'),'Authoritative server time must remain intact');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const a=radio.indexOf('function radioShiftDeviceMatrix(rows){');
const b=radio.indexOf('function renderSummary(){',a);
assert(a>=0&&b>a);
const scope={Map,ACTS:{ISSUE:'Nhận máy',RETURN:'Trả máy',REPORT:'Báo lỗi'},S:x=>String(x??'').trim(),esc:safe,label:x=>x};
vm.createContext(scope);
vm.runInContext(radio.slice(a,b)+'\nthis.matrix=radioShiftDeviceMatrix;',scope);
const matrix=scope.matrix([
 {deviceCode:'DH01',action:'ISSUE',actorName:'Người nhận'},
 {deviceCode:'DH01',action:'RETURN',actorName:'Người trả'},
 {deviceCode:'DH02',action:'REPORT',actorName:'Người báo lỗi'},
]);
assert.match(matrix,/Đối soát theo từng máy trong ca/);
assert.match(matrix,/Người nhận|Người trả/);
assert.match(matrix,/DH02/);
assert(!matrix.includes('<script>'),'Names must be escaped');
const x=radio.indexOf('function renderAdminOverview(){'),y=radio.indexOf('function render(){',x);
assert(x>=0&&y>x);
const dashboard={innerHTML:'',replaceChildren(){this.innerHTML='';}};
const panel={hidden:true};
const boxes={radioAdminOverview:panel,radioAdminDashboard:dashboard};
const t=Date.now();
const ctx={Date,Number,Map,Math,devices:[
 {code:'DH01',status:'OUT',holderName:'Hòa',shift:'AM',updatedAt:{toMillis:()=>t-13*3600000,toDate:()=>new Date(t-13*3600000)}},
 {code:'DH02',status:'FAULT',faultCode:'MIC'},
 {code:'DH03',status:'READY'}
],currentUser:()=>({role:'AD'}),isAdmin:u=>u.role==='AD',$:id=>boxes[id],OVERDUE_MS:12*3600000,
 fmt:()=> '09:00',label:x=>x,esc:safe,STATUSES:{FAULT:'Ngừng cấp / lỗi'},REASON_TEXT:{MIC:'Micro không phát tiếng'}};
vm.createContext(ctx);
vm.runInContext(radio.slice(x,y)+'\nthis.renderMonitor=renderAdminOverview;',ctx);
ctx.renderMonitor();
assert.equal(panel.hidden,false);
assert.match(dashboard.innerHTML,/Hòa/);
assert.match(dashboard.innerHTML,/Cần kiểm tra 12h/);
assert.match(dashboard.innerHTML,/Micro không phát tiếng/);
ctx.currentUser=()=>({role:'DH'});
ctx.renderMonitor();
assert.equal(panel.hidden,true,'Employee cannot see Admin monitoring');
console.log('Radio administrator monitor/shift matrix and iOS proof feedback PASS');
