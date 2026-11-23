'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=fs.readFileSync('app/modules/draft-sync-popup.v1.js','utf8');
const cloud=fs.readFileSync('app/modules/cloud-draft-sync.v2.js','utf8');
const loader=fs.readFileSync('app/modules/stability.v6.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
assert(loader.includes("draft-sync-popup.v1.js?v="),'popup must use pinned app-release build');
assert(loader.includes('load(cloud,()=>load(popup))'),'async loader must load alerts after cloud protection');
assert(sw.includes('"./app/modules/draft-sync-popup.v1.js"'),'PWA must cache the popup module offline');
const ids={},events={},timers=[];
const el=()=>({hidden:false,textContent:'',dataset:{},listeners:{},setAttribute(k,v){this[k]=v},addEventListener(k,fn){this.listeners[k]=fn},appendChild(){},innerHTML:''});
const doc={
 hidden:false,body:{appendChild(x){ids[x.id]=x}},head:{appendChild(x){ids[x.id]=x}},
 getElementById:id=>ids[id]||null,
 addEventListener(){},
 createElement:()=>el()
};
for(const id of ['sdsIcon','sdsTitle','sdsLead','sdsDetail','sdsClose'])ids[id]=el();
const ctx={
 window:{addEventListener(name,cb){events[name]=cb}},
 document:doc,Date,URL,
 setTimeout(fn,delay){timers.push({fn,delay});return timers.length},
 clearTimeout(){},
};
vm.createContext(ctx);
vm.runInContext(source,ctx);
const api=ctx.window.SAGSDraftSyncPopup;
assert(api&&typeof api.show==='function','popup API ready');
assert.equal(api.show('offline',{scope:'user|flight'}),true);
assert.equal(ids.sagsDraftSyncPopup.hidden,false);
assert.match(ids.sdsTitle.textContent,/MẤT KẾT NỐI/);
assert.match(ids.sdsDetail.textContent,/lưu nháp trên thiết bị/);
assert.equal(api.show('offline',{scope:'user|flight'}),false,'no repetitive alerts on duplicate events');
assert.equal(api.show('local-saved',{scope:'user|flight'}),true);
assert.match(ids.sdsTitle.textContent,/ĐÃ LƯU NHÁP/);
api.close();
assert.equal(api.show('local-saved',{scope:'user|flight'}),false,'no new modal for every offline input field');
assert.equal(api.show('reconnecting',{scope:'user|flight'}),true);
assert.match(ids.sdsTitle.textContent,/INTERNET TRỞ LẠI/);
assert.equal(api.show('syncing',{scope:'user|flight'}),true);
assert.match(ids.sdsLead.textContent,/bản nháp chưa đồng bộ/);
assert.equal(api.show('synced',{scope:'user|flight'}),true);
assert.match(ids.sdsDetail.textContent,/không phải xác nhận Hoàn tất/);
assert(timers.some(t=>t.delay===6500),'success auto dismissal must remain bounded');
assert.equal(api.show('failed',{scope:'user|flight'}),true);
assert.match(ids.sdsTitle.textContent,/CHƯA THỂ ĐỒNG BỘ/);
assert.equal(api.show('local-failed',{scope:'user|flight'}),true);
assert.match(ids.sdsDetail.textContent,/Không xóa cache/);
assert.equal(api.show('synced',{}),false,'never claim a cloud result without an account/flight context');
assert(cloud.includes("new CustomEvent('sags:draft-sync-notice'"),'status events must come from cloud sync');
assert(cloud.includes('pendingFor(context.account,true)'),'reconnect must strictly verify IndexedDB before reporting success');
assert(cloud.includes("notifyDraftState(remaining.length?'failed':'synced'"),'remaining queue must prohibit false success');
console.log('Large operator popup transitions, no-per-key alerts, pending-sync validation and PWA cache PASS');
