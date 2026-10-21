'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'app/modules/carrier-notebook.v1.js'),'utf8');
assert.match(src,/function parseQuickWorkbook\(/);
assert.match(src,/function renderQuick\(/);
assert.match(src,/function ensureQuickStyle\(/);
const exposed=src.replace(/\}\)\(window\);\s*$/, 'window.__test={parseQuickWorkbook,parseRows,renderQuick,notesPresent,setDb(v){db=v}};\n})(window);');
assert.notEqual(exposed,src,'cannot expose helper functions for test');
const sandbox={window:{},document:{readyState:'loading',addEventListener(){}},console,Date};
vm.runInNewContext(exposed,sandbox,{filename:'carrier-notebook.v1.js'});
const h=sandbox.window.__test;
const base=JSON.parse(fs.readFileSync(path.join(root,'data/carrier-service-guide.json'),'utf8'));
assert.equal(base.carriers.length,28,'quick-view seed must include 28 carriers');
const byCode=code=>base.carriers.find(c=>c.carrier===code);
assert.equal(byCode('VJ').services.loadSign,'COOR');
assert.equal(byCode('KC').services.engineer,'VIETSTAR');
assert.ok(byCode('KC').reviewNote,'disputed engineer must show a review note');
assert.equal(byCode('VZ').services.engineer,'','unverified engineer must remain blank');
h.setDb(base);
const headings=['MA_HANG','TEN_HANG','LOAI_TAU','PHAM_VI','DOOR','KY_TAI','DAI_DIEN','THO_MAY','XANG_DAU','SUAT_AN','LUU_Y_NGAN','GHI_CHU_NOI_BO'];
const book={Sheets:{
 HANG:{rows:[headings,['VJ','','','','MỞ / ĐÓNG','COOR','','VJ','PETROLIMEX','VINACS','Lưu ý mới',''],['XX','','','','','CBTT','','','','','','']]},
 LUU_Y:{rows:[['MA_HANG','NHOM','NOI_DUNG','MUC_DO','THU_TU'],['VJ','LOADING','Trọng tâm <kiểm tra>','QUAN_TRONG','1']]},
 BO_SUNG:{rows:[['MA_HANG','TEN_TRUONG','GIA_TRI','THU_TU'],['VJ','Kênh liên lạc','Kênh 1','1']]}
}};
const XLSX={utils:{sheet_to_json:s=>s.rows}};
const next=h.parseQuickWorkbook(book,XLSX,'test.xlsx');
assert.equal(next.carriers.length,29,'adding a new airline must not delete existing airlines');
assert.equal(next.carriers.find(c=>c.carrier==='XX').services.loadSign,'CBTT');
const vj=next.carriers.find(c=>c.carrier==='VJ'),old=byCode('VJ');
assert.deepEqual(JSON.parse(JSON.stringify(vj.sections)),JSON.parse(JSON.stringify(old.sections)),'legacy instructions must survive Excel imports');
assert.equal(vj.quickNotes[0].priority,'QUAN_TRONG');
assert.equal(vj.extraFields[0].value,'Kênh 1');
assert.match(h.renderQuick(vj),/&lt;kiểm tra&gt;/,'note must be HTML escaped');
assert.match(h.renderQuick(vj),/KÝ TẢI/);
assert.match(h.renderQuick(vj),/PETROLIMEX/);
assert.equal(h.notesPresent(vj),true);
const c2={Sheets:{HANG:{rows:[headings,['VJ','','','','','','','','-','','-','']]}}};
const edited=h.parseQuickWorkbook(c2,XLSX,'clear.xlsx');
assert.equal(edited.carriers.find(c=>c.carrier==='VJ').services.fuel,'','dash explicitly clears a field');
assert.equal(edited.carriers.find(c=>c.carrier==='VJ').services.engineer,'VJ','blank preserves existing values');
assert.throws(()=>h.parseQuickWorkbook({Sheets:{HANG:{rows:[headings,['VJ'],['VJ']]}}},XLSX,'dup.xlsx'),/Trùng MA_HANG/);
assert.throws(()=>h.parseQuickWorkbook({Sheets:{HANG:{rows:[headings,['VJ']]},LUU_Y:{rows:[['MA_HANG','NHOM','NOI_DUNG','MUC_DO'],['YY','CHUNG','test','QUAN_TRONG']]}}},XLSX,'unknown.xlsx'),/chưa có/);
console.log('PASS carrier quick-view seed, import preservation, extensions, clearing, validation and escaping');
