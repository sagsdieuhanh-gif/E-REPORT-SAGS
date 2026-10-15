const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn');
const source=fs.readFileSync('app/modules/business-text.v1.js','utf8');
const dialogs=[];
const events={},c={alert:(...args)=>dialogs.push(args),confirm:(...args)=>{dialogs.push(args);return false},prompt:(...args)=>{dialogs.push(args);return 'CaseSensitiveReturn'},document:{addEventListener:(n,fn)=>(events[n]??=[]).push(fn)},Event:class{constructor(type,options){this.type=type;Object.assign(this,options)}}};c.window=c;vm.createContext(c);vm.runInContext(source,c);
c.alert('Nội dung thông báo');assert.equal(dialogs[0][0],'NỘI DUNG THÔNG BÁO');assert.equal(c.confirm('Xác nhận lưu?'),false);assert.equal(c.prompt('Nhập nội dung','CaseSensitiveDefault'),'CaseSensitiveReturn');assert.equal(dialogs[2][1],'CaseSensitiveDefault');
const api=c.SAGSBusinessText,registry=JSON.parse(fs.readFileSync('forms/forms.registry.json','utf8'));
const opaque=new Set(registry.forms.flatMap(f=>f.fields).filter(f=>['signature','image'].includes(String(f.sourceType||f.type).toLowerCase())).map(f=>f.bind||f.key));
api.register(registry.forms.flatMap(f=>f.fields));
let count=0;
for(const form of registry.forms){
 api.register(form.fields);
 const state={};for(const f of form.fields)state[f.bind||f.key]=(opaque.has(f.bind||f.key)||['signature','checkbox','check','displaycheck'].includes(String(f.sourceType||f.type).toLowerCase()))?'data:image/png;base64/aBcD':'Nguyễn Trung Kiên\nghi chú bx787 / cxr';
 api.normalizeState(state,form.fields);
 for(const f of form.fields){const k=f.bind||f.key,t=String(f.sourceType||f.type).toLowerCase();if(opaque.has(k)||['signature','checkbox','check','displaycheck'].includes(t))assert.equal(state[k],'data:image/png;base64/aBcD',k);else{assert.equal(state[k],'NGUYỄN TRUNG KIÊN\nGHI CHÚ BX787 / CXR',k);count++;}}
}
assert.ok(count>800);
const fields=[{key:'name',type:'text'},{key:'notes',type:'textarea'},{key:'sig',type:'signature'},{key:'flag',type:'check'},{key:'count',type:'number'}];
const address='https://example.com/aBcD?q=Case',image='data:image/png;base64,aBcDeF==',nested={sessionId:'MixedCase'};
const state={name:'Nguyễn Trung Kiên',notes:'abß\nđã phục vụ',sig:image,flag:true,count:123,flightSessionId:'CaseSensitiveId',photo:[image],metadata:nested};
api.normalizeState(state,fields);assert.equal(state.name,'NGUYỄN TRUNG KIÊN');assert.equal(state.notes,'ABSS\nĐÃ PHỤC VỤ');assert.equal(state.sig,image);assert.equal(state.flag,true);assert.equal(state.count,123);assert.equal(state.flightSessionId,'CaseSensitiveId');assert.equal(state.metadata,nested);
for(const v of [address,image,'blob:MixedCase','Someone@Example.com',null,undefined,123,false])assert.equal(api.upper(v),v);
assert.equal(api.draft('flag','true'),'true');assert.equal(api.draft('notes','nháp tiếng Việt'),'NHÁP TIẾNG VIỆT');
// Exercise capture listeners before an inline draft consumer, including IME and
// expanded Unicode caret positions. No CSS-only casing can satisfy these checks.
function input(value,options={}){return {value,type:'text',tagName:'INPUT',id:'admFullName',name:'',autocomplete:'off',selectionStart:2,selectionEnd:2,selectionDirection:'none',matches:()=>true,closest:()=>null,setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b},dispatchEvent(e){for(const fn of events[e.type]||[])fn({...e,target:this});this.draft=this.value},...options};}
const el=input('aßcd');events.input[0]({target:el});assert.equal(el.value,'ASSCD');assert.equal(el.selectionStart,3);
const ime=input('đang gõ');events.compositionstart[0]({target:ime});events.input[0]({target:ime,isComposing:true});assert.equal(ime.value,'đang gõ');events.compositionend[0]({target:ime});assert.equal(ime.value,'ĐANG GÕ');assert.equal(ime.draft,'ĐANG GÕ');
for(const options of [{type:'password'},{type:'email'},{type:'url'},{type:'hidden'},{id:'personalLoginUser',autocomplete:'username'},{id:'configJson'},{id:'apiToken'},{id:'editAccountDocId'}]){const el=input('aBcD',options);events.input[0]({target:el});assert.equal(el.value,'aBcD',JSON.stringify(options));}
// Real canonical persist/draw entry points must normalize BEFORE their first
// storage/render operation, including a loaded lowercase record with no input event.
const legacy=fs.readFileSync('app/boot/05-legacy.js','utf8');const functions={};
function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&['persist','draw','shouldUppercaseManualField'].includes(n.id?.name))functions[n.id.name]=legacy.slice(n.start,n.end);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}walk(acorn.parse(legacy,{ecmaVersion:'latest'}));
c.fields=fields;c.state={name:'tên đã lưu',notes:'ghi chú cũ'};c.activeFlightSessionId='CaseSensitiveId';const stop=new Error('boundary reached');c.readFlightSessionEnvelope=()=>{throw stop};c.cancelPendingTouchHit=()=>{};c.getActiveFlightMainForm=()=>{throw stop};
for(const name of ['persist','draw']){vm.runInContext(functions[name],c);c.state.name='tên đã lưu';assert.throws(()=>c[name](),e=>e===stop);assert.equal(c.state.name,'TÊN ĐÃ LƯU');}
vm.runInContext(functions.shouldUppercaseManualField,c);assert.equal(c.shouldUppercaseManualField({type:'textarea'}),true);assert.equal(c.shouldUppercaseManualField({type:'signature'}),false);
// New policy is synchronously available before the first legacy render.
const index=fs.readFileSync('index.html','utf8');assert.ok(index.indexOf('business-text.v1.js')<index.indexOf('boot/05-legacy.js'));
console.log(`Business casing: ${count} textual fields across ${registry.forms.length} forms; Unicode/IME/caret, opaque data and actual persist/draw boundaries passed`);
