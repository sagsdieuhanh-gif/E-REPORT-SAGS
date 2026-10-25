'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sw=fs.readFileSync('service-worker.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const listeners={};let shellOpenCount=0,metaOpenCount=0,metaMatchCount=0;
const metaBody={build:sw.match(/const BUILD='([^']+)'/)[1],assets:{}};
const shellCache={match:async()=>null};
const sandbox={
 URL,URLSearchParams,Date,Promise,Response,console,
 self:{registration:{scope:'https://example.test/'},location:{href:'https://example.test/service-worker.js',origin:'https://example.test'},addEventListener(name,cb){listeners[name]=cb}},
 caches:{
  async open(key){if(key.includes('app-shell')){shellOpenCount++;return shellCache}metaOpenCount++;return{match:async()=>{metaMatchCount++;return new Response(JSON.stringify(metaBody))}}},
  async keys(){return[]},async delete(){return true}
 },
 crypto:globalThis.crypto
};
vm.createContext(sandbox);vm.runInContext(sw,sandbox,{filename:'service-worker.js'});
(async()=>{
 const result=await vm.runInContext('Promise.all([sagsCurrentShellCache(),sagsCurrentShellCache(),sagsCurrentShellCache()])',sandbox);
 assert.ok(result.every(x=>x===shellCache),'Startup scripts must share one cache handle');
 assert.equal(shellOpenCount,1,'No repeated expensive CacheStorage.open per asset request');
 const manifests=await vm.runInContext('Promise.all([readManifest(),readManifest(),readManifest()])',sandbox);
 assert.ok(manifests.every(x=>x.build===metaBody.build));
 assert.equal(metaMatchCount,3,'Pinned metadata must be reread to detect deleted or damaged cache storage');
 assert.ok(metaOpenCount>=1);
 vm.runInContext('markBootstrapVerified({assets:{}})',sandbox);
 const fast=await vm.runInContext('ensureBootstrapVerified({assets:{}})',sandbox);
 assert.equal(fast,true);
 assert.equal(shellOpenCount,1,'A verified worker must not re-scan startup files on each query');
 assert.match(sw,/ensureBootstrapVerified\(m,\{force:true\}\);await self\.skipWaiting\(\)/,'Update activation must force full integrity verification');
 assert.match(sw,/const queue=SAGS_BOOTSTRAP\.slice\(\);let failure=null/,'Initial verification must keep bounded work queue');
 assert.match(sw,/if\(event\.data\?\.type==='SAGS_CHECK_ASSETS'\)event\.waitUntil\(verifyCurrentAssets/,'Explicit full asset check preserved');
 assert.match(html,/root\.addEventListener\('load',autoCheck,\{once:true\}\)/,'Start storage migration after login UI loads');
 assert.match(html,/requestIdleCallback\(run,\{timeout:2500\}\)/,'Storage migration must yield to user-visible work');
 assert.ok(!html.includes("void checkClients();\n})(window);"),'Storage compaction must not run while head parses');
 assert.match(html,/proto\.setItem=function\(key,value\)/,'Lossless quota-recovery hook must remain installed');
 assert.match(html,/const packedBefore=allowed\.test\(k\)/,'Encrypted/compressed draft overwrite guard preserved');
 console.log('PWA warm start: cache handle shared, live integrity metadata preserved, storage recovery deferred');
})().catch(e=>{console.error(e);process.exitCode=1});
