const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto').webcrypto;
const root=path.resolve(__dirname,'..'),scope='https://test.local/',stores=new Map(),listeners={};let offline=false,corrupt='',claimCalls=0,skipCalls=0;
const cache=name=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {match:async k=>m.get(String(k))?.clone(),put:async(k,v)=>m.set(String(k),v.clone()),delete:async k=>m.delete(String(k))}};
const data={localStorage:'LOCAL DRAFT',indexedDB:'IDB DRAFT',queue:'PENDING'};const before=JSON.stringify(data);
const self={registration:{scope},location:{origin:'https://test.local',href:scope},addEventListener:(n,fn)=>listeners[n]=fn,clients:{claim:async()=>claimCalls++,matchAll:async()=>[{id:'old'},{id:'new'}],get:async()=>({postMessage(){}})},skipWaiting:async()=>skipCalls++};
const c={self,console,URL,Response,crypto,caches:{open:async n=>cache(n),keys:async()=>[...stores.keys()],delete:async n=>stores.delete(n)},localStorage:new Proxy({}, {get(){throw Error('SW touched local drafts')}}),indexedDB:new Proxy({}, {get(){throw Error('SW touched draft DB')}}),fetch:async req=>{if(offline)throw Error('offline');const u=new URL(typeof req==='string'?req:req.url),p='.'+u.pathname;const b=fs.readFileSync(path.join(root,p));return new Response(p===corrupt?Buffer.from('BAD BYTES'):b)}};
vm.createContext(c);const source=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');vm.runInContext(source+'\nthis.currentName=CACHE_NAME;this.metaName=META_CACHE_NAME;',c);
async function event(name,data={}){let wait;listeners[name]({...data,waitUntil:p=>wait=p});if(wait)await wait;return wait}
async function fetchPage(url,mode='navigate'){let response;const pending=[];listeners.fetch({request:{method:'GET',url,mode},clientId:'new',respondWith:p=>response=p,waitUntil:p=>pending.push(p)});const out=await response;await Promise.all(pending);return out}
(async()=>{
 await event('install');assert(stores.has(c.currentName));assert.equal(skipCalls,0);await event('activate');assert.equal(claimCalls,0);
 const current=await fetchPage(scope);assert.match(await current.text(),/sags-release-build/);
 const oldName='sags-app-shell-prior-release';await cache(oldName).put(scope+'index.html',new Response('OLD TAB PINNED'));
 const oldListeners={},oldContext={...c,self:{...self,addEventListener:(n,fn)=>oldListeners[n]=fn}};vm.createContext(oldContext);vm.runInContext(source.replace(/const CACHE_NAME='[^']+'/,"const CACHE_NAME='"+oldName+"'"),oldContext);
 let oldResponse;oldListeners.fetch({request:{method:'GET',url:scope,mode:'navigate'},respondWith:p=>oldResponse=p,waitUntil(){}});assert.equal(await(await oldResponse).text(),'OLD TAB PINNED');
 await event('message',{data:{type:'SKIP_WAITING'},ports:[]});assert.equal(skipCalls,1);assert.equal(claimCalls,0);
 offline=true;assert.match(await(await fetchPage(scope)).text(),/sags-release-build/);assert.equal((await fetchPage(scope+'app/modules/cloud-draft-sync.v2.js','cors')).status,200);
 offline=false;stores.delete(c.currentName);stores.delete(c.metaName);corrupt='./app/styles/aviation-reference.v1.css';await assert.rejects(event('install'),/mismatch/);assert(stores.has(oldName));assert(!stores.has(c.currentName));assert.equal(await(await cache(oldName).match(scope+'index.html')).text(),'OLD TAB PINNED','failed candidate rolls back to prior cache');
 corrupt='';await event('install');const cleanup=await c.safeCleanupOldReleaseCaches();assert.equal(cleanup.skipped,true);assert(stores.has(oldName),'existing old tab prevents release cache deletion');
 assert.equal(JSON.stringify(data),before);console.log('PWA lifecycle: fresh install, deliberate activation, old/new tab pinning, offline, checksum failure/rollback, multi-tab cleanup and draft isolation PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
