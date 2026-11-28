'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const p=fs.readFileSync('app/modules/admin-account-grant.v111.js','utf8');
const bootstrap=fs.readFileSync('app/boot/13-v485FeaturePermissions.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const h=fs.readFileSync('app/boot/14-v18CanonicalAccountHierarchy.js','utf8');
const list=fs.readFileSync('app/boot/15-v116-account-name-search.js','utf8');
new Function(p);new Function(h);
assert(bootstrap.includes('window.sagsV485StartPermissionSignal=v485StartPermissionSignal'),'Login runtime must export permission signal trigger');
assert(html.includes('sags-admin-grant-lazy-v111'),'Grant editor must lazy-load on demand');
assert(html.includes('app/modules/admin-account-grant.v111.js'),'Lazy loading path must exist');
assert(h.includes('＋ THÊM / SỬA QUYỀN</button>'),'ADMIN must see add-permissions control');
assert(list.includes('firebase.firestore().collection("users").get()'),'account manager uses canonical Firebase users/{UID}');
assert(list.includes('arr.push({id:doc.id,uid:doc.id,...d'),'row actions use the Firebase Auth UID');
assert(!list.includes('HANDOVER_COLLECTION'),'legacy account records must not be used');
assert(p.includes('get({source:"server"})'),'permission editor verifies account on server');
assert(p.includes('await store.runTransaction(async tx=>'),'grant must update atomically relative to role change');
assert(p.includes('if(role!==expectedRole)throw Error'),'concurrent role change must stop grants');
assert(p.includes('permissionLastChangeV485'),'grant must retain audit metadata');
assert(p.includes('if(role==="RADIO_MANAGER")throw Error'),'radio-only accounts must not gain flight features');
assert(p.includes('if(role==="AD")throw Error'),'never grant extra AD privilege');
assert(p.includes('onSnapshot(snap=>'),'users must receive live Firestore permission updates');
assert(bootstrap.includes('SAGSAdminAccountGrantV111?.ensureListener()'),'listener must initialize as part of role UI after login');
assert(html.includes('onAuthStateChanged(function(user)'),'listeners must start after login');
assert(p.includes('permissionRevV485:rev'),'permissions must carry new revision');
assert(p.includes('if(JSON.stringify(clean(stored))!==JSON.stringify(clean(overrides))'),'grant must verify persisted values');
const startOpen=p.indexOf('async function v485OpenPermissionEditor(id){');
const endOpen=p.indexOf('window.v485OpenPermissionEditor=v485OpenPermissionEditor;',startOpen);
const startSave=p.indexOf('async function v485SavePermissionEditor(){');
const endSave=p.indexOf('window.v485SavePermissionEditor=v485SavePermissionEditor;',startSave);
assert(startOpen>=0&&endOpen>startOpen&&startSave>=0&&endSave>startSave,'grant/open functions must be present');
const openFn=p.slice(startOpen,endOpen);
const saveFn=p.slice(startSave,endSave).replace('setTimeout(()=>{v485PermEditing=null;root.v485ClosePermissionEditor?.()},1300);','setTimeout(()=>{},1300);');
const doc={role:'DH',active:true,deleted:false,username:'KIENNT',name:'KIEN',permissionRevV485:1,featureOverridesV485:{},updatedAtMs:1};
const actor={role:'ADMIN',active:true,deleted:false,username:'AD'};
let updates=[],rtSignals=[],txReads=0,verifiedReads=0;
const targetRef={get:async arg=>{assert.equal(arg.source,'server');verifiedReads++;return {exists:true,data:()=>structuredClone(doc)};}};
const actorRef={get:async arg=>{assert.equal(arg.source,'server');return {exists:true,data:()=>structuredClone(actor)};}};
const store={
 collection(name){assert.equal(name,'users');return{doc(id){assert(['uid-a','admin-uid'].includes(id));return id==='admin-uid'?actorRef:targetRef}}},
 runTransaction:async fn=>fn({
  get:async ref=>{assert.equal(ref,targetRef);txReads++;return{exists:true,data:()=>structuredClone(doc)}},
  update:(ref,patch)=>{assert.equal(ref,targetRef);updates.push(patch);Object.assign(doc,patch);}
 })
};
const firebase={auth:()=>({currentUser:{uid:'admin-uid',getIdToken:async force=>{assert.equal(force,true)}}}),firestore:()=>store};
const selectors={'v485PermStatus':{textContent:''},'v485FeaturePermissionModal':{style:{display:'none'},setAttribute:()=>{}},
 'v485PermSub':{innerHTML:''},'v485PermGrid':{innerHTML:''}};
const btn={disabled:false,textContent:'LƯU QUYỀN'};
const features=['FLIGHTS','FSAGS421','FSAGS423','FINAL'],base={FLIGHTS:true,FSAGS421:true,FSAGS423:true,FINAL:false};
const choices=features.map(k=>({dataset:{v485Feature:k},checked:k==='FINAL'||base[k],disabled:false}));
const document={getElementById:k=>selectors[k],querySelector:()=>btn,querySelectorAll:()=>choices};
let lastAlert='',refreshCount=0;
const env={
 currentRole:'AD',firebase,document,console,Date,JSON,Object,String,Math,
 v485RoleDefaults:()=>({...base}),
 v485Effective:()=>({...base}),
 v485Overrides:d=>d?.featureOverridesV485||{},
 normalizeFirebaseOperationalRole:x=>x==='ADMIN'?'AD':x,
 escapeHtml:x=>String(x),v484DepartmentLabel:()=>'',v484InferSystemDepartment:()=>'',v484RoleLabel:x=>x,
 SAGS_FEATURES_V485:Object.fromEntries(features.map(x=>[x,{label:x,note:x}])),
 V485_FEATURE_KEYS:features,normalizePersonalUsername:x=>x,
 currentActor:()=>({username:'AD',role:'AD'}),
 refreshAccountManager:async()=>{refreshCount++},
 sagsV470Safe:x=>x,sagsV470Ref:path=>({set:async data=>{rtSignals.push({path,data})}}),
 setTimeout:()=>{},alert:x=>{lastAlert=String(x)},
 roleDenied:()=>{throw Error('role-denied')}
};
const inst=new Function(...Object.keys(env),
 'let v485PermEditing=null,v485PermRole="",v485PermDefaults={};'+openFn+';'+saveFn+
 ';return {open:v485OpenPermissionEditor,save:v485SavePermissionEditor,editing:()=>v485PermEditing};')(...Object.values(env));
(async()=>{
 await inst.open('uid-a');
 assert.equal(inst.editing().id,'uid-a');
 assert(selectors.v485PermGrid.innerHTML.includes('FINAL'),'grant grid must show feature');
 await inst.save();
 assert.equal(updates.length,1);
 assert.equal(doc.featureOverridesV485.FINAL,true);
 assert(doc.permissionRevV485>1);
 assert.equal(doc.permissionLastChangeV485.byUid,'admin-uid');
 assert.deepEqual(Array.from(doc.permissionLastChangeV485.changedKeys),['FINAL']);
 assert.equal(txReads,1);assert(verifiedReads>=2);
 assert.equal(rtSignals.length,1);
 assert.equal(rtSignals[0].path,'account_permissions/KIENNT');
 assert.equal(refreshCount,1);
 assert(selectors.v485PermStatus.textContent.includes('THÀNH CÔNG'));
 assert.equal(btn.disabled,false);
 doc.role='CBTT';
 await inst.save();
 assert.equal(updates.length,1,'must not write if role changed since editor open');
 assert(selectors.v485PermStatus.textContent.includes('Vai trò đã thay đổi'));
 doc.role='RADIO_MANAGER';
 await inst.open('uid-a');
 assert(lastAlert.includes('Quản lý bộ đàm'),'special role guard failed');
 console.log('ADMIN add-account-permissions V1.11: UID verified, atomic save, role conflict, radio isolation PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
