/* E-REPORT/SAGS V2.3 · ADMIN DAILY FLIGHT STATS EXPORT
 * BUILD: V2.3-DAILY-FLIGHT-STATS-EXPORT
 *
 * ADMIN-only, read-only statistics:
 * - One account + one parent flight/workspace + one operation day = one flight count.
 * - Multiple forms, ARR/DEP parts, reopen/update actions do not increase the count.
 * - Completed handovers keep both the previous and next operator counted on that same flight/day.
 * - Export a real .xlsx file with exactly: Ngày | Tài khoản | Họ tên | Số chuyến.
 * - No new Firebase counter/heartbeat writes are created.
 */
(function(root){
  'use strict';
  const BUILD='V2.3-DAILY-FLIGHT-STATS-EXPORT';
  if(root.__SAGS_V23_DAILY_FLIGHT_STATS===BUILD)return;
  root.__SAGS_V23_DAILY_FLIGHT_STATS=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
  const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const hash=s=>{let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase()};

  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role||root.currentRole)}
  function isAdmin(){return ['AD','ADMIN'].includes(role())}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function once(path){return (await db(path).once('value')).val()}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function displayDate(date){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(date));return m?`${m[3]}/${m[2]}/${m[1]}`:S(date)}

  function flightTokens(x){
    const out=[];
    for(const v of [x?.arrFlight,x?.depFlight,x?.flightRaw,x?.flightName,x?.assignmentFlight]){
      const s=U(v);if(!s)continue;
      for(const t of s.split(/[^A-Z0-9]+/).map(normFlight).filter(Boolean))if(t)out.push(t);
    }
    return [...new Set(out)];
  }
  function recTokens(rec){return new Set(flightTokens(rec))}
  function resolveFlightId(date,item,flights){
    let fid=S(item?.flightId);
    if(fid)return fid;
    try{if(typeof root.sagsV346ResolveRosterFlightId==='function'){fid=S(root.sagsV346ResolveRosterFlightId(date,item,flights||{}));if(fid)return fid}}catch(_){}
    const wanted=new Set(flightTokens(item));
    if(wanted.size){
      const hits=[];
      for(const [key,rec] of Object.entries(flights||{})){
        const have=recTokens(rec);let ok=false;for(const t of wanted)if(have.has(t)){ok=true;break}
        if(ok)hits.push(S(rec?.flightId||key));
      }
      if(hits.length===1)return hits[0];
    }
    const stable=[date,...flightTokens(item),S(item?.route),S(item?.acReg),S(item?.sta),S(item?.std)].join('|');
    return 'LEGACY_'+hash(stable||JSON.stringify(item||{}));
  }

  function addUsage(map,names,user,fid,name){
    const u=normUser(user),f=S(fid);if(!u||!f)return;
    if(!map.has(u))map.set(u,new Set());
    map.get(u).add(f);
    const n=S(name);if(n&&!names.has(u))names.set(u,n);
  }

  async function getCatalog(){
    try{return typeof root.v466GetUserCatalog==='function'?await root.v466GetUserCatalog(true):[]}catch(_){return []}
  }

  async function buildStats(date){
    date=S(date)||today();
    const [manRaw,flightsRaw,handoffsRaw,catalog] = await Promise.all([
      once(`roster_manifests/${safe(date)}`).catch(()=>null),
      once(`flight_records/${safe(date)}`).catch(()=>null),
      once(`roster_handoffs/${safe(date)}`).catch(()=>null),
      getCatalog()
    ]);
    const man=manRaw||{},flights=flightsRaw||{},handoffs=handoffsRaw||{};
    const usage=new Map(),names=new Map();

    for(const p of Array.isArray(catalog)?catalog:[]){
      const u=normUser(p?.username||p?.userName||p?.code);if(!u)continue;
      const n=S(p?.name||p?.fullName||p?.displayName||p?.username);if(n)names.set(u,n);
    }

    const items=Array.isArray(man?.items)?man.items:Object.values(man?.items||{});
    for(const item of items){
      if(!item||item.active===false)continue;
      const u=normUser(item.user||item.targetUser);if(!u)continue;
      addUsage(usage,names,u,resolveFlightId(date,item,flights),item.name||item.userName||item.targetName);
    }

    for(const [key,rec0] of Object.entries(flights||{})){
      const rec=rec0||{},fid=S(rec.flightId||key);if(!fid)continue;
      for(const a of Object.values(rec.unitAssignments||{}))if(a?.username)addUsage(usage,names,a.username,fid,a.name||a.fullName);
      for(const ev of Object.values(rec.rampTransferHistory||{})){
        if(!ev)continue;
        addUsage(usage,names,ev.fromUser,fid,ev.fromName);
        addUsage(usage,names,ev.toUser,fid,ev.toName);
      }
    }

    for(const h of Object.values(handoffs||{})){
      if(!h||U(h.status)!=='COMPLETED')continue;
      const fid=S(h.flightId)||resolveFlightId(date,h,flights);
      addUsage(usage,names,h.fromUser,fid,h.fromName);
      addUsage(usage,names,h.toUser,fid,h.toName);
    }

    const rows=[...usage.entries()].map(([username,set])=>({
      date,username,name:S(names.get(username)||username),count:set.size
    })).filter(x=>x.count>0).sort((a,b)=>b.count-a.count||a.username.localeCompare(b.username,'vi'));

    return {date,rows,totalAccounts:rows.length,totalUserFlights:rows.reduce((n,x)=>n+x.count,0)};
  }

  /* ---------- Minimal XLSX writer: ZIP store + inline-string worksheet ---------- */
  const te=typeof TextEncoder!=='undefined'?new TextEncoder():null;
  function utf8(s){if(te)return te.encode(String(s));const t=unescape(encodeURIComponent(String(s))),u=new Uint8Array(t.length);for(let i=0;i<t.length;i++)u[i]=t.charCodeAt(i);return u}
  function xml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
  const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
  function crc32(u){let c=0xFFFFFFFF;for(const b of u)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
  function u16(v){return [v&255,(v>>>8)&255]}
  function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]}
  function dosDateTime(d=new Date()){let y=Math.max(1980,d.getFullYear());return {time:((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((Math.floor(d.getSeconds()/2))&31),date:(((y-1980)&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31)}}
  function concatBytes(parts){let n=0;for(const p of parts)n+=p.length;const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
  function zipStore(entries){
    const locals=[],centrals=[];let offset=0;const dt=dosDateTime();
    for(const e of entries){
      const name=utf8(e.name),data=e.data instanceof Uint8Array?e.data:utf8(e.data),crc=crc32(data),size=data.length;
      const lh=new Uint8Array([80,75,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(dt.time),...u16(dt.date),...u32(crc),...u32(size),...u32(size),...u16(name.length),...u16(0)]);
      const local=concatBytes([lh,name,data]);locals.push(local);
      const ch=new Uint8Array([80,75,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(dt.time),...u16(dt.date),...u32(crc),...u32(size),...u32(size),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]);
      centrals.push(concatBytes([ch,name]));offset+=local.length;
    }
    const central=concatBytes(centrals),localAll=concatBytes(locals);
    const end=new Uint8Array([80,75,5,6,...u16(0),...u16(0),...u16(entries.length),...u16(entries.length),...u32(central.length),...u32(localAll.length),...u16(0)]);
    return concatBytes([localAll,central,end]);
  }
  function colName(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
  function cell(ref,value,style=0){if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"${style?` s="${style}"`:''}><v>${value}</v></c>`;return `<c r="${ref}" t="inlineStr"${style?` s="${style}"`:''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`}
  function buildXlsx(rows){
    const data=[['Ngày','Tài khoản','Họ tên','Số chuyến'],...rows.map(r=>[displayDate(r.date),r.username,r.name,r.count])];
    let sheetData='';
    for(let r=0;r<data.length;r++){
      const cells=data[r].map((v,c)=>cell(`${colName(c+1)}${r+1}`,v,r===0?1:0)).join('');
      sheetData+=`<row r="${r+1}">${cells}</row>`;
    }
    const last=Math.max(1,data.length);
    const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:D${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/><col min="3" max="3" width="30" customWidth="1"/><col min="4" max="4" width="13" customWidth="1"/></cols><sheetData>${sheetData}</sheetData><autoFilter ref="A1:D${last}"/></worksheet>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="THỐNG KÊ CHUYẾN" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    return zipStore([
      {name:'[Content_Types].xml',data:types},{name:'_rels/.rels',data:rels},{name:'xl/workbook.xml',data:workbook},{name:'xl/_rels/workbook.xml.rels',data:wbRels},{name:'xl/styles.xml',data:styles},{name:'xl/worksheets/sheet1.xml',data:sheet}
    ]);
  }

  async function deliverXlsx(bytes,filename){
    const mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob=new Blob([bytes],{type:mime});
    try{
      const file=new File([blob],filename,{type:mime,lastModified:Date.now()});
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:'THỐNG KÊ CHUYẾN/NGÀY'});return 'shared'}catch(e){if(e?.name==='AbortError')return 'cancelled'}
      }
    }catch(_){}
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'downloaded';
  }

  /* ---------- ADMIN UI ---------- */
  let lastStats=null;
  function ensureUi(){
    if(document.getElementById('v23StatsModal'))return;
    const st=document.createElement('style');st.id='v23StatsStyle';st.textContent=`
      #v23StatsModal{display:none;position:fixed;inset:0;z-index:28000;background:rgba(0,0,0,.58);align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:Arial,sans-serif}#v23StatsModal.show{display:flex}
      .v23Box{width:min(96vw,680px);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 20px 55px rgba(0,0,0,.35);color:#17324d}.v23Head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v23Head h3{margin:0;color:#0b4f91;font-size:19px}.v23Sub{font-size:12px;color:#667788;margin-top:4px;line-height:1.4}.v23Tools{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0}.v23Date{border:1px solid #b9c7d4;border-radius:9px;padding:10px;font:800 14px Arial;background:#fff;color:#17324d}.v23Btn{border:0;border-radius:9px;padding:10px 12px;font:900 13px Arial;background:#0b67b2;color:#fff}.v23Btn.green{background:#167947}.v23Btn.gray{background:#e8edf2;color:#334}.v23Btn:disabled{opacity:.45}.v23Status{min-height:20px;font:800 12px Arial;color:#526777;margin:5px 0}.v23Status.err{color:#b42318}.v23Summary{padding:9px 10px;border-radius:10px;background:#eef6ff;color:#234f74;font:900 13px Arial;margin:8px 0}.v23Table{width:100%;border-collapse:collapse;font-size:12px}.v23Table th,.v23Table td{border:1px solid #d7e1e9;padding:7px 8px;text-align:left}.v23Table th{background:#eef4f8;color:#294b66}.v23Table td:last-child,.v23Table th:last-child{text-align:center;font-weight:900}.v23Empty{padding:15px;text-align:center;color:#687786;background:#f7f9fb;border-radius:10px}
      @media(max-width:600px){.v23Box{padding:11px}.v23Tools>*{flex:1;min-width:130px}.v23Table{font-size:11px}.v23Table th,.v23Table td{padding:6px}}
    `;document.head.appendChild(st);
    const m=document.createElement('div');m.id='v23StatsModal';m.innerHTML=`<div class="v23Box"><div class="v23Head"><div><h3>📊 THỐNG KÊ CHUYẾN THEO TÀI KHOẢN</h3><div class="v23Sub">Mỗi tài khoản trên cùng một Flight Workspace trong một ngày chỉ tính 1 chuyến, dù có nhiều tờ/ARR/DEP/UPDATE. Bàn giao hoàn tất vẫn giữ cả người trước và người sau trong thống kê chuyến đó.</div></div><button class="v23Btn gray" type="button" onclick="sagsV23StatsClose()">ĐÓNG</button></div><div class="v23Tools"><input id="v23StatsDate" class="v23Date" type="date"><button id="v23StatsView" class="v23Btn" type="button" onclick="sagsV23StatsLoad()">XEM</button><button id="v23StatsExport" class="v23Btn green" type="button" onclick="sagsV23StatsExport()">XUẤT EXCEL</button></div><div id="v23StatsStatus" class="v23Status"></div><div id="v23StatsBody"></div></div>`;document.body.appendChild(m);
  }
  function status(msg,err=false){const e=document.getElementById('v23StatsStatus');if(e){e.textContent=S(msg);e.classList.toggle('err',!!err)}}
  function renderStats(s){
    const b=document.getElementById('v23StatsBody');if(!b)return;
    if(!s?.rows?.length){b.innerHTML='<div class="v23Empty">Ngày này chưa có tài khoản nào được xác định có chuyến.</div>';return}
    b.innerHTML=`<div class="v23Summary">${esc(displayDate(s.date))} · ${s.totalAccounts} tài khoản có chuyến · Tổng ${s.totalUserFlights} lượt chuyến-người</div><table class="v23Table"><thead><tr><th>Tài khoản</th><th>Họ tên</th><th>Số chuyến</th></tr></thead><tbody>${s.rows.map(r=>`<tr><td>${esc(r.username)}</td><td>${esc(r.name)}</td><td>${r.count}</td></tr>`).join('')}</tbody></table>`;
  }
  async function loadSelected(){
    ensureUi();if(!isAdmin())throw new Error('Chỉ ADMIN được xem thống kê.');
    const date=S(document.getElementById('v23StatsDate')?.value)||today();
    status('Đang tổng hợp '+displayDate(date)+'…');
    const view=document.getElementById('v23StatsView'),exp=document.getElementById('v23StatsExport');if(view)view.disabled=true;if(exp)exp.disabled=true;
    try{lastStats=await buildStats(date);renderStats(lastStats);status('Đã tổng hợp.');return lastStats}finally{if(view)view.disabled=false;if(exp)exp.disabled=false}
  }
  root.sagsV23StatsOpen=function(){ensureUi();if(!isAdmin())return;const inp=document.getElementById('v23StatsDate');if(inp&&!inp.value)inp.value=S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today();document.getElementById('v23StatsModal')?.classList.add('show');loadSelected().catch(e=>status('Không tải được thống kê: '+S(e?.message||e),true))};
  root.sagsV23StatsClose=function(){document.getElementById('v23StatsModal')?.classList.remove('show')};
  root.sagsV23StatsLoad=function(){return loadSelected().catch(e=>{status('Không tải được thống kê: '+S(e?.message||e),true);throw e})};
  root.sagsV23StatsExport=async function(){
    try{
      const date=S(document.getElementById('v23StatsDate')?.value)||today();
      const s=(!lastStats||lastStats.date!==date)?await loadSelected():lastStats;
      if(!s?.rows?.length)throw new Error('Ngày này chưa có dữ liệu để xuất.');
      status('Đang tạo file Excel…');
      const bytes=buildXlsx(s.rows),filename=`THONG_KE_CHUYEN_${date.replace(/-/g,'')}.xlsx`;
      const result=await deliverXlsx(bytes,filename);status(result==='cancelled'?'Đã hủy chia sẻ.':`Đã tạo ${filename}.`);
      return {ok:true,filename,rows:s.rows.length};
    }catch(e){status('Không xuất được Excel: '+S(e?.message||e),true);return {ok:false,error:S(e?.message||e)}}
  };

  function injectHubItem(){
    if(!isAdmin())return;
    const host=document.getElementById('adminHubBody'),grid=host?.querySelector('.ahGrid');if(!grid||document.getElementById('v23HubStats'))return;
    const b=document.createElement('button');b.id='v23HubStats';b.className='ahItem';b.type='button';b.innerHTML='📊 XUẤT SỐ CHUYẾN/NGÀY<small>Chọn 1 ngày · mỗi tài khoản 1 dòng · xuất Excel</small>';b.onclick=()=>{try{root.adminHubClose?.()}catch(_){}root.sagsV23StatsOpen()};grid.appendChild(b);
  }
  function patchHub(){
    const fn=root.adminHubOpenGroup;if(typeof fn!=='function'||fn.__v23Stats)return false;
    const wrapped=function(key){const r=fn.apply(this,arguments);setTimeout(()=>{if(S(key)==='people')injectHubItem()},0);return r};
    wrapped.__v23Stats=true;root.adminHubOpenGroup=wrapped;return true;
  }
  function sync(){ensureUi();patchHub();const body=document.getElementById('adminHubBody');if(body&&/NHÂN SỰ|TÀI KHOẢN/.test(U(body.textContent)))injectHubItem()}

  root.sagsV23StatsDiagnostics=()=>({build:BUILD,role:role(),admin:isAdmin(),lastDate:lastStats?.date||'',lastRows:lastStats?.rows?.length||0});
  root.sagsV23BuildDailyStats=date=>buildStats(S(date)||today());
  root.sagsV23BuildXlsxBytes=rows=>buildXlsx(Array.isArray(rows)?rows:[]);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,120),{once:true});else setTimeout(sync,120);
  let tries=0;const timer=setInterval(()=>{sync();if(++tries>60)clearInterval(timer)},500);
  window.addEventListener('pageshow',()=>setTimeout(sync,80),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sync,80)},{passive:true});
})(typeof window!=='undefined'?window:globalThis);
