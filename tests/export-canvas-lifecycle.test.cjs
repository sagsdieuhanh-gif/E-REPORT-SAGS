const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync('app/boot/05-legacy.js','utf8');
const code=s.slice(s.indexOf('async function sagsRunReportExport('),s.indexOf('function parseClockMinutes('));
async function run(fail){
 let drawn=0,modalOpened=false;const pages=[{width:1241,height:1755},{width:1241,height:1755}],status={},buttons={style:{}};
 const window={sagsV450FastRenderPage:null,v452IsDesktopExportDevice:()=>true,v452DesktopDownloadPrepared:()=>true};
 const c={window,document:{querySelector:()=>true,getElementById:id=>id==='exportStatus'?status:buttons},state:{date:'09/10/2026'},activeKey:'old',renderReportPage:async n=>pages[n===11?0:1],draw:()=>{assert(modalOpened,'export dialog paints before live draw');drawn++},safeFilePart:x=>x,flightSessionDisplayName:()=> 'VJ123',currentFlightSessionMeta:()=>null,deriveFlightSessionLabel:()=>'',v479ReleasePreparedUrl(){},openExportModal(){modalOpened=true},requestAnimationFrame:fn=>fn(),setTimeout:fn=>fn(),canvasesToPdfFile:async()=>{if(fail)throw Error('encode failed');return {name:'test.pdf'}},v479ShowPreparedButtons(){},console:{error(){}},navigator:{},preparedPdfFile:null,preparedPdfName:''};
 vm.createContext(c);vm.runInContext(code,c);await c.sagsRunReportExport('fsags09');
 assert.equal(drawn,1);for(const page of pages){assert.equal(page.width,1);assert.equal(page.height,1)}
 assert.equal(window.__SAGS_EXPORT_BATCH_DRAWN,false);assert.equal(window.__SAGS_SUPPRESS_BBBT_CXR_ON_RENDER,false);
 if(fail){assert.equal(c.preparedPdfFile,null);assert.match(status.textContent,/encode failed/)}else assert(c.preparedPdfFile);
}
(async()=>{await run(false);await run(true);console.log('PDF canvas lifecycle: modal-before-draw, success/error cleanup, flags and error reporting passed')})().catch(e=>{console.error(e);process.exitCode=1});
