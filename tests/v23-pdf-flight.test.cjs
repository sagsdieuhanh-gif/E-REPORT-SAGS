const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const boot=fs.readFileSync('app/boot/05-legacy.js','utf8');
const start=boot.indexOf('const sagsV23SvgCache='),end=boot.indexOf('async function v479DecodeSvgOverlay',start);
let decodes=0;
const c={Map,decode:async xml=>{decodes++;if(xml==='bad')throw Error('decode');return {xml}}};vm.createContext(c);
vm.runInContext(boot.slice(start,end)+'async function v479DecodeSvgOverlay(xml){return decode(xml)};this.load=v479LoadSvgOverlay;',c);
(async()=>{const [a,b]=await Promise.all([c.load('one'),c.load('one')]);assert.equal(a,b);assert.equal(decodes,1);await c.load('changed');assert.equal(decodes,2);await assert.rejects(c.load('bad'));await assert.rejects(c.load('bad'));assert.equal(decodes,4);for(let i=0;i<9;i++)await c.load('page'+i);await c.load('one');assert.equal(decodes,14);
const match=boot.match(/String\(val\|\|""\)\.split\((\/.*?\/)\)\.map/);assert(match);const split=vm.runInNewContext(match[1]);for(const separator of [' / ',' - ',' – ','\n'])assert.equal(('VJ123'+separator+'VJ124').split(split).map(s=>s.trim()).filter(Boolean).length,2);
console.log('V2.3 exact-content PDF reuse, invalidation, bounded cache, retry and BBBT separators passed');})().catch(e=>{console.error(e);process.exitCode=1});
