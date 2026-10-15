const cp=require('child_process');const fs=require('fs'),path=require('path'),acorn=require(process.cwd()+'/node_modules/acorn');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/':'')+'playwright');
// Offline browser audit: real project CSS/templates; no Firebase or production writes.
const root=process.cwd();const read=file=>process.env.AUDIT_BASE_REF&&file==='app/modules/theme-contrast.v2.js'?cp.execFileSync('git',['show',process.env.AUDIT_BASE_REF+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
function str(n,env={}){if(!n)return null;if(n.type==='Identifier')return env['$'+n.name]??null;if(n.type==='ArrayExpression'){const parts=n.elements.map(x=>str(x,env));return parts.every(x=>x!==null)?parts.join(''):null}if(n.type==='CallExpression'&&n.callee?.property?.name==='join')return str(n.callee.object,env);if(n.type==='Literal'&&typeof n.value==='string')return n.value;if(n.type==='TemplateLiteral')return n.quasis.map((q,i)=>q.value.cooked+(i<n.expressions.length?'Mẫu':'')).join('');if(n.type==='BinaryExpression'&&n.operator==='+'){const a=str(n.left,env),b=str(n.right,env);return (a??'Mẫu')+(b??'Mẫu')}return null}
const index=fs.readFileSync('index.html','utf8');const scripts=[...index.matchAll(/<script[^>]+src="([^"?]+)[^"]*"/g)].map(x=>x[1]).filter(x=>x.startsWith('./app/')).map(x=>x.slice(2));
const extra=['app/modules/stability.v6-core.js','app/modules/indexeddb-flight-store.v1.js','app/modules/network-diagnostics.js'];
const css=[],html=[],seen=new Set();const roster=[];
for(const file of [...scripts,...extra]){if(seen.has(file)||!fs.existsSync(file))continue;seen.add(file);const s=read(file);let ast;try{ast=acorn.parse(s,{ecmaVersion:'latest',allowReturnOutsideFunction:true})}catch(_){continue}
 function visit(n,ids={}){if(!n||typeof n!=='object')return;
  if(n.type==='BlockStatement'||n.type==='Program'){const local={...ids};for(const a of n.body)visit(a,local);return}
  if(n.type==='VariableDeclarator'&&n.id?.name){const v=str(n.init,ids);if(v!==null)ids['$'+n.id.name]=v;}
  if(n.type==='AssignmentExpression'&&n.right?.type==='FunctionExpression'&&n.left?.object?.name==='root'&&['dailyRosterLoadAssignments','dailyRosterFilterAssignments'].includes(n.left?.property?.name))roster.push(s.slice(n.start,n.end));
  if(n.type==='AssignmentExpression'&&n.left?.type==='MemberExpression'){
   const object=n.left.object?.name,key=n.left.property?.name,v=str(n.right,ids);
   if(key==='id'&&object&&v)ids[object]=v;
   if(key==='textContent'&&v&&/[.#][\w-]+[^{}]{0,100}\{/.test(v)&&!v.includes('<div'))css.push({file,css:v});
   if(key==='innerHTML'&&v&&/<(?:div|section|h[1-4]|label|input|button)\b/.test(v))html.push({file,id:ids[object],html:v});
  }
  for(const [k,v]of Object.entries(n)){if(k==='body'&&Array.isArray(v))continue;if(Array.isArray(v))v.forEach(a=>visit(a,ids));else if(v&&typeof v==='object')visit(v,ids)}
 }visit(ast);
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--in-process-gpu']});const page=await browser.newPage({viewport:{width:Number(process.env.AUDIT_WIDTH||1200),height:900}});
 await page.route('**/*',route=>route.abort());
 let markup=index.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link[^>]*>/gi,'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'');
 await page.setContent(markup);
 const cssFiles=[...index.matchAll(/<link[^>]+href="([^"?]+\.css)[^"]*"/g)].map(x=>x[1]).filter(x=>x.startsWith('./'));
 for(const f of cssFiles)await page.addStyleTag({content:fs.readFileSync(f.slice(2),'utf8')});
 for(const x of css)await page.addStyleTag({content:x.css});
 await page.evaluate(items=>{for(const x of items){if(x.id&&!document.getElementById(x.id)){const n=document.createElement('div');n.id=x.id;n.innerHTML=x.html;document.body.appendChild(n)}}},html);
 for(const file of ['app/modules/form-entry-contrast.v1.js','app/modules/theme-contrast.v2.js'])await page.addScriptTag({content:read(file)});
 await page.evaluate(()=>{document.body.classList.add('v157-authenticated');window.__auditTemplates=[...document.querySelectorAll('[id]')].filter(e=>/Modal$|Center$|Drawer$|Toast$|^sagsQuickEntry$|^entry$|^sags5494(?:Quick|FieldEditor)$|^v6494AviationHome$/.test(e.id)&&!e.closest('.sheet,svg')).filter(e=>!e.parentElement?.closest('[id$="Modal"],[id$="Center"],[id$="Drawer"],[id$="Toast"]')).map(e=>({id:e.id,html:e.outerHTML}));});
 await page.evaluate(blocks=>{window.root=window;window.canManageDailyRoster=()=>true;window.manifestDate=()=> '2026-10-15';window.S=v=>String(v??'').trim();window.upper=v=>S(v).toUpperCase();window.rosterFlightKey=v=>upper(v).replace(/[^A-Z0-9]/g,'');window.esc=v=>S(v);window.formLabel=()=> '42.3';window.setStatus=()=>{};window.loadManifest=async()=>({items:{bx:{flightRaw:'BX787 / BX788',user:'NV001',sourceColumn:'Grnd_Cor',formGroup:'fsags',assignmentId:'bx'},ke:{flightRaw:'KE468 / KE469',user:'NV002',sourceColumn:'Grnd_Cor',formGroup:'fsags',assignmentId:'ke',manualOverride:true,originalUser:'NV001'}}});for(const b of blocks)(0,eval)(b);},roster);
 await page.addStyleTag({content:'*{animation:none!important;transition:none!important}'});
 const templates=(await page.evaluate(()=>window.__auditTemplates)).flatMap(t=>['quickTimeModal','fs09QuickModal'].includes(t.id)?[0,1,2].map(variant=>({...t,variant})):t.id==='entry'?['single','ruled','late-guide'].map(variant=>({...t,variant})):[t]);const all=[];const coverage=[];
 for(const theme of ['dark','light'])for(const t of templates.filter(t=>!process.env.AUDIT_ROOT||t.id===process.env.AUDIT_ROOT)){
  await page.evaluate(({t,theme})=>{document.documentElement.dataset.uiTheme=theme;document.body.className='v157-authenticated';document.body.innerHTML=t.html;const e=document.getElementById(t.id);e.hidden=false;e.setAttribute('aria-hidden','false');e.classList.add('show','open');if(t.id==='v6494AviationHome')document.body.classList.add('v157-home','v6494-home');e.style.setProperty('display','block','important');e.style.setProperty('position','relative','important');e.style.setProperty('inset','auto','important');for(const n of e.querySelectorAll('[data-page],.sagsSettingsContent section')){n.hidden=false;n.style.setProperty('display','block','important')}}, {t,theme});
  if(t.id==='dailyRosterModal')await page.evaluate(async()=>{await window.dailyRosterLoadAssignments?.();document.getElementById('drPreview').innerHTML='<div class="drConflictPanel"><div class="drConflictHead">CẦN XÁC NHẬN PHÂN CÔNG</div><div class="drConflictIntro">Người phụ trách cần xác nhận</div><div class="drConflictItem"><div class="drConflictMeta"><b>BX787 / BX788</b><span class="drConflictUser">NV001</span></div><button class="drConflictChoice">42.3 + 55.1</button><button class="drConflictChoice selected">CHỈ 42.3</button></div><div class="drConflictFoot">CÒN 1 TRƯỜNG HỢP CHƯA CHỌN</div><div class="drConflictFoot done">ĐÃ XỬ LÝ</div></div><div class="drStatus warn">Cảnh báo cần xác nhận</div><div class="drStatus err">Chưa lưu được</div>';});
  if(t.id==='quickTimeModal'||t.id==='fs09QuickModal'){
    await page.evaluate(fields=>{window.fields=fields;window.state={fltBefore:'BX787',fltAfter:'BX788',date:'15/10/2026',f09_fltBefore:'BX787',f09_fltAfter:'BX788',f09_date:'15/10/2026'};window.currentRole='AD';window.currentUserProfile={username:'AD',role:'AD'};window.activeFormGroup='fsags';window.activeFlightSessionId='audit';window.nowHHMM=()=> '12:34';window.__sagsGetSession=()=>({role:'AD',profile:currentUserProfile});window.alert=()=>{};},JSON.parse(fs.readFileSync('forms/forms.registry.json','utf8')).forms.flatMap(f=>(f.fields||[]).map(x=>({...x,page:x.sourcePage,type:x.sourceType||x.type}))));
    await page.addScriptTag({content:fs.readFileSync('app/boot/18-v173-quick-time.js','utf8')});
    await page.addScriptTag({content:fs.readFileSync('app/boot/19-v183-fs09-quick.js','utf8')});
    await page.evaluate(t=>{if(t.id==='quickTimeModal'){activeFormGroup='fsags';openQuickTimePanel();qteGoPage(t.variant)}else{activeFormGroup='fsags09';openFS09QuickPanel();fs09qGoPage(t.variant)}},t);
  }
  if(t.id==='fwcModal')await page.evaluate(()=>{document.getElementById('fwcBody').innerHTML='<div class="fwcTools"><input id="fwcDate" type="date" value="2026-10-15"><input id="sagsFlightSearch" type="search" placeholder="Tìm chuyến"><button class="fwcBtn">Làm mới</button></div><div class="fwcStatus">Danh sách chuyến bay</div><div id="fwcList" class="v478CanonicalQueue"><div class="v478RoleTabs"><button class="active">Đang làm</button><button>Đã hoàn tất</button></div><div class="v1199FlightGrid v478RoleGrid"><div class="fwcFlight v1199Card v478CanonicalRoleCard"><div class="fwcFlightTitle v1199Title">BX787 / BX788</div><div class="fwcMeta v1199Meta">A321 · HL8396</div><div class="v478RoleModules"><span class="fwcBadge">42.3</span></div><div class="v478RoleActions"><button class="fwcBtn v1199Action">HỒ SƠ CHUYẾN</button></div></div></div></div>';});
  if(t.id==='sagsQuickEntry')await page.evaluate(()=>{for(const [id,text]of Object.entries({sqHeading:'SỐ KHÁCH · 1ST',sqTitle:'ADL',sqCount:'Trường 1/4',sqHint:'Nhập số hành khách',sqError:'Giá trị cần kiểm tra'})){const n=document.getElementById(id);if(n)n.textContent=text}});

  if(t.id==='entry'&&t.variant!=='single'){
   const src=fs.readFileSync('app/boot/05-legacy.js','utf8');let configure;
   const visit=n=>{if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id?.name==='sagsV6113ConfigureEntry')configure=src.slice(n.start,n.end);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v)};
   visit(acorn.parse(src,{ecmaVersion:'latest'}));
   await page.evaluate(({configure,late})=>{
    window.entry=document.getElementById('entry');window.entryText=document.getElementById('entryText');window.editing={key:'handlingNotes',page:1,multiline:true};window.sagsV6113Guide=null;
    window.sagsV6113Check=()=>({valid:true,rows:2});window.sagsV6113Feedback=()=>{};
    const guide={boxWidth:580,rowCount:5,lineHeight:26,fontFamily:'Arial',fontSize:18,fontWeight:'400',fontStyle:'normal',letterSpacing:0,color:'#003B8E',align:'left'};
    window.sagsV6113EntryGuide=()=>late?null:guide;
    window.sagsV6113EntryReady=()=>new Promise(resolve=>{window.__auditGuideReady=()=>{window.sagsV6113EntryGuide=()=>guide;resolve();};});
    entry.style.display='flex';(0,eval)(configure);window.sagsV6113ConfigureEntry(editing);
   },{configure,late:t.variant==='late-guide'});
   await page.evaluate(()=>Promise.resolve());
  }

  const check=async(focusOnly=false)=>await page.evaluate(focusOnly=>{
   const rgba=s=>{const m=s.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];return [m[0],m[1],m[2],m.length>3?m[3]:1]};
   const mix=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
   const lum=a=>a.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const bg=e=>{const chain=[];for(let p=e;p;p=p.parentElement)chain.unshift(p);let c=[255,255,255,1];for(const n of chain){const st=getComputedStyle(n);c=mix(rgba(st.backgroundColor),c);if(st.backgroundImage.includes('gradient')){const m=st.backgroundImage.match(/rgba?\([^)]+\)/);if(m)c=mix(rgba(m[0]),c)}}return c};
   const out=[];let count=0;for(const e of document.body.querySelectorAll('*')){
    if(focusOnly&&e!==document.activeElement)continue;
    if(e.closest('svg,canvas,.sheet,[data-export-field],.pdfPage'))continue;
    const st=getComputedStyle(e),rect=e.getBoundingClientRect();if(!rect.width||!rect.height||st.visibility==='hidden'||st.display==='none')continue;
    let opacity=1;for(let p=e;p;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);if(opacity<.01)continue;
    const text=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();const input=e.matches('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select');if(!text&&!input)continue;
    count++;const background=bg(e),fg=rgba(st.webkitTextFillColor||st.color);fg[3]*=opacity;const actual=mix(fg,background);const threshold=(parseFloat(st.fontSize)>=24||parseFloat(st.fontSize)>=18.66&&parseInt(st.fontWeight)>=700)?3:4.5;
    const value=ratio(actual,background);if(value<threshold)out.push({id:e.id,tag:e.tagName,cls:typeof e.className==='string'?e.className:'',text:(text||e.value||e.placeholder||'[control]').slice(0,80),parents:(()=>{const a=[];for(let p=e;p&&a.length<5;p=p.parentElement)a.push(p.tagName+'#'+p.id+'.'+p.className+' '+getComputedStyle(p).backgroundColor+' '+p.getAttribute('style'));return a})(),fg:st.webkitTextFillColor||st.color,bg:background,ratio:+value.toFixed(2),threshold});
    if(input&&e.placeholder){const ph=getComputedStyle(e,'::placeholder'),pf=rgba(ph.webkitTextFillColor||ph.color);pf[3]*=Number(ph.opacity);const pr=ratio(mix(pf,background),background);if(pr<4.5)out.push({id:e.id,tag:'PLACEHOLDER',text:e.placeholder,fg:ph.webkitTextFillColor||ph.color,bg:background,ratio:+pr.toFixed(2),threshold:4.5});}
   }return {count,issues:out};
  },focusOnly);
  const record=(result,state)=>{coverage.push({root:t.id,variant:t.variant,theme,state,count:result.count,fail:result.issues.length});all.push(...result.issues.map(x=>({...x,root:t.id,variant:t.variant,theme,state})));};
  record(await check(),'initial');
  const controls=page.locator('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]):not([type=reset]):not([type=range]):not([type=color]),textarea,select,[contenteditable=true]');
  await controls.evaluateAll(es=>{for(const e of es){e.dataset.auditDisabled=String(e.disabled);e.dataset.auditReadOnly=String(e.readOnly);e.disabled=false;e.readOnly=false;if(e.tagName==='SELECT'){if(!e.options.length)e.add(new Option('Chuyến bay BX787','BX787'));e.selectedIndex=0;}else if(e.isContentEditable)e.textContent='KIỂM TRA CHỮ NHẬP';else e.value=({date:'2026-10-15',time:'12:34','datetime-local':'2026-10-15T12:34',month:'2026-10',week:'2026-W42',number:'123',email:'test@example.com',url:'https://example.com'})[e.type]||'KIỂM TRA CHỮ NHẬP 123';}});
  if(t.id==='entry'){
   const input=page.locator('#entryText');await input.fill('');await input.focus();
   await page.keyboard.insertText('HANDLING NOTES\nKIỂM TRA CHỮ NHẬP 123');
   record(await check(true),'keyboard-input');
   if(t.variant==='late-guide'){await page.evaluate(async()=>{window.__auditGuideReady();await Promise.resolve();});record(await check(true),'guide-arrived-while-typing');}
   await input.evaluate(e=>e.blur());
  }
  record(await check(),'filled-blurred');
  for(let i=0;i<await controls.count();i++){const e=controls.nth(i);if(!await e.isVisible())continue;await e.focus();record(await check(true),'filled-focused');await e.evaluate(n=>n.blur());}
  for(const state of ['readonly','disabled','restored']){
   await controls.evaluateAll((es,state)=>{for(const e of es){e.disabled=state==='disabled';e.readOnly=state==='readonly';if(state==='restored'){e.disabled=e.dataset.auditDisabled==='true';e.readOnly=e.dataset.auditReadOnly==='true';}}},state);
   record(await check(),state);
  }
  if(t.id==='entry'&&t.variant==='late-guide'&&theme==='dark')await page.screenshot({path:'/tmp/sags-filled-handling-notes-'+(process.env.AUDIT_LABEL||'audit')+'.png',fullPage:true});
  if(t.id==='dailyRosterModal'&&theme==='dark')await page.screenshot({path:'/tmp/sags-roster-'+(process.env.AUDIT_LABEL||'before')+'.png',fullPage:true});
 }
 const report={templates:templates.length,dynamicCss:css.length,coverage,issues:all};fs.writeFileSync('/tmp/sags-contrast-'+(process.env.AUDIT_LABEL||'before')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify({templates:templates.length,textChecks:coverage.reduce((s,x)=>s+x.count,0),issues:all.length,byRoot:coverage.filter(x=>x.fail)},null,2));await browser.close();if(all.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
