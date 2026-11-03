'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app/boot/32-v6494-aviation-shell.js','utf8');
const from=source.indexOf('function legacyButton(key)'),end=source.indexOf('function todayText()',from);
assert(from>0&&end>from);
const pending=[],opened=[],closed=[],all={};
const n={dataset:{},hidden:false,classList:{remove(){}},setAttribute(){}};
all.v6494AviationHome=n;
let script;
const menu={myflight:{disabled:false,click(){opened.push('myflight')}},archive:{disabled:false,click(){opened.push('archive')}}};
const root={SAGSFormEditHistoryV1:{open(){opened.push('history')}},SAGSRadioCustodyV1:null,alert(m){opened.push('alert:'+m)},sagsV479GoHome(){opened.push('home')}};
const doc={getElementById:id=>all[id]||null,querySelector:q=>{
 if(q.startsWith('meta[name='))return {content:'test'};
 if(q.includes('data-v157-key')){const key=q.match(/data-v157-key="([^"]+)"/)?.[1];return menu[key]}
 return null},
 createElement(tag){const x={tag,style:{},classList:{remove(){}},remove(){}};if(tag==='script')script=x;return x},
 head:{appendChild(){}},body:{appendChild(){},classList:{remove(){}}}};
const cx={document:doc,root,console,encodeURIComponent,sync(){},scheduleSync(){},observeStateTargets(){},setTimeout(f){pending.push(f)},$:id=>all[id]};
vm.createContext(cx);
vm.runInContext(source.slice(from,end),cx);
assert.equal(cx.available('history'),true);
assert.equal(cx.available('radio'),true);
cx.trigger('radio'); // asynch script loading
assert(script&&script.onload,'radio must load lazily');
cx.trigger('history');
root.SAGSRadioCustodyV1={open(){opened.push('radio')},close(){closed.push('radio')}};
script.onload();
Promise.resolve().then(()=>Promise.resolve()).then(()=>{
 assert.deepEqual(opened,['history'],'late radio load must NOT supersede history');
 cx.trigger('radio');assert.deepEqual(opened,['history','radio']);
 all.sagsRadioPanel={hidden:false};root.sagsV157NavigateMenu=key=>{cx.beforeRoute(key);opened.push(key);return true};cx.trigger('archive');assert.deepEqual(opened,['history','radio','archive']);
 assert(closed.includes('radio'),'switch away must close active radio');
 assert(!source.includes('function ensurePcRadioFallback()'));
 console.log('PC native menu actions and stale radio async isolation PASS');
}).catch(e=>{console.error(e);process.exitCode=1});
