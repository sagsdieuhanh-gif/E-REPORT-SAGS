/* E-REPORT/SAGS V2.5 · ADMIN STATS COMPACT + UNIT FILTER
 * BUILD: V2.5-STATS-UNIT-FILTER-ADMIN-COMPACT
 *
 * - Bỏ nút thống kê nổi ở thanh dưới/trang chủ.
 * - Chỉ đặt THỐNG KÊ CHUYẾN bên trong AD CONTROL CENTER.
 * - Cho ADMIN chọn ngày + đơn vị trước khi xem/xuất: TẤT CẢ, ĐH, CBTT, PVHK, HLNG, CARGO, VSTB, VHTTB, KTTB, LNF, CHƯA XÁC ĐỊNH.
 * - Giữ engine đếm chống trùng và XLSX của V2.3.
 */
(function(root){
  'use strict';
  const BUILD='V2.5-STATS-UNIT-FILTER-ADMIN-COMPACT';
  if(root.__SAGS_V25_STATS_UNIT_FILTER===BUILD)return;
  root.__SAGS_V25_STATS_UNIT_FILTER=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
  function plain(v){return U(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/[^A-Z0-9]+/g,' ').trim()}
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role||root.currentRole)}
  function isAdmin(){return ['AD','ADMIN'].includes(role())}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function displayDate(date){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(date));return m?`${m[3]}/${m[2]}/${m[1]}`:S(date)}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function once(path){return (await db(path).once('value')).val()}
  async function catalog(){try{return typeof root.v466GetUserCatalog==='function'?await root.v466GetUserCatalog(true):[]}catch(_){return []}}

  const UNIT_LABEL={ALL:'TẤT CẢ',DH:'ĐH',CBTT:'CBTT',PVHK:'PVHK',HLNG:'HLNG',CARGO:'CARGO',VSTB:'VSTB',VHTTB:'VHTTB',KTTB:'KTTB',LNF:'LNF',UNKNOWN:'CHƯA XÁC ĐỊNH'};
  const UNIT_OPTIONS=['ALL','DH','CBTT','PVHK','HLNG','CARGO','VSTB','VHTTB','KTTB','LNF','UNKNOWN'];

  function canonicalUnit(v){
    const x=plain(v);if(!x)return '';
    if(x==='DH'||x==='D H'||x.includes('DIEU HANH'))return 'DH';
    if(x.includes('CBTT')||x.includes('CAN BO TAI TRONG'))return 'CBTT';
    if(x.includes('PVHK')||x.includes('PHUC VU HANH KHACH'))return 'PVHK';
    if(x.includes('PVHLNG')||x.includes('HLNG')||x.includes('HANH LY'))return 'HLNG';
    if(x.includes('CARGO')||x.includes('HANG HOA'))return 'CARGO';
    if(x.includes('VSTB')||x.includes('VE SINH TAU BAY'))return 'VSTB';
    if(x.includes('VHTTB')||x.includes('VAN HANH TRANG THIET BI'))return 'VHTTB';
    if(x.includes('KTTB')||x.includes('KY THUAT TRANG THIET BI'))return 'KTTB';
    if(x==='LNF'||x.includes('LOST FOUND')||x.includes('LOST AND FOUND'))return 'LNF';
    return '';
  }
  function profileUnit(p){
    if(!p)return '';
    for(const v of [p.role,p.departmentCode,p.systemDepartment,p.department,p.groupCode,p.group,p.unit,p.workUnit,p.team,p.section,p.jobUnit]){
      const u=canonicalUnit(v);if(u)return u;
    }
    return '';
  }
  function formUnit(item){
    const f=plain(item?.formGroup||item?.mainForm||item?.roleKey||item?.sourceColumn);
    if(!f)return '';
    if(f.includes('FINAL'))return 'CBTT';
    if(f.includes('FSAGS09')||f.includes('SAGS CXR 09'))return 'PVHK';
    if(f.includes('FSAGS421')||f.includes('FSAGS551')||f.includes('FSAGS423')||f==='FSAGS')return 'DH';
    if(f.includes('LOADING208'))return 'HLNG';
    return '';
  }
  function addEvidence(map,user,unit,weight=1){
    const u=normUser(user),k=canonicalUnit(unit)||unit;if(!u||!k||!UNIT_LABEL[k]||k==='ALL'||k==='UNKNOWN')return;
    if(!map.has(u))map.set(u,new Map());const m=map.get(u);m.set(k,(m.get(k)||0)+weight);
  }
  function bestEvidence(map,user){
    const m=map.get(normUser(user));if(!m||!m.size)return '';
    return [...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0]||'';
  }

  async function unitMapForDay(date){
    const [users,flightsRaw,manRaw]=await Promise.all([
      catalog(),
      once(`flight_records/${safe(date)}`).catch(()=>null),
      once(`roster_manifests/${safe(date)}`).catch(()=>null)
    ]);
    const byProfile=new Map(),evidence=new Map();
    for(const p of Array.isArray(users)?users:[]){
      const user=normUser(p?.username||p?.userName||p?.code);if(!user)continue;
      const unit=profileUnit(p);if(unit)byProfile.set(user,unit);
    }
    for(const rec of Object.values(flightsRaw||{})){
      for(const [key,a] of Object.entries(rec?.unitAssignments||{})){
        if(!a?.username)continue;const unit=canonicalUnit(key)||canonicalUnit(a.unit);if(unit)addEvidence(evidence,a.username,unit,6);
      }
      for(const ev of Object.values(rec?.rampTransferHistory||{})){
        if(!ev)continue;addEvidence(evidence,ev.fromUser,'DH',3);addEvidence(evidence,ev.toUser,'DH',3);
      }
    }
    const items=Array.isArray(manRaw?.items)?manRaw.items:Object.values(manRaw?.items||{});
    for(const item of items){
      if(!item||item.active===false)continue;const unit=formUnit(item);if(unit)addEvidence(evidence,item.user||item.targetUser,unit,2);
    }
    return {byProfile,evidence};
  }

  async function buildFiltered(date,selectedUnit){
    if(typeof root.sagsV23BuildDailyStats!=='function')throw new Error('Engine thống kê V2.3 chưa được nạp.');
    const [base,maps]=await Promise.all([root.sagsV23BuildDailyStats(date),unitMapForDay(date)]);
    const allRows=(base?.rows||[]).map(r=>{
      const u=normUser(r.username),unit=maps.byProfile.get(u)||bestEvidence(maps.evidence,u)||'UNKNOWN';
      return {...r,unit,unitLabel:UNIT_LABEL[unit]||unit};
    });
    const unit=UNIT_LABEL[selectedUnit]?selectedUnit:'ALL';
    const rows=unit==='ALL'?allRows:allRows.filter(r=>r.unit===unit);
    return {date:S(base?.date||date),unit,rows,allRows,totalAccounts:rows.length,totalUserFlights:rows.reduce((n,r)=>n+Number(r.count||0),0)};
  }

  async function deliver(bytes,filename){
    const mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',blob=new Blob([bytes],{type:mime});
    try{const file=new File([blob],filename,{type:mime,lastModified:Date.now()});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'THỐNG KÊ CHUYẾN'});return 'shared'}catch(e){if(e?.name==='AbortError')return 'cancelled'}}}catch(_){}
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'downloaded';
  }

  let last=null;
  function ensureStyle(){
    if(document.getElementById('v25StatsStyle'))return;
    const st=document.createElement('style');st.id='v25StatsStyle';st.textContent=`
      #v24StatsFloat,#v23HubStats{display:none!important}
      #v25StatsModal{display:none;position:fixed;inset:0;z-index:29200;background:rgba(0,0,0,.58);align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:Arial,sans-serif}#v25StatsModal.show{display:flex}
      .v25Box{width:min(96vw,700px);max-height:92vh;overflow:auto;background:#fff;border-radius:17px;padding:14px;box-shadow:0 20px 55px rgba(0,0,0,.35);color:#17324d}.v25Head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v25Head h3{margin:0;color:#0b4f91;font-size:19px}.v25Sub{font-size:12px;color:#667788;margin-top:4px;line-height:1.4}.v25Tools{display:grid;grid-template-columns:minmax(145px,1fr) minmax(150px,1fr) auto auto;gap:7px;margin:13px 0}.v25Input,.v25Select{border:1px solid #b9c7d4;border-radius:9px;padding:10px;font:800 13px Arial;background:#fff;color:#17324d;min-width:0}.v25Btn{border:0;border-radius:9px;padding:10px 12px;font:900 13px Arial;background:#0b67b2;color:#fff}.v25Btn.green{background:#167947}.v25Btn.gray{background:#e8edf2;color:#334}.v25Btn:disabled{opacity:.45}.v25Status{min-height:20px;font:800 12px Arial;color:#526777;margin:5px 0}.v25Status.err{color:#b42318}.v25Summary{padding:9px 10px;border-radius:10px;background:#eef6ff;color:#234f74;font:900 13px Arial;margin:8px 0}.v25Table{width:100%;border-collapse:collapse;font-size:12px}.v25Table th,.v25Table td{border:1px solid #d7e1e9;padding:7px 8px;text-align:left}.v25Table th{background:#eef4f8;color:#294b66}.v25Table td:last-child,.v25Table th:last-child{text-align:center;font-weight:900}.v25Unit{display:inline-block;padding:3px 7px;border-radius:999px;background:#eef2f6;color:#445b70;font-weight:900;font-size:10px}.v25Empty{padding:15px;text-align:center;color:#687786;background:#f7f9fb;border-radius:10px}
      .v25StatsCard{width:100%;box-sizing:border-box;border:1px solid #d8e4ef;border-radius:18px;background:#fff;padding:18px 20px;margin:14px 0;box-shadow:0 4px 14px rgba(20,65,105,.08);display:flex;align-items:center;justify-content:space-between;gap:14px;color:#173f67;font-family:Arial,sans-serif;cursor:pointer;text-align:left}.v25StatsMain{display:flex;align-items:center;gap:14px;min-width:0}.v25StatsIcon{width:58px;height:58px;border-radius:16px;background:#e5f0ff;color:#0b67b2;display:flex;align-items:center;justify-content:center;font-size:26px;flex:0 0 58px}.v25StatsTitle{font-size:18px;font-weight:900;line-height:1.2}.v25StatsSub{font-size:13px;font-weight:700;color:#71869b;line-height:1.35;margin-top:5px}.v25StatsOpen{flex:0 0 auto;padding:9px 14px;border-radius:999px;background:#e9f8ef;color:#147044;font-weight:900;font-size:13px}
      @media(max-width:650px){.v25Tools{grid-template-columns:1fr 1fr}.v25Btn{min-height:42px}.v25Box{padding:11px}.v25Table{font-size:11px}.v25Table th,.v25Table td{padding:6px}.v25StatsCard{padding:15px 16px}.v25StatsIcon{width:52px;height:52px;flex-basis:52px}.v25StatsTitle{font-size:17px}.v25StatsSub{font-size:12px}}
    `;document.head.appendChild(st);
  }
  function ensureModal(){
    ensureStyle();if(document.getElementById('v25StatsModal'))return;
    const m=document.createElement('div');m.id='v25StatsModal';
    m.innerHTML=`<div class="v25Box"><div class="v25Head"><div><h3>📊 THỐNG KÊ CHUYẾN</h3><div class="v25Sub">Chọn ngày và đơn vị cần theo dõi. Mỗi tài khoản trên cùng một Flight Workspace trong ngày chỉ tính 1 chuyến.</div></div><button class="v25Btn gray" type="button" onclick="sagsV25StatsClose()">ĐÓNG</button></div><div class="v25Tools"><input id="v25StatsDate" class="v25Input" type="date"><select id="v25StatsUnit" class="v25Select">${UNIT_OPTIONS.map(k=>`<option value="${k}">${UNIT_LABEL[k]}</option>`).join('')}</select><button id="v25StatsView" class="v25Btn" type="button" onclick="sagsV25StatsLoad()">XEM</button><button id="v25StatsExport" class="v25Btn green" type="button" onclick="sagsV25StatsExport()">XUẤT EXCEL</button></div><div id="v25StatsStatus" class="v25Status"></div><div id="v25StatsBody"></div></div>`;
    document.body.appendChild(m);
    document.getElementById('v25StatsUnit')?.addEventListener('change',()=>root.sagsV25StatsLoad?.());
  }
  function status(msg,err=false){const e=document.getElementById('v25StatsStatus');if(e){e.textContent=S(msg);e.classList.toggle('err',!!err)}}
  function render(s){
    const b=document.getElementById('v25StatsBody');if(!b)return;
    if(!s?.rows?.length){b.innerHTML=`<div class="v25Empty">${esc(UNIT_LABEL[s?.unit]||'Đơn vị này')} chưa có tài khoản nào được xác định có chuyến trong ngày ${esc(displayDate(s?.date))}.</div>`;return}
    b.innerHTML=`<div class="v25Summary">${esc(displayDate(s.date))} · ${esc(UNIT_LABEL[s.unit]||s.unit)} · ${s.totalAccounts} tài khoản · ${s.totalUserFlights} lượt chuyến-người</div><table class="v25Table"><thead><tr><th>Tài khoản</th><th>Họ tên</th><th>Đơn vị</th><th>Số chuyến</th></tr></thead><tbody>${s.rows.map(r=>`<tr><td>${esc(r.username)}</td><td>${esc(r.name)}</td><td><span class="v25Unit">${esc(r.unitLabel)}</span></td><td>${Number(r.count||0)}</td></tr>`).join('')}</tbody></table>`;
  }
  async function load(){
    ensureModal();if(!isAdmin())throw new Error('Chỉ ADMIN được xem thống kê.');
    const date=S(document.getElementById('v25StatsDate')?.value)||today(),unit=S(document.getElementById('v25StatsUnit')?.value)||'ALL';
    status(`Đang tổng hợp ${displayDate(date)} · ${UNIT_LABEL[unit]||unit}…`);
    const a=document.getElementById('v25StatsView'),b=document.getElementById('v25StatsExport');if(a)a.disabled=true;if(b)b.disabled=true;
    try{last=await buildFiltered(date,unit);render(last);status('Đã tổng hợp.');return last}finally{if(a)a.disabled=false;if(b)b.disabled=false}
  }

  root.sagsV25StatsOpen=function(){ensureModal();if(!isAdmin())return;const d=document.getElementById('v25StatsDate');if(d&&!d.value)d.value=S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today();document.getElementById('v25StatsModal')?.classList.add('show');load().catch(e=>status('Không tải được thống kê: '+S(e?.message||e),true))};
  root.sagsV25StatsClose=function(){document.getElementById('v25StatsModal')?.classList.remove('show')};
  root.sagsV25StatsLoad=function(){return load().catch(e=>{status('Không tải được thống kê: '+S(e?.message||e),true);return null})};
  root.sagsV25StatsExport=async function(){
    try{
      const date=S(document.getElementById('v25StatsDate')?.value)||today(),unit=S(document.getElementById('v25StatsUnit')?.value)||'ALL';
      const s=(!last||last.date!==date||last.unit!==unit)?await load():last;if(!s?.rows?.length)throw new Error('Không có dữ liệu của đơn vị đã chọn để xuất.');
      if(typeof root.sagsV23BuildXlsxBytes!=='function')throw new Error('Bộ tạo Excel V2.3 chưa sẵn sàng.');
      status('Đang tạo file Excel…');const bytes=root.sagsV23BuildXlsxBytes(s.rows),tag=unit==='ALL'?'TAT_CA':unit,filename=`THONG_KE_CHUYEN_${tag}_${date.replace(/-/g,'')}.xlsx`;
      const result=await deliver(bytes,filename);status(result==='cancelled'?'Đã hủy chia sẻ.':`Đã tạo ${filename}.`);return {ok:true,filename,unit,rows:s.rows.length};
    }catch(e){status('Không xuất được Excel: '+S(e?.message||e),true);return {ok:false,error:S(e?.message||e)}}
  };

  function visible(el){if(!el||!el.isConnected)return false;const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0}
  function text(el){return U(el?.innerText||el?.textContent||'')}
  function accountCard(){
    return [...document.querySelectorAll('button,div,section,article,li')].filter(visible).filter(el=>{const t=text(el);return t.includes('TÀI KHOẢN & PHÂN QUYỀN')&&t.includes('RESET MẬT KHẨU')&&t.length<600}).sort((a,b)=>text(a).length-text(b).length)[0]||null;
  }
  function injectCard(){
    if(!isAdmin())return false;document.getElementById('v24StatsCard')?.remove();
    if(document.getElementById('v25StatsCard'))return true;const card=accountCard();if(!card)return false;
    const b=document.createElement('button');b.id='v25StatsCard';b.type='button';b.className='v25StatsCard';b.innerHTML='<span class="v25StatsMain"><span class="v25StatsIcon">📊</span><span><span class="v25StatsTitle">THỐNG KÊ CHUYẾN</span><span class="v25StatsSub">Chọn ngày + đơn vị (ĐH, CBTT, PVHK...) · xuất Excel</span></span></span><span class="v25StatsOpen">MỞ</span>';b.onclick=()=>root.sagsV25StatsOpen();card.insertAdjacentElement('afterend',b);return true;
  }
  function cleanupFloating(){document.getElementById('v24StatsFloat')?.remove();const old=document.getElementById('v23HubStats');if(old)old.style.setProperty('display','none','important')}
  function sync(){ensureStyle();cleanupFloating();if(!isAdmin()){document.getElementById('v25StatsCard')?.remove();return}injectCard()}

  root.sagsV25StatsDiagnostics=()=>({build:BUILD,role:role(),admin:isAdmin(),v23Engine:typeof root.sagsV23BuildDailyStats==='function',card:!!document.getElementById('v25StatsCard'),lastDate:last?.date||'',lastUnit:last?.unit||'',lastRows:last?.rows?.length||0});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,160),{once:true});else setTimeout(sync,160);
  const mo=new MutationObserver(()=>{clearTimeout(root.__v25StatsTimer);root.__v25StatsTimer=setTimeout(sync,90)});const start=()=>{try{mo.observe(document.body,{childList:true,subtree:true})}catch(_){}};if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
  window.addEventListener('pageshow',()=>setTimeout(sync,100),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sync,100)},{passive:true});setTimeout(sync,700);setTimeout(sync,1800);setTimeout(sync,3500);
})(typeof window!=='undefined'?window:globalThis);
