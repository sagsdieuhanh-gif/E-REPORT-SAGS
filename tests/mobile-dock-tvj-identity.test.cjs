const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync(__dirname+'/../app/styles/new-ui-v1.css','utf8'),js=fs.readFileSync(__dirname+'/../app/modules/mobile-form-dock.v2.js','utf8'),core=fs.readFileSync(__dirname+'/../app/generated/core-flight.js','utf8'),reg=JSON.parse(fs.readFileSync(__dirname+'/../forms/forms.registry.json','utf8'));
assert.match(css,/CANONICAL MOBILE FORM DOCK/);assert.match(css,/grid-template-rows:44px 44px!important/);assert.match(js,/"bottom":"0"/);
const tvj=reg.forms.find(x=>x.id==='tvj_gof_035'),name=tvj.fields.find(x=>String(x.key).toUpperCase()==='NAME');assert.equal(name.type,'text');assert.equal(name.bind,'acuStart_copy');
assert.match(core,/423\|421\|TVJGOF035\|FSAGS\|GRND_COR/);assert.match(core,/\["bbbt","fsags","fsags421","fsags551","tvjgof035"\]/);
console.log('Mobile dock + TVJ identity: canonical two rows, text name binding and form identity preserved');
