/* E-REPORT/SAGS V3.0 · FLIGHT WORKSPACE CORE
 * One flight = one workspace shared by all operating units.
 * Phase 1: list flights sorted by STD, unit ownership, module status, and direct DAILY ROSTER entry.
 */
(function(root){'use strict';
  const BUILD='V3.0-20260820-01';
  const ROOT='flight_records';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const UNITS=[
    {key:'DH',label:'ĐH · ĐIỀU HÀNH',icon:'✈',tasks:['Theo dõi và điều phối tổng thể chuyến','Theo dõi STA/STD/ETD, Door Close, Pushback, MVA/MVT','Theo dõi tiến độ và bất thường khai thác']},
    {key:'CBTT',label:'CBTT · CÂN BẰNG TRỌNG TẢI',icon:'⚖',tasks:['Nhận dữ liệu KẾT SỔ, hành lý và hàng hóa','Lập/kiểm tra FINAL, Weight & Balance','Thực hiện CROSSCHECK FINAL theo revision']},
    {key:'PVHK',label:'PVHK · PHỤC VỤ HÀNH KHÁCH',icon:'👥',tasks:['Check-in/boarding và KẾT SỔ','ADL / CHD / INF','BAG PCS / KG và khách đặc biệt']},
    {key:'HLNG',label:'HLNG · HÀNH LÝ NHÀ GA',icon:'🛄',tasks:['Chuyến đi: nhận hành lý từ băng chuyền, phân loại, chất lên móc/ULD','Chuyến đến: nhận hành lý từ móc/ULD, đưa lên băng chuyền trả khách','Ghi nhận thời gian hoàn tất và bất thường']},
    {key:'CARGO',label:'KHO HÀNG · CARGO',icon:'📦',tasks:['Tiếp nhận/xử lý hàng hóa','Build-up / loading / breakdown','Cargo weight, ULD hàng và hàng đặc biệt']},
    {key:'VSTB',label:'VSTB · VỆ SINH TÀU BAY',icon:'🧹',tasks:['Nhận nhiệm vụ vệ sinh tàu bay','Bắt đầu và hoàn tất vệ sinh','Ghi nhận bất thường phục vụ cabin']},
    {key:'VHTTB',label:'VHTTB · VẬN HÀNH TRANG THIẾT BỊ',icon:'🚜',tasks:['Nhận yêu cầu thiết bị phục vụ','Điều động thiết bị và nhân sự vận hành','Cập nhật tình trạng đáp ứng']},
    {key:'KTTB',label:'KTTB · KỸ THUẬT THIẾT BỊ',icon:'🔧',tasks:['Tiếp nhận yêu cầu báo hỏng thiết bị','Bảo trì / bảo dưỡng / sửa chữa','Cập nhật tình trạng thiết bị sau xử lý'],requestOnly:true},
    {key:'LNF',label:'LNF · LOST & FOUND',icon:'🔎',tasks:['Tiếp nhận case hành lý thất lạc chuyến đến','Theo dõi xử lý','Ghi nhận kết quả trả khách'],requestOnly:true}
  ];
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){const p=profile();return S(p.username||(role()==='AD'?'AD':''));}
  function myName(){const p=profile();return S(p.name||p.fullName||p.displayName||p.username||me());}
  function dep(){const p=profile();return U(p.departmentCode||p.systemDepartment||p.department||p.groupCode||p.group||'');}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function unitForProfile(){
    if(role()==='AD')return '';
    const p=profile(), text=U([p.role,p.roleCode,p.groupCode,p.departmentCode,p.systemDepartment,p.department,p.group,p.jobTitle].filter(Boolean).join(' '));
    const tests=[
      ['CBTT',/(CBTT|CÂN BẰNG TRỌNG TẢI|CAN BANG TRONG TAI|LOAD CONTROL)/],
      ['PVHK',/(PVHK|PHỤC VỤ HÀNH KHÁCH|PHUC VU HANH KHACH)/],
      ['HLNG',/(HLNG|HÀNH LÝ NHÀ GA|HANH LY NHA GA)/],
      ['CARGO',/(KHO HÀNG|KHO HANG|CARGO)/],
      ['VSTB',/(VSTB|VỆ SINH TÀU BAY|VE SINH TAU BAY)/],
      ['VHTTB',/(VHTTB|VẬN HÀNH TRANG THIẾT BỊ|VAN HANH TRANG THIET BI)/],
      ['KTTB',/(KTTB|KỸ THUẬT THIẾT BỊ|KY THUAT THIET BI)/],
      ['LNF',/(LNF|LOST\s*&?\s*FOUND|LOST AND FOUND)/],
      ['DH',/(^|\s)(ĐH|DH)(\s|$)|ĐIỀU HÀNH|DIEU HANH/]
    ];
    for(const [k,re] of tests)if(re.test(text))return k;
    return '';
  }
  function timeScore(v){const s=S(v).replace(/[^0-9]/g,'');if(s.length<3)return 99999;const hh=Number(s.slice(0,-2)),mm=Number(s.slice(-2));return (Number.isFinite(hh)?hh:99)*60+(Number.isFinite(mm)?mm:99);}
  function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path);}
  async function readFlights(date){if(typeof root.sagsFlightHubRead==='function')return await root.sagsFlightHubRead(date);const s=await dbref(`${ROOT}/${safe(date)}`).once('value');return s.val()||{};}
  let cache={date:'',flights:{},selected:null};
  function ensureUI(){
    if(document.getElementById('fwcModal'))return;
    const st=document.createElement('style');st.textContent=`
      #fwcModal{display:none;position:fixed;inset:0;z-index:16820;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:10px;font-family:Arial,sans-serif}#fwcModal.show{display:flex}
      .fwcPanel{width:min(98vw,1120px);max-height:95vh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-sizing:border-box;box-shadow:0 18px 50px rgba(0,0,0,.32)}.fwcHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.fwcHead h3{margin:0;color:#0b4f91}.fwcSub{font-size:12px;color:#5f6f7d;line-height:1.45;margin-top:4px}.fwcBtn{border:0;border-radius:9px;padding:9px 12px;font-weight:900;cursor:pointer;background:#0b67b2;color:#fff}.fwcBtn.gray{background:#eef3f7;color:#31475a;border:1px solid #ccd7df}.fwcBtn.green{background:#15803d}.fwcBtn.orange{background:#b45309}.fwcBtn:disabled{opacity:.45;cursor:not-allowed}.fwcTools{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:10px 0}.fwcTools input{padding:9px;border:1px solid #cad6df;border-radius:9px}.fwcStatus{padding:9px 10px;border-radius:9px;background:#eef6ff;color:#244862;font-size:12px;margin:8px 0}.fwcStatus.err{background:#fff0f0;color:#9b1c1c}
      .fwcFlight{border:1px solid #d9e2e9;border-radius:12px;margin:8px 0;padding:10px;display:grid;grid-template-columns:minmax(200px,1.3fr) minmax(200px,1fr) auto;gap:10px;align-items:center}.fwcFlight:hover{background:#f8fbfd}.fwcFlightTitle{font-size:17px;font-weight:900;color:#173f60}.fwcMeta{font-size:12px;color:#5e6f7d;margin-top:3px}.fwcBadges{display:flex;gap:5px;flex-wrap:wrap}.fwcBadge{display:inline-block;padding:3px 7px;border-radius:999px;background:#e9f7ee;color:#17643a;font-size:11px;font-weight:900}.fwcBadge.warn{background:#fff3cd;color:#7a5200}.fwcEmpty{padding:18px;text-align:center;color:#687987}
      .fwcBack{margin:6px 0 10px}.fwcWorkspaceHead{border:1px solid #cfe0ed;background:#f3f9fd;border-radius:13px;padding:12px;margin-bottom:10px}.fwcWorkspaceTitle{font-size:22px;font-weight:900;color:#123f63}.fwcUnitGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fwcUnit{border:1px solid #d8e3eb;border-radius:12px;padding:10px;background:#fff}.fwcUnit.mine{border-color:#76b98b;background:#f5fbf7}.fwcUnit h4{margin:0 0 6px;color:#194766}.fwcOwner{font-size:12px;font-weight:800;color:#31556f;margin:5px 0}.fwcTasks{margin:6px 0 0;padding-left:18px;color:#596a78;font-size:12px;line-height:1.45}.fwcUnitActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.fwcNotice{font-size:11px;color:#6c7b87;margin-top:6px}.fwcModules{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      @media(max-width:720px){.fwcUnitGrid{grid-template-columns:1fr}.fwcFlight{grid-template-columns:1fr}.fwcPanel{padding:10px}.fwcBtn{width:auto}.fwcFlight .fwcBtn{width:100%}}
    `;document.head.appendChild(st);
    const m=document.createElement('div');m.id='fwcModal';m.innerHTML=`<div class="fwcPanel"><div class="fwcHead"><div><h3>✈ CHUYẾN HÔM NAY · FLIGHT WORKSPACE</h3><div class="fwcSub">Một chuyến bay = một hồ sơ chung. Danh sách mặc định xếp theo STD tăng dần.</div></div><button class="fwcBtn gray" onclick="flightWorkspaceClose()">ĐÓNG</button></div><div id="fwcBody"></div></div>`;document.body.appendChild(m);
  }
  function status(msg,err=false){const e=document.getElementById('fwcStatus');if(e){e.textContent=msg;e.classList.toggle('err',!!err)}}
  function moduleBadges(rec){try{return root.sagsFlightHubModuleBadges?.(rec)||[]}catch(_){return []}}
  function listHtml(date,flights){const arr=Object.values(flights||{}).filter(Boolean).sort((a,b)=>timeScore(a.std)-timeScore(b.std)||S(a.depFlight||a.arrFlight||a.flightRaw).localeCompare(S(b.depFlight||b.arrFlight||b.flightRaw),'vi'));if(!arr.length)return '<div class="fwcEmpty">Ngày này chưa có chuyến. AD hãy vào ⚙ QUẢN LÝ → VẬN HÀNH CHUYẾN → DAILY ROSTER và chọn file.</div>';
    return arr.map(rec=>{const name=S(rec.depFlight||rec.arrFlight||rec.flightName||rec.flightRaw||rec.flightId),mods=moduleBadges(rec),assign=rec.unitAssignments||{},owners=Object.keys(assign).filter(k=>assign[k]?.username).length;return `<div class="fwcFlight"><div><div class="fwcFlightTitle">${esc(name)}</div><div class="fwcMeta">${esc(rec.route||'')} · A/C ${esc(rec.acReg||'—')} · STA ${esc(rec.sta||'—')} · <b>STD ${esc(rec.std||'—')}</b></div><div class="fwcMeta">${esc(rec.flightId||'')}</div></div><div><div class="fwcBadges">${mods.length?mods.map(x=>`<span class="fwcBadge">${esc(x.kind)}: ${esc(x.status)}</span>`).join(''):'<span class="fwcBadge warn">CHƯA CÓ DỮ LIỆU NGHIỆP VỤ</span>'}</div><div class="fwcMeta">Đơn vị đã nhận: ${owners}/${UNITS.filter(x=>!x.requestOnly).length}</div></div><button class="fwcBtn" onclick="flightWorkspaceOpenFlight('${esc(rec.flightId)}')">MỞ CHUYẾN</button></div>`}).join('');}
  async function renderList(date){ensureUI();const body=document.getElementById('fwcBody');body.innerHTML=`<div class="fwcTools"><input id="fwcDate" type="date" value="${esc(date)}"><button class="fwcBtn" onclick="flightWorkspaceRefresh()">TẢI DANH SÁCH</button>${role()==='AD'?'<button class="fwcBtn green" onclick="flightWorkspacePickRoster()">📋 CHỌN DAILY ROSTER</button>':''}<button class="fwcBtn gray" onclick="rosterHandoffOpen?.()">BÀN GIAO / DUYỆT</button></div><div id="fwcStatus" class="fwcStatus">Đang tải danh sách chuyến…</div><div id="fwcList"></div>`;
    try{const flights=await readFlights(date);cache={date,flights,selected:null};document.getElementById('fwcList').innerHTML=listHtml(date,flights);status(`✓ ${Object.keys(flights||{}).length} Flight Workspace · xếp theo STD.`);}catch(e){status('Không tải được danh sách chuyến: '+S(e?.message||e),true)}}
  root.flightWorkspaceOpenList=function(date){ensureUI();document.getElementById('fwcModal').classList.add('show');return renderList(S(date)||today());};
  root.flightWorkspaceClose=function(){document.getElementById('fwcModal')?.classList.remove('show');};
  root.flightWorkspaceRefresh=function(){return renderList(S(document.getElementById('fwcDate')?.value)||cache.date||today());};
  root.flightWorkspacePickRoster=function(){if(role()!=='AD')return;let inp=document.getElementById('fwcRosterFile');if(!inp){inp=document.createElement('input');inp.id='fwcRosterFile';inp.type='file';inp.accept='.xlsx,.xlsm,.csv';inp.style.position='fixed';inp.style.left='-9999px';inp.addEventListener('change',async()=>{const f=inp.files?.[0];inp.value='';if(!f)return;try{status('Đang đọc DAILY ROSTER và tự tạo chuyến…');const ok=await root.dailyRosterLoadFile?.(f);if(ok)setTimeout(()=>root.flightWorkspaceOpenList?.(),500);}catch(e){status('Không tạo chuyến từ DAILY ROSTER: '+S(e?.message||e),true)}});document.body.appendChild(inp);}inp.click();};
  root.flightWorkspaceOpenFlight=function(fid){const rec=cache.flights?.[fid];if(!rec)return;cache.selected=fid;const body=document.getElementById('fwcBody'),myUnit=unitForProfile(),isAdmin=role()==='AD',mods=moduleBadges(rec);body.innerHTML=`<div class="fwcBack"><button class="fwcBtn gray" onclick="flightWorkspaceOpenList('${esc(cache.date)}')">← DANH SÁCH CHUYẾN</button> <button class="fwcBtn gray" onclick="rosterHandoffOpen?.()">BÀN GIAO / DUYỆT</button></div><div class="fwcWorkspaceHead"><div class="fwcWorkspaceTitle">${esc(rec.depFlight||rec.arrFlight||rec.flightName||rec.flightRaw||fid)}</div><div class="fwcMeta">${esc(rec.route||'')} · STA ${esc(rec.sta||'—')} · STD ${esc(rec.std||'—')} · A/C ${esc(rec.acReg||'—')} · ${esc(fid)}</div><div class="fwcModules">${mods.length?mods.map(x=>`<span class="fwcBadge">${esc(x.kind)}: ${esc(x.status)}</span>`).join(''):'<span class="fwcBadge warn">Chưa phát sinh dữ liệu module</span>'}</div></div><div class="fwcUnitGrid">${UNITS.map(u=>unitHtml(rec,u,myUnit,isAdmin)).join('')}</div>`;};
  function unitHtml(rec,u,myUnit,isAdmin){const a=rec.unitAssignments?.[u.key]||{},mine=myUnit===u.key,owner=S(a.name||a.username),canClaim=!u.requestOnly&&!owner&&mine;return `<div class="fwcUnit ${mine?'mine':''}"><h4>${u.icon} ${esc(u.label)}</h4><div class="fwcOwner">${u.requestOnly?'Loại công việc: tiếp nhận yêu cầu theo sự kiện':`Người phụ trách: ${owner?esc(owner):'<span style="color:#9b1c1c">CHƯA NHẬN</span>'}`}</div><ul class="fwcTasks">${u.tasks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><div class="fwcUnitActions">${canClaim?`<button class="fwcBtn green" onclick="flightWorkspaceClaim('${esc(rec.flightId)}','${u.key}')">NHẬN CÔNG VIỆC</button>`:''}${owner&&mine?'<span class="fwcBadge">BẠN ĐANG PHỤ TRÁCH</span>':''}${isAdmin&&!u.requestOnly?`<span class="fwcNotice">AD theo dõi; việc nhận thực tế do tài khoản đơn vị thực hiện.</span>`:''}</div>${!myUnit&&!isAdmin?'<div class="fwcNotice">Tài khoản chưa map được đơn vị; AD cần kiểm tra Department/Group/Role trong hồ sơ.</div>':''}</div>`;}
  root.flightWorkspaceClaim=async function(fid,unit){try{const rec=cache.flights?.[fid];if(!rec)throw new Error('Không tìm thấy chuyến.');const myUnit=unitForProfile();if(myUnit!==unit)throw new Error('Tài khoản không thuộc đơn vị này.');const current=rec.unitAssignments?.[unit];if(current?.username)throw new Error('Đơn vị đã có người phụ trách. Hãy dùng quy trình bàn giao.');const t=Date.now(),p=profile(),value={unit,username:me(),name:myName(),departmentCode:S(p.departmentCode||p.systemDepartment||p.department),groupCode:S(p.groupCode||p.group),claimedAtMs:t,updatedAtMs:t,status:'ACTIVE'};await dbref(`${ROOT}/${safe(cache.date)}/${safe(fid)}/unitAssignments/${safe(unit)}`).set(value);cache.flights[fid].unitAssignments=cache.flights[fid].unitAssignments||{};cache.flights[fid].unitAssignments[unit]=value;root.flightWorkspaceOpenFlight(fid);}catch(e){alert('Không nhận được công việc: '+S(e?.message||e));}};
  function installButton(){const bar=document.querySelector('.toolbar-row.main-actions');if(!bar)return;let b=document.getElementById('roleBtnRosterFlights');if(!b){b=document.createElement('button');b.id='roleBtnRosterFlights';b.textContent='✈ CHUYẾN HÔM NAY';bar.appendChild(b);}b.onclick=()=>root.flightWorkspaceOpenList();b.style.display=role()?'inline-flex':'none';}
  function sync(){ensureUI();installButton();const b=document.getElementById('roleBtnRosterFlights');if(b)b.onclick=()=>root.flightWorkspaceOpenList();}
  const base=root.applyRoleUI;if(typeof base==='function')root.applyRoleUI=function(){const r=base.apply(this,arguments);setTimeout(sync,0);return r};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,100),{once:true});else setTimeout(sync,100);
  setInterval(sync,1800);
  root.__FLIGHT_WORKSPACE_V3_HDSD='V3.0: AD chọn DAILY ROSTER → hệ thống tự đọc và tự tạo Flight Workspace. Màn CHUYẾN HÔM NAY xếp theo STD. Mỗi chuyến có các phân hệ ĐH, CBTT, PVHK, HLNG, Cargo, VSTB, VHTTB, KTTB, LNF. Tài khoản đúng đơn vị bấm NHẬN CÔNG VIỆC; KTTB/LNF nhận yêu cầu theo sự kiện. Một chuyến chỉ có một flightId và mọi dữ liệu module liên quan được liên kết vào flightId đó.';
  root.__FLIGHT_WORKSPACE_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);
