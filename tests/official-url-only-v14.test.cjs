'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const found=html.match(/<script id="sags-official-entry-guard">([\s\S]*?)<\/script>/);
assert(found,'Canonical origin guard must be in the first HTML head');
const script=found[1];
assert(html.indexOf('id="sags-official-entry-guard"')<html.indexOf('sags-storage-capacity-bootstrap'),'Guard must run before first normal application script');
assert(html.indexOf('id="sags-official-entry-guard"')<html.indexOf('firebase-app-compat.js'),'Guard must run before Firebase SDK loads');
const OFFICIAL='https://sagsdieuhanh-gif.github.io/E-REPORT-SAGS/';
function evaluate(url,{framed=false}={}){
 const parsed=new URL(url),redirects=[],doc={documentElement:{innerHTML:'ORIGINAL'}};
 const root={document:doc,location:{protocol:parsed.protocol,host:parsed.host,hostname:parsed.hostname,
  pathname:parsed.pathname,search:parsed.search,hash:parsed.hash,
  replace:target=>redirects.push(target)},stop(){root.stopped=true},stopped:false};
 root.self=root;root.top=framed?{}:root;
 vm.runInNewContext(script,{window:root},{timeout:2000});
 return {root,redirects,doc};
}
const normal=evaluate(OFFICIAL);
assert.equal(normal.redirects.length,0);assert.equal(normal.root.stopped,false);assert.equal(normal.doc.documentElement.innerHTML,'ORIGINAL');
const query=evaluate(OFFICIAL+'?update=1#my-flight');
assert.equal(query.redirects.length,0,'Official query/hash navigation remains compatible');
const installed=evaluate(OFFICIAL+'index.html?home=1#menu');
assert.deepEqual(installed.redirects,[OFFICIAL+'?home=1#menu'],'Old PWA index.html path must normalize to official home');
for(const input of [
 'http://sagsdieuhanh-gif.github.io/E-REPORT-SAGS/',
 'https://sagsdieuhanh-gif.github.io.evil.tld/E-REPORT-SAGS/',
 'https://example.com/E-REPORT-SAGS/',
 'https://sagsdieuhanh-gif.github.io/OTHER-REPORT/',
 'https://sagsdieuhanh-gif.github.io/E-REPORT-SAGS-SPOOF/',
 'https://sagsdieuhanh-gif.github.io/e-report-sags/',
 'http://localhost:8080/E-REPORT-SAGS/',
 'file:///tmp/E-REPORT-SAGS/index.html'
]){
 const result=evaluate(input);
 assert.deepEqual(result.redirects,[OFFICIAL],input+' must redirect to canonical site');
 assert.equal(result.root.__SAGS_OFFICIAL_ORIGIN_BLOCKED,true);
 assert.equal(result.root.stopped,true,'Unofficial origin must stop bootstrap');
 assert.match(result.doc.documentElement.innerHTML,/Địa chỉ E-REPORT không hợp lệ/);
}
const iframe=evaluate(OFFICIAL,{framed:true});
assert.deepEqual(iframe.redirects,[OFFICIAL],'Embedding official site on a foreign page must not be a supported entry');
assert.equal(iframe.root.stopped,true);
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
assert.equal(manifest.start_url,'./','Installed iOS/Android apps must launch canonical directory URL');
assert.equal(manifest.scope,'./');
console.log('Official URL entry guard PASS: strict HTTPS host/path, PWA, redirect, spoof origins, iframe, Firebase bootstrap order');