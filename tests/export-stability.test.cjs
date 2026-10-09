const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const registry=read('app/modules/form-registry-runtime.v647.js'),maint=read('app/modules/form-registry-runtime.v6419.js');
class Element{constructor(kind){this.nodeType=1;this.kind=kind}matches(selector){return selector.split(',').some(s=>s==='#'+this.kind||(s==='[id^="page"]'&&this.kind.startsWith('page')))}querySelector(){return null}}
const ctx={};vm.createContext(ctx);
vm.runInContext(registry.slice(registry.indexOf('const registryUiSelector='),registry.indexOf('let uiQueued=')),ctx);
vm.runInContext(maint.slice(maint.indexOf('const maintenanceSelector='),maint.indexOf('let maintainQueued=')),ctx);
for(const fn of [ctx.registryUiChanged,ctx.maintenanceChanged]){
 for(const node of [{nodeType:3},new Element('a'),new Element('svg'),new Element('canvas')])assert.equal(fn([{addedNodes:[node],removedNodes:[]}]),false,'export text/links/graphics should not trigger form scans');
 assert.equal(fn([{addedNodes:[new Element('page16')],removedNodes:[]}]),true);
}
assert.equal(ctx.registryUiChanged([{addedNodes:[new Element('fs09QuickModal')],removedNodes:[]}]),true);
assert.equal(ctx.maintenanceChanged([{addedNodes:[new Element('exportModal')],removedNodes:[]}]),true);
let writes=0;const props=new Map();const style={getPropertyValue:k=>props.get(k)?.value||'',getPropertyPriority:k=>props.get(k)?.priority||'',setProperty(k,value,priority){writes++;props.set(k,{value,priority})}};
vm.runInContext(maint.slice(maint.indexOf('function exportStyle('),maint.indexOf('function centerExport(')),ctx);
ctx.exportStyle({style},'left','100px');ctx.exportStyle({style},'left','100px');assert.equal(writes,1);ctx.exportStyle({style},'left','101px');assert.equal(writes,2);

// Run the actual painter with an attribute observer that schedules the next paint.
// Writing the same SVG style must settle, rather than sustain one paint per frame.
let paintRuns=0,pendingPaint=false,display='';
const triangle={style:{get display(){return display},set display(v){display=v;pendingPaint=true}}};
const painter={root:{sagsV495ManagedPage:()=>true,sagsV495PaintCanonicalPage:()=>paintRuns++},document:{getElementById:()=>({}),querySelectorAll:()=>[triangle]},visiblePage:()=>true,registryCanvas:()=>({width:1241,height:1755,getContext:()=>({clearRect(){}})})};
vm.createContext(painter);vm.runInContext(registry.slice(registry.indexOf('function paintPage('),registry.indexOf('function releaseHiddenCanvases(')),painter);
painter.paintPage(16);for(let i=0;pendingPaint&&i<20;i++){pendingPaint=false;painter.paintPage(16)}
assert.equal(pendingPaint,false,'SVG observer/painter must settle');assert.equal(paintRuns,2);

const boot=read('app/boot/05-legacy.js');let calls=0,resolve;
ctx.sagsRunReportExport=()=>{calls++;return new Promise(r=>{resolve=r})};
vm.runInContext(boot.slice(boot.indexOf('let sagsReportExportJob='),boot.indexOf('async function sagsRunReportExport(')),ctx);
(async()=>{
 const a=ctx.sendReport('bbbt'),b=ctx.sendReport('bbbt');assert.equal(a,b);await Promise.resolve();assert.equal(calls,1);resolve();await a;
 ctx.sagsRunReportExport=async()=>{calls++;throw Error('failed')};await assert.rejects(ctx.sendReport());
 ctx.sagsRunReportExport=async()=>{calls++;return 'retry'};assert.equal(await ctx.sendReport(),'retry');assert.equal(calls,3);
 assert.match(registry,/if\(el.style.display!=='none'\)/,'prevent SVG style feedback loop');
 console.log('Export stability: unrelated mutations ignored; form changes retained; styles idempotent; single flight and error retry passed');
})().catch(e=>{console.error(e);process.exitCode=1});
