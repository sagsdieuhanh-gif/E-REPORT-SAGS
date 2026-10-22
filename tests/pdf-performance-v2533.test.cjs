'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),acorn=require('acorn');
const source=fs.readFileSync('app/core/runtime.v503hf2.bundle.js','utf8');const ast=acorn.parse(source,{ecmaVersion:'latest'}),nodes=[];
function walk(n){if(!n||typeof n!=='object')return;nodes.push(n);for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end')if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}walk(ast);
const fn=name=>{const n=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);assert(n,name);return source.slice(n.start,n.end)};
const assignment=nodes.find(n=>n.type==='AssignmentExpression'&&n.left?.object?.name==='root'&&n.left?.property?.name==='sagsV495BeforeExport');assert(assignment);
(async()=>{
 let requests=0,time=1000,release,timer,syncs=0,network='hold';
 const registry={schema:2,forms:[{id:'test',pages:[{id:'p1',width:1241,height:1755}],fields:[{key:'x',pageId:'p1'}]}]};
 const c={root:{sagsV450FastRenderPage(){}},published:structuredClone(registry),draft:null,clone:structuredClone,AbortController,Date:{now:()=>time},setTimeout:fn=>{timer=fn;return 1},clearTimeout(){},console:{warn(){}},fetch:(url,{signal})=>{requests++;if(network==='ok')return Promise.resolve({ok:true,json:async()=>structuredClone(registry)});if(network==='bad')return Promise.resolve({ok:false,status:503});return new Promise((resolve,reject)=>{release=()=>resolve({ok:true,json:async()=>structuredClone(registry)});signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true})})},fmDedupePublishedSystemV636(){},fmNormalizeRegistryV487(){},syncLegacyToLive:()=>syncs++,draw(){},isAD:()=>false,document:{querySelector:()=>true}};
 vm.createContext(c);vm.runInContext('let sagsPdfRegistryJobV2533=null,sagsPdfRegistryAtV2533=0;'+source.slice(assignment.start,assignment.end),c);
 const first=c.root.sagsV495BeforeExport(),second=c.root.sagsV495BeforeExport();assert.equal(first,second,'coalesce concurrent exports');assert.equal(requests,1);release();await first;await c.root.sagsV495BeforeExport();assert.equal(requests,1,'30s reuse');assert.equal(syncs,1);
 time+=31000;const timeout=c.root.sagsV495BeforeExport();timer();assert.equal(await timeout,true,'timeout keeps validated published registry');assert.equal(requests,2);
 network='ok';await c.root.sagsV495BeforeExport();assert.equal(requests,3,'failed freshness check must be retried');
 vm.runInContext('sagsPdfRegistryAtV2533=0;published=null;',c);network='bad';await assert.rejects(c.root.sagsV495BeforeExport(),/Không có forms/,'missing valid registry must still block export');
 // Real packaged path selection and canonical/custom-background branch behavior.
 let imageLoads=0,paints=0;const info={image:'./forms/fsags42.3/page-01.png',width:1241,height:1755,blobKey:false};
 const p={root:{sagsV495PageInfo:()=>info,sagsV495ManagedPage:()=>true,sagsV495PageImage:async()=>info.image,sagsV495PaintCanonicalPage:()=>paints++},document:{getElementById:()=>({}),createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}})})},perf:()=>0,baseW:()=>1241,baseH:()=>1755,isMobile:()=>false,stateObj:()=>({}),sagsPdfExactSvgOverlay:async()=>({}),drawSignatures:async()=>{},loadImage:async()=>{imageLoads++;return {naturalWidth:1241,naturalHeight:1755}}};
 vm.createContext(p);vm.runInContext(fn('bgPath')+';'+fn('layerCfg')+';'+fn('fastPage'),p);
 for(const n of [1,2,4,6,7,9,10,11,12,13]){const path=p.bgPath(n);assert(fs.existsSync(path),path);assert(fs.existsSync(path.replace('./pdf-bg/','./forms/').replace(/\.jpg$/,'.png')))}
 assert.equal(p.bgPath(15),null,'custom TVJ must use canonical background');
 let canvas=await p.fastPage(1);assert.equal(canvas.__sagsLayered,true);assert.equal(imageLoads,0,'packaged JPEG does not decode/re-encode full PNG');assert.equal(paints,1);
 info.blobKey=true;canvas=await p.fastPage(1);assert.equal(canvas.__sagsLayered,false);assert.equal(imageLoads,1,'custom background always honored');
 info.blobKey=false;info.image='./custom.png';canvas=await p.fastPage(1);assert.equal(canvas.__sagsLayered,false);
 // 42.1 retains its existing lossless encoder and full resolution.
 let lossless=0,jpeg=0;const e={fetchPdfBackgroundV6114:async()=>new Uint8Array([1]),canvasToLosslessRgbV6110:async()=>{lossless++;return {bytes:new Uint8Array([2]),format:'flate-rgb'}},canvasToJpegBytes:async()=>{jpeg++;return new Uint8Array([3])},layerCfg:()=>({quality:.84}),isMobile:()=>false};
 vm.createContext(e);vm.runInContext(fn('singlePageData'),e);for(const n of [6,7]){const page=await e.singlePageData({__sagsLayered:true,__sagsPageNo:n,width:1241,height:1755});assert.equal(page.overlayFormat,'flate-rgb')};assert.equal(lossless,2);assert.equal(jpeg,0);
 console.log('V2.5.33 PDF: request coalescing/TTL/timeout/retry, invalid registry block, packaged backgrounds, custom preservation, lossless 42.1 passed');
})().catch(e=>{console.error(e);process.exitCode=1});
