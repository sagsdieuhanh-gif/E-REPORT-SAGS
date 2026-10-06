const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const roster=fs.readFileSync(path.join(root,'app/modules/daily-roster.v502.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app/styles/new-ui-v1.css'),'utf8');
const aviation=fs.readFileSync(path.join(root,'app/modules/aviation-reference.v1.js'),'utf8');

const start=roster.indexOf('function session(){try{return root.__sagsGetSession');
const end=roster.indexOf('function opDate()',start);
assert(start>=0&&end>start,'scope helpers not found');
let state={role:'DH',profile:{username:'u',positionCode:'NHAN_VIEN',jobTitle:'Nhân viên'}};
const ctx={root:{__sagsGetSession:()=>state,currentRole:'DH',currentUserProfile:state.profile},U:v=>String(v??'').trim().toUpperCase(),norm:v=>String(v??'').trim().toUpperCase()};
vm.createContext(ctx);vm.runInContext(roster.slice(start,end),ctx);
const can=(role,positionCode,jobTitle,extra={})=>{state={role,profile:{username:'u',role,positionCode,jobTitle,...extra}};return ctx.allFlightScope();};
assert.equal(can('DH','NHAN_VIEN','Nhân viên'),false);
assert.equal(can('AD','QUAN_TRI_HE_THONG','Quản trị hệ thống'),true);
assert.equal(can('KH','NHAN_VIEN','Nhân viên'),true);
for(const [code,title] of [['CA_TRUONG','Ca trưởng'],['CA_PHO','Ca phó'],['DOI_TRUONG','Đội trưởng'],['DOI_PHO','Đội phó'],['TRUONG_PHONG','Trưởng phòng'],['PHO_PHONG','Phó phòng']]) assert.equal(can('DH',code,title),true,code+' must see all flights');

assert.match(roster,/readOverview=async function\(date,opts=\{\}\)/);
assert(roster.includes("allFlights?(await db(`roster_manifests/${safe(date)}`).once('value'))"),'all-flight overview must read full manifest');
assert.match(aviation,/api\.readOverview\(date,\{allFlights\}\)/);
assert.match(aviation,/api\.allFlightScope\?\.\(\)/);
assert.match(aviation,/itemWorkingAny/);
assert.doesNotMatch(aviation,/images\.kiwi\.com/,'airline logos must never depend on an external CDN');
assert.match(aviation,/opsFwcBrand/,'MY FLIGHT cards must carry airline identity');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
assert.match(sw,/\.\/assets\/airlines\/VJ\.png/,'local airline logos must be precached');

assert.match(roster,/configuredFormLabel\('fsags54'/);
assert.match(roster,/configuredFormLabel\('fsags94'/);
assert.doesNotMatch(roster,/label:'F-54'/);
assert.doesNotMatch(roster,/label:'F-94'/);
assert.match(roster,/&nbsp;\|&#xA0;\|&#160;/);

assert.match(css,/V6\.4\.102 · SUPERVISOR ALL-FLIGHT HOME \+ AD CONTRAST HARDENING/);
assert.match(css,/#dailyRosterModal #drManage th/);
assert.match(css,/#v181AdminCenter \.v181AdminHead button/);
assert.match(css,/#v644MyFlightBack/);

console.log('V6.4.102 supervisor visibility, dynamic form labels and AD contrast checks passed');
