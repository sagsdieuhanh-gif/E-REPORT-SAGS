window.__SAGS_RUNTIME_BUILD__="V4.7.1-LOCAL-CARRIER-GUIDE-MANAGER";
/* E-REPORT/SAGS V4.6.2 · LIVE TEST EDIT · FORM MANAGER + FAST PDF */
if(typeof window!=="undefined")window.__SAGS_V450_FORM_MANAGER_LAYOUT=true;

/* ===== RUNTIME · bundled from ui.js · V4.3.0 ===== */

/* E-REPORT/SAGS V1.1.87 · VER PC MOBILE UI
   UI shell only: legacy chrome removed; only the new drawer/home shell remains. */
(function(root){
  "use strict";
  if(root.__SAGS_V1183_UI)return;
  root.__SAGS_V1183_UI=true;

  const $=id=>document.getElementById(id);
  let v187SyncTimer=0,v187Syncing=false;
  const setText=(el,value)=>{if(el&&el.textContent!==String(value??""))el.textContent=String(value??"")};
  const V200_GREETING_KEY="sagsV200LoginGreeting";
  const V200_WEATHER_KEY="sagsV200CxrWeather";
  const v200Greetings=[
    "Chúc bạn một ca làm việc năng động, an toàn và hiệu quả!",
    "Khởi đầu thật hứng khởi — cùng vận hành mỗi chuyến bay thật trơn tru nhé!",
    "Chúc bạn nhiều năng lượng tích cực và một ngày khai thác thuận lợi!",
    "Một ngày mới, một tinh thần mới — làm việc tập trung và hiệu quả nhé!",
    "Chúc ca trực hôm nay phối hợp nhịp nhàng, an toàn và thành công!",
    "Sẵn sàng cho một ngày làm việc chuyên nghiệp và đầy cảm hứng nhé!"
  ];
  function v200Greeting(){
    try{
      let message=sessionStorage.getItem(V200_GREETING_KEY)||"";
      if(!message){
        message=v200Greetings[Math.floor(Math.random()*v200Greetings.length)];
        sessionStorage.setItem(V200_GREETING_KEY,message);
      }
      return message;
    }catch(_){return v200Greetings[Math.floor(Math.random()*v200Greetings.length)]}
  }
  function v200WeatherText(code){
    const labels={0:"Trời quang",1:"Ít mây",2:"Có mây",3:"Nhiều mây",45:"Sương mù",48:"Sương mù",51:"Mưa phùn nhẹ",53:"Mưa phùn",55:"Mưa phùn dày",61:"Mưa nhẹ",63:"Mưa vừa",65:"Mưa to",71:"Tuyết nhẹ",80:"Mưa rào nhẹ",81:"Mưa rào",82:"Mưa rào to",95:"Dông",96:"Dông có mưa đá",99:"Dông có mưa đá"};
    return labels[Number(code)]||"Đang cập nhật";
  }
  async function v200RefreshWeather(){
    const title=$("v200WeatherMain"),sub=$("v200WeatherSub");
    if(!title||!sub)return;
    title.textContent="Đang cập nhật…";sub.textContent="Dự báo thời tiết CXR";
    try{
      const url="https://api.open-meteo.com/v1/forecast?latitude=11.9982&longitude=109.2194&current_weather=true&timezone=Asia%2FHo_Chi_Minh";
      const data=await fetch(url,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("weather");return r.json()});
      const w=data?.current_weather||{};
      if(!Number.isFinite(Number(w.temperature)))throw new Error("weather data");
      title.textContent=`${Math.round(Number(w.temperature))}°C · ${v200WeatherText(w.weathercode)}`;
      sub.textContent=`CXR · gió ${Math.round(Number(w.windspeed)||0)} km/h`;
      try{sessionStorage.setItem(V200_WEATHER_KEY,JSON.stringify({title:title.textContent,sub:sub.textContent,at:Date.now()}))}catch(_){}
    }catch(_){
      try{
        const saved=JSON.parse(sessionStorage.getItem(V200_WEATHER_KEY)||"{}");
        if(saved.title){title.textContent=saved.title;sub.textContent=saved.sub||"CXR";return}
      }catch(_){}
      title.textContent="Chưa có dữ liệu thời tiết";sub.textContent="Kiểm tra kết nối mạng để cập nhật CXR";
    }
  }
  function scheduleSync(delay=50){
    if(v187SyncTimer)return;
    v187SyncTimer=setTimeout(()=>{v187SyncTimer=0;sync()},Math.max(0,Number(delay)||0));
  }
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const today=()=>{
    try{return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
    catch(_){return new Date().toISOString().slice(0,10)}
  };
  const session=()=>{try{return root.__sagsGetSession?.()||{}}catch(_){return {}}};
  const currentRole=()=>{
    try{
      const s=session(),p=s.profile||{};
      return String(s.role||p.role||root.currentRole||"").trim().toUpperCase();
    }catch(_){return ""}
  };
  const isAdmin=()=>currentRole()==="AD";
  const canDailyRoster=()=>{
    try{
      return typeof root.dailyRosterCanManage==="function" && !!root.dailyRosterCanManage();
    }catch(_){return false}
  };
  const canAcLimits=()=>{
    try{
      return isAdmin() || (typeof root.v485Can==="function" && !!root.v485Can("AC_LIMITS"));
    }catch(_){return false}
  };
  const canFleet=()=>{
    try{
      if(typeof root.v138CanManageFleet==="function")return !!root.v138CanManageFleet();
      return isAdmin() || (typeof root.v485Can==="function" && !!root.v485Can("FLEET"));
    }catch(_){return false}
  };
  const canDataHub=()=>canDailyRoster()||canAcLimits()||canFleet();
  const shown=el=>{
    if(!el)return false;
    try{const cs=getComputedStyle(el);return cs.display!=="none"&&cs.visibility!=="hidden"&&Number(cs.opacity||1)!==0}catch(_){return true}
  };
  const loginVisible=()=>shown($("roleLoginModal"));
  const isHome=()=>{
    const el=$("roleHomeIdle");
    // Core showRoleHomeIdle()/hideRoleHomeIdle() owns this flag.
    // Do not use computed display here: UI CSS, modal layers or old toolbar
    // styles may leave the element visually measurable after a flight opens.
    return !!el && el.getAttribute("aria-hidden")==="false";
  };
  const clickExisting=id=>{
    const el=$(id);if(!el)return false;
    try{el.click();return true}catch(_){return false}
  };
  const call=(name,...args)=>{
    try{const fn=root[name];if(typeof fn==="function"){fn(...args);return true}}catch(e){console.warn("V1.1.87 UI action",name,e)}
    return false;
  };
  const goHome=()=>{
    setActiveMenu("home");
    clearUiBackStack();
    try{call("flightWorkspaceClose")}catch(_){}
    try{call("showRoleHomeIdle")}catch(_){}
    setTimeout(sync,30);
  };
  const menuDefs=[
    {title:"KHAI THÁC",items:[
      {key:"home",icon:"⌂",label:"Trang chủ",action:goHome,available:()=>true},
      {key:"myflight",icon:"✈",label:"My Flight",action:()=>call("flightWorkspaceOpenList",today())||clickExisting("roleBtnFlights"),available:()=>typeof root.flightWorkspaceOpenList==="function"||!!$("roleBtnFlights")},
      {key:"datahub",icon:"📥",label:"DỮ LIỆU KHAI THÁC",meta:"Roster · A/C Limits · Fleet",action:()=>openDataHub(),available:canDataHub}
    ]},
    {title:"NGHIỆP VỤ CHUYẾN",items:[
      {key:"closeout",icon:"✓",label:"Kết sổ",meta:"theo chuyến",action:()=>clickExisting("fs09QuickBtn"),available:()=>!!$("fs09QuickBtn")&&shown($("fs09QuickBtn"))},
      {key:"final",icon:"F",label:"FINAL",meta:"theo chuyến",action:()=>clickExisting("finalFormsQuickBtn"),available:()=>!!$("finalFormsQuickBtn")&&shown($("finalFormsQuickBtn"))},
      {key:"cross",icon:"↔",label:"Crosscheck",meta:"theo chuyến",action:()=>call("sagsV342Open")||clickExisting("finalFormsQuickBtn"),available:()=>typeof root.sagsV342Open==="function"||!!$("finalFormsQuickBtn")},
      {key:"archive",icon:"▣",label:"Hồ sơ chuyến",meta:"theo chuyến",action:()=>clickExisting("roleBtnArchive")||clickExisting("roleBtnFlights"),available:()=>!!$("roleBtnArchive")||!!$("roleBtnFlights")}
    ]},
    {title:"BÁO CÁO ĐIỀU HÀNH",items:[
      {key:"shift",icon:"▤",label:"Giao ban ngày",action:()=>call("v1171OpenDayReport"),available:()=>["AD","DH","ĐH"].includes(currentRole())&&typeof root.v1171OpenDayReport==="function"},
      {key:"night",icon:"☾",label:"Báo cáo bay đêm",action:()=>call("v1171OpenNightReport"),available:()=>["AD","DH","ĐH"].includes(currentRole())&&typeof root.v1171OpenNightReport==="function"}
    ]},
    {title:"HỆ THỐNG",items:[
      {key:"rs",icon:"✎",label:"Read & Sign",action:()=>clickExisting("readSignQuickBtn")||call("openReadSignManager"),available:()=>!!$("readSignQuickBtn")||typeof root.openReadSignManager==="function"},
      {key:"notice",icon:"●",label:"Thông báo",action:()=>call("sagsV342Open"),available:()=>typeof root.sagsV342Open==="function"}
    ]},
    {title:"QUẢN TRỊ AD",adminOnly:true,items:[
      {key:"adcontrol",icon:"A",label:"AD CONTROL CENTER",meta:"Quản trị riêng AD",action:()=>openAdminCenter(),available:isAdmin}
    ]}
  ];

  const ACTIVE_MENU_KEY="sagsActiveMenuV2";
  let activeMenuKey="home";
  try{
    const saved=String(sessionStorage.getItem(ACTIVE_MENU_KEY)||"").trim();
    if(saved&&menuDefs.flatMap(x=>x.items).some(x=>x.key===saved))activeMenuKey=saved;
  }catch(_){}
  function currentActiveMenuKey(){
    if(shown($("v174DataHub")))return "datahub";
    if(shown($("v181AdminCenter")))return "adcontrol";
    return activeMenuKey||"home";
  }
  function applyActiveMenu(){
    const active=currentActiveMenuKey();
    document.querySelectorAll(".v157MenuItem").forEach(btn=>{
      const on=String(btn.dataset.v157Key||"")===active;
      btn.classList.toggle("active",on);
      if(on)btn.setAttribute("aria-current","page");
      else btn.removeAttribute("aria-current");
    });
  }
  function setActiveMenu(key){
    key=String(key||"").trim();
    if(!menuDefs.flatMap(x=>x.items).some(x=>x.key===key))return;
    activeMenuKey=key;
    try{sessionStorage.setItem(ACTIVE_MENU_KEY,key)}catch(_){}
    applyActiveMenu();
  }

  function install(){
    if($("v157UiRoot"))return;
    const host=document.createElement("div");
    host.id="v157UiRoot";
    host.innerHTML=`
      <div id="v157DrawerBackdrop"></div>
      <aside id="v157Drawer" aria-label="Menu điều hướng">
        <div class="v157DrawerHead">
          <div class="v157Brand">
            <div class="v157LogoBox"><img src="sags-logo.png" alt="SAGS"></div>
            <div class="v157BrandText">SAIGON<br>CAM RANH<br>GROUND<br>SERVICES</div>
          </div>
          <div class="v157UserCard">
            <div class="v157Avatar" id="v157DrawerAvatar">U</div>
            <div style="min-width:0">
              <div class="v157UserName" id="v157UserName">Người dùng</div>
              <div class="v157Online">● Online</div>
            </div>
            <div class="v157UserRole" id="v157UserRole">—</div>
          </div>
        </div>
        <div class="v157MenuBody" id="v157MenuBody"></div>
        <div class="v157DrawerFooter">
          <div class="v157AccountActions">
            <button id="v157PasswordBtn" class="v157PasswordBtn" type="button">🔑 ĐỔI MẬT KHẨU</button>
            <button id="v157LogoutBtn" class="v157LogoutBtn" type="button">⎋ ĐĂNG XUẤT</button>
          </div>
        </div>
      </aside>
      <div id="v174DataHub" aria-hidden="true">
        <div class="v174DataHubPanel">
          <div class="v174DataHubHead">
            <div>
              <h3>📥 DỮ LIỆU KHAI THÁC</h3>
              <p>DAILY ROSTER · A/C LIMITS · FLEET</p>
            </div>
            <button id="v174DataHubClose" type="button">✕</button>
          </div>
          <div class="v174DataHubGrid">
            <button id="v174RosterCard" class="v174DataCard" type="button">
              <span class="v174DataIcon">📋</span>
              <b>DAILY ROSTER</b>
              <small>Đổ / cập nhật file phân công và tạo Flight Workspace</small>
              <em id="v174RosterPerm">MỞ</em>
            </button>
            <button id="v174AclCard" class="v174DataCard" type="button">
              <span class="v174DataIcon">⚠</span>
              <b>A/C LIMITS</b>
              <small>Nhập / cập nhật hạn chế tàu bay và cảnh báo khai thác</small>
              <em id="v174AclPerm">MỞ</em>
            </button>
            <button id="v174FleetCard" class="v174DataCard" type="button">
              <span class="v174DataIcon">✈</span>
              <b>FLEET TÀU BAY</b>
              <small>Quản lý A/C REG, A/C TYPE, CONFIG và dữ liệu đội tàu</small>
              <em id="v174FleetPerm">MỞ</em>
            </button>
          </div>
          <div class="v174DataHubNote">
            Đây là module dùng chung theo phân quyền. AD và tài khoản thường đều truy cập đúng một nơi này nếu được cấp quyền.
          </div>
        </div>
      </div>

      <div id="v181AdminCenter" aria-hidden="true">
        <div class="v181AdminPanel">
          <div class="v181AdminHead">
            <div class="v181AdminHeadText">
              <span class="v181AdminBadge">AD</span>
              <div>
                <h3>AD CONTROL CENTER</h3>
                <p>Trung tâm quản trị riêng dành cho Administrator</p>
              </div>
            </div>
            <button id="v181AdminClose" type="button">✕</button>
          </div>

          <div class="v181AdminIntro">
            <b>QUẢN TRỊ HỆ THỐNG</b>
            <span>Chỉ chứa các chức năng dành riêng cho AD. Daily Roster, A/C Limits và Fleet không đặt tại đây.</span>
          </div>

          <div class="v181AdminSectionTitle">TÀI KHOẢN & PHÂN QUYỀN</div>
          <div class="v181AdminGrid one">
            <button id="v181AccountsCard" class="v181AdminCard primary" type="button">
              <span class="v181AdminIcon">👤</span>
              <span class="v181AdminCardText">
                <b>TÀI KHOẢN & PHÂN QUYỀN</b>
                <small>Tìm nhân viên, role, quyền chức năng, reset mật khẩu</small>
              </span>
              <em>MỞ</em>
            </button>
          </div>

          <div class="v181AdminSectionTitle">GIÁM SÁT & DUYỆT</div>
          <div class="v181AdminGrid">
            <button id="v181MonitorCard" class="v181AdminCard" type="button">
              <span class="v181AdminIcon">◫</span>
              <span class="v181AdminCardText">
                <b>GIÁM SÁT KHAI THÁC</b>
                <small>Theo dõi trạng thái nghiệp vụ của các chuyến trong ngày</small>
              </span>
              <em>THEO DÕI</em>
            </button>
            <button id="v181ApprovalCard" class="v181AdminCard" type="button">
              <span class="v181AdminIcon">✓</span>
              <span class="v181AdminCardText">
                <b>CHỜ DUYỆT</b>
                <small>Danh sách yêu cầu đang chờ AD xử lý</small>
              </span>
              <em id="v181ApprovalMeta">MỞ</em>
            </button>
          </div>

          <div class="v181AdminSectionTitle">HỆ THỐNG & KIỂM SOÁT</div>
          <div class="v181AdminGrid">
            <button id="v181AuditCard" class="v181AdminCard" type="button">
              <span class="v181AdminIcon">▤</span>
              <span class="v181AdminCardText">
                <b>NHẬT KÝ</b>
                <small>Kiểm tra các mốc nghiệp vụ quan trọng đã ghi nhận</small>
              </span>
              <em>MỞ</em>
            </button>
            <button id="v181FirebaseCard" class="v181AdminCard" type="button">
              <span class="v181AdminIcon">◈</span>
              <span class="v181AdminCardText">
                <b>FIREBASE USAGE</b>
                <small>Theo dõi mức sử dụng và tình trạng tài nguyên Firebase</small>
              </span>
              <em>THEO DÕI</em>
            </button>
            <button id="v451NoticeAdminCard" class="v181AdminCard" type="button">
              <span class="v181AdminIcon">🔔</span>
              <span class="v181AdminCardText">
                <b>🔔 QUẢN LÝ THÔNG BÁO</b>
                <small>🗑 DỌN LỊCH SỬ PHÁT KẾT SỔ · kiểm soát tín hiệu realtime</small>
              </span>
              <em>MỞ</em>
            </button>
          </div>

          <div class="v181AdminFootNote">
            DỮ LIỆU KHAI THÁC được tách riêng theo phân quyền để tránh trùng chức năng giữa AD và các tài khoản thường.
          </div>
        </div>
      </div>

      <main id="v157HomeDashboard" aria-label="Trang chủ">
        <div class="v157Welcome v200Welcome">
          <div class="v200WelcomeCopy">
            <strong id="v157WelcomeName">Xin chào 👋</strong>
            <span id="v200GreetingText">Chào mừng trở lại hệ thống</span>
          </div>
          <div class="v200WeatherCard" aria-label="Thời tiết tại CXR">
            <b>☀️ CXR</b>
            <strong id="v200WeatherMain">Đang cập nhật…</strong>
            <span id="v200WeatherSub">Dự báo thời tiết CXR</span>
          </div>
        </div>
        <section id="v181AdminHomeQuick" class="v181AdminHomeQuick">
          <div>
            <span class="v181AdminHomeBadge">AD</span>
            <b>AD CONTROL CENTER</b>
            <small>Quản trị tài khoản · Giám sát · Duyệt · Nhật ký · Firebase</small>
          </div>
          <button id="v181AdminHomeBtn" type="button">MỞ →</button>
        </section>
        <div class="v157MetricGrid">
          <div class="v157Metric">
            <div class="v157MetricHead"><span class="v157MetricIco">↔</span><span>Đang chờ Crosscheck</span></div>
            <div class="v157MetricNum" id="v157CrossCount">—</div>
            <div class="v157MetricSub">chuyến / công việc</div>
          </div>
          <div class="v157Metric warn">
            <div class="v157MetricHead"><span class="v157MetricIco">⚠</span><span>A/C Limits đang hiển thị</span></div>
            <div class="v157MetricNum" id="v157LimitCount">—</div>
            <div class="v157MetricSub">cảnh báo đang hiệu lực</div>
          </div>
        </div>
        <section class="v157Panel">
          <div class="v157PanelHead"><span>Lịch sử gần đây</span><button class="v157PanelLink" id="v157HistoryBtn">Xem lịch sử →</button></div>
          <div class="v157Empty" id="v157RecentText">Mở MY FLIGHT để xem các chuyến và phần việc hiện tại.</div>
        </section>
        <section class="v157Panel">
          <div class="v157PanelHead"><span>Báo cáo</span><button class="v157PanelLink" id="v157ReportBtn">Xem tất cả →</button></div>
          <div class="v157Empty">Báo cáo điều hành được mở từ menu bên trái.</div>
        </section>
        <section class="v157Panel">
          <div class="v157PanelHead"><span>A/C Limits</span><button class="v157PanelLink" id="v157LimitsBtn">Xem tất cả →</button></div>
          <div class="v157Empty">Mở danh sách hạn chế tàu bay theo quyền tài khoản.</div>
        </section>
      </main>
      <nav id="v157BottomBar" aria-label="Điều hướng nhanh">
        <button class="v157BottomBtn active" id="v157BottomHome"><b>⌂</b><span>Trang chủ</span></button>
        <button class="v157BottomBtn" id="v157BottomFlight"><b>✈</b><span>My Flight</span></button>
        <button class="v157BottomBtn" id="v157BottomAlert"><b>●</b><span>Thông báo</span></button>
        <button class="v157BottomBtn" id="v157BottomMenu"><b>☰</b><span>Menu</span></button>
      </nav>
      <nav id="v163OperationNav" aria-label="Thao tác biểu mẫu">
        <button id="v163FlightBtn" type="button">✈ CHUYẾN</button>
        <button id="v163HomeBtn" type="button">⌂ TRANG CHỦ</button>
        <button id="v163MultiBtn" type="button">⇄ MULTI</button>
        <button id="v163SignBtn" type="button">✍ KÝ</button>
      </nav>`;
    document.body.appendChild(host);

    $("v157DrawerBackdrop").onclick=closeDrawer;
    $("v174DataHubClose").onclick=closeDataHub;
    $("v174DataHub").onclick=e=>{if(e.target===$("v174DataHub"))closeDataHub()};
    $("v174RosterCard").onclick=()=>{
      if(!canDailyRoster())return;
      pushUiBack("datahub");
      closeDataHub();
      if(!call("openDailyRosterManager")&&!clickExisting("roleBtnDailyRoster"))popUiBack();
    };
    $("v174AclCard").onclick=()=>{
      if(!canAcLimits())return;
      pushUiBack("datahub");
      closeDataHub();
      if(!call("aclSimpleOpen")&&!call("aclOpenAdmin")&&!clickExisting("roleBtnAcLimits"))popUiBack();
    };
    $("v174FleetCard").onclick=()=>{
      if(!canFleet())return;
      pushUiBack("datahub");
      closeDataHub();
      if(!call("openFleetManager")&&!clickExisting("roleBtnFleet"))popUiBack();
    };

    $("v181AdminClose").onclick=closeAdminCenter;
    $("v181AdminCenter").onclick=e=>{if(e.target===$("v181AdminCenter"))closeAdminCenter()};
    $("v181AdminHomeBtn").onclick=openAdminCenter;
    $("v181AccountsCard").onclick=()=>openAdminModule("openAccountManager","roleBtnAccounts");
    $("v181MonitorCard").onclick=()=>openAdminModule("openActivityMonitor","roleBtnActivity");
    $("v181ApprovalCard").onclick=()=>openAdminModule("sagsV339OpenApprovalQueue","roleBtnApprovalQueue");
    $("v181AuditCard").onclick=()=>openAdminModule("openAuditManager","roleBtnAudit");
    $("v181FirebaseCard").onclick=()=>openAdminModule("openFirebaseUsageMonitor","roleBtnFirebaseUsage");
    $("v451NoticeAdminCard").onclick=openAdminNoticeManager;

    $("v157PasswordBtn").onclick=()=>{
      closeDrawer();
      if(!clickExisting("roleChangePasswordBtn")) call("openChangePasswordModal");
    };
    $("v157LogoutBtn").onclick=()=>{
      closeDrawer();closeDataHub();closeAdminCenter();clearUiBackStack();
      activeMenuKey="home";try{sessionStorage.removeItem(ACTIVE_MENU_KEY)}catch(_){}
      try{sessionStorage.removeItem("sagsUiWorkspaceV181")}catch(_){}
      if(!call("roleLogout")) clickExisting("roleLogoutBtn");
    };
    $("v157BottomHome").onclick=()=>{setActiveMenu("home");goHome()};
    $("v157BottomFlight").onclick=()=>{setActiveMenu("myflight");call("flightWorkspaceOpenList",today())||clickExisting("roleBtnFlights")};
    $("v157BottomAlert").onclick=()=>{setActiveMenu("notice");call("sagsV342Open")};
    $("v157BottomMenu").onclick=openDrawer;
    $("v157HistoryBtn").onclick=()=>{setActiveMenu("myflight");call("flightWorkspaceOpenList",today())||clickExisting("roleBtnFlights")};
    $("v157ReportBtn").onclick=()=>call("v1171OpenDayReport");
    $("v157LimitsBtn").onclick=()=>{setActiveMenu("datahub");openDataHub()};
    $("v163FlightBtn").onclick=()=>{setActiveMenu("myflight");call("flightWorkspaceOpenList",today())||clickExisting("roleBtnFlights")};
    $("v163HomeBtn").onclick=goHome;
    $("v163MultiBtn").onclick=()=>call("sagsV36OpenMultitask");
    $("v163SignBtn").onclick=()=>call("openTemplateMenu");

    renderMenu();
    document.body.classList.add("v157-ui-ready");
  }

  function sectionVisibleItems(sec){
    return sec.items.filter(it=>{
      try{return it.available?!!it.available():true}catch(_){return false}
    });
  }

  function renderMenu(){
    const body=$("v157MenuBody");if(!body)return;
    const sections=menuDefs.map(sec=>({...sec,visibleItems:sectionVisibleItems(sec)}))
      .filter(sec=>sec.visibleItems.length>0);
    body.innerHTML=sections.map((sec,si)=>`
      <section class="v157Section">
        <h3 class="v157SectionTitle">${esc(sec.title)}</h3>
        ${sec.visibleItems.map(it=>`
          <button type="button" class="v157MenuItem${it.key===currentActiveMenuKey()?" active":""}" data-v157-key="${esc(it.key)}">
            <span class="ico">${esc(it.icon)}</span>
            <span>${esc(it.label)}</span>
            <span class="meta">${esc(it.meta||"")}</span>
          </button>`).join("")}
        ${si<sections.length-1?'<div class="v157MenuDivider"></div>':""}
      </section>`).join("");
    body.querySelectorAll(".v157MenuItem").forEach(btn=>{
      const key=btn.dataset.v157Key;
      const item=menuDefs.flatMap(x=>x.items).find(x=>x.key===key);
      btn.onclick=()=>{
        if(btn.disabled)return;
        setActiveMenu(key);
        closeDrawer();
        try{item?.action?.()}catch(e){console.warn("V2 FULL SAGS menu",key,e)}
        setTimeout(sync,80);
      };
    });
  }

  const UI_BACK_KEY="sagsUiBackStackV183";
  function readUiBackStack(){
    try{
      const a=JSON.parse(sessionStorage.getItem(UI_BACK_KEY)||"[]");
      return Array.isArray(a)?a.filter(x=>["admin","datahub"].includes(String(x))):[];
    }catch(_){return []}
  }
  function writeUiBackStack(a){
    try{
      const clean=(Array.isArray(a)?a:[]).filter(x=>["admin","datahub"].includes(String(x))).slice(-12);
      if(clean.length)sessionStorage.setItem(UI_BACK_KEY,JSON.stringify(clean));
      else sessionStorage.removeItem(UI_BACK_KEY);
    }catch(_){}
  }
  function pushUiBack(name){
    name=String(name||"");
    if(!["admin","datahub"].includes(name))return;
    const a=readUiBackStack();
    if(a[a.length-1]!==name)a.push(name);
    writeUiBackStack(a);
  }
  function popUiBack(){
    const a=readUiBackStack();
    const x=a.pop()||"";
    writeUiBackStack(a);
    return x;
  }
  function clearUiBackStack(){writeUiBackStack([])}
  function returnPreviousUi(){
    const target=popUiBack();
    if(target==="admin"&&isAdmin()){
      setTimeout(()=>openAdminCenter({fromBack:true}),20);
      return true;
    }
    if(target==="datahub"&&canDataHub()){
      setTimeout(()=>openDataHub({fromBack:true}),20);
      return true;
    }
    return false;
  }

  function rememberWorkspace(name){
    try{
      if(name)sessionStorage.setItem("sagsUiWorkspaceV181",name);
      else sessionStorage.removeItem("sagsUiWorkspaceV181");
    }catch(_){}
  }

  function closeDataHub(){
    const h=$("v174DataHub");
    if(!h)return;
    h.classList.remove("show");
    h.setAttribute("aria-hidden","true");
    try{if(sessionStorage.getItem("sagsUiWorkspaceV181")==="datahub")rememberWorkspace("")}catch(_){}
  }
  function syncDataHub(){
    const r=canDailyRoster(),a=canAcLimits(),f=canFleet();
    const rb=$("v174RosterCard"),ab=$("v174AclCard"),fb=$("v174FleetCard");
    if(rb){rb.disabled=!r;rb.classList.toggle("disabled",!r)}
    if(ab){ab.disabled=!a;ab.classList.toggle("disabled",!a)}
    if(fb){fb.disabled=!f;fb.classList.toggle("disabled",!f)}
    setText($("v174RosterPerm"),r?"MỞ":"CHƯA CÓ QUYỀN");
    setText($("v174AclPerm"),a?"MỞ":"CHƯA CÓ QUYỀN");
    setText($("v174FleetPerm"),f?"MỞ":"CHƯA CÓ QUYỀN");
  }
  function openDataHub(opts={}){
    if(!canDataHub())return;
    setActiveMenu("datahub");
    closeDrawer();closeAdminCenter();
    const h=$("v174DataHub");
    if(!h)return;
    syncDataHub();
    h.classList.add("show");
    h.setAttribute("aria-hidden","false");
    rememberWorkspace("datahub");
  }

  function approvalBadgeValue(){
    const e=$("v339ApprovalBadge");
    if(!e)return 0;
    return Number(String(e.textContent||"").replace(/\D/g,"")||0);
  }
  function syncAdminCenter(){
    const ad=isAdmin();
    const q=$("v181AdminHomeQuick");
    if(q)q.style.display=ad?"flex":"none";
    if($("v181ApprovalMeta")){
      const n=approvalBadgeValue();
      setText($("v181ApprovalMeta"),n>0?`${Math.min(n,99)} CHỜ`:"MỞ");
      $("v181ApprovalMeta").classList.toggle("hasCount",n>0);
    }
  }
  function closeAdminCenter(){
    const h=$("v181AdminCenter");
    if(!h)return;
    h.classList.remove("show");
    h.setAttribute("aria-hidden","true");
    try{if(sessionStorage.getItem("sagsUiWorkspaceV181")==="admin")rememberWorkspace("")}catch(_){}
  }
  function openAdminCenter(opts={}){
    if(!isAdmin()){
      try{root.sagsActionPopup?.({type:"warning",title:"KHÔNG CÓ QUYỀN",message:"AD CONTROL CENTER chỉ dành cho tài khoản Administrator."})}catch(_){}
      return;
    }
    setActiveMenu("adcontrol");
    closeDrawer();closeDataHub();
    const h=$("v181AdminCenter");
    if(!h)return;
    syncAdminCenter();
    h.classList.add("show");
    h.setAttribute("aria-hidden","false");
    rememberWorkspace("admin");
  }
  function openAdminModule(fnName,fallbackId){
    if(!isAdmin())return;
    pushUiBack("admin");
    closeAdminCenter();
    const ok=call(fnName);
    if(!ok&&fallbackId){
      if(!clickExisting(fallbackId))popUiBack();
    }else if(!ok){
      popUiBack();
    }
  }
  function ensureAdminNoticeManager(){
    let m=$("v451NoticeAdminModal");
    if(m)return m;
    if(!$("v451NoticeAdminStyle")){
      const st=document.createElement("style");st.id="v451NoticeAdminStyle";st.textContent=`
#v451NoticeAdminModal{position:fixed;inset:0;z-index:2147482500;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(5,20,36,.72);box-sizing:border-box;font-family:Arial,sans-serif}#v451NoticeAdminModal.show{display:flex}.v451NoticeCard{width:min(94vw,720px);max-height:90dvh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 58px rgba(0,0,0,.42);padding:14px;color:#173d67}.v451NoticeHead{display:flex;align-items:center;gap:10px;border-bottom:1px solid #dbe5ee;padding-bottom:10px}.v451NoticeHead b{font-size:18px}.v451NoticeHead span{flex:1}.v451NoticeHead button{width:42px;height:42px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:900}.v451NoticeInfo{margin:12px 0;padding:11px;border-radius:11px;background:#eef5fb;color:#36566f;font:700 12px/1.5 Arial}.v451NoticeBlock{border:1px solid #d6e2eb;border-radius:12px;padding:12px;margin-top:10px}.v451NoticeBlock h4{margin:0 0 5px;font-size:14px}.v451NoticeBlock p{margin:0 0 10px;color:#617486;font:700 11px/1.45 Arial}.v451NoticeActions{display:flex;gap:8px;flex-wrap:wrap}.v451NoticeActions button{min-height:44px;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;background:#f8fafc;color:#173d67;font-weight:900}.v451NoticeActions #v451ClearCloseoutBtn{background:#b42318;border-color:#b42318;color:#fff}.v451NoticeActions #v451OpenActionCenter{background:#0b67b2;border-color:#0b67b2;color:#fff}
      `;document.head.appendChild(st);
    }
    m=document.createElement("div");m.id="v451NoticeAdminModal";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.innerHTML=`<div class="v451NoticeCard"><div class="v451NoticeHead"><b>🔔 QUẢN LÝ THÔNG BÁO</b><span></span><button id="v451NoticeClose" type="button">✕</button></div><div class="v451NoticeInfo">Chỉ dành cho AD. Khu vực này quản lý lớp tín hiệu/thông báo realtime; không xóa hồ sơ nghiệp vụ chính trong Firestore.</div><div class="v451NoticeBlock"><h4>KẾT SỔ · LỊCH SỬ PHÁT REALTIME</h4><p>Dọn các event/popup KẾT SỔ cũ trong RTDB và cache thông báo trên thiết bị. Hồ sơ KẾT SỔ đã lưu vẫn được giữ nguyên.</p><div class="v451NoticeActions"><button id="v451ClearCloseoutBtn" type="button">🗑 DỌN LỊCH SỬ PHÁT KẾT SỔ</button><button id="v451OpenActionCenter" type="button">MỞ CẦN XỬ LÝ / THÔNG BÁO</button></div></div></div>`;document.body.appendChild(m);
    $("v451NoticeClose").onclick=()=>m.classList.remove("show");m.onclick=e=>{if(e.target===m)m.classList.remove("show")};
    $("v451ClearCloseoutBtn").onclick=()=>{if(typeof root.v379ClearOldCloseoutNotices==="function")root.v379ClearOldCloseoutNotices();else alert("Chức năng dọn lịch sử KẾT SỔ chưa tải xong. Vui lòng thử lại.")};
    $("v451OpenActionCenter").onclick=()=>{m.classList.remove("show");call("sagsV342Open")};
    return m;
  }
  function openAdminNoticeManager(){
    if(!isAdmin())return;
    closeAdminCenter();
    const m=ensureAdminNoticeManager();m.classList.add("show");
  }
  function restoreWorkspace(){
    let key="";
    try{key=sessionStorage.getItem("sagsUiWorkspaceV181")||""}catch(_){}
    if(key==="admin"&&isAdmin()&&!shown($("v181AdminCenter")))openAdminCenter();
    else if(key==="datahub"&&canDataHub()&&!shown($("v174DataHub")))openDataHub();
  }

  function openDrawer(){
    if(!document.body.classList.contains("v157-authenticated"))return;
    renderMenu();
    syncMenuAvailability();
    document.body.classList.add("v157-drawer-open");
  }
  function closeDrawer(){document.body.classList.remove("v157-drawer-open")}

  function syncMenuAvailability(){
    document.querySelectorAll(".v157MenuItem").forEach(btn=>{
      const key=btn.dataset.v157Key;
      const item=menuDefs.flatMap(x=>x.items).find(x=>x.key===key);
      let ok=true;try{ok=item?.available?!!item.available():true}catch(_){ok=false}
      btn.disabled=!ok;
      const on=key===currentActiveMenuKey();
      btn.classList.toggle("active",on);
      if(on)btn.setAttribute("aria-current","page");
      else btn.removeAttribute("aria-current");
    });
  }

  function badgeNumber(){
    const ids=["v342Badge","readSignNotifyBadge","fs09NotifyBadge","khNotifyBadge"];
    let total=0,found=false;
    for(const id of ids){
      const e=$(id);if(!e)continue;
      const n=Number(String(e.textContent||"").replace(/\D/g,"")||0);
      if(n>0){total+=n;found=true}
    }
    return found?Math.min(total,99):0;
  }

  function crossCount(){
    const e=$("v342Badge");if(!e)return "—";
    const n=Number(String(e.textContent||"").replace(/\D/g,"")||0);
    return Number.isFinite(n)?String(n):"—";
  }

  function overlayOpen(){
    const ids=[
      "quickTimeModal","fs09QuickModal","timeSkipModal","entry",
      "appUpdateModal","roleChangePasswordModal","finalPaperModal",
      "flightSessionModal","fs09SheetManagerModal","kh208ManagerModal",
      "finalSheetManagerModal","accountManagerModal","auditManagerModal",
      "activityMonitorModal","fleetManagerModal","v174DataHub","v181AdminCenter"
    ];
    return ids.some(id=>shown($(id)));
  }

  function sync(){
    if(v187Syncing)return;
    v187Syncing=true;
    try{
    install();
    const s=session(),profile=s.profile||{},role=String(s.role||profile.role||"").toUpperCase();
    const auth=!!role && !loginVisible();
    const home=auth && isHome();
    const overlay=auth && overlayOpen();

    document.body.classList.toggle("v157-authenticated",auth);
    document.body.classList.toggle("v157-home",home);
    document.body.classList.toggle("v163-operational",auth&&!home&&!overlay);
    document.body.classList.toggle("v166-overlay-open",overlay);
    if(!auth)closeDrawer();

    const name=String(profile.name||profile.fullName||profile.username||role||"Người dùng").trim();
    const initial=(name.match(/[A-ZÀ-Ỹ0-9]/iu)?.[0]||"U").toUpperCase();
    setText($("v157UserName"),name);
    setText($("v157UserRole"),role||"—");
    setText($("v157DrawerAvatar"),initial);
    setText($("v157WelcomeName"),`Xin chào, ${name} 👋`);
    setText($("v200GreetingText"),v200Greeting());
    if(auth&&home&&!$("v200WeatherMain")?.dataset.loaded){
      $("v200WeatherMain").dataset.loaded="1";
      v200RefreshWeather();
    }
    if(!auth){
      try{sessionStorage.removeItem(V200_GREETING_KEY)}catch(_){}
      const weather=$("v200WeatherMain");if(weather)delete weather.dataset.loaded;
    }

    setText($("v157CrossCount"),crossCount());

    // Do not invent A/C LIMITS count. Show availability rather than fake data.
    setText($("v157LimitCount"),canAcLimits()?"MỞ":"—");

    syncDataHub();
    syncAdminCenter();
    if(!auth){closeDataHub();closeAdminCenter();}
    else if(!isAdmin()&&shown($("v181AdminCenter")))closeAdminCenter();

    syncMenuAvailability();
    if(auth){
      let k="";try{k=sessionStorage.getItem("sagsUiWorkspaceV181")||""}catch(_){ }
      if(k)setTimeout(restoreWorkspace,0);
    }
    }finally{v187Syncing=false}
  }

  function patchOperationalHooks(){
    for(const name of [
      "switchFlightSession","showFormGroup","hideRoleHomeIdle","flightWorkspaceClose",
      "openQuickTimePanel","closeQuickTimePanel","openFS09QuickPanel","closeFS09QuickPanel"
    ]){
      try{
        const base=root[name];
        if(typeof base!=="function"||base.__v1159UiSync)continue;
        const wrapped=function(){
          const r=base.apply(this,arguments);
          Promise.resolve(r).finally(()=>scheduleSync(40));
          return r;
        };
        wrapped.__v1159UiSync=true;
        wrapped.__v1159Base=base;
        root[name]=wrapped;
        try{
          if(name==="switchFlightSession")switchFlightSession=wrapped;
          else if(name==="showFormGroup")showFormGroup=wrapped;
          else if(name==="hideRoleHomeIdle")hideRoleHomeIdle=wrapped;
          else if(name==="flightWorkspaceClose")flightWorkspaceClose=wrapped;
          else if(name==="openQuickTimePanel")openQuickTimePanel=wrapped;
          else if(name==="closeQuickTimePanel")closeQuickTimePanel=wrapped;
          else if(name==="openFS09QuickPanel")openFS09QuickPanel=wrapped;
          else if(name==="closeFS09QuickPanel")closeFS09QuickPanel=wrapped;
        }catch(_){}
      }catch(_){}
    }
  }

  function installSwipeHome(){
    if(root.__SAGS_V1162_SWIPE_HOME)return;
    root.__SAGS_V1162_SWIPE_HOME=true;
    let tracking=false,startX=0,startY=0,lastX=0,lastY=0,startAt=0;

    const transientOpen=()=>{
      // Do not navigate away while editing/confirming or when drawer/login is open.
      if(document.body.classList.contains("v157-drawer-open"))return true;
      if(shown($("v174DataHub"))||shown($("v181AdminCenter")))return true;
      if(loginVisible())return true;
      const ids=[
        "entry","appUpdateModal","roleChangePasswordModal","finalPaperModal",
        "flightSessionModal","fs09SheetManagerModal","kh208ManagerModal",
        "finalSheetManagerModal","accountManagerModal","auditManagerModal"
      ];
      return ids.some(id=>shown($(id)));
    };

    document.addEventListener("touchstart",e=>{
      if(!document.body.classList.contains("v157-authenticated"))return;
      if(isHome()||transientOpen())return;
      if(e.touches?.length!==1)return;
      const t=e.touches[0];
      // Edge gesture only: avoids interfering with form scrolling, pinch zoom and field editing.
      if(Number(t.clientX)>28)return;
      tracking=true;
      startX=lastX=Number(t.clientX);
      startY=lastY=Number(t.clientY);
      startAt=Date.now();
    },{passive:true,capture:true});

    document.addEventListener("touchmove",e=>{
      if(!tracking||e.touches?.length!==1)return;
      const t=e.touches[0];
      lastX=Number(t.clientX);lastY=Number(t.clientY);
      const dx=lastX-startX,dy=Math.abs(lastY-startY);
      // Once intent is clearly horizontal, suppress browser/page drag for this gesture.
      if(dx>22&&dy<45){
        try{e.preventDefault()}catch(_){}
      }
    },{passive:false,capture:true});

    const finish=()=>{
      if(!tracking)return;
      tracking=false;
      const dx=lastX-startX;
      const dy=Math.abs(lastY-startY);
      const ms=Date.now()-startAt;
      if(dx>=90&&dy<=70&&ms<=1200&&!transientOpen()&&!isHome()){
        try{navigator.vibrate?.(18)}catch(_){}
        goHome();
      }
    };
    document.addEventListener("touchend",finish,{passive:true,capture:true});
    document.addEventListener("touchcancel",()=>{tracking=false},{passive:true,capture:true});
  }

  function boot(){
    install();patchOperationalHooks();installSwipeHome();sync();
    const ownSel="#v157Drawer,#v157HomeDashboard,#v157BottomBar,#v174DataHub,#v181AdminCenter";
    const mo=new MutationObserver(list=>{
      if(v187Syncing)return;
      let relevant=false;
      for(const m of list){
        const t=m.target?.nodeType===1?m.target:m.target?.parentElement;
        if(t?.closest?.(ownSel))continue;
        relevant=true;break;
      }
      if(relevant)scheduleSync(60);
    });
    try{mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["style","class","aria-hidden"]})}catch(_){}
    window.addEventListener("pageshow",()=>scheduleSync(60),{passive:true});
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)scheduleSync(60)},{passive:true});
    // Fallback only; normal updates are event/mutation driven.
    setInterval(()=>scheduleSync(0),10000);
  }

  root.v157OpenMenu=openDrawer;
  root.v157CloseMenu=closeDrawer;
  root.v181OpenAdminCenter=openAdminCenter;
  root.v174OpenDataHub=openDataHub;
  root.sagsUiReturnPrevious=returnPreviousUi;
  root.sagsUiClearBackStack=clearUiBackStack;
  root.sagsUiSetActiveMenu=setActiveMenu;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(typeof window!=="undefined"?window:globalThis);


/* ===== RUNTIME · bundled from ios-export.js · V4.3.0 ===== */
/* E-REPORT/SAGS V1.1.94 · iOS direct signature-to-PDF fix
   Scope: iPhone/iPad Safari/WebKit only.
   Root cause fixed here: V1.1.92/93 decoded an already-visible data-URL signature through
   Blob URL -> offscreen transparent canvas -> PNG -> Image. Safari can occasionally return
   blank pixels from that intermediate canvas although the same signature is visible in the UI.
   V1.1.94 draws the original signature Image directly onto the final compact PDF page canvas
   and verifies pixels on that FINAL page. A compact-canvas fallback is used only if direct draw
   does not change the page. Never reject a visible signature based on an intermediate canvas. */
(function(root){
  'use strict';
  if(root.__SAGS_V1194_IOS_SIGNATURE_DIRECT_FIX)return;
  root.__SAGS_V1194_IOS_SIGNATURE_DIRECT_FIX=true;

  function isIOS(){
    try{
      const ua=String(navigator.userAgent||'');
      const platform=String(navigator.platform||'');
      return /iPad|iPhone|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1);
    }catch(_){return false;}
  }
  if(!isIOS())return;

  const NS='http://www.w3.org/2000/svg';
  const LONG_SIDE=1100;
  const signatureImageCache=new Map();
  let exporting=false;

  function nextPaint(ms=16){return new Promise(r=>requestAnimationFrame(()=>setTimeout(r,ms)));}
  function compactDims(w,h){
    w=Math.max(1,Number(w)||1);h=Math.max(1,Number(h)||1);
    const long=Math.max(w,h);if(long<=LONG_SIDE)return {w:Math.round(w),h:Math.round(h),scale:1};
    const scale=LONG_SIDE/long;return {w:Math.max(1,Math.round(w*scale)),h:Math.max(1,Math.round(h*scale)),scale};
  }
  function isQuotaError(e){
    const s=String(e?.name||'')+' '+String(e?.message||e||'');
    return /QuotaExceeded|NS_ERROR_DOM_QUOTA_REACHED|storage quota|quota/i.test(s);
  }

  const basePersist=(typeof persist==='function')?persist:root.persist;
  if(typeof basePersist==='function'){
    const safePersist=function(){
      try{return basePersist.apply(this,arguments);}catch(e){
        if(isQuotaError(e)){
          console.warn('V1.1.94 iOS signature storage quota ignored for export',e);
          root.__SAGS_IOS_SIGNATURE_STORAGE_WARNING=String(e?.message||e||'QuotaExceededError');return false;
        }
        throw e;
      }
    };
    root.persist=safePersist;try{persist=safePersist;}catch(_){ }
  }

  function stripLiveSignatureImages(){
    try{
      for(const f of (typeof fields!=='undefined'?fields:[])){
        if(f?.type!=='signature'||!state?.[f.key])continue;
        const svg=document.getElementById('svg'+Number(f.page));if(!svg)continue;
        for(const el of svg.querySelectorAll('image')){
          const href=String(el.getAttribute('href')||el.getAttributeNS('http://www.w3.org/1999/xlink','href')||'');
          if(href.startsWith('data:image/'))el.remove();
        }
      }
    }catch(e){console.warn('V1.1.94 strip live signature images',e);}
  }

  const baseDraw=(typeof draw==='function')?draw:root.draw;
  if(typeof baseDraw==='function'){
    const patchedDraw=function(){const r=baseDraw.apply(this,arguments);if(exporting)stripLiveSignatureImages();return r;};
    root.draw=patchedDraw;try{draw=patchedDraw;}catch(_){ }
  }

  async function loadSignatureDirect(src,label){
    src=String(src||'').trim();
    if(!src)throw new Error(label+' chưa có dữ liệu chữ ký.');
    let cached=signatureImageCache.get(src);if(cached)return cached;
    const img=new Image();
    img.decoding='sync';
    // Connecting the Image to DOM is intentional: iOS Safari is more reliable at materializing
    // data-URL pixels for a DOM-connected image than for a Blob-backed offscreen image.
    img.alt='';img.setAttribute('aria-hidden','true');
    img.style.cssText='position:fixed;left:-10000px;top:-10000px;width:auto;height:auto;max-width:none;max-height:none;opacity:.001;pointer-events:none;z-index:-1';
    try{document.body?.appendChild(img);}catch(_){ }
    await new Promise((resolve,reject)=>{
      let done=false;
      const ok=()=>{if(done)return;done=true;resolve();};
      const bad=()=>{if(done)return;done=true;reject(new Error('Không đọc được '+label+' trên iOS.'));};
      img.onload=ok;img.onerror=bad;img.src=src;
      try{img.decode?.().then(ok).catch(()=>{});}catch(_){ }
    });
    // Give WebKit two paint boundaries before the image is used by canvas.
    await nextPaint(8);await nextPaint(8);
    const iw=Number(img.naturalWidth||img.width||0),ih=Number(img.naturalHeight||img.height||0);
    if(!(iw>0&&ih>0))throw new Error(label+' không có kích thước ảnh hợp lệ trên iOS.');
    cached={image:img,width:iw,height:ih,src};signatureImageCache.set(src,cached);return cached;
  }

  function releaseSignatureImages(){
    for(const v of signatureImageCache.values()){
      try{v.image.onload=null;v.image.onerror=null;v.image.remove();v.image.src='';}catch(_){ }
    }
    signatureImageCache.clear();
  }
  function snapshotRect(ctx,x,y,w,h){
    const cw=ctx.canvas.width,ch=ctx.canvas.height;
    const ix=Math.max(0,Math.floor(x)),iy=Math.max(0,Math.floor(y));
    const iw=Math.min(cw-ix,Math.max(1,Math.ceil(w))),ih=Math.min(ch-iy,Math.max(1,Math.ceil(h)));
    if(iw<=0||ih<=0)return null;
    try{return {ix,iy,iw,ih,data:ctx.getImageData(ix,iy,iw,ih).data};}catch(_){return null;}
  }
  function pixelsChanged(before,after){
    if(!before||!after||before.length!==after.length)return true;
    let changed=0;
    for(let i=0;i<before.length;i+=4){
      if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]||before[i+3]!==after[i+3]){
        if(++changed>=3)return true;
      }
    }
    return false;
  }
  function targetRectForField(f,sx,sy,imgW,imgH){
    const a=abs(f);
    const padX=Math.min(14,Math.max(6,a.vw*.035)),padY=Math.min(10,Math.max(5,a.vh*.075));
    const safeX=(a.vx+padX)*sx,safeY=(a.vy+padY)*sy;
    const safeW=Math.max(1,(a.vw-padX*2)*sx),safeH=Math.max(1,(a.vh-padY*2)*sy);
    const r=Math.min(safeW/imgW,safeH/imgH),dw=Math.max(1,imgW*r),dh=Math.max(1,imgH*r);
    return {dx:safeX+(safeW-dw)/2,dy:safeY+(safeH-dh)/2,dw,dh};
  }
  async function drawDirectAndVerify(ctx,sig,rect){
    const {dx,dy,dw,dh}=rect;
    const before=snapshotRect(ctx,dx-2,dy-2,dw+4,dh+4);
    const draw=()=>{
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(sig.image,dx,dy,dw,dh);ctx.restore();
    };
    draw();await nextPaint(6);
    let after=snapshotRect(ctx,dx-2,dy-2,dw+4,dh+4);
    if(!before||!after||pixelsChanged(before.data,after.data))return true;
    // Safari fallback #1: redraw after a longer compositor boundary.
    await nextPaint(24);draw();await nextPaint(8);
    after=snapshotRect(ctx,dx-2,dy-2,dw+4,dh+4);
    if(!after||pixelsChanged(before.data,after.data))return true;
    // Safari fallback #2: rasterize the DOM-connected Image to a small opaque-independent canvas,
    // then immediately draw that canvas to the FINAL page. No early "blank signature" rejection.
    let tmp=null;
    try{
      const maxW=Math.min(900,Math.max(64,Math.round(sig.width))),maxH=Math.min(240,Math.max(32,Math.round(sig.height)));
      const rr=Math.min(1,maxW/sig.width,maxH/sig.height);const tw=Math.max(1,Math.round(sig.width*rr)),th=Math.max(1,Math.round(sig.height*rr));
      tmp=document.createElement('canvas');tmp.width=tw;tmp.height=th;
      const tx=tmp.getContext('2d',{alpha:true,willReadFrequently:true});if(!tx)return false;
      tx.clearRect(0,0,tw,th);tx.drawImage(sig.image,0,0,tw,th);
      // One readback flushes the temporary canvas, but its content is not used as a rejection gate.
      try{tx.getImageData(0,0,Math.min(tw,8),Math.min(th,8));}catch(_){ }
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.drawImage(tmp,dx,dy,dw,dh);ctx.restore();await nextPaint(8);
      after=snapshotRect(ctx,dx-2,dy-2,dw+4,dh+4);
      return !after||pixelsChanged(before.data,after.data);
    }finally{try{if(tmp){tmp.width=1;tmp.height=1;}}catch(_){ }}
  }
  async function drawSignaturesVerified(ctx,pageNo,sx,sy){
    const all=(typeof fields!=='undefined'?fields:[]).filter(
      f=>Number(f?.page)===Number(pageNo)&&f?.type==='signature'&&typeof state!=='undefined'&&String(state[f.key]||'').trim()
    );
    let painted=0;
    for(const f of all){
      const key=String(f.key||'');const src=String(state[f.key]||'').trim();
      const sig=await loadSignatureDirect(src,'chữ ký '+key);
      const rect=targetRectForField(f,sx,sy,sig.width,sig.height);
      const ok=await drawDirectAndVerify(ctx,sig,rect);
      if(!ok)throw new Error('Chữ ký '+key+' đang hiển thị trên biểu mẫu nhưng iOS chưa đưa được vào trang PDF. Vui lòng bấm XUẤT lại; nếu còn lỗi hãy chụp thông báo này.');
      painted++;
    }
    ctx.canvas.__sagsExpectedSignatures=all.length;ctx.canvas.__sagsPaintedSignatures=painted;
    if(painted!==all.length)throw new Error('Thiếu chữ ký khi dựng PDF iOS ('+painted+'/'+all.length+').');
    return painted;
  }

  const baseRender=root.renderReportPage;
  if(typeof baseRender==='function'){
    const renderIOS=async function(pageNo){
      const page=document.getElementById('page'+pageNo),svg=document.getElementById('svg'+pageNo);
      if(!page||!svg||typeof abs!=='function'||typeof sanitizeSvgForExport!=='function'||typeof v479LoadSvgOverlay!=='function')return await baseRender.apply(this,arguments);
      const bg=page.querySelector('img');if(!bg)return await baseRender.apply(this,arguments);
      activeKey=null;if(!root.__SAGS_EXPORT_BATCH_DRAWN&&typeof draw==='function')draw();stripLiveSignatureImages();
      const baseW=Number(typeof BASE_W!=='undefined'?BASE_W:1241),baseH=Number(typeof BASE_H!=='undefined'?BASE_H:1755),dims=compactDims(baseW,baseH);
      const canvas=document.createElement('canvas');canvas.width=dims.w;canvas.height=dims.h;canvas.__sagsOriginalWidth=dims.w;canvas.__sagsOriginalHeight=dims.h;
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Không tạo được vùng xuất PDF trên iOS.');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const sx=canvas.width/baseW,sy=canvas.height/baseH;
      await new Promise((resolve,reject)=>{if(bg.complete&&bg.naturalWidth){resolve();return;}const oldLoad=bg.onload,oldErr=bg.onerror;bg.onload=e=>{try{oldLoad?.call(bg,e);}catch(_){}resolve();};bg.onerror=e=>{try{oldErr?.call(bg,e);}catch(_){}reject(new Error('Không tải được nền Trang '+pageNo));};});
      ctx.drawImage(bg,0,0,canvas.width,canvas.height);
      const clone=svg.cloneNode(true);clone.querySelectorAll('.hit,.selected-region,image').forEach(el=>el.remove());sanitizeSvgForExport(clone);
      clone.querySelectorAll('text.value').forEach(t=>{t.setAttribute('font-family','Times New Roman');t.setAttribute('font-weight','700');t.setAttribute('dominant-baseline','middle');if(t.classList.contains('manual-value')||t.classList.contains('time-value'))t.setAttribute('fill',String(typeof ENTRY_COLOR!=='undefined'?ENTRY_COLOR:'#0057b8'));if(t.classList.contains('center'))t.setAttribute('text-anchor','middle');if(t.classList.contains('left'))t.setAttribute('text-anchor','start');});
      clone.querySelectorAll('text.tick').forEach(t=>{t.setAttribute('font-family','Arial');t.setAttribute('font-weight','900');t.setAttribute('fill','#111');t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');});
      clone.setAttribute('xmlns',NS);clone.setAttribute('width',String(baseW));clone.setAttribute('height',String(baseH));
      const style=document.createElementNS(NS,'style'),entryColor=String(typeof ENTRY_COLOR!=='undefined'?ENTRY_COLOR:'#0057b8');style.textContent=`.value{font-family:'Times New Roman',serif;font-weight:700;dominant-baseline:middle}.manual-value,.time-value{fill:${entryColor}}.left{text-anchor:start}.center{text-anchor:middle}.tick{font-family:Arial,sans-serif;font-weight:900;fill:#111;text-anchor:middle;dominant-baseline:middle}`;clone.insertBefore(style,clone.firstChild);
      const xml=new XMLSerializer().serializeToString(clone),overlay=await v479LoadSvgOverlay(xml,'dữ liệu Trang '+pageNo);ctx.drawImage(overlay,0,0,canvas.width,canvas.height);try{overlay.onload=null;overlay.onerror=null;overlay.src='';}catch(_){ }
      await drawSignaturesVerified(ctx,pageNo,sx,sy);
      if(Number(pageNo)===4&&typeof state!=='undefined'&&state.bbbtCxrNo!==undefined&&state.bbbtCxrNo!==null&&state.bbbtCxrNo!==''){
        ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.font=`900 ${Math.max(12,28*sy)}px Times New Roman`;ctx.fillStyle='#b54032';ctx.textAlign='right';ctx.textBaseline='top';const no=typeof formatBBBTCxrNo==='function'?formatBBBTCxrNo(state.bbbtCxrNo):state.bbbtCxrNo;ctx.fillText('CXR No: '+no,(baseW-42)*sx,30*sy);ctx.restore();
      }
      await nextPaint(6);return canvas;
    };
    root.renderReportPage=renderIOS;try{renderReportPage=renderIOS;}catch(_){ }
  }

  function buildPdfFromJpegs(jpegPages,fileName,landscape){
    const objects=[],pageCount=jpegPages.length,catalogId=1,pagesId=2,pageIds=[],imageIds=[],contentIds=[];let nextId=3;
    for(let i=0;i<pageCount;i++){pageIds.push(nextId++);imageIds.push(nextId++);contentIds.push(nextId++);}
    objects[catalogId]=asciiBytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);objects[pagesId]=asciiBytes(`<< /Type /Pages /Count ${pageCount} /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] >>`);
    const PW=landscape?841.89:595.28,PH=landscape?595.28:841.89;
    for(let i=0;i<pageCount;i++){const img=jpegPages[i],pId=pageIds[i],iId=imageIds[i],cId=contentIds[i];objects[pId]=asciiBytes(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im${i+1} ${iId} 0 R >> >> /Contents ${cId} 0 R >>`);objects[iId]=concatBytes([asciiBytes(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`),img.bytes,asciiBytes('\nendstream')]);const content=asciiBytes(`q\n${PW} 0 0 ${PH} 0 0 cm\n/Im${i+1} Do\nQ\n`);objects[cId]=concatBytes([asciiBytes(`<< /Length ${content.length} >>\nstream\n`),content,asciiBytes('endstream')]);}
    const parts=[asciiBytes('%PDF-1.4\n')],offsets=new Array(objects.length).fill(0);let pos=parts[0].length;for(let id=1;id<objects.length;id++){offsets[id]=pos;const h=asciiBytes(`${id} 0 obj\n`),t=asciiBytes('\nendobj\n');parts.push(h,objects[id],t);pos+=h.length+objects[id].length+t.length;}const xrefPos=pos;let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let id=1;id<objects.length;id++)xref+=String(offsets[id]).padStart(10,'0')+' 00000 n \n';xref+=`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;parts.push(asciiBytes(xref));return v479PdfPayload(concatBytes(parts),fileName);
  }
  async function lowMemoryPdf(canvases,fileName,landscape){
    const jpg=[];for(const canvas of canvases){const w=Number(canvas?.__sagsOriginalWidth||canvas?.width||1),h=Number(canvas?.__sagsOriginalHeight||canvas?.height||1);const bytes=await canvasToJpegBytes(canvas,landscape?0.86:0.82);jpg.push({bytes,width:w,height:h});try{canvas.width=1;canvas.height=1;}catch(_){ }await nextPaint(4);}return buildPdfFromJpegs(jpg,fileName,landscape);
  }

  const baseLoading208=root.renderLoading208Page;
  if(typeof baseLoading208==='function'){
    const render208IOS=async function(){
      const page=document.getElementById('page13'),bg=page?.querySelector('img'),svg=document.getElementById('svg13');if(!page||!bg||!svg||typeof abs!=='function'||typeof sanitizeSvgForExport!=='function'||typeof v479LoadSvgOverlay!=='function')return await baseLoading208.apply(this,arguments);
      activeKey=null;if(!root.__SAGS_EXPORT_BATCH_DRAWN&&typeof draw==='function')draw();stripLiveSignatureImages();
      const fw=Number(typeof F208_W!=='undefined'?F208_W:1491),fh=Number(typeof F208_H!=='undefined'?F208_H:1055),bw=Number(typeof BASE_W!=='undefined'?BASE_W:1241),bh=Number(typeof BASE_H!=='undefined'?BASE_H:1755),dims=compactDims(fw,fh);
      const canvas=document.createElement('canvas');canvas.width=dims.w;canvas.height=dims.h;canvas.__sagsOriginalWidth=dims.w;canvas.__sagsOriginalHeight=dims.h;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Không tạo được vùng xuất F/SAG-CXR/208 trên iOS.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const sx=canvas.width/bw,sy=canvas.height/bh;
      await new Promise((resolve,reject)=>{if(bg.complete&&bg.naturalWidth){resolve();return;}const oldLoad=bg.onload,oldErr=bg.onerror;bg.onload=e=>{try{oldLoad?.call(bg,e);}catch(_){}resolve();};bg.onerror=e=>{try{oldErr?.call(bg,e);}catch(_){}reject(new Error('Không tải được nền F/SAG-CXR/208'));};});ctx.drawImage(bg,0,0,canvas.width,canvas.height);
      const clone=svg.cloneNode(true);clone.querySelectorAll('.hit,.selected-region,image').forEach(el=>el.remove());sanitizeSvgForExport(clone);clone.querySelectorAll('text.value').forEach(t=>{t.setAttribute('font-family','Times New Roman');t.setAttribute('font-weight','700');t.setAttribute('dominant-baseline','middle');if(t.classList.contains('manual-value')||t.classList.contains('time-value'))t.setAttribute('fill',String(typeof ENTRY_COLOR!=='undefined'?ENTRY_COLOR:'#0057b8'));if(t.classList.contains('center'))t.setAttribute('text-anchor','middle');if(t.classList.contains('left'))t.setAttribute('text-anchor','start');});clone.querySelectorAll('text.tick').forEach(t=>{t.setAttribute('font-family','Arial');t.setAttribute('font-weight','900');t.setAttribute('fill','#111');t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');});clone.setAttribute('xmlns',NS);clone.setAttribute('width',String(bw));clone.setAttribute('height',String(bh));clone.setAttribute('preserveAspectRatio','none');const xml=new XMLSerializer().serializeToString(clone),overlay=await v479LoadSvgOverlay(xml,'dữ liệu F/SAG-CXR/208');ctx.drawImage(overlay,0,0,canvas.width,canvas.height);try{overlay.onload=null;overlay.onerror=null;overlay.src='';}catch(_){ }await drawSignaturesVerified(ctx,13,sx,sy);await nextPaint(6);return canvas;
    };
    root.renderLoading208Page=render208IOS;try{renderLoading208Page=render208IOS;}catch(_){ }
  }

  if(typeof root.canvasesToPdfFile==='function'){const p=async function(canvases,fileName){return await lowMemoryPdf(canvases,fileName,false);};root.canvasesToPdfFile=p;try{canvasesToPdfFile=p;}catch(_){ }}
  if(typeof root.canvasesToLandscapePdfFile==='function'){const p=async function(canvases,fileName){return await lowMemoryPdf(canvases,fileName,true);};root.canvasesToLandscapePdfFile=p;try{canvasesToLandscapePdfFile=p;}catch(_){ }}

  const baseSend=root.sendReport;
  if(typeof baseSend==='function'){
    const sendIOS=async function(){exporting=true;root.__SAGS_IOS_SIGNATURE_EXPORTING=true;try{try{document.activeElement?.blur?.();}catch(_){ }stripLiveSignatureImages();await nextPaint(28);return await baseSend.apply(this,arguments);}finally{releaseSignatureImages();exporting=false;root.__SAGS_IOS_SIGNATURE_EXPORTING=false;try{if(typeof draw==='function')draw();}catch(_){ }await nextPaint(6);}};
    root.sendReport=sendIOS;try{sendReport=sendIOS;}catch(_){ }
  }
  console.info('E-REPORT/SAGS V1.1.94 iOS direct signature PDF fix active');
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from report.js · V4.3.0 ===== */
/* E-REPORT/SAGS V4.2.40
   ONE OFFICIAL SHIFT REPORT + QUICK VOICE REPORT PIPELINE
   - AD / DH / ĐH: create, finalize and export Shift Report.
   - Other authenticated operational accounts: Quick Report via voice/photo.
   - Quick reports are stored in the shared incident source and are automatically
     collected by Shift Report through incident_index when TỔNG HỢP is used. */
(function(root){
  "use strict";
  if(root.__SAGS_REPORT_V428)return;
  root.__SAGS_REPORT_V428=true;

  const S=v=>String(v??"").trim();
  const U=v=>S(v).toUpperCase();
  const MANAGER_ROLES=new Set(["AD","DH","ĐH"]);
  const VIEW_ROLES=new Set(["","VIEW","VIEWER"]);

  let wrappedGetter=null, originalGetter=null;

  function normalizeRole(v){return U(v)}
  function ensureSessionBridge(){
    const current=root.__sagsGetSession;
    if(typeof current!=="function")return false;
    if(current===wrappedGetter)return true;
    originalGetter=current;
    wrappedGetter=function(){
      let s={};
      try{s=originalGetter?.()||{}}catch(_){s={}}
      const p=(s&&typeof s.profile==="object"&&s.profile)||{};
      return {
        ...s,
        username:S(s.username||p.username||p.userName||p.login||p.account),
        role:normalizeRole(s.role||p.role||p.systemRole),
        profile:p
      };
    };
    root.__sagsGetSession=wrappedGetter;
    return true;
  }

  function session(){
    ensureSessionBridge();
    let s={};
    try{s=root.__sagsGetSession?.()||{}}catch(_){}
    const p=s.profile||{};
    return {
      username:S(root.currentUserProfile?.username||s.username||p.username||p.userName||p.login||p.account),
      role:normalizeRole(root.currentRole||s.role||p.role||p.systemRole),
      profile:p
    };
  }

  function loggedIn(){return !!session().username}
  function canQuickReport(){
    const s=session();
    return !!s.username&&!VIEW_ROLES.has(s.role);
  }
  function canOfficialReport(){
    const s=session();
    return !!s.username&&MANAGER_ROLES.has(s.role);
  }

  function openOfficialReport(){
    ensureSessionBridge();
    if(!canOfficialReport()){
      try{alert("Chỉ tài khoản AD hoặc ĐH được phép lập, chốt và xuất BÁO CÁO CA.")}catch(_){}
      return;
    }
    if(typeof root.sagsShiftOpen!=="function"){
      try{alert("BÁO CÁO CA chưa nạp xong. Vui lòng mở lại chức năng.")}catch(_){}
      return;
    }
    return root.sagsShiftOpen();
  }

  function openQuickReport(){
    ensureSessionBridge();
    if(!canQuickReport()){
      try{alert("Tài khoản hiện tại chưa được phép gửi BÁO CÁO NHANH.")}catch(_){}
      return;
    }
    if(typeof root.sagsQuickOpen!=="function"){
      try{alert("BÁO CÁO NHANH chưa nạp xong. Vui lòng mở lại chức năng.")}catch(_){}
      return;
    }
    return root.sagsQuickOpen();
  }

  /* Legacy callers from cached UI all route to the one official report.
     There is no second day/night report anymore. */
  root.v1171OpenDayReport=openOfficialReport;
  root.v1171OpenNightReport=openOfficialReport;

  function normText(v){
    return U(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/Đ/g,"D");
  }

  function setMenuLabel(btn,label,icon,meta){
    if(!btn)return;
    const spans=btn.querySelectorAll("span");
    if(spans[0]&&icon)spans[0].textContent=icon;
    if(spans[1])spans[1].textContent=label;
    if(spans[2]&&meta!==undefined)spans[2].textContent=meta;
    if(!spans.length)btn.textContent=label;
  }

  function createReportSection(body){
    const section=document.createElement("section");
    section.className="v157Section";
    section.dataset.sagsReportSection="1";
    section.innerHTML='<h3 class="v157SectionTitle">BÁO CÁO ĐIỀU HÀNH</h3>';
    const system=[...body.querySelectorAll(".v157Section")].find(sec=>
      normText(sec.querySelector(".v157SectionTitle")?.textContent).includes("HE THONG")
    );
    if(system)body.insertBefore(section,system);
    else body.appendChild(section);
    return section;
  }

  function ensureQuickMenu(){
    const body=document.getElementById("v157MenuBody");
    if(!body||!canQuickReport())return;

    let section=[...body.querySelectorAll(".v157Section")].find(sec=>
      normText(sec.querySelector(".v157SectionTitle")?.textContent).includes("BAO CAO DIEU HANH")
    );
    if(!section)section=createReportSection(body);

    let btn=section.querySelector('[data-sags-quick-report="1"]');
    if(!btn){
      btn=document.createElement("button");
      btn.type="button";
      btn.className="v157MenuItem";
      btn.dataset.sagsQuickReport="1";
      btn.innerHTML='<span class="ico">🎤</span><span>Báo cáo nhanh</span><span class="meta">Nói · ảnh · gửi nguồn chung</span>';
      btn.onclick=()=>{
        try{document.getElementById("v157DrawerBackdrop")?.click()}catch(_){}
        openQuickReport();
      };
      section.appendChild(btn);
    }
  }

  function reconcileDrawer(){
    const shift=document.querySelector('[data-v157-key="shift"]');
    const night=document.querySelector('[data-v157-key="night"]');

    if(shift){
      if(canOfficialReport()){
        shift.hidden=false;
        setMenuLabel(shift,"Báo cáo ca","▤","Chốt · xuất file");
        shift.setAttribute("aria-label","Báo cáo ca");
        shift.title="Báo cáo khai thác ca trực";
      }else{
        shift.remove();
      }
    }
    if(night)night.remove();

    ensureQuickMenu();

    // Remove any other legacy report controls that older cached code can recreate.
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      if(el.id==="srOpen"||el.id==="v157ReportBtn"||el.dataset?.sagsQuickReport==="1")return;
      if(el.matches?.('[data-v157-key="shift"]'))return;
      const t=normText(el.textContent);
      if(
        t.includes("GIAO BAN NGAY")||
        t.includes("BAO CAO BAY DEM")||
        t.includes("BAO CAO CHIEU DEM")||
        t.includes("BAO CAO TINH HINH PHUC VU BAY CHIEU DEM")
      )el.remove();
    });
  }

  /* ---------- Smart Voice: de-duplicate, overlap-merge, aviation vocabulary ---------- */
  let activeVoice=null;

  function voiceCtor(){
    return root.SpeechRecognition||root.webkitSpeechRecognition||null;
  }

  function speechKey(v){
    return S(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/Đ/g,"D").replace(/đ/g,"d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g," ")
      .trim();
  }

  function sameWords(a,b){
    if(a.length!==b.length)return false;
    for(let i=0;i<a.length;i++)if(speechKey(a[i])!==speechKey(b[i]))return false;
    return true;
  }

  function collapseSpeechRepeats(text){
    let tokens=S(text).replace(/\s+/g," ").split(" ").filter(Boolean);
    // Browser STT on mobile can return patterns such as
    // "khi kiểm tra khi kiểm tra" or repeated partial phrases.
    for(let pass=0;pass<6;pass++){
      let changed=false;
      for(let i=0;i<tokens.length;i++){
        const max=Math.min(8,Math.floor((tokens.length-i)/2));
        for(let n=max;n>=1;n--){
          const a=tokens.slice(i,i+n),b=tokens.slice(i+n,i+2*n);
          if(sameWords(a,b)){
            tokens.splice(i+n,n);
            changed=true;
            i=Math.max(-1,i-n);
            break;
          }
        }
      }
      if(!changed)break;
    }
    return tokens.join(" ").trim();
  }

  function aviationTerms(text){
    let t=S(text);
    const upper=["apu","gpu","asu","fod","mvt","mva","uld","pax","adl","chd","inf","sta","std","eta","etd"];
    for(const x of upper)t=t.replace(new RegExp(`\\b${x}\\b`,"gi"),x.toUpperCase());
    t=t.replace(/\bpush\s*back\b/gi,"PUSHBACK")
      .replace(/\bchock\s*on\b/gi,"CHOCK ON")
      .replace(/\bchock\s*off\b/gi,"CHOCK OFF")
      .replace(/\bdoor\s*close\b/gi,"DOOR CLOSE")
      .replace(/\bs[\s-]*mod\b/gi,"S-MOD")
      .replace(/\ba\s*\/\s*c\b/gi,"A/C");
    return t.replace(/\s+([,.;:!?])/g,"$1").replace(/\s+/g," ").trim();
  }

  function cleanSpeech(text){
    return aviationTerms(collapseSpeechRepeats(text));
  }

  function mergeSpeech(existing,incoming){
    const current=S(existing),fresh=cleanSpeech(incoming);
    if(!fresh)return current;

    const curTokens=current.split(/\s+/).filter(Boolean);
    const newTokens=fresh.split(/\s+/).filter(Boolean);
    const curKeys=curTokens.map(speechKey),newKeys=newTokens.map(speechKey);
    const recent=curKeys.slice(-40).join(" "),wholeNew=newKeys.join(" ");
    if(wholeNew&&recent.includes(wholeNew))return current;

    const max=Math.min(16,curKeys.length,newKeys.length);
    let overlap=0;
    for(let n=max;n>=1;n--){
      if(curKeys.slice(-n).join(" ")===newKeys.slice(0,n).join(" ")){
        overlap=n;break;
      }
    }
    const add=newTokens.slice(overlap).join(" ").trim();
    if(!add)return current;
    return current+(current&&!/\s$/.test(current)?" ":"")+add;
  }

  function alternativeScore(alt){
    const raw=S(alt?.transcript),clean=cleanSpeech(raw);
    if(!clean)return -999;
    const rawN=raw.split(/\s+/).filter(Boolean).length||1;
    const cleanN=clean.split(/\s+/).filter(Boolean).length||1;
    const repetitionLoss=Math.max(0,rawN-cleanN);
    const conf=Number(alt?.confidence||0);
    return (conf>0?conf:0.55)*10 + Math.min(cleanN,14)*0.03 - repetitionLoss*0.35;
  }

  function bestAlternative(result){
    let best=null,score=-Infinity;
    const count=Math.min(result?.length||0,3);
    for(let i=0;i<count;i++){
      const alt=result[i],s=alternativeScore(alt);
      if(s>score){score=s;best=alt}
    }
    return best||result?.[0]||null;
  }

  function restoreVoiceUi(v,message=""){
    clearTimeout(v.silenceTimer);
    clearTimeout(v.maxTimer);
    try{v.field.readOnly=v.wasReadOnly}catch(_){}
    try{
      v.btn.classList.remove("listening");
      v.btn.textContent=v.idleLabel;
      v.btn.setAttribute("aria-pressed","false");
    }catch(_){}
    if(v.hint&&message)v.hint.textContent=message;
  }

  function stopVoice(abort=false,message="Đã dừng. Đọc lại chữ trước khi lưu."){
    if(!activeVoice)return;
    const v=activeVoice;
    activeVoice=null;
    clearTimeout(v.silenceTimer);
    clearTimeout(v.maxTimer);
    try{abort?v.rec.abort():v.rec.stop()}catch(_){}
    restoreVoiceUi(v,message);
  }

  function startSmartVoice(field,btn,hint,permissionFn){
    if(permissionFn&&!permissionFn())return;
    const Ctor=voiceCtor();
    if(!Ctor||!root.isSecureContext){
      if(hint)hint.textContent="Trình duyệt chưa hỗ trợ nhận giọng nói hoặc chưa dùng HTTPS. Có thể dùng micro bàn phím.";
      else alert("Trình duyệt chưa hỗ trợ nhận giọng nói. Có thể dùng micro trên bàn phím điện thoại để nhập.");
      return;
    }
    if(activeVoice){
      if(activeVoice.field===field){stopVoice(false);return}
      stopVoice(true,"Đã chuyển sang ô khác.");
    }
    if(field.disabled||field.readOnly)return;

    const rec=new Ctor();
    rec.lang="vi-VN";
    rec.continuous=true;
    rec.interimResults=true;
    try{rec.maxAlternatives=3}catch(_){}

    const idleLabel=S(btn.dataset.sagsIdleLabel||btn.textContent||"🎤 NÓI");
    btn.dataset.sagsIdleLabel=idleLabel;
    const v={rec,field,btn,hint,idleLabel,wasReadOnly:field.readOnly,silenceTimer:0,maxTimer:0,lastKey:"",lastAt:0};
    activeVoice=v;
    field.readOnly=true;
    btn.classList.add("listening");
    btn.textContent="■ DỪNG";
    btn.setAttribute("aria-pressed","true");
    if(hint)hint.textContent="Đang nghe… nói từng câu ngắn, ngắt nhẹ giữa các ý.";

    const armSilence=()=>{
      clearTimeout(v.silenceTimer);
      v.silenceTimer=setTimeout(()=>{
        if(activeVoice===v)stopVoice(false,"Tự dừng vì đã im lặng. Đọc lại chữ trước khi lưu.");
      },6000);
    };
    armSilence();
    v.maxTimer=setTimeout(()=>{
      if(activeVoice===v)stopVoice(false,"Đã đủ 60 giây. Có thể bấm NÓI để ghi tiếp.");
    },60000);

    rec.onspeechstart=armSilence;
    rec.onresult=e=>{
      if(activeVoice!==v||!field.isConnected)return;
      armSilence();
      let interim="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        const r=e.results[i];
        if(r.isFinal){
          const alt=bestAlternative(r),conf=Number(alt?.confidence||0),text=cleanSpeech(alt?.transcript);
          if(!text)continue;
          // Confidence is not supplied by every browser. Only reject when it is
          // explicitly very low; do not reject valid results whose confidence=0.
          if(conf>0&&conf<0.24){
            if(hint)hint.textContent="Đoạn vừa nói nghe chưa rõ nên chưa thêm. Nói lại chậm hơn một chút.";
            continue;
          }
          const key=speechKey(text),now=Date.now();
          if(key&&key===v.lastKey&&now-v.lastAt<5000)continue;
          const merged=mergeSpeech(field.value,text);
          if(merged!==field.value){
            field.value=merged;
            field.dispatchEvent(new Event("input",{bubbles:true}));
            field.dispatchEvent(new Event("change",{bubbles:true}));
          }
          v.lastKey=key;v.lastAt=now;
          if(hint)hint.textContent="Đã nhận: "+text;
        }else{
          const alt=bestAlternative(r);
          interim=cleanSpeech(alt?.transcript);
        }
      }
      if(interim&&hint)hint.textContent="Đang nghe: "+interim;
    };
    rec.onerror=e=>{
      const msg=({
        "not-allowed":"Chưa được cấp micro. Cho phép micro trong trình duyệt hoặc dùng micro bàn phím.",
        "audio-capture":"Không mở được micro.",
        "network":"Lỗi mạng khi nhận giọng nói. Chữ đã nhận được vẫn được giữ.",
        "no-speech":"Chưa nghe rõ. Bấm NÓI để thử lại."
      })[e.error]||"Nhận giọng nói đã dừng. Chữ đã nhận được vẫn được giữ.";
      if(activeVoice===v)activeVoice=null;
      restoreVoiceUi(v,msg);
    };
    rec.onend=()=>{
      if(activeVoice===v){
        activeVoice=null;
        restoreVoiceUi(v,"Đã dừng. Đọc lại chữ trước khi lưu.");
      }
    };
    try{rec.start()}catch(_){
      if(activeVoice===v)activeVoice=null;
      restoreVoiceUi(v,"Không khởi động được micro. Có thể dùng micro bàn phím.");
    }
  }

  const VOICE_FIELDS=[
    ["srChanges","🎤 NÓI · THAY ĐỔI KHAI THÁC"],
    ["srIncidentNote","🎤 NÓI · DIỄN BIẾN / XỬ LÝ"],
    ["srHandover","🎤 NÓI · BÀN GIAO"],
    ["srAdvice","🎤 NÓI · KIẾN NGHỊ"]
  ];

  function installShiftVoice(){
    if(!canOfficialReport())return;
    for(const [id,label] of VOICE_FIELDS){
      const ta=document.getElementById(id);
      if(!ta)continue;
      let b=ta.nextElementSibling?.classList?.contains("srVoiceBtn")?ta.nextElementSibling:null;
      if(!b){
        b=document.createElement("button");
        b.type="button";
        b.className="srVoiceBtn";
        b.textContent="🎤 NÓI";
        b.title=label;
        b.setAttribute("aria-label",label);
        ta.insertAdjacentElement("afterend",b);
      }
      b.dataset.sagsIdleLabel="🎤 NÓI";
      b.onclick=()=>startSmartVoice(ta,b,null,canOfficialReport);
      ta.dataset.sagsVoiceReady="2";
    }
  }

  /* ---------- Quick Report: explain shared aggregation and retire old form bridge ---------- */
  function reconcileQuickModal(){
    const modal=document.getElementById("qiModal");
    if(!modal)return;

    const title=document.getElementById("qiTitle");
    if(title)title.textContent="BÁO CÁO NHANH · NÓI / ẢNH";

    // Replace the V4.2.23 browser speech handler with Smart Voice without
    // changing the Quick Report storage/data flow.
    document.querySelectorAll("#qiModal .qiSpeech").forEach(box=>{
      const field=box.previousElementSibling;
      const b=box.querySelector("button");
      const hint=box.querySelector('[role="status"]');
      if(!field||field.tagName!=="TEXTAREA"||!b)return;
      b.dataset.sagsIdleLabel="🎤 NÓI ĐỂ NHẬP";
      b.dataset.sagsSmartVoice="1";
      if(!b.classList.contains("listening"))b.textContent="🎤 NÓI ĐỂ NHẬP";
      b.onclick=()=>startSmartVoice(field,b,hint,canQuickReport);
      if(hint&&!hint.dataset.sagsSmartHint){
        hint.dataset.sagsSmartHint="1";
        hint.textContent="Nói từng câu ngắn; hệ thống tự lọc đoạn lặp và ghép phần bị chồng.";
      }
    });

    const send=document.getElementById("qiSend");
    if(send&&!document.getElementById("qiSharedReportNote")){
      const note=document.createElement("div");
      note.id="qiSharedReportNote";
      note.className="qiSharedReportNote";
      note.innerHTML="<b>NGUỒN CHUNG BÁO CÁO CA</b><span>GỬI NỘI DUNG + LINK sẽ lưu báo cáo nhanh vào hồ sơ chung. AD/ĐH lấy nội dung này khi bấm TỔNG HỢP trong BÁO CÁO CA rồi rà soát, chốt và xuất file.</span>";
      send.closest(".qiActions")?.insertAdjacentElement("beforebegin",note);
    }

    // The old Quick Incident UI offered "ĐƯA NỘI DUNG VÀO BÁO CÁO"
    // by searching legacy #v1171Form. That form is retired. Shift Report now
    // reads incident_index automatically, so remove only this obsolete manual bridge.
    document.querySelectorAll("#qiEvents article").forEach(card=>{
      [...card.querySelectorAll("button")].forEach(b=>{
        if(normText(b.textContent).includes("DUA NOI DUNG VAO BAO CAO")){
          const sel=b.previousElementSibling;
          if(sel?.tagName==="SELECT")sel.remove();
          b.remove();
          if(!card.querySelector(".qiAutoAggregate")){
            const p=document.createElement("p");
            p.className="qiAutoAggregate";
            p.textContent="✓ Đã nằm trong nguồn chung để BÁO CÁO CA tự tổng hợp.";
            card.appendChild(p);
          }
        }
      });
    });
  }


  /* ---------- Ultra-simple official report: DATE + SHIFT -> EXPORT ---------- */
  function installUltraShiftUi(){
    if(!canOfficialReport())return;
    const panel=document.querySelector("#srModal .srPanel");
    if(!panel)return;

    // IMPORTANT: MutationObserver runs after DOM changes. Reusing the same shell
    // prevents NGÀY/CA/XUẤT from being destroyed and recreated while rendering.
    const existingShell=panel.querySelector(":scope > .sgrUltraShell");
    const existingExport=existingShell?.querySelector("#sgrUltraExport");
    if(existingShell&&existingExport){
      existingShell.hidden=false;
      existingShell.style.display="flex";
      existingExport.hidden=false;
      existingExport.style.display="block";
      existingExport.style.visibility="visible";
      existingExport.style.opacity=existingExport.disabled?".65":"1";
      return;
    }

    const title=document.getElementById("srTitle");
    if(title)title.textContent="BÁO CÁO CA";

    // Remove a previous simplified shell if an old runtime happened to create one.
    panel.querySelectorAll(":scope > .sgrShell").forEach(el=>el.remove());

    const shell=document.createElement("div");
    shell.className="sgrUltraShell";

    const intro=document.createElement("div");
    intro.className="sgrUltraIntro";
    intro.innerHTML="<b>CHỌN NGÀY + CA → XUẤT PDF</b><span>Hệ thống tự đặt giờ ca, tự đọc nguồn và tự tổng hợp. Không cần nhập TỪ / ĐẾN.</span>";

    const fields=document.createElement("div");
    fields.className="sgrUltraFields";

    const dayLabel=document.createElement("label");
    dayLabel.textContent="NGÀY";
    const day=document.createElement("input");
    day.type="date";
    day.id="sgrUltraDay";
    dayLabel.appendChild(day);

    const shiftLabel=document.createElement("label");
    shiftLabel.textContent="CA";
    const shift=document.createElement("select");
    shift.id="sgrUltraShift";
    shift.add(new Option("CA SÁNG · 08:15–18:15","day"));
    shift.add(new Option("CA TỐI · 18:15–08:15 hôm sau","night"));
    shiftLabel.appendChild(shift);

    fields.append(dayLabel,shiftLabel);

    const exportBtn=document.createElement("button");
    exportBtn.type="button";
    exportBtn.id="sgrUltraExport";
    exportBtn.textContent="TẠO & XUẤT PDF";
    exportBtn.hidden=false;
    exportBtn.style.cssText="display:block!important;visibility:visible!important;opacity:1;width:100%;min-height:58px;font-size:17px;font-weight:900;position:relative;z-index:20";

    const exportWrap=document.createElement("div");
    exportWrap.className="sgrUltraExportWrap";
    exportWrap.appendChild(exportBtn);

    const note=document.createElement("div");
    note.className="sgrUltraNote";
    note.textContent="Báo cáo nhanh / sự việc đã gửi trong nguồn chung sẽ được lấy tự động khi tổng hợp.";

    const visibleStatus=document.createElement("p");
    visibleStatus.id="sgrUltraStatus";
    visibleStatus.setAttribute("role","status");
    visibleStatus.setAttribute("aria-live","polite");

    shell.append(intro,fields,exportWrap,note,visibleStatus);
    panel.querySelector("header")?.insertAdjacentElement("afterend",shell);

    const internalDay=document.getElementById("srDay");
    const internalShift=document.getElementById("srShift");
    const localToday=()=>{
      try{
        return new Intl.DateTimeFormat("en-CA",{
          timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"
        }).format(new Date());
      }catch(_){
        return new Date(Date.now()+7*3600000).toISOString().slice(0,10);
      }
    };
    day.value=internalDay?.value||localToday();
    shift.value=internalShift?.value||"day";

    exportBtn.onclick=async()=>{
      if(exportBtn.disabled)return;
      if(!day.value){
        visibleStatus.textContent="Chọn ngày báo cáo.";
        day.focus();
        return;
      }

      exportBtn.disabled=true;
      exportBtn.textContent="ĐANG TỔNG HỢP…";
      visibleStatus.textContent="Đang chuẩn bị ca và đọc dữ liệu…";

      try{
        ensureSessionBridge();

        // A finalized report restores as locked. Starting another DATE/SHIFT means
        // a new report, so reset the finalized screen automatically.
        const loadBtn=document.getElementById("srLoad");
        const newBtn=document.getElementById("srNew");
        if(loadBtn?.disabled&&typeof newBtn?.onclick==="function"){
          const oldConfirm=root.confirm;
          try{
            root.confirm=()=>true;
            await newBtn.onclick();
          }finally{
            root.confirm=oldConfirm;
          }
        }

        const srDay=document.getElementById("srDay");
        const srShift=document.getElementById("srShift");
        const srPreset=document.getElementById("srPreset");
        const srScope=document.getElementById("srScope");
        const srArchive=document.getElementById("srArchive");
        const srPeople=document.getElementById("srPeople");
        const srLoad=document.getElementById("srLoad");
        const srPrint=document.getElementById("srPrint");
        const srStatus=document.getElementById("srStatus");

        if(!srDay||!srShift||!srPreset||!srLoad||!srPrint){
          throw Error("Mô-đun BÁO CÁO CA chưa nạp đầy đủ.");
        }

        srDay.value=day.value;
        srShift.value=shift.value;

        // Existing preset is the single source of shift boundaries:
        // day 08:15–18:15; night 18:15–08:15 next day.
        if(typeof srPreset.onclick==="function")srPreset.onclick();

        if(srScope)srScope.value="all";
        if(srArchive)srArchive.checked=true;

        const s=session();
        if(srPeople&&!S(srPeople.value)){
          srPeople.value=S(s.profile?.name||s.profile?.fullName||s.username);
          srPeople.dispatchEvent(new Event("input",{bubbles:true}));
        }

        visibleStatus.textContent="Đang tổng hợp đúng thời gian ca…";
        if(typeof srLoad.onclick!=="function")throw Error("Không mở được chức năng tổng hợp.");
        await srLoad.onclick();

        const msg=S(srStatus?.textContent);
        if(/^Chưa hoàn tất:/i.test(msg)){
          visibleStatus.textContent=msg;
          return;
        }

        visibleStatus.textContent=msg||"Đã tổng hợp. Đang mở xuất PDF…";
        exportBtn.textContent="ĐANG MỞ PDF…";

        // Export immediately. The existing print function uses the just-loaded
        // report snapshot and opens the system Print / Save PDF dialog.
        if(typeof srPrint.onclick!=="function")throw Error("Không mở được chức năng xuất PDF.");
        await srPrint.onclick();

        visibleStatus.textContent=(msg?msg+" ":"")+"Đã mở chức năng IN / LƯU PDF.";
      }catch(e){
        visibleStatus.textContent="Chưa hoàn tất: "+S(e?.message||e);
      }finally{
        exportBtn.disabled=false;
        exportBtn.textContent="TẠO & XUẤT PDF";
      }
    };
  }

  function reconcileOfficialUi(){
    const srOpen=document.getElementById("srOpen");
    if(srOpen){
      srOpen.hidden=!canOfficialReport();
      srOpen.style.display=canOfficialReport()?"":"none";
    }
    const homeReport=document.getElementById("v157ReportBtn");
    if(homeReport){
      homeReport.textContent=canOfficialReport()?"Mở báo cáo ca →":"Báo cáo nhanh →";
      homeReport.onclick=()=>canOfficialReport()?openOfficialReport():openQuickReport();
    }
    if(!canOfficialReport()){
      document.getElementById("srModal")?.setAttribute("data-not-authorized","1");
    }else{
      installUltraShiftUi();
    }
  }

  function reconcileAll(){
    ensureSessionBridge();
    document.getElementById("v1171ReportModal")?.remove();
    reconcileDrawer();
    reconcileOfficialUi();
    reconcileQuickModal();
  }

  // Capture phase enforces role before old target handlers run.
  document.addEventListener("click",function(ev){
    ensureSessionBridge();
    const el=ev.target?.closest?.('button,a,[role="button"]');
    if(!el)return;

    const official=
      el.id==="srOpen"||
      el.matches?.('[data-v157-key="shift"]');

    if(official&&!canOfficialReport()){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      alert("Chỉ tài khoản AD hoặc ĐH được phép lập, chốt và xuất BÁO CÁO CA. Tài khoản này có thể dùng BÁO CÁO NHANH.");
      return;
    }

    if(el.matches?.('[data-v157-key="night"]')){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      el.remove();
      return;
    }

    const quickSpeechBox=el.closest?.(".qiSpeech");
    if(quickSpeechBox&&el.tagName==="BUTTON"){
      const field=quickSpeechBox.previousElementSibling;
      if(field?.tagName==="TEXTAREA"){
        ev.preventDefault();
        ev.stopImmediatePropagation();
        startSmartVoice(field,el,quickSpeechBox.querySelector('[role="status"]'),canQuickReport);
        return;
      }
    }

    if(el.dataset?.sagsQuickReport==="1"){
      ensureSessionBridge();
    }
  },true);

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      reconcileAll();
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",reconcileAll,{once:true});
  }else{
    reconcileAll();
  }

  new MutationObserver(schedule).observe(document.documentElement,{
    childList:true,
    subtree:true
  });

  ["sags:login","sags:rolechange","sags:profilechange","sags:ui-ready"].forEach(name=>{
    root.addEventListener?.(name,schedule);
  });

  root.addEventListener?.("visibilitychange",()=>{
    if(document.hidden&&activeVoice)stopVoice(true,"Đã dừng micro khi ứng dụng ra nền.");
  });

  // Small non-sensitive diagnostics for support.
  root.sagsReportPermissionCheck=function(){
    const s=session();
    return {
      loggedIn:!!s.username,
      role:s.role||"",
      quickReport:canQuickReport(),
      officialShiftReport:canOfficialReport()
    };
  };
})(typeof window!=="undefined"?window:globalThis);


/* ===== RUNTIME · bundled from v2.1-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.1 · MY FLIGHT REALTIME + ADAPTIVE FILE SHARE
 * Scope:
 * 1) When roster_mail changes for the signed-in user, refresh MY FLIGHT immediately
 *    if the flight list is currently visible. Never force the operator out of an open form.
 * 2) Normalize file sharing across browsers: use native file Share only when supported;
 *    otherwise download/open the file. User-cancelled Share is not treated as an error.
 * This patch intentionally does not change FINAL/CROSSCHECK/KẾT SỔ business logic.
 */
(function(root){
  'use strict';
  const BUILD='V2.1-MYFLIGHT-REALTIME-ADAPTIVE-SHARE';
  if(root.__SAGS_V21_RUNTIME_PATCH===BUILD)return;
  root.__SAGS_V21_RUNTIME_PATCH=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');

  function session(){
    try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}
    catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}
  }
  function normUser(v){
    try{
      if(typeof root.normalizePersonalUsername==='function')return root.normalizePersonalUsername(v);
    }catch(_){}
    return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
  }
  function me(){
    const s=session(),p=s?.profile||root.currentUserProfile||{};
    return normUser(p.username||p.userName||p.code||(U(s?.role)==='AD'?'AD':''));
  }
  function today(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function opDate(){
    return S(document.getElementById('fwcDate')?.value)
      || S(sessionStorage.getItem('sagsV36FwcDate'))
      || today();
  }
  function listVisible(){
    const e=document.getElementById('fwcList');
    if(!e)return false;
    try{
      const cs=getComputedStyle(e);
      return cs.display!=='none'&&cs.visibility!=='hidden'&&e.offsetParent!==null;
    }catch(_){return true}
  }
  function showSyncHint(){
    if(!listVisible())return;
    const body=document.getElementById('fwcBody');
    if(!body)return;
    let e=document.getElementById('v21MyFlightSyncHint');
    if(!e){
      e=document.createElement('div');
      e.id='v21MyFlightSyncHint';
      e.style.cssText='margin:6px 0;padding:7px 9px;border-radius:9px;background:#eef6ff;color:#28506f;font:800 11px/1.35 Arial;';
      const list=document.getElementById('fwcList');
      if(list?.parentNode)list.parentNode.insertBefore(e,list);
      else body.prepend(e);
    }
    e.textContent='ĐANG ĐỒNG BỘ PHÂN CÔNG MỚI…';
    e.style.display='block';
    clearTimeout(showSyncHint._t);
    showSyncHint._t=setTimeout(()=>{try{e.style.display='none'}catch(_){}},1800);
  }

  let refreshTimer=0, refreshAgainTimer=0, refreshing=false, queued=false;
  async function refreshMyFlight(date){
    date=S(date)||opDate();
    if(!listVisible()||typeof root.flightWorkspaceOpenList!=='function')return;
    if(refreshing){queued=true;return}
    refreshing=true;
    try{
      await Promise.resolve(root.flightWorkspaceOpenList(date));
      try{root.v38ApplyListFilter?.()}catch(_){}
      root.dispatchEvent?.(new CustomEvent('sags:v21-myflight-refreshed',{detail:{date,atMs:Date.now()}}));
    }catch(e){
      console.warn('V2.1 MY FLIGHT realtime refresh',e);
    }finally{
      refreshing=false;
      if(queued){queued=false;setTimeout(()=>refreshMyFlight(date),60);}
    }
  }
  function scheduleRefresh(rec){
    const recDate=S(rec?.opDate||rec?.date||rec?.operationDate||'');
    const d=opDate();
    if(recDate&&d&&recDate!==d)return;
    try{root.dailyRosterRestartMailbox?.()}catch(_){}
    if(!listVisible())return;
    showSyncHint();
    clearTimeout(refreshTimer);
    clearTimeout(refreshAgainTimer);
    refreshTimer=setTimeout(()=>refreshMyFlight(recDate||d),70);
    // Second short refresh catches the rare case where the mailbox event reaches the
    // client a fraction before the master flight/manifest is visible to the list reader.
    refreshAgainTimer=setTimeout(()=>refreshMyFlight(recDate||d),420);
  }

  let mailRef=null, boundPath='', mailAdded=null, mailChanged=null, mailRemoved=null;
  function unbindMailbox(){
    try{
      if(mailRef&&mailAdded)mailRef.off('child_added',mailAdded);
      if(mailRef&&mailChanged)mailRef.off('child_changed',mailChanged);
      if(mailRef&&mailRemoved)mailRef.off('child_removed',mailRemoved);
    }catch(_){}
    mailRef=null;boundPath='';mailAdded=mailChanged=mailRemoved=null;
  }
  function bindMailbox(){
    const u=me();
    if(!u||typeof root.sagsV470Ref!=='function')return false;
    const path=`roster_mail/${safe(u)}/items`;
    if(path===boundPath&&mailRef)return true;
    unbindMailbox();
    try{
      const ref=root.sagsV470Ref(path);
      if(!ref||typeof ref.on!=='function')return false;
      mailAdded=s=>scheduleRefresh(s?.val?.()||{});
      mailChanged=s=>scheduleRefresh(s?.val?.()||{});
      mailRemoved=s=>scheduleRefresh(s?.val?.()||{});
      ref.on('child_added',mailAdded);
      ref.on('child_changed',mailChanged);
      ref.on('child_removed',mailRemoved);
      mailRef=ref;boundPath=path;
      root.__SAGS_V21_MAIL_PATH=path;
      return true;
    }catch(e){
      console.warn('V2.1 mailbox bind',e);
      return false;
    }
  }

  function bindWithRetry(){
    let tries=0;
    const tick=()=>{
      if(bindMailbox()||++tries>=30)return;
      setTimeout(tick,500);
    };
    tick();
  }

  // Rebind when the role/session UI changes. This is event-driven; no permanent heartbeat.
  const baseApply=root.applyRoleUI;
  if(typeof baseApply==='function'&&!baseApply.__v21Mailbox){
    const wrapped=function(){
      const r=baseApply.apply(this,arguments);
      Promise.resolve(r).finally(()=>setTimeout(bindMailbox,0));
      return r;
    };
    wrapped.__v21Mailbox=1;
    root.applyRoleUI=wrapped;
    try{applyRoleUI=wrapped}catch(_){}
  }
  window.addEventListener('pageshow',()=>setTimeout(bindMailbox,80),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(bindMailbox,80)},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindWithRetry,{once:true});
  else bindWithRetry();

  /* ---------- Adaptive file share ---------- */
  function isIOS(){
    try{
      const ua=S(navigator.userAgent),p=S(navigator.platform);
      return /iPad|iPhone|iPod/i.test(ua)||(p==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1);
    }catch(_){return false}
  }
  function fileName(file,i=0){
    return S(file?.name)||`SAGS_EXPORT_${Date.now()}${i?`_${i+1}`:''}.pdf`;
  }
  function fallbackFile(file,i=0){
    try{
      const blob=file instanceof Blob?file:new Blob([file],{type:'application/octet-stream'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=fileName(file,i);
      a.rel='noopener';
      if(isIOS())a.target='_blank';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{try{URL.revokeObjectURL(url);a.remove()}catch(_){}},30000);
      return true;
    }catch(e){
      console.warn('V2.1 file fallback',e);
      return false;
    }
  }
  function fallbackFiles(files){
    let ok=false;
    Array.from(files||[]).forEach((f,i)=>{ok=fallbackFile(f,i)||ok});
    return ok;
  }
  function nativeFileCapability(files){
    if(typeof navigator.share!=='function')return false;
    if(typeof navigator.canShare!=='function')return null;
    try{return !!navigator.canShare({files:Array.from(files||[])})}catch(_){return false}
  }

  const nativeShare=typeof navigator.share==='function'?navigator.share.bind(navigator):null;
  async function adaptiveShare(data){
    const files=Array.from(data?.files||[]);
    if(!files.length){
      if(!nativeShare)throw new Error('Trình duyệt không hỗ trợ Share API.');
      return nativeShare(data);
    }
    const cap=nativeFileCapability(files);
    if(cap===false){
      fallbackFiles(files);
      return {fallback:'download'};
    }
    if(nativeShare){
      try{
        await nativeShare(data);
        return {shared:true};
      }catch(e){
        if(e?.name==='AbortError')return {cancelled:true};
        console.warn('V2.1 native file share failed; fallback to download/open',e);
        fallbackFiles(files);
        return {fallback:'download',error:S(e?.message||e)};
      }
    }
    fallbackFiles(files);
    return {fallback:'download'};
  }

  // Shadow navigator.share on this page so legacy export paths inherit the same behavior.
  // URL/text shares are passed through unchanged; only file shares get adaptive fallback.
  if(nativeShare){
    const wrappedShare=function(data){return adaptiveShare(data)};
    wrappedShare.__sagsV21AdaptiveShare=1;
    try{
      Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:wrappedShare});
      root.__SAGS_V21_SHARE_WRAPPED=true;
    }catch(e){
      try{
        navigator.share=wrappedShare;
        root.__SAGS_V21_SHARE_WRAPPED=navigator.share===wrappedShare;
      }catch(_){
        root.__SAGS_V21_SHARE_WRAPPED=false;
        console.info('V2.1 navigator.share could not be shadowed; existing fallback paths remain active.');
      }
    }
  }

  root.sagsV21ShareFile=async function(file,opts={}){
    if(!file)throw new Error('Chưa có file để chia sẻ.');
    const f=file instanceof File?file:new File([file],S(opts.name)||'SAGS_EXPORT.pdf',{type:S(file?.type)||S(opts.type)||'application/pdf',lastModified:Date.now()});
    return adaptiveShare({title:S(opts.title)||f.name.replace(/\.[^.]+$/,''),text:S(opts.text)||undefined,files:[f]});
  };
  root.sagsV21ShareDiagnostics=function(){
    let pdfCap=null;
    try{
      if(typeof File==='function'&&typeof navigator.canShare==='function'){
        pdfCap=navigator.canShare({files:[new File(['%PDF-1.4'],'SAGS_TEST.pdf',{type:'application/pdf'})]});
      }
    }catch(_){pdfCap=false}
    return {
      build:BUILD,
      shareApi:typeof navigator.share==='function',
      canShareApi:typeof navigator.canShare==='function',
      pdfFileShare:pdfCap,
      wrapped:!!root.__SAGS_V21_SHARE_WRAPPED,
      ios:isIOS(),
      userAgent:S(navigator.userAgent)
    };
  };

  // Light UI hint: browser cannot share PDF files natively -> existing GỬI/CHIA SẺ
  // buttons still work, but will save/open the PDF instead.
  function decorateExportButtons(){
    let cap=null;
    try{
      if(typeof File==='function'&&typeof navigator.canShare==='function'){
        cap=navigator.canShare({files:[new File(['%PDF-1.4'],'SAGS_TEST.pdf',{type:'application/pdf'})]});
      }
    }catch(_){cap=false}
    if(cap!==false)return;
    document.querySelectorAll('button').forEach(b=>{
      const t=U(b.textContent);
      if(/GỬI PDF|CHIA SẺ PDF|SHARE PDF/.test(t)){
        b.title='Trình duyệt này không hỗ trợ chia sẻ file PDF trực tiếp. V2.1 sẽ chuyển sang LƯU/TẢI hoặc mở PDF.';
      }
    });
  }
  const mo=new MutationObserver(()=>decorateExportButtons());
  try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(_){}
  setTimeout(decorateExportButtons,500);

})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2 · ARR/DEP CHOICE + LOCAL-FIRST AUTOSAVE
 * BUILD: V2.2-ARRDEP-CHOICE-LOCALFIRST
 *
 * Runtime-only patch: no manual app.js edit required.
 * - First DEP open after an ARR handover: CONTINUE CURRENT SHEET or CREATE NEW DEP SHEET.
 * - NEW DEP keeps only common flight identity/schedule fields; ARR operational entries stay in ARR completion snapshot.
 * - One active DEP form instance per flight/form.
 * - Local-first autosave + background/pagehide checkpoint + pending cloud sync recovery.
 */
(function(root){
  'use strict';
  const BUILD='V2.2-ARRDEP-CHOICE-LOCALFIRST';
  if(root.__SAGS_V22_RUNTIME_PATCH===BUILD)return;
  root.__SAGS_V22_RUNTIME_PATCH=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return null}};
  const normUser=v=>U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_');
  const ownedKey=k=>{try{return typeof root.sagsOwnedKey==='function'?root.sagsOwnedKey(k):k}catch(_){return k}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function me(){const p=session()?.profile||root.currentUserProfile||{};return normUser(p.username||p.userName||p.code||'')}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function opDate(){return S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||S(activeMeta()?.rosterOpDate)||today()}
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function listMeta(aid){try{return (root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===S(aid))||null}catch(_){return null}}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function once(path){return (await db(path).once('value')).val()}
  async function manifest(date){return (await once(`roster_manifests/${safe(date)}`))||{}}
  function itemsOf(man){const it=man?.items;return Array.isArray(it)?it.filter(Boolean):Object.values(it||{}).filter(Boolean)}

  function canonicalForm(v){v=U(v);if(v==='FSAGS'||v==='FSAGS423')return 'FSAGS423';return v||'FORM'}
  function sameLane(a,b){
    if(S(a?.flightId)!==S(b?.flightId))return false;
    if(canonicalForm(a?.formGroup)!==canonicalForm(b?.formGroup))return false;
    const as=U(a?.sourceColumn),bs=U(b?.sourceColumn);
    if(as&&bs&&as!==bs)return false;
    const ar=U(a?.roleKey),br=U(b?.roleKey);
    if(!as&&!bs&&ar&&br&&ar!==br)return false;
    return true;
  }
  function depSourceArr(man,item,st){
    const explicit=S(st?.handoverFromAssignmentId);
    if(explicit){const x=itemsOf(man).find(v=>S(v.assignmentId)===explicit);if(x)return x}
    const pool=itemsOf(man).filter(x=>S(x.assignmentId)!==S(item?.assignmentId)&&sameLane(x,item)&&U(x.assignmentLeg)==='ARR');
    pool.sort((a,b)=>Number(b.workPartOrder||0)-Number(a.workPartOrder||0));
    return pool[0]||null;
  }
  function completed(st){const c=U(st?.claimStatus),w=U(st?.workPartStatus),t=U(st?.taskStatusV333||st?.taskStatus);return !!st?.completionEnvelope||['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(c)||w==='COMPLETED'||t==='COMPLETED'}
  function currentEnvelope(meta){try{return root.readFlightSessionEnvelope?.(meta?.id)||null}catch(_){return null}}

  /* ---------- DEP choice ---------- */
  function ensureChoiceUi(){
    if(document.getElementById('v22DepChoiceModal'))return;
    const st=document.createElement('style');st.id='v22DepChoiceStyle';st.textContent=`
      #v22DepChoiceModal{position:fixed;inset:0;z-index:26000;background:rgba(0,0,0,.58);display:none;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;font-family:Arial,sans-serif}
      #v22DepChoiceModal .box{width:min(94vw,440px);background:#fff;border-radius:16px;padding:16px;box-shadow:0 18px 50px rgba(0,0,0,.35);color:#17324d}
      #v22DepChoiceModal h3{margin:0 0 8px;color:#064f9e;font-size:18px}#v22DepChoiceModal p{font-size:13px;line-height:1.45;margin:7px 0;color:#425466}
      #v22DepChoiceModal .actions{display:grid;gap:8px;margin-top:13px}#v22DepChoiceModal button{border:0;border-radius:11px;padding:12px 10px;font:800 13px Arial}
      #v22DepChoiceContinue{background:#e8f4ff;color:#07599d}#v22DepChoiceNew{background:#eaf7ef;color:#17663b}#v22DepChoiceCancel{background:#eef1f4;color:#5b6874}
      #v22DepBadge{position:fixed;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:15000;display:none;padding:5px 8px;border-radius:999px;background:#eaf7ef;color:#17663b;border:1px solid #b8dec7;font:900 10px Arial;box-shadow:0 2px 7px rgba(0,0,0,.12)}
      #v22SaveBadge{position:fixed;left:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:15000;display:none;padding:5px 8px;border-radius:999px;background:#eef4f8;color:#526777;border:1px solid #ccd9e3;font:800 10px Arial;box-shadow:0 2px 7px rgba(0,0,0,.1)}
    `;document.head.appendChild(st);
    const m=document.createElement('div');m.id='v22DepChoiceModal';m.innerHTML=`<div class="box"><h3>PHẦN DEP</h3><p>Phần ARR trước đã hoàn tất. Chọn cách thực hiện DEP:</p><div class="actions"><button id="v22DepChoiceContinue" type="button">TIẾP TỤC TỜ HIỆN TẠI</button><button id="v22DepChoiceNew" type="button">TẠO TỜ DEP MỚI</button><button id="v22DepChoiceCancel" type="button">ĐỂ SAU</button></div><p><b>Tờ DEP mới</b> chỉ giữ thông tin nhận dạng/lịch chuyến cơ bản; dữ liệu khai thác ARR không bị sao chép sang DEP.</p></div>`;document.body.appendChild(m);
    const dep=document.createElement('div');dep.id='v22DepBadge';document.body.appendChild(dep);
    const save=document.createElement('div');save.id='v22SaveBadge';document.body.appendChild(save);
  }
  function chooseDep(){
    ensureChoiceUi();const m=document.getElementById('v22DepChoiceModal');m.style.display='flex';
    return new Promise(resolve=>{
      const done=v=>{m.style.display='none';for(const id of ['v22DepChoiceContinue','v22DepChoiceNew','v22DepChoiceCancel'])document.getElementById(id).onclick=null;resolve(v)};
      document.getElementById('v22DepChoiceContinue').onclick=()=>done('CONTINUE');
      document.getElementById('v22DepChoiceNew').onclick=()=>done('NEW_DEP');
      document.getElementById('v22DepChoiceCancel').onclick=()=>done('CANCEL');
    });
  }
  function identityKey(raw){
    let k=S(raw).replace(/^f(?:421|551|09)_/i,'');
    k=k.replace(/[^a-z0-9]/gi,'').toLowerCase();
    return /^(fltbefore|fltafter|flightbefore|flightafter|flightno|flightnumber|route1|route2|route3|acreg|aircraftreg|registration|flightdate|opdate|date|std|etd|sta|eta)$/.test(k);
  }
  function baselineEnvelope(src,item,prev){
    src=src&&typeof src==='object'?src:{};const state={},seed={};
    for(const [k,v] of Object.entries(src.state&&typeof src.state==='object'?src.state:{}))if(identityKey(k))state[k]=clone(v);
    for(const [k,v] of Object.entries(src.rosterSeed&&typeof src.rosterSeed==='object'?src.rosterSeed:{}))if(identityKey(k))seed[k]=clone(v);
    return {
      state,rosterSeed:seed,
      mainForm:S(item?.formGroup||src.mainForm||src.activeFormGroup||'fsags'),
      activeFormGroup:S(item?.formGroup||src.mainForm||src.activeFormGroup||'fsags'),
      currentPage:1,scrollY:0,
      arrivalOp:S(src.arrivalOp||'passenger'),departureOp:S(src.departureOp||'passenger'),
      rosterAssignmentId:S(item?.assignmentId),
      v22Phase:'DEP',v22DepNewSheet:true,v22SourceArrAssignmentId:S(prev?.assignmentId),v22CreatedAtMs:Date.now()
    };
  }
  function depInstanceId(item,mode){return `DEP_${safe(S(item?.assignmentId)||Date.now())}_${mode==='NEW_DEP'?'NEW':'CONT'}`}
  async function acquireDepInstance(date,item,mode,prev){
    const fid=S(item?.flightId),form=canonicalForm(item?.formGroup),aid=S(item?.assignmentId),instanceId=depInstanceId(item,mode),path=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}`;
    const lockRef=db(`${path}/activeDepInstance`),now=Date.now();
    let tx=null;
    try{tx=await lockRef.transaction(cur=>{
      if(cur&&U(cur.status)==='ACTIVE'&&S(cur.assignmentId)!==aid)return;
      return {schema:1,instanceId,assignmentId:aid,mode,status:'ACTIVE',ownerUser:me(),createdAtMs:Number(cur?.createdAtMs||now)||now,updatedAtMs:now};
    })}catch(e){throw new Error('Không khóa được tờ DEP: '+S(e?.message||e))}
    if(tx&&tx.committed===false){const v=tx.snapshot?.val?.()||{};throw new Error(`Đang có một tờ DEP khác hoạt động (${S(v.instanceId)||'không xác định'}).`)}
    await db(`${path}/instances/${safe(instanceId)}`).update({schema:1,instanceId,phase:'DEP',mode,status:'ACTIVE',assignmentId:aid,sourceArrAssignmentId:S(prev?.assignmentId),ownerUser:me(),createdAtMs:now,updatedAtMs:now});
    return {instanceId,path};
  }
  async function recordContinue(date,item,prev,st){
    const inst=await acquireDepInstance(date,item,'CONTINUE',prev),now=Date.now();
    await db(`roster_sessions/${safe(item.assignmentId)}`).update({v22DepChoice:'CONTINUE',v22DepChoiceAtMs:now,v22DepChoiceBy:me(),v22FormInstanceId:inst.instanceId,v22FormInstanceMode:'CONTINUE_CURRENT'});
    return inst;
  }
  async function prepareNewDep(date,item,prev,st){
    const inst=await acquireDepInstance(date,item,'NEW_DEP',prev),now=Date.now();
    let src=st?.handoverEnvelope||st?.envelope||null;
    if(!src&&prev?.assignmentId){try{const ps=await once(`roster_sessions/${safe(prev.assignmentId)}`);src=ps?.completionEnvelope||ps?.envelope||null}catch(_){}}
    const env=baselineEnvelope(src||{},item,prev);env.v22FormInstanceId=inst.instanceId;
    await db(`roster_sessions/${safe(item.assignmentId)}`).update({
      envelope:env,envelopeUpdatedAtMs:now,handoverEnvelope:env,handoverEnvelopeAtMs:now,
      v22DepChoice:'NEW_DEP',v22DepChoiceAtMs:now,v22DepChoiceBy:me(),v22FormInstanceId:inst.instanceId,v22FormInstanceMode:'NEW_DEP',v22DepNewSheet:true
    });
    const lm=listMeta(item.assignmentId);if(lm?.id&&typeof root.flightSessionStorageKey==='function')try{localStorage.setItem(root.flightSessionStorageKey(lm.id),JSON.stringify(env))}catch(_){}
    return inst;
  }
  function showDepBadge(meta){
    ensureChoiceUi();const b=document.getElementById('v22DepBadge');if(!meta?.id){b.style.display='none';return}
    const env=currentEnvelope(meta)||{},isDep=U(env.v22Phase)==='DEP'||env.v22DepNewSheet===true;
    if(isDep){b.textContent=env.v22DepNewSheet?'DEP ✓ · TỜ MỚI':'DEP ✓';b.style.display='block'}else b.style.display='none';
  }

  let receivePatched=false,completePatched=false;
  function patchReceive(){
    if(receivePatched)return true;const base=root.v324ReceiveOrOpen;if(typeof base!=='function')return false;
    if(base.__v22DepChoice){receivePatched=true;return true}
    const wrapped=async function(fid){
      const date=opDate();
      try{
        const man=await manifest(date),mine=itemsOf(man).filter(x=>S(x.flightId)===S(fid)&&normUser(x.user||x.targetUser)===me());
        const dep=mine.find(x=>U(x.assignmentLeg)==='DEP');
        if(dep){
          const st=(await once(`roster_sessions/${safe(dep.assignmentId)}`))||{};
          const prev=depSourceArr(man,dep,st);let prevSt=null;
          if(prev?.assignmentId)try{prevSt=await once(`roster_sessions/${safe(prev.assignmentId)}`)}catch(_){}
          const hasHandover=!!(st?.handoverEnvelope||st?.handoverFromAssignmentId||(prevSt&&completed(prevSt)));
          if(hasHandover&&!S(st?.v22DepChoice)){
            const choice=await chooseDep();if(choice==='CANCEL')return;
            if(choice==='NEW_DEP')await prepareNewDep(date,dep,prev,st);else await recordContinue(date,dep,prev,st);
          }
        }
      }catch(e){alert('Không chuẩn bị được phần DEP: '+S(e?.message||e));return}
      const r=await base.apply(this,arguments);setTimeout(()=>showDepBadge(activeMeta()),120);return r;
    };
    wrapped.__v22DepChoice=1;root.v324ReceiveOrOpen=wrapped;receivePatched=true;return true;
  }
  function patchComplete(){
    if(completePatched)return true;const base=root.v324ConfirmRosterHandover;if(typeof base!=='function')return false;
    if(base.__v22DepComplete){completePatched=true;return true}
    const wrapped=async function(){
      const meta=activeMeta(),aid=S(meta?.rosterAssignmentId),date=S(meta?.rosterOpDate)||opDate();let before=null;
      if(aid)try{before=await once(`roster_sessions/${safe(aid)}`)}catch(_){}
      const r=await base.apply(this,arguments);
      if(aid&&S(before?.v22FormInstanceId)){
        try{
          const after=(await once(`roster_sessions/${safe(aid)}`))||{};
          if(completed(after)){
            const man=await manifest(date),item=itemsOf(man).find(x=>S(x.assignmentId)===aid),fid=S(item?.flightId),form=canonicalForm(item?.formGroup),iid=S(before.v22FormInstanceId),path=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}`;
            if(fid&&iid){await db(`${path}/instances/${safe(iid)}`).update({status:'COMPLETED',completedAtMs:Date.now(),completedBy:me(),updatedAtMs:Date.now()});try{await db(`${path}/activeDepInstance`).transaction(cur=>S(cur?.instanceId)===iid?null:cur)}catch(_){}}
          }
        }catch(e){console.warn('V2.2 DEP instance completion',e)}
      }
      return r;
    };
    wrapped.__v22DepComplete=1;root.v324ConfirmRosterHandover=wrapped;completePatched=true;return true;
  }
  function installBusinessHooks(){patchReceive();patchComplete();setTimeout(()=>showDepBadge(activeMeta()),100)}

  /* ---------- Local-first autosave ---------- */
  let saveTimer=0,lastSavedAtMs=0,lastReason='',saveCount=0,lastCloudSyncAtMs=0,lastCloudError='';
  function primaryKey(id){try{return typeof root.flightSessionStorageKey==='function'?root.flightSessionStorageKey(id):''}catch(_){return ''}}
  function checkpointKey(id){return ownedKey(`sagsV22LocalCheckpoint::${S(id)}`)}
  function readCheckpoint(id){try{return JSON.parse(localStorage.getItem(checkpointKey(id))||'null')}catch(_){return null}}
  function useful(env){if(!env||typeof env!=='object')return false;const st=env.state&&typeof env.state==='object'?env.state:{};return Object.values(st).some(v=>v!==null&&v!==undefined&&String(v).trim()!=='')||!!S(env.rosterAssignmentId)||!!S(env.mainForm)}
  function cloudEnvelope(env){
    env=env&&typeof env==='object'?env:{};const state={};
    for(const [k,v] of Object.entries(env.state&&typeof env.state==='object'?env.state:{})){if(/attachment/i.test(k))continue;try{const z=JSON.stringify(v);if(z.length<=180000)state[k]=JSON.parse(z)}catch(_){}}
    return {...clone(env),state,scrollY:Number(env.scrollY)||0};
  }
  function setSaveBadge(text,pending){ensureChoiceUi();const b=document.getElementById('v22SaveBadge');if(!activeMeta()?.id){b.style.display='none';return}b.textContent=text;b.style.display='block';b.style.background=pending?'#fff4dd':'#eef4f8';b.style.color=pending?'#8a5700':'#526777';clearTimeout(setSaveBadge._t);setSaveBadge._t=setTimeout(()=>{try{b.style.display='none'}catch(_){}},2600)}
  function writeCheckpoint(meta,env,reason){
    const now=Date.now(),copy=clone(env)||{};copy.v22LocalRevision=now;copy.v22LocalSavedAtMs=now;copy.v22LocalSaveReason=S(reason);if(meta?.rosterAssignmentId&&!copy.rosterAssignmentId)copy.rosterAssignmentId=S(meta.rosterAssignmentId);
    const pk=primaryKey(meta?.id);try{if(pk)localStorage.setItem(pk,JSON.stringify(copy))}catch(e){console.warn('V2.2 primary local save',e)}
    const cp={schema:2,build:BUILD,sessionId:S(meta?.id),rosterAssignmentId:S(meta?.rosterAssignmentId||copy.rosterAssignmentId),atMs:now,localRevision:now,reason:S(reason),pendingSync:!!meta?.rosterAssignmentId,envelope:copy};
    try{localStorage.setItem(checkpointKey(meta?.id),JSON.stringify(cp))}catch(e){console.warn('V2.2 checkpoint save',e)}return cp;
  }
  function markSynced(cp){const x=readCheckpoint(cp?.sessionId);if(!x||Number(x.localRevision)!==Number(cp.localRevision))return;x.pendingSync=false;x.syncedAtMs=Date.now();try{localStorage.setItem(checkpointKey(cp.sessionId),JSON.stringify(x))}catch(_){}}
  async function flushCloud(cp,meta){
    if(!cp?.pendingSync||!cp?.envelope)return false;const aid=S(cp.rosterAssignmentId||meta?.rosterAssignmentId);if(!aid)return false;
    try{
      const ref=db(`roster_sessions/${safe(aid)}`),snap=await ref.once('value'),remote=snap.val()||{},localRev=Number(cp.localRevision||cp.atMs||0),remoteRev=Number(remote.v22LocalRevision||remote.envelope?.v22LocalRevision||0);
      if(remoteRev>localRev){lastCloudError='Cloud revision mới hơn local; không ghi đè.';return false}
      const now=Date.now(),env=cloudEnvelope(cp.envelope);await ref.update({envelope:env,envelopeUpdatedAtMs:now,updatedAtMs:now,v22LocalRevision:localRev,v22LocalSyncAtMs:now});lastCloudSyncAtMs=now;lastCloudError='';markSynced(cp);setSaveBadge('✓ ĐÃ LƯU',false);return true;
    }catch(e){lastCloudError=S(e?.message||e);setSaveBadge('⏳ ĐÃ LƯU TRÊN MÁY',true);console.warn('V2.2 pending sync',e);return false}
  }
  function persistNow(reason='event'){
    clearTimeout(saveTimer);const meta=activeMeta();if(!meta?.id)return false;
    try{if(typeof root.persist==='function')root.persist()}catch(e){console.warn('V2.2 base persist',e)}
    const env=currentEnvelope(meta);if(!env)return false;const cp=writeCheckpoint(meta,env,reason);lastSavedAtMs=cp.atMs;lastReason=S(reason);saveCount++;setSaveBadge(cp.pendingSync?'⏳ ĐÃ LƯU TRÊN MÁY':'✓ ĐÃ LƯU',cp.pendingSync);Promise.resolve(flushCloud(cp,meta)).catch(()=>{});return true;
  }
  function scheduleSave(reason='input',delay=100){clearTimeout(saveTimer);saveTimer=setTimeout(()=>persistNow(reason),Math.max(0,Number(delay)||0))}
  async function restoreIfNewer(){
    const meta=activeMeta();if(!meta?.id)return false;const cp=readCheckpoint(meta.id);if(!cp?.envelope)return false;const ca=S(cp.rosterAssignmentId||cp.envelope?.rosterAssignmentId),ma=S(meta.rosterAssignmentId);if(ca&&ma&&ca!==ma)return false;
    const cur=currentEnvelope(meta),cr=Number(cur?.v22LocalRevision||cur?.v22LocalSavedAtMs||0),lr=Number(cp.localRevision||cp.atMs||0);let restored=false;
    if(!useful(cur)||lr>cr){const pk=primaryKey(meta.id);try{if(pk)localStorage.setItem(pk,JSON.stringify(cp.envelope));restored=true}catch(_){}}
    if(cp.pendingSync)await flushCloud(cp,meta);return restored;
  }

  document.addEventListener('input',()=>scheduleSave('input',100),true);
  document.addEventListener('change',()=>scheduleSave('change',0),true);
  document.addEventListener('blur',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e?.target?.tagName))scheduleSave('blur',0)},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)persistNow('visibility-hidden');else setTimeout(()=>restoreIfNewer().catch(()=>{}),30)},{passive:true});
  window.addEventListener('pagehide',()=>persistNow('pagehide'),{capture:true});
  window.addEventListener('pageshow',()=>setTimeout(()=>{restoreIfNewer().catch(()=>{});installBusinessHooks()},60),{passive:true});
  window.addEventListener('online',()=>setTimeout(()=>restoreIfNewer().catch(()=>{}),80),{passive:true});
  try{document.addEventListener('freeze',()=>persistNow('freeze'),{capture:true})}catch(_){}

  root.sagsV22SaveNow=reason=>persistNow(reason||'manual');
  root.sagsV22RestoreLocal=()=>restoreIfNewer();
  root.sagsV22AutosaveDiagnostics=()=>{const meta=activeMeta(),cp=meta?.id?readCheckpoint(meta.id):null;return {build:BUILD,lastSavedAtMs,lastReason,saveCount,lastCloudSyncAtMs,lastCloudError,activeSessionId:S(meta?.id),rosterAssignmentId:S(meta?.rosterAssignmentId),checkpointAtMs:Number(cp?.atMs||0),pendingSync:!!cp?.pendingSync}};

  ensureChoiceUi();installBusinessHooks();
  let tries=0;const retry=setInterval(()=>{installBusinessHooks();if(receivePatched&&completePatched||++tries>40)clearInterval(retry)},250);
  setTimeout(()=>restoreIfNewer().catch(()=>{}),800);
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.2-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.2 · DEP RECEIVE AFTER ARR COMPLETED
 * BUILD: V2.2.2-DEP-RECEIVE-AFTER-ARR
 * Base: V2.2-ARRDEP-CHOICE-LOCALFIRST
 *
 * Purpose:
 * - Keep V2.2 as the only ARR/DEP base.
 * - After ARR is truly COMPLETED, notify/refresh the DEP owner's mailbox.
 * - The DEP owner can claim DEP immediately without being stuck at WAITING_PREVIOUS.
 * - First DEP open offers CONTINUE CURRENT SHEET or CREATE NEW DEP SHEET.
 * - NEW DEP keeps only flight identity/schedule baseline and cannot be hydrated back to ARR data.
 * - One active DEP instance per flight/form; stale locks are released safely.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.2-DEP-RECEIVE-AFTER-ARR';
  if(root.__SAGS_V222_DEP_RECEIVE_FIX===BUILD)return;
  root.__SAGS_V222_DEP_RECEIVE_FIX=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return null}};
  const norm=v=>{
    try{
      return typeof root.normalizePersonalUsername==='function'
        ? root.normalizePersonalUsername(v)
        : U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
    }catch(_){
      return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
    }
  };

  function profile(){
    try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}
    catch(_){return root.currentUserProfile||{}}
  }
  function me(){const p=profile();return norm(p.username||p.userName||p.code||'')}
  function today(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function opDate(){
    return S(document.getElementById('fwcDate')?.value)
      ||S(sessionStorage.getItem('sagsV36FwcDate'))
      ||S(activeMeta()?.rosterOpDate)
      ||today();
  }
  function db(path=''){
    if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');
    return root.sagsV470Ref(path);
  }
  async function once(path){return (await db(path).once('value')).val()}
  async function manifest(date){return (await once(`roster_manifests/${safe(date)}`).catch(()=>null))||{}}
  function items(man){
    const x=man?.items;
    return (Array.isArray(x)?x:Object.values(x||{})).filter(v=>v&&v.active!==false&&!v.duplicateInactive);
  }
  function fidOf(man,x,date=''){
    const fid=S(x?.flightId)||S(root.sagsV346ResolveRosterFlightId?.(S(date||man?.opDate)||opDate(),x,{}));
    if(fid&&x&&!x.flightId)x.flightId=fid;
    return fid;
  }
  function isArr(x){return U(x?.assignmentLeg)==='ARR'}
  function isDep(x){return U(x?.assignmentLeg)==='DEP'}
  function canonicalForm(x){
    const g=U(x?.formGroup||x);
    if(g==='FSAGS'||g==='FSAGS423')return 'FSAGS423';
    return g||'FORM';
  }
  function sourceFamily(x){
    const src=U(x?.sourceColumn),rk=U(x?.roleKey),fg=U(x?.formGroup);
    if(rk==='CBTT'||src.includes('GRND_LS')||fg==='FINAL')return 'GRND_LS';
    if(rk==='PAX09'||src.includes('PAX_SUPR')||fg==='FSAGS09')return 'PAX_SUPR';
    if((rk==='LD'||fg==='FSAGS551'||src==='GRND_LD')&&!src.includes('GRND_COR'))return 'GRND_LD';
    if(['COR','BOTH'].includes(rk)||src.includes('GRND_COR')||['FSAGS','FSAGS423','FSAGS421'].includes(fg))return 'GRND_COR';
    return src||rk||fg||'ROSTER';
  }
  function sameWorkFamily(a,b){
    return canonicalForm(a)===canonicalForm(b)&&sourceFamily(a)===sourceFamily(b);
  }
  async function sessionState(aid){
    return (await once(`roster_sessions/${safe(aid)}`).catch(()=>null))||{};
  }
  function completed(st){
    const cs=U(st?.claimStatus),ws=U(st?.workPartStatus),ts=U(st?.taskStatusV333||st?.taskStatus);
    return !!st?.completionEnvelope
      ||Number(st?.completedAtMs||st?.completionEnvelopeAtMs||0)>0
      ||['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(cs)
      ||ws==='COMPLETED'
      ||ts==='COMPLETED';
  }
  function activelyClaimed(st){
    const cs=U(st?.claimStatus),ts=U(st?.taskStatusV333||st?.taskStatus),ws=U(st?.workPartStatus);
    return cs==='CLAIMED'||ts==='IN_PROGRESS'||ws==='IN_PROGRESS';
  }

  function cleanEnvelope(env){
    const x=env&&typeof env==='object'?env:{};
    const src=x.state&&typeof x.state==='object'?x.state:{},state={};
    for(const [k,v] of Object.entries(src)){
      if(/attachment/i.test(k))continue;
      try{
        const z=JSON.stringify(v);
        if(z.length<=180000)state[k]=JSON.parse(z);
      }catch(_){}
    }
    return {
      state,
      mainForm:S(x.mainForm||x.activeFormGroup||'fsags'),
      activeFormGroup:S(x.activeFormGroup||x.mainForm||'fsags'),
      currentPage:Number(x.currentPage)||1,
      scrollY:0,
      arrivalOp:S(x.arrivalOp||'passenger'),
      departureOp:S(x.departureOp||'passenger'),
      rosterSeed:clone(x.rosterSeed||{})||{}
    };
  }
  function identityKey(raw){
    const k=S(raw)
      .replace(/^f(?:423|421|551|09)_/i,'')
      .replace(/[^a-z0-9]/gi,'')
      .toLowerCase();
    return /^(fltbefore|fltafter|flightbefore|flightafter|flight|flightno|flightnumber|fltno|arrflight|depflight|route|route1|route2|route3|acreg|aircraftreg|registration|aircraft|flightdate|opdate|date|std|etd|sta|eta|bay|gate)$/.test(k);
  }
  function depBaseline(src,dep,arr){
    src=cleanEnvelope(src);
    const state={},seed={};
    for(const [k,v] of Object.entries(src.state||{}))if(identityKey(k))state[k]=clone(v);
    for(const [k,v] of Object.entries(src.rosterSeed||{}))if(identityKey(k))seed[k]=clone(v);
    return {
      state,rosterSeed:seed,
      mainForm:S(dep?.formGroup||src.mainForm||'fsags'),
      activeFormGroup:S(dep?.formGroup||src.activeFormGroup||src.mainForm||'fsags'),
      currentPage:1,scrollY:0,
      arrivalOp:S(src.arrivalOp||'passenger'),
      departureOp:S(src.departureOp||'passenger'),
      rosterAssignmentId:S(dep?.assignmentId),
      v22Phase:'DEP',
      v22DepNewSheet:true,
      v222DepNewSheet:true,
      v222SourceArrAssignmentId:S(arr?.assignmentId),
      v222CreatedAtMs:Date.now()
    };
  }

  async function findArrPredecessor(date,man,dep,depSt){
    const depAid=S(dep?.assignmentId),fid=fidOf(man,dep,date);
    if(!depAid||!fid)return null;

    const explicit=S(depSt?.handoverFromAssignmentId);
    if(explicit){
      const item=items(man).find(x=>S(x.assignmentId)===explicit)||null;
      if(item){
        const st=await sessionState(explicit);
        if(completed(st))return {item,st,reason:'HANDOVER_FROM'};
      }
    }

    const rec=(await once(`flight_records/${safe(date)}/${safe(fid)}`).catch(()=>null))||{};
    const hist=Object.values(rec?.workPartHistory||{}).filter(Boolean)
      .sort((a,b)=>Number(b?.atMs||0)-Number(a?.atMs||0));
    const ev=hist.find(x=>
      S(x?.nextAssignmentId)===depAid
      &&U(x?.type)==='WORK_PART_COMPLETED'
      &&U(x?.status)==='COMPLETED'
    );
    if(ev?.assignmentId){
      const item=items(man).find(x=>S(x.assignmentId)===S(ev.assignmentId))||null;
      if(item){
        const st=await sessionState(ev.assignmentId);
        if(completed(st))return {item,st,reason:'WORK_HISTORY'};
      }
    }

    const arrs=items(man).filter(x=>
      isArr(x)
      &&fidOf(man,x,date)===fid
      &&canonicalForm(x)===canonicalForm(dep)
    );
    const rows=[];
    for(const item of arrs){
      const st=await sessionState(item.assignmentId);
      if(!completed(st))continue;
      let score=0;
      if(sameWorkFamily(item,dep))score+=100;
      if(sourceFamily(item)===sourceFamily(dep))score+=25;
      const ao=Number(item.workPartOrder||0),dd=Number(dep.workPartOrder||0);
      if(ao&&dd&&ao<=dd)score+=15;
      score+=Math.min(9,Math.floor(Number(st.completedAtMs||0)/1e12));
      rows.push({item,st,score,reason:'COMPLETED_ARR'});
    }
    rows.sort((a,b)=>b.score-a.score||Number(b.st?.completedAtMs||0)-Number(a.st?.completedAtMs||0));
    return rows[0]||null;
  }

  function ensureChoiceUi(){
    let m=document.getElementById('v222DepChoiceModal');
    if(m)return m;
    const st=document.createElement('style');
    st.id='v222DepChoiceStyle';
    st.textContent=`
      #v222DepChoiceModal{position:fixed;inset:0;z-index:26950;background:rgba(0,0,0,.60);display:none;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;font-family:Arial,sans-serif}
      #v222DepChoiceModal .box{width:min(94vw,450px);background:#fff;border-radius:17px;padding:16px;box-shadow:0 18px 55px rgba(0,0,0,.36);color:#17324d}
      #v222DepChoiceModal h3{margin:0 0 8px;color:#064f9e;font-size:19px}
      #v222DepChoiceModal p{font-size:13px;line-height:1.45;margin:7px 0;color:#425466}
      #v222DepChoiceModal .actions{display:grid;gap:9px;margin-top:13px}
      #v222DepChoiceModal button{border:0;border-radius:11px;padding:13px 10px;font:900 13px Arial}
      #v222Continue{background:#e8f4ff;color:#07599d}
      #v222New{background:#eaf7ef;color:#17663b}
      #v222Later{background:#eef1f4;color:#5b6874}`;
    document.head.appendChild(st);
    m=document.createElement('div');
    m.id='v222DepChoiceModal';
    m.innerHTML=`<div class="box"><h3>DEP ĐÃ SẴN SÀNG</h3><p>Phần ARR trước đã <b>HOÀN TẤT</b>. Chọn cách thực hiện DEP:</p><div class="actions"><button id="v222Continue" type="button">TIẾP TỤC TỜ HIỆN TẠI</button><button id="v222New" type="button">TẠO TỜ DEP MỚI</button><button id="v222Later" type="button">ĐỂ SAU</button></div><p><b>TỜ DEP MỚI</b> chỉ giữ thông tin nhận dạng/lịch chuyến cơ bản. Dữ liệu khai thác ARR vẫn nằm nguyên trong snapshot ARR đã hoàn tất.</p></div>`;
    document.body.appendChild(m);
    return m;
  }
  function chooseDep(){
    const m=ensureChoiceUi();
    m.style.display='flex';
    return new Promise(resolve=>{
      const finish=v=>{
        m.style.display='none';
        for(const id of ['v222Continue','v222New','v222Later']){
          const b=document.getElementById(id);if(b)b.onclick=null;
        }
        resolve(v);
      };
      document.getElementById('v222Continue').onclick=()=>finish('CONTINUE');
      document.getElementById('v222New').onclick=()=>finish('NEW_DEP');
      document.getElementById('v222Later').onclick=()=>finish('CANCEL');
    });
  }

  async function releaseStaleDepLock(date,man,dep){
    const fid=fidOf(man,dep,date),form=canonicalForm(dep);
    if(!fid)return;
    const path=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}/activeDepInstance`;
    let cur=null;try{cur=(await db(path).once('value')).val()||null}catch(_){}
    if(!cur||S(cur.assignmentId)===S(dep.assignmentId))return;
    const oldAid=S(cur.assignmentId),oldItem=items(man).find(x=>S(x.assignmentId)===oldAid)||null;
    const oldSt=oldAid?await sessionState(oldAid):{};
    const stale=!oldItem||completed(oldSt)||!activelyClaimed(oldSt);
    if(stale){
      try{await db(path).transaction(x=>S(x?.assignmentId)===oldAid?null:x)}catch(_){}
    }
  }

  async function ensureDepInstance(date,man,dep,mode,arr){
    await releaseStaleDepLock(date,man,dep);
    const fid=fidOf(man,dep,date),form=canonicalForm(dep),aid=S(dep.assignmentId);
    if(!fid||!aid)throw new Error('Không xác định được hồ sơ DEP.');
    const base=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}`;
    const instanceId=`DEP_${safe(aid)}_${mode==='NEW_DEP'?'NEW':'CONT'}`;
    const now=Date.now(),ref=db(`${base}/activeDepInstance`);
    const tx=await ref.transaction(cur=>{
      if(cur&&U(cur.status)==='ACTIVE'&&S(cur.assignmentId)!==aid)return;
      return {
        schema:3,engine:BUILD,instanceId,assignmentId:aid,mode,status:'ACTIVE',
        ownerUser:me(),sourceArrAssignmentId:S(arr?.assignmentId),
        createdAtMs:Number(cur?.createdAtMs||now)||now,updatedAtMs:now
      };
    });
    if(tx&&tx.committed===false){
      const v=tx.snapshot?.val?.()||{};
      throw new Error(`Đang có tờ DEP khác được xử lý bởi ${norm(v.ownerUser)||'người khác'}.`);
    }
    const lock=tx?.snapshot?.val?.()||{
      schema:3,engine:BUILD,instanceId,assignmentId:aid,mode,status:'ACTIVE',
      ownerUser:me(),sourceArrAssignmentId:S(arr?.assignmentId),createdAtMs:now,updatedAtMs:now
    };
    await db(`${base}/instances/${safe(instanceId)}`).update(lock);
    return {instanceId,base};
  }

  function localMeta(aid){
    try{return (root.readFlightSessionList?.()||[]).find(x=>S(x?.rosterAssignmentId)===S(aid))||null}catch(_){return null}
  }
  function writeLocalEnvelope(aid,env){
    try{
      const lm=localMeta(aid);
      if(lm?.id&&typeof root.flightSessionStorageKey==='function'){
        localStorage.setItem(root.flightSessionStorageKey(lm.id),JSON.stringify(env));
      }
    }catch(e){console.info('V2.2.2 local DEP save',e?.message||e)}
  }

  async function prepareNewDep(date,man,dep,depSt,arrInfo){
    const arr=arrInfo.item,arrSt=arrInfo.st;
    const inst=await ensureDepInstance(date,man,dep,'NEW_DEP',arr);
    const src=arrSt?.completionEnvelope||depSt?.handoverEnvelope||arrSt?.envelope||depSt?.envelope||{};
    const env=depBaseline(src,dep,arr);
    env.v22FormInstanceId=inst.instanceId;
    env.v222FormInstanceId=inst.instanceId;

    const now=Date.now(),aid=S(dep.assignmentId),fid=fidOf(man,dep,date);
    const wk=S(dep.workspaceKey||dep.rosterWorkspaceKey),patch={};
    patch[`roster_sessions/${safe(aid)}/envelope`]=env;
    patch[`roster_sessions/${safe(aid)}/envelopeUpdatedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/handoverEnvelope`]=env;
    patch[`roster_sessions/${safe(aid)}/handoverEnvelopeAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=S(arr.assignmentId);
    patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=norm(arrSt.completedBy||arr.user||arr.targetUser);
    patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt.completedAtMs||arrSt.completionEnvelopeAtMs||now);
    patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
    patch[`roster_sessions/${safe(aid)}/handoverReady`]=true;
    patch[`roster_sessions/${safe(aid)}/v22DepChoice`]='NEW_DEP';
    patch[`roster_sessions/${safe(aid)}/v22DepChoiceAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v22DepChoiceBy`]=me();
    patch[`roster_sessions/${safe(aid)}/v22FormInstanceId`]=inst.instanceId;
    patch[`roster_sessions/${safe(aid)}/v22FormInstanceMode`]='NEW_DEP';
    patch[`roster_sessions/${safe(aid)}/v22DepNewSheet`]=true;
    patch[`roster_sessions/${safe(aid)}/v222PreparedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222PreparedBy`]=me();

    if(wk){
      patch[`roster_flight_workspaces/${safe(wk)}/envelope`]=cleanEnvelope(env);
      patch[`roster_flight_workspaces/${safe(wk)}/envelopeUpdatedAtMs`]=now;
      patch[`roster_flight_workspaces/${safe(wk)}/updatedAtMs`]=now;
      patch[`roster_flight_workspaces/${safe(wk)}/updatedBy`]=me();
      patch[`roster_flight_workspaces/${safe(wk)}/v222Phase`]='DEP';
      patch[`roster_flight_workspaces/${safe(wk)}/v222DepAssignmentId`]=aid;
    }
    if(fid){
      patch[`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(canonicalForm(dep))}/v222LastDepAssignmentId`]=aid;
      patch[`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(canonicalForm(dep))}/v222LastDepCreatedAtMs`]=now;
    }
    await db('').update(patch);
    writeLocalEnvelope(aid,env);
    return env;
  }

  async function prepareContinue(date,man,dep,depSt,arrInfo){
    const arr=arrInfo.item,arrSt=arrInfo.st;
    const inst=await ensureDepInstance(date,man,dep,'CONTINUE',arr);
    const now=Date.now(),aid=S(dep.assignmentId),patch={};
    const src=depSt?.envelope||depSt?.handoverEnvelope||arrSt?.completionEnvelope||arrSt?.envelope||null;
    if(src&&!depSt?.envelope){
      patch[`roster_sessions/${safe(aid)}/envelope`]=cleanEnvelope(src);
      patch[`roster_sessions/${safe(aid)}/envelopeUpdatedAtMs`]=now;
    }
    patch[`roster_sessions/${safe(aid)}/v22DepChoice`]='CONTINUE';
    patch[`roster_sessions/${safe(aid)}/v22DepChoiceAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v22DepChoiceBy`]=me();
    patch[`roster_sessions/${safe(aid)}/v22FormInstanceId`]=inst.instanceId;
    patch[`roster_sessions/${safe(aid)}/v22FormInstanceMode`]='CONTINUE_CURRENT';
    patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=S(arr.assignmentId);
    patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=norm(arrSt.completedBy||arr.user||arr.targetUser);
    patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt.completedAtMs||arrSt.completionEnvelopeAtMs||now);
    patch[`roster_sessions/${safe(aid)}/v222PreparedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222PreparedBy`]=me();
    await db('').update(patch);
  }

  async function depCandidate(date,man,fid){
    const u=me(),rows=[];
    for(const dep of items(man)){
      if(!isDep(dep)||fidOf(man,dep,date)!==S(fid)||norm(dep.user||dep.targetUser)!==u)continue;
      const st=await sessionState(dep.assignmentId);
      if(completed(st))continue;
      const arr=await findArrPredecessor(date,man,dep,st);
      if(arr)rows.push({dep,st,arr});
    }
    rows.sort((a,b)=>Number(a.dep.workPartOrder||999)-Number(b.dep.workPartOrder||999));
    return rows[0]||null;
  }

  async function notifyDepReady(date,man,arrItem,arrSt){
    if(!arrItem||!isArr(arrItem)||!completed(arrSt))return false;
    const fid=fidOf(man,arrItem,date);if(!fid)return false;
    const deps=items(man).filter(x=>
      isDep(x)
      &&fidOf(man,x,date)===fid
      &&canonicalForm(x)===canonicalForm(arrItem)
    );
    if(!deps.length)return false;
    const same=deps.filter(x=>sameWorkFamily(x,arrItem));
    const pool=(same.length?same:deps).sort((a,b)=>Number(a.workPartOrder||999)-Number(b.workPartOrder||999));

    let dep=null,depSt=null;
    for(const x of pool){
      const s=await sessionState(x.assignmentId);
      if(completed(s))continue;
      dep=x;depSt=s;break;
    }
    if(!dep)return false;

    const now=Date.now(),aid=S(dep.assignmentId),depUser=norm(dep.user||dep.targetUser),patch={};
    const env=arrSt.completionEnvelope||arrSt.envelope||{};
    patch[`roster_sessions/${safe(aid)}/ownerUser`]=depUser;
    patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=S(arrItem.assignmentId);
    patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=norm(arrSt.completedBy||arrItem.user||arrItem.targetUser);
    patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt.completedAtMs||arrSt.completionEnvelopeAtMs||now);
    patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
    patch[`roster_sessions/${safe(aid)}/handoverReady`]=true;
    patch[`roster_sessions/${safe(aid)}/claimStatus`]='READY';
    patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='UNCLAIMED';
    patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='READY';
    patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222ArrReadyAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222ArrReadyFromAssignmentId`]=S(arrItem.assignmentId);
    if(env&&Object.keys(env).length){
      patch[`roster_sessions/${safe(aid)}/handoverEnvelope`]=cleanEnvelope(env);
      patch[`roster_sessions/${safe(aid)}/handoverEnvelopeAtMs`]=now;
    }

    // Important: touch the DEP owner's mailbox so a logged-in second device/account
    // receives child_changed and refreshes MY FLIGHT immediately.
    if(depUser){
      patch[`roster_mail/${safe(depUser)}/items/${safe(aid)}/handoverReady`]=true;
      patch[`roster_mail/${safe(depUser)}/items/${safe(aid)}/previousPartCompletedAtMs`]=Number(arrSt.completedAtMs||arrSt.completionEnvelopeAtMs||now);
      patch[`roster_mail/${safe(depUser)}/items/${safe(aid)}/readyAtMs`]=now;
      patch[`roster_mail/${safe(depUser)}/items/${safe(aid)}/v222ArrReadyFromAssignmentId`]=S(arrItem.assignmentId);
    }

    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='UNCLAIMED';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='CHƯA NHẬN';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='READY';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/ownerUser`]=depUser;
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;

    await db('').update(patch);
    return true;
  }

  async function claimDepDirect(date,man,cand){
    const dep=cand.dep,arr=cand.arr.item,aid=S(dep.assignmentId),fid=fidOf(man,dep,date),u=me();
    if(!aid||!fid||norm(dep.user||dep.targetUser)!==u)throw new Error('DEP không thuộc tài khoản hiện tại.');
    const proof=await findArrPredecessor(date,man,dep,await sessionState(aid));
    if(!proof||!completed(proof.st))throw new Error('ARR trước chưa có dấu HOÀN TẤT hợp lệ.');

    const gid=S(dep.coAssigneeGroupId),patch={},now=Date.now();
    if(gid){
      const lockRef=db(`roster_co_claims/${safe(date)}/${safe(gid)}`);
      const tx=await lockRef.transaction(cur=>{
        const owner=norm(cur?.claimedBy),status=U(cur?.status),curAid=S(cur?.claimedAssignmentId);
        if(status==='CLAIMED'&&owner&&owner!==u)return;
        return {
          schema:1,groupId:gid,status:'CLAIMED',claimedBy:u,claimedAssignmentId:aid,
          claimedAtMs:Number(cur?.claimedAtMs||now)||now,updatedAtMs:now,
          opDate:date,flightId:fid,formGroup:S(dep.formGroup),sourceColumn:S(dep.sourceColumn),
          claimSource:'V2.2.2_DEP_AFTER_ARR'
        };
      });
      if(tx&&tx.committed===false){
        const x=tx.snapshot?.val?.()||{};
        throw new Error(`DEP đang được ${norm(x.claimedBy)||'người khác'} xử lý.`);
      }
      const peers=items(man).filter(x=>S(x.coAssigneeGroupId)===gid&&S(x.assignmentId)!==aid);
      for(const p of peers){
        const pid=S(p.assignmentId);if(!pid)continue;
        patch[`roster_sessions/${safe(pid)}/claimStatus`]='STANDBY';
        patch[`roster_sessions/${safe(pid)}/taskStatusV333`]='UNCLAIMED';
        patch[`roster_sessions/${safe(pid)}/taskAvailabilityV333`]='STANDBY';
        patch[`roster_sessions/${safe(pid)}/coClaimedBy`]=u;
        patch[`roster_sessions/${safe(pid)}/coClaimedAssignmentId`]=aid;
        patch[`roster_sessions/${safe(pid)}/updatedAtMs`]=now;
      }
      patch[`roster_sessions/${safe(aid)}/coClaimedBy`]=u;
      patch[`roster_sessions/${safe(aid)}/coClaimedAssignmentId`]=aid;
    }

    patch[`roster_sessions/${safe(aid)}/ownerUser`]=u;
    patch[`roster_sessions/${safe(aid)}/claimStatus`]='CLAIMED';
    patch[`roster_sessions/${safe(aid)}/workPartStatus`]='IN_PROGRESS';
    patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';
    patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='ACTIVE';
    patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/claimedAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/claimedBy`]=u;
    patch[`roster_sessions/${safe(aid)}/handoverReady`]=false;
    patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
    patch[`roster_sessions/${safe(aid)}/v222DirectClaimAtMs`]=now;
    patch[`roster_sessions/${safe(aid)}/v222DirectClaimFromArrAssignmentId`]=S(arr.assignmentId);
    patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=now;

    patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}`]={
      assignmentId:aid,username:u,name:S(profile().name||profile().fullName||u),
      formGroup:S(dep.formGroup),sourceColumn:S(dep.sourceColumn),
      workPartOrder:Number(dep.workPartOrder||1),workPartTotal:Number(dep.workPartTotal||1),
      coAssigneeGroupId:gid||null,status:'CLAIMED',taskStatus:'IN_PROGRESS',
      claimedAtMs:now,updatedAtMs:now,claimSource:'V2.2.2_DEP_AFTER_ARR'
    };
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='IN_PROGRESS';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='ĐANG LÀM';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='ACTIVE';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/ownerUser`]=u;
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;

    await db('').update(patch);
    return true;
  }

  async function prepareAndClaimBeforeOpen(fid){
    const date=opDate(),man=await manifest(date),cand=await depCandidate(date,man,fid);
    if(!cand)return {handled:false};

    const st=await sessionState(cand.dep.assignmentId);
    let choice=U(st.v22DepChoice);
    if(!['NEW_DEP','CONTINUE'].includes(choice)){
      choice=await chooseDep();
      if(choice==='CANCEL')return {handled:true,cancel:true};
      if(choice==='NEW_DEP')await prepareNewDep(date,man,cand.dep,st,cand.arr);
      else await prepareContinue(date,man,cand.dep,st,cand.arr);
    }else if(choice==='NEW_DEP'){
      const current=await sessionState(cand.dep.assignmentId);
      const good=current?.v22DepNewSheet===true
        &&(current?.envelope?.v22DepNewSheet===true||current?.envelope?.v222DepNewSheet===true);
      if(!good)await prepareNewDep(date,man,cand.dep,current,cand.arr);
    }

    const latest=await sessionState(cand.dep.assignmentId);
    if(!activelyClaimed(latest)){
      await claimDepDirect(date,man,cand);
    }
    return {handled:true,mode:choice,aid:S(cand.dep.assignmentId)};
  }

  function captureArr(){
    const meta=activeMeta(),aid=S(meta?.rosterAssignmentId);
    if(!aid)return null;
    return {aid,date:S(meta?.rosterOpDate)||opDate()};
  }
  async function arrContext(x){
    if(!x)return null;
    const man=await manifest(x.date),item=items(man).find(v=>S(v.assignmentId)===x.aid)||null;
    return item?{...x,man,item}:null;
  }

  function patchReceive(){
    const base=root.v324ReceiveOrOpen;
    if(typeof base!=='function'||base.__v222DepReceive)return false;
    const wrapped=async function(fid){
      try{
        const prep=await prepareAndClaimBeforeOpen(S(fid));
        if(prep?.cancel)return false;
      }catch(e){
        alert('Không nhận được DEP: '+S(e?.message||e));
        return false;
      }
      const r=await base.apply(this,arguments);

      // Re-apply the exact NEW DEP envelope after all older wrappers have finished.
      setTimeout(async()=>{
        try{
          const meta=activeMeta(),aid=S(meta?.rosterAssignmentId);
          if(!aid)return;
          const st=await sessionState(aid);
          if(U(st?.v22DepChoice)==='NEW_DEP'&&st?.envelope?.v22DepNewSheet===true){
            writeLocalEnvelope(aid,st.envelope);
          }
        }catch(_){}
      },100);
      return r;
    };
    wrapped.__v222DepReceive=1;
    wrapped.__v222Base=base;
    root.v324ReceiveOrOpen=wrapped;
    try{v324ReceiveOrOpen=wrapped}catch(_){}
    return true;
  }

  function patchComplete(){
    const base=root.v324ConfirmRosterHandover;
    if(typeof base!=='function'||base.__v222DepReceive)return false;
    const wrapped=async function(){
      let before=null;
      try{before=await arrContext(captureArr())}catch(_){}
      const r=await base.apply(this,arguments);
      try{
        if(before?.item&&isArr(before.item)){
          const after=await sessionState(before.aid);
          if(completed(after)){
            const fresh=await manifest(before.date);
            await notifyDepReady(before.date,fresh,before.item,after);
          }
        }
      }catch(e){console.warn('V2.2.2 ARR->DEP ready notify',e)}
      return r;
    };
    wrapped.__v222DepReceive=1;
    wrapped.__v222Base=base;
    root.v324ConfirmRosterHandover=wrapped;
    try{v324ConfirmRosterHandover=wrapped}catch(_){}
    return true;
  }

  function install(){
    patchReceive();
    patchComplete();
  }
  install();
  setTimeout(install,250);
  setTimeout(install,700);
  setTimeout(install,1500);
  setTimeout(install,3000);
  window.addEventListener('pageshow',()=>setTimeout(install,80),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,80)},{passive:true});

  root.sagsV222DepDiagnostics=async function(fid='') {
    const date=opDate(),man=await manifest(date),f=S(fid);
    const candidates=[];
    for(const dep of items(man)){
      if(!isDep(dep)||norm(dep.user||dep.targetUser)!==me()||(f&&fidOf(man,dep,date)!==f))continue;
      const st=await sessionState(dep.assignmentId),arr=await findArrPredecessor(date,man,dep,st);
      candidates.push({
        aid:S(dep.assignmentId),fid:fidOf(man,dep,date),user:norm(dep.user||dep.targetUser),
        claimStatus:S(st.claimStatus),taskStatus:S(st.taskStatusV333),
        availability:S(st.taskAvailabilityV333),choice:S(st.v22DepChoice),
        arrAid:S(arr?.item?.assignmentId),arrDone:!!arr&&completed(arr.st)
      });
    }
    return {
      build:BUILD,
      baseV22:root.__SAGS_V22_RUNTIME_PATCH||'',
      date,user:me(),
      receivePatched:!!root.v324ReceiveOrOpen?.__v222DepReceive,
      completePatched:!!root.v324ConfirmRosterHandover?.__v222DepReceive,
      candidates
    };
  };
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.5-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.5 · SIGNATURE EXPORT STORAGE FIX
 * BUILD: V2.2.5-SIGNATURE-EXPORT-STORAGE-FIX-R2
 * Base in production: V2.2.2 + V2.2 local-first autosave.
 *
 * Fix:
 * - V2.2 stored the full envelope twice in localStorage:
 *   primary session key + sagsV22LocalCheckpoint::<session>.
 *   A signature/image-heavy form can therefore hit browser quota.
 * - Keep only ONE physical envelope copy (primary key).
 * - Checkpoint becomes metadata + envelopeRef, but V2.2 still sees a virtual
 *   full checkpoint through a transparent getItem compatibility shim.
 * - Before export, flush current in-memory form once.
 * - If already inside the same roster assignment, v310ExportAssignment no
 *   longer switches/reloads the same session before opening export.
 * - During the short export-open window only, legacy non-essential cache writes
 *   may ignore QuotaExceededError; normal editing/autosave errors are NOT hidden.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.5-SIGNATURE-EXPORT-STORAGE-FIX-R2';
  if(root.__SAGS_V225_SIGNATURE_EXPORT===BUILD)return;
  root.__SAGS_V225_SIGNATURE_EXPORT=BUILD;

  const S=v=>String(v??'').trim();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const nativeGet=Storage.prototype.getItem;
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;

  let exportDepth=0;
  let compactedCount=0;
  let hydratedReads=0;
  let ignoredQuotaWrites=0;
  let lastQuotaKey='';
  let lastQuotaAtMs=0;
  let lastCompactAtMs=0;

  function isLocal(store){
    try{return store===root.localStorage}catch(_){return false}
  }
  function isQuota(e){
    const n=S(e?.name),m=S(e?.message).toLowerCase();
    return n==='QuotaExceededError'||n==='NS_ERROR_DOM_QUOTA_REACHED'||m.includes('quota');
  }
  function isCheckpointKey(k){
    return S(k).includes('sagsV22LocalCheckpoint::');
  }
  function activeMeta(){
    try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}
  }
  function primaryKeyForSession(id){
    try{return typeof root.flightSessionStorageKey==='function'?S(root.flightSessionStorageKey(id)):''}catch(_){return ''}
  }
  function parseJson(s){
    try{return JSON.parse(s)}catch(_){return null}
  }
  function compactCheckpointValue(key,value){
    const cp=parseJson(value);
    if(!cp||typeof cp!=='object'||!cp.envelope)return {value,changed:false};

    const sid=S(cp.sessionId);
    const pk=primaryKeyForSession(sid);
    if(!pk)return {value,changed:false};

    const envText=JSON.stringify(cp.envelope);
    let primary=nativeGet.call(root.localStorage,pk);

    if(!primary){
      try{
        nativeSet.call(root.localStorage,pk,envText);
        primary=envText;
      }catch(e){
        // If the checkpoint itself is already occupying a lot of quota, remove
        // that old duplicate once and retry the canonical primary write.
        if(isQuota(e)){
          try{
            nativeRemove.call(root.localStorage,key);
            nativeSet.call(root.localStorage,pk,envText);
            primary=envText;
          }catch(_){}
        }
      }
    }else{
      // V2.2 writes primary immediately before checkpoint. Do not write a second
      // full copy here; primary is already canonical.
    }

    if(!primary)return {value,changed:false};

    const compact={...cp};
    delete compact.envelope;
    compact.envelopeRef=pk;
    compact.envelopeBytes=envText.length;
    compact.compactedBy=BUILD;
    compact.compactedAtMs=Date.now();
    return {value:JSON.stringify(compact),changed:true};
  }

  Storage.prototype.setItem=function(key,value){
    if(!isLocal(this))return nativeSet.call(this,key,value);

    const k=S(key);
    let v=String(value);

    if(isCheckpointKey(k)){
      try{
        const c=compactCheckpointValue(k,v);
        v=c.value;
        if(c.changed){
          compactedCount++;
          lastCompactAtMs=Date.now();
        }
      }catch(_){}
    }

    try{
      return nativeSet.call(this,key,v);
    }catch(e){
      // ONLY while opening/exporting a PDF. Editing/autosave outside this window
      // keeps the original error behavior so data-loss problems are not hidden.
      if(exportDepth>0 && isQuota(e) && (
        k.includes('rampFullTestV17Data')
        || isCheckpointKey(k)
        || k===primaryKeyForSession(activeMeta()?.id)
      )){
        ignoredQuotaWrites++;
        lastQuotaKey=k;
        lastQuotaAtMs=Date.now();
        console.warn('V2.2.5 export quota guard:',k);
        return;
      }
      throw e;
    }
  };

  Storage.prototype.getItem=function(key){
    const raw=nativeGet.call(this,key);
    if(!isLocal(this)||!raw||!isCheckpointKey(key))return raw;

    const cp=parseJson(raw);
    if(!cp||cp.envelope||!S(cp.envelopeRef))return raw;

    try{
      const envRaw=nativeGet.call(root.localStorage,S(cp.envelopeRef));
      const env=parseJson(envRaw);
      if(!env)return raw;
      hydratedReads++;
      return JSON.stringify({...cp,envelope:env});
    }catch(_){
      return raw;
    }
  };

  function migrateExistingCheckpoints(){
    let n=0;
    try{
      const keys=[];
      for(let i=0;i<root.localStorage.length;i++){
        const k=root.localStorage.key(i);
        if(isCheckpointKey(k))keys.push(k);
      }
      for(const k of keys){
        const raw=nativeGet.call(root.localStorage,k);
        if(!raw)continue;
        const c=compactCheckpointValue(k,raw);
        if(c.changed){
          try{
            nativeSet.call(root.localStorage,k,c.value);
            n++;
          }catch(e){
            console.warn('V2.2.5 checkpoint migration',e);
          }
        }
      }
    }catch(e){
      console.warn('V2.2.5 checkpoint scan',e);
    }
    compactedCount+=n;
    if(n)lastCompactAtMs=Date.now();
    return n;
  }

  async function preExportSave(){
    try{
      // Blur an active field so input/change handlers commit their current value.
      const a=document.activeElement;
      if(a&&['INPUT','TEXTAREA','SELECT'].includes(a.tagName))a.blur();
    }catch(_){}
    await new Promise(r=>setTimeout(r,0));

    try{
      if(typeof root.sagsV22SaveNow==='function')root.sagsV22SaveNow('pre-export-signature');
      else if(typeof root.persist==='function')root.persist();
    }catch(e){
      if(!isQuota(e))console.warn('V2.2.5 pre-export save',e);
    }
    await new Promise(r=>setTimeout(r,20));
  }

  async function inExportWindow(fn,args,self){
    exportDepth++;
    try{
      await preExportSave();
      return await fn.apply(self,args);
    }finally{
      // Keep the guard alive only long enough for export modal preparation.
      setTimeout(()=>{exportDepth=Math.max(0,exportDepth-1)},350);
    }
  }

  function patchOpenExport(){
    const base=root.openExportChoiceMenu;
    if(typeof base!=='function'||base.__v225SignatureExport)return false;

    const wrapped=async function(){
      return inExportWindow(base,arguments,this);
    };
    wrapped.__v225SignatureExport=1;
    wrapped.__v225Base=base;
    root.openExportChoiceMenu=wrapped;
    try{openExportChoiceMenu=wrapped}catch(_){}
    return true;
  }

  function patchV310Export(){
    const base=root.v310ExportAssignment;
    if(typeof base!=='function'||base.__v225SignatureExport)return false;

    const wrapped=async function(aid){
      aid=S(aid);
      const meta=activeMeta();
      const activeAid=S(meta?.rosterAssignmentId);

      // The old function closes the cockpit and switchFlightSession(meta.id)
      // even when the operator is already on that exact form. Right after signing
      // this unnecessary reload can read an older local copy. For the same active
      // assignment, export directly from current in-memory state instead.
      if(aid&&activeAid&&aid===activeAid&&typeof root.openExportChoiceMenu==='function'){
        return inExportWindow(root.openExportChoiceMenu,[/* no args */],this);
      }

      return inExportWindow(base,arguments,this);
    };
    wrapped.__v225SignatureExport=1;
    wrapped.__v225Base=base;
    root.v310ExportAssignment=wrapped;
    try{v310ExportAssignment=wrapped}catch(_){}
    return true;
  }

  function install(){
    patchOpenExport();
    patchV310Export();
  }

  // Migrate old duplicate full checkpoints once after startup; not on every export.
  setTimeout(()=>migrateExistingCheckpoints(),350);
  install();
  setTimeout(install,250);
  setTimeout(install,700);
  setTimeout(install,1500);
  setTimeout(install,3000);
  window.addEventListener('pageshow',()=>setTimeout(install,60),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,60)},{passive:true});

  root.sagsV225StorageDiagnostics=function(){
    let checkpointCount=0,checkpointBytes=0,primaryBytes=0;
    try{
      for(let i=0;i<root.localStorage.length;i++){
        const k=root.localStorage.key(i),v=nativeGet.call(root.localStorage,k)||'';
        if(isCheckpointKey(k)){checkpointCount++;checkpointBytes+=v.length}
      }
      const pk=primaryKeyForSession(activeMeta()?.id);
      if(pk)primaryBytes=(nativeGet.call(root.localStorage,pk)||'').length;
    }catch(_){}
    return {
      build:BUILD,
      checkpointCount,checkpointBytes,activePrimaryBytes:primaryBytes,
      compactedCount,hydratedReads,ignoredQuotaWrites,lastQuotaKey,lastQuotaAtMs,lastCompactAtMs,
      exportDepth,
      openExportPatched:!!root.openExportChoiceMenu?.__v225SignatureExport,
      v310ExportPatched:!!root.v310ExportAssignment?.__v225SignatureExport
    };
  };
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.6-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.6 · SIGNATURE LEGACY QUOTA FIX
 * BUILD: V2.2.6-SIGNATURE-LEGACY-QUOTA-FIX
 * Base: V2.2.5 R2 + V2.2.2 ARR/DEP.
 *
 * Exact recurring bug fixed:
 * saveSignature() stores a PNG data URL in state and immediately calls persist().
 * persist() first writes the canonical flight session envelope, then writes the
 * same large state again to legacy "rampFullTestV17Data::<user>".
 * V2.2.5 only ignored that legacy quota error inside the EXPORT window, but the
 * signature persist happens BEFORE exportDepth starts. Result: signing can throw
 * QuotaExceededError and the operator cannot proceed to export.
 *
 * V2.2.6 rules:
 * 1) Canonical sagsFlightSessionV1:* remains mandatory and is NEVER silently dropped.
 * 2) Legacy rampFullTestV17Data is best-effort only. If a canonical session exists,
 *    do not physically duplicate the full state there.
 * 3) Before every canonical session write, remove obsolete legacy duplicates and
 *    compact old full V2.2 checkpoints when their canonical session already exists.
 * 4) If canonical write still exceeds quota after safe cleanup, rethrow the error.
 *    Normal autosave/data-integrity failures are therefore never hidden.
 * 5) Never clear all website data and never delete a checkpoint that is the only
 *    recoverable copy of a session.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.6-SIGNATURE-LEGACY-QUOTA-FIX';
  if(root.__SAGS_V226_SIGNATURE_QUOTA===BUILD)return;
  root.__SAGS_V226_SIGNATURE_QUOTA=BUILD;

  const S=v=>String(v??'').trim();
  const previousSet=Storage.prototype.setItem;
  const currentGet=Storage.prototype.getItem;
  const nativeRemove=Storage.prototype.removeItem;

  let legacyRemoved=0;
  let checkpointsCompacted=0;
  let legacyWritesSkipped=0;
  let canonicalRetries=0;
  let canonicalQuotaErrors=0;
  let lastCleanupAtMs=0;
  let lastCanonicalKey='';
  let lastLegacyKey='';

  function isLocal(store){
    try{return store===root.localStorage}catch(_){return false}
  }

  function isQuota(e){
    const n=S(e?.name);
    const m=S(e?.message).toLowerCase();
    return n==='QuotaExceededError'
      ||n==='NS_ERROR_DOM_QUOTA_REACHED'
      ||m.includes('quota')
      ||m.includes('storage')&&m.includes('exceed');
  }

  function isLegacyKey(key){
    return S(key).includes('rampFullTestV17Data');
  }

  function isCheckpointKey(key){
    return S(key).includes('sagsV22LocalCheckpoint::');
  }

  function isCanonicalSessionKey(key){
    return S(key).includes('sagsFlightSessionV1:');
  }

  function parseJson(raw){
    try{return JSON.parse(raw)}catch(_){return null}
  }

  function allKeys(){
    const a=[];
    try{
      for(let i=0;i<root.localStorage.length;i++){
        const k=root.localStorage.key(i);
        if(k)a.push(k);
      }
    }catch(_){}
    return a;
  }

  function canonicalExists(){
    try{
      for(const k of allKeys()){
        if(!isCanonicalSessionKey(k))continue;
        const v=currentGet.call(root.localStorage,k);
        if(v&&v!=='{}')return true;
      }
    }catch(_){}
    return false;
  }

  function primaryKeyForSessionId(sessionId){
    try{
      if(typeof root.flightSessionStorageKey==='function'){
        return S(root.flightSessionStorageKey(sessionId));
      }
    }catch(_){}
    // Fallback: infer the owned prefix from an existing canonical key.
    const sid=S(sessionId);
    if(!sid)return '';
    for(const k of allKeys()){
      const i=k.indexOf('sagsFlightSessionV1:');
      if(i>=0)return k.slice(0,i)+'sagsFlightSessionV1:'+sid;
    }
    return '';
  }

  function removeLegacyDuplicates(){
    if(!canonicalExists())return 0;
    let n=0;
    for(const k of allKeys()){
      if(!isLegacyKey(k))continue;
      try{
        nativeRemove.call(root.localStorage,k);
        n++;
        lastLegacyKey=k;
      }catch(_){}
    }
    if(n){
      legacyRemoved+=n;
      lastCleanupAtMs=Date.now();
    }
    return n;
  }

  function compactRecoverableCheckpoints(){
    let n=0;
    for(const k of allKeys()){
      if(!isCheckpointKey(k))continue;

      let raw='';
      try{raw=currentGet.call(root.localStorage,k)||''}catch(_){}
      if(!raw)continue;

      const cp=parseJson(raw);
      if(!cp||typeof cp!=='object'||!cp.envelope)continue;

      const sid=S(cp.sessionId);
      const pk=primaryKeyForSessionId(sid);
      if(!pk)continue;

      let primary='';
      try{primary=currentGet.call(root.localStorage,pk)||''}catch(_){}
      // Safety: if checkpoint is the only copy, leave it untouched.
      if(!primary)continue;

      const compact={...cp};
      let bytes=0;
      try{bytes=JSON.stringify(cp.envelope).length}catch(_){}
      delete compact.envelope;
      compact.envelopeRef=pk;
      compact.envelopeBytes=bytes;
      compact.compactedBy=BUILD;
      compact.compactedAtMs=Date.now();

      try{
        previousSet.call(root.localStorage,k,JSON.stringify(compact));
        n++;
      }catch(e){
        // Replacing a large value with a smaller one should normally work.
        // If it does not, preserve the original checkpoint.
        console.info('V2.2.6 checkpoint compact skipped',k,e?.name||e?.message||e);
      }
    }
    if(n){
      checkpointsCompacted+=n;
      lastCleanupAtMs=Date.now();
    }
    return n;
  }

  function safeCleanupBeforeCanonical(){
    // Order matters: removing the old legacy full-state duplicate releases space
    // immediately, then checkpoint compaction releases another duplicate copy.
    removeLegacyDuplicates();
    compactRecoverableCheckpoints();
  }

  Storage.prototype.setItem=function(key,value){
    if(!isLocal(this))return previousSet.call(this,key,value);

    const k=S(key);
    const v=String(value);

    // Canonical session is the source of truth. Make room for it first.
    if(isCanonicalSessionKey(k)){
      lastCanonicalKey=k;
      safeCleanupBeforeCanonical();

      try{
        return previousSet.call(this,k,v);
      }catch(e){
        if(!isQuota(e))throw e;

        // One deterministic retry after another safe cleanup. We do NOT delete
        // unrelated app/site data and do NOT suppress a second canonical failure.
        canonicalRetries++;
        safeCleanupBeforeCanonical();
        try{
          return previousSet.call(this,k,v);
        }catch(e2){
          if(isQuota(e2))canonicalQuotaErrors++;
          throw e2;
        }
      }
    }

    // Legacy state is only a backward-compatibility bootstrap. persist() writes the
    // canonical session BEFORE this legacy key. If canonical data exists, writing
    // the same signed/image-heavy state again is unnecessary and caused the exact
    // historical quota failure.
    if(isLegacyKey(k)){
      lastLegacyKey=k;

      if(canonicalExists()){
        try{nativeRemove.call(this,k)}catch(_){}
        legacyWritesSkipped++;
        lastCleanupAtMs=Date.now();
        return;
      }

      // No canonical session exists yet: preserve old bootstrap behavior.
      try{
        return previousSet.call(this,k,v);
      }catch(e){
        // Do not hide a quota error if legacy is genuinely the only data path.
        throw e;
      }
    }

    return previousSet.call(this,k,v);
  };

  function startupCleanup(){
    try{
      removeLegacyDuplicates();
      compactRecoverableCheckpoints();
    }catch(e){
      console.info('V2.2.6 startup cleanup',e);
    }
  }

  // Run immediately, then once after V2.2.5's own migration timer.
  startupCleanup();
  setTimeout(startupCleanup,500);
  window.addEventListener('pageshow',()=>setTimeout(startupCleanup,50),{passive:true});

  root.sagsV226StorageDiagnostics=function(){
    let legacyBytes=0,legacyCount=0,checkpointBytes=0,checkpointCount=0,canonicalBytes=0,canonicalCount=0;
    try{
      for(const k of allKeys()){
        const raw=currentGet.call(root.localStorage,k)||'';
        if(isLegacyKey(k)){legacyCount++;legacyBytes+=raw.length}
        if(isCheckpointKey(k)){checkpointCount++;checkpointBytes+=raw.length}
        if(isCanonicalSessionKey(k)){canonicalCount++;canonicalBytes+=raw.length}
      }
    }catch(_){}
    return {
      build:BUILD,
      canonicalCount,canonicalBytes,
      legacyCount,legacyBytes,
      checkpointCount,checkpointBytes,
      legacyRemoved,legacyWritesSkipped,checkpointsCompacted,
      canonicalRetries,canonicalQuotaErrors,
      lastCanonicalKey,lastLegacyKey,lastCleanupAtMs,
      v225:typeof root.sagsV225StorageDiagnostics==='function'
        ?root.sagsV225StorageDiagnostics()
        :null
    };
  };
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.7-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.7 · SIGNATURE STORAGE RECOVERY
 * BUILD: V2.2.7-SIGNATURE-STORAGE-RECOVERY
 * Base: V2.2.6 + V2.2.5 R2 + V2.2.2 ARR/DEP
 *
 * This patch handles the remaining quota case proved on real devices:
 * canonical sagsFlightSessionV1:* itself can exceed localStorage quota.
 *
 * Fix strategy:
 * 1) All future legacy 1600x420 signature PNG outputs are transparently stored
 *    at 640x168 (same aspect ratio, transparent PNG).
 * 2) Existing 1600x420 signature PNGs inside ALL local flight sessions,
 *    checkpoints, and legacy state are migrated to the compact size.
 * 3) MY FLIGHT waits for the safe local signature migration before opening a
 *    new assignment, so old sessions can release quota first.
 * 4) Export also waits for migration, then keeps the V2.2.5 pre-export behavior.
 * 5) No unrelated localStorage keys are deleted. No signature is removed:
 *    old signatures are resized and retained.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.7-SIGNATURE-STORAGE-RECOVERY';
  const TARGET_W=640;
  const TARGET_H=168; // exact same ratio as 1600x420
  const OLD_W=1600;
  const OLD_H=420;

  if(root.__SAGS_V227_SIGNATURE_STORAGE===BUILD)return;
  root.__SAGS_V227_SIGNATURE_STORAGE=BUILD;

  const S=v=>String(v??'').trim();
  const nativeToDataURL=(typeof HTMLCanvasElement!=='undefined')
    ?HTMLCanvasElement.prototype.toDataURL
    :null;

  let sourceCompacted=0;
  let migratedSignatures=0;
  let migratedKeys=0;
  let migrationErrors=0;
  let lastMigrationAtMs=0;
  let lastMigrationReason='';
  let migrationPromise=null;
  let receivePatched=false;
  let exportPatched=false;

  function isSignatureCanvas(c){
    return !!c
      &&Number(c.width)===OLD_W
      &&Number(c.height)===OLD_H;
  }

  // FUTURE SIGNATURES:
  // Both handwritten signature save and imported signature image currently
  // serialize a transparent 1600x420 PNG. Store the same visual at 640x168.
  if(nativeToDataURL){
    const wrappedToDataURL=function(type,quality){
      const mime=S(type).toLowerCase();
      if(isSignatureCanvas(this)&&(!mime||mime==='image/png')){
        try{
          const c=document.createElement('canvas');
          c.width=TARGET_W;
          c.height=TARGET_H;
          const ctx=c.getContext('2d');
          if(ctx){
            ctx.imageSmoothingEnabled=true;
            ctx.imageSmoothingQuality='high';
            ctx.clearRect(0,0,TARGET_W,TARGET_H);
            ctx.drawImage(this,0,0,OLD_W,OLD_H,0,0,TARGET_W,TARGET_H);
            const out=nativeToDataURL.call(c,'image/png');
            const original=nativeToDataURL.call(this,'image/png');
            // Only use compact copy when it is actually smaller.
            if(out&&out.length<original.length){
              sourceCompacted++;
              return out;
            }
            return original;
          }
        }catch(e){
          console.info('V2.2.7 signature source compact skipped',e?.message||e);
        }
      }
      return nativeToDataURL.call(this,type,quality);
    };
    wrappedToDataURL.__sagsV227=1;
    HTMLCanvasElement.prototype.toDataURL=wrappedToDataURL;
  }

  function pngDimensions(dataUrl){
    try{
      if(typeof dataUrl!=='string'||!dataUrl.startsWith('data:image/png;base64,'))return null;
      const b64=dataUrl.slice(dataUrl.indexOf(',')+1);
      // 32 decoded bytes are enough for PNG signature + IHDR width/height.
      const raw=atob(b64.slice(0,48));
      if(raw.length<24)return null;
      const u=i=>raw.charCodeAt(i)&255;
      if(u(0)!==137||u(1)!==80||u(2)!==78||u(3)!==71)return null;
      const width=((u(16)<<24)>>>0)+(u(17)<<16)+(u(18)<<8)+u(19);
      const height=((u(20)<<24)>>>0)+(u(21)<<16)+(u(22)<<8)+u(23);
      return {width,height};
    }catch(_){
      return null;
    }
  }

  function isOldSignatureDataUrl(v){
    const d=pngDimensions(v);
    return !!d&&d.width===OLD_W&&d.height===OLD_H;
  }

  async function resizeOldSignature(dataUrl){
    if(!isOldSignatureDataUrl(dataUrl)||!nativeToDataURL)return dataUrl;
    try{
      const img=new Image();
      img.decoding='async';
      await new Promise((resolve,reject)=>{
        img.onload=()=>resolve();
        img.onerror=()=>reject(new Error('signature image decode failed'));
        img.src=dataUrl;
      });
      const c=document.createElement('canvas');
      c.width=TARGET_W;
      c.height=TARGET_H;
      const ctx=c.getContext('2d');
      if(!ctx)return dataUrl;
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.clearRect(0,0,TARGET_W,TARGET_H);
      ctx.drawImage(img,0,0,OLD_W,OLD_H,0,0,TARGET_W,TARGET_H);
      const out=nativeToDataURL.call(c,'image/png');
      // Never replace with a larger representation.
      if(out&&out.length<dataUrl.length){
        migratedSignatures++;
        return out;
      }
      return dataUrl;
    }catch(e){
      migrationErrors++;
      console.info('V2.2.7 old signature resize skipped',e?.message||e);
      return dataUrl;
    }
  }

  async function compactNode(node){
    if(typeof node==='string'){
      return isOldSignatureDataUrl(node)?await resizeOldSignature(node):node;
    }
    if(Array.isArray(node)){
      let changed=false;
      const out=[];
      for(const v of node){
        const nv=await compactNode(v);
        if(nv!==v)changed=true;
        out.push(nv);
      }
      return changed?out:node;
    }
    if(node&&typeof node==='object'){
      let changed=false;
      const out={};
      for(const [k,v] of Object.entries(node)){
        const nv=await compactNode(v);
        if(nv!==v)changed=true;
        out[k]=nv;
      }
      return changed?out:node;
    }
    return node;
  }

  function relevantLocalKey(k){
    const x=S(k);
    return x.includes('sagsFlightSessionV1:')
      ||x.includes('sagsV22LocalCheckpoint::')
      ||x.includes('rampFullTestV17Data');
  }

  function physicalKeys(){
    const keys=[];
    try{
      for(let i=0;i<root.localStorage.length;i++){
        const k=root.localStorage.key(i);
        if(k&&relevantLocalKey(k))keys.push(k);
      }
    }catch(_){}
    return keys;
  }

  async function compactKey(k){
    let raw='';
    try{raw=root.localStorage.getItem(k)||''}catch(_){}
    if(!raw||!raw.includes('data:image/png;base64,'))return false;

    let obj;
    try{obj=JSON.parse(raw)}catch(_){return false;}

    const beforeCount=migratedSignatures;
    const compact=await compactNode(obj);
    if(migratedSignatures===beforeCount||compact===obj)return false;

    let next='';
    try{next=JSON.stringify(compact)}catch(_){return false;}
    if(!next||next.length>=raw.length)return false;

    try{
      // V2.2.6 storage wrapper stays active and performs its own safe duplicate
      // cleanup before canonical session writes.
      root.localStorage.setItem(k,next);
      migratedKeys++;
      return true;
    }catch(e){
      migrationErrors++;
      console.warn('V2.2.7 compact key failed',k,e);
      return false;
    }
  }

  function hasCanonicalSession(){
    try{
      for(let i=0;i<root.localStorage.length;i++){
        const k=root.localStorage.key(i);
        if(k&&k.includes('sagsFlightSessionV1:')&&(root.localStorage.getItem(k)||''))return true;
      }
    }catch(_){}
    return false;
  }

  function removeRedundantLegacyOnly(){
    // V2.2.6 already does this. Repeat narrowly here for devices that loaded
    // an old key after startup. Never remove it if no canonical session exists.
    if(!hasCanonicalSession())return;
    const keys=physicalKeys().filter(k=>k.includes('rampFullTestV17Data'));
    for(const k of keys){
      try{root.localStorage.removeItem(k)}catch(_){}
    }
  }

  async function migrateAll(reason='manual'){
    if(migrationPromise)return migrationPromise;
    migrationPromise=(async()=>{
      lastMigrationReason=reason;
      try{
        removeRedundantLegacyOnly();
        const keys=physicalKeys();
        for(const k of keys){
          await compactKey(k);
          // Yield between sessions so older phones remain responsive.
          await new Promise(r=>setTimeout(r,0));
        }
        removeRedundantLegacyOnly();
        lastMigrationAtMs=Date.now();
        return true;
      }finally{
        migrationPromise=null;
      }
    })();
    return migrationPromise;
  }

  function patchReceive(){
    const base=root.v324ReceiveOrOpen;
    if(typeof base!=='function'||base.__v227StorageRecovery)return false;
    const wrapped=async function(){
      await migrateAll('before-my-flight');
      return base.apply(this,arguments);
    };
    wrapped.__v227StorageRecovery=1;
    wrapped.__v227Base=base;
    root.v324ReceiveOrOpen=wrapped;
    try{v324ReceiveOrOpen=wrapped}catch(_){}
    receivePatched=true;
    return true;
  }

  function patchExport(){
    const base=root.openExportChoiceMenu;
    if(typeof base!=='function'||base.__v227StorageRecovery)return false;
    const wrapped=async function(){
      await migrateAll('before-export');
      return base.apply(this,arguments);
    };
    wrapped.__v227StorageRecovery=1;
    wrapped.__v227Base=base;
    root.openExportChoiceMenu=wrapped;
    try{openExportChoiceMenu=wrapped}catch(_){}
    exportPatched=true;
    return true;
  }

  function install(){
    patchReceive();
    patchExport();
  }

  // Startup recovery for devices already carrying large historical signatures.
  setTimeout(()=>{void migrateAll('startup')},180);
  install();
  setTimeout(install,300);
  setTimeout(install,900);
  setTimeout(install,1800);
  setTimeout(install,3200);
  window.addEventListener('pageshow',()=>{
    setTimeout(install,60);
    setTimeout(()=>{void migrateAll('pageshow')},120);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      setTimeout(install,60);
      setTimeout(()=>{void migrateAll('resume')},120);
    }
  },{passive:true});

  root.sagsV227StorageRecovery=()=>migrateAll('manual');

  root.sagsV227StorageDiagnostics=async function(){
    let canonicalCount=0,canonicalChars=0,checkpointCount=0,checkpointChars=0,oldSignatureCount=0;
    try{
      for(const k of physicalKeys()){
        const raw=root.localStorage.getItem(k)||'';
        if(k.includes('sagsFlightSessionV1:')){canonicalCount++;canonicalChars+=raw.length}
        if(k.includes('sagsV22LocalCheckpoint::')){checkpointCount++;checkpointChars+=raw.length}
        if(raw.includes('data:image/png;base64,')){
          try{
            const obj=JSON.parse(raw);
            const walk=x=>{
              if(typeof x==='string'){if(isOldSignatureDataUrl(x))oldSignatureCount++;return}
              if(Array.isArray(x)){x.forEach(walk);return}
              if(x&&typeof x==='object')Object.values(x).forEach(walk);
            };
            walk(obj);
          }catch(_){}
        }
      }
    }catch(_){}

    let estimate=null;
    try{
      if(navigator.storage?.estimate)estimate=await navigator.storage.estimate();
    }catch(_){}

    return {
      build:BUILD,
      signatureStoredSize:`${TARGET_W}x${TARGET_H}`,
      canonicalCount,canonicalChars,
      checkpointCount,checkpointChars,
      oldSignatureCount,
      sourceCompacted,migratedSignatures,migratedKeys,migrationErrors,
      lastMigrationAtMs,lastMigrationReason,
      receivePatched,exportPatched,
      storageEstimate:estimate,
      v226:typeof root.sagsV226StorageDiagnostics==='function'
        ?root.sagsV226StorageDiagnostics()
        :null
    };
  };
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.9-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.9 · PDF EXPORT COMPLETE / SHARE FIX
 * BUILD: V2.2.9-PDF-EXPORT-COMPLETE-SHARE-FIX
 * Base production: V2.2.7
 *
 * Real-device symptom fixed:
 * - PDF is already generated/exported, but the export UI remains at
 *   "Đang hoàn tất PDF...".
 * - Pressing XUẤT again can then open the native share sheet.
 *
 * Root cause class:
 * Mobile Web Share requires a live user activation. PDF rendering is async;
 * on some browsers that activation has expired before navigator.share() is
 * reached. Some WebView/browser builds reject, while some remain pending.
 * The legacy caller keeps awaiting that Promise, so the PDF is ready but the
 * progress UI never transitions to DONE.
 *
 * V2.2.9:
 * 1) Never call file-share without a live user gesture when UserActivation API
 *    says the gesture is already gone.
 * 2) If a share Promise remains pending while the page is still visible/focused,
 *    release the export caller instead of leaving "Đang hoàn tất PDF..." forever.
 * 3) Keep the generated File and show an explicit "CHIA SẺ / LƯU PDF" button.
 *    Its tap is a NEW user gesture, so native Share opens reliably.
 * 4) If native share/download already completed, transition stuck progress text
 *    to "PDF đã tạo xong." and re-enable ĐÓNG.
 * 5) No business data, form data, signature data, FINAL/CROSSCHECK/KẾT SỔ logic
 *    is changed.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.9-PDF-EXPORT-COMPLETE-SHARE-FIX';
  if(root.__SAGS_V229_PDF_EXPORT===BUILD)return;
  root.__SAGS_V229_PDF_EXPORT=BUILD;

  const S=v=>String(v??'').trim();
  const FILE_SHARE_TIMEOUT_MS=3200;

  let installed=false;
  let baseNavigatorShare=null;
  let baseSagsShareFile=null;
  let pendingShareData=null;
  let pendingShareSource='';
  let deferredCount=0;
  let watchdogCount=0;
  let completedCount=0;
  let cancelledCount=0;
  let lastReason='';
  let lastAtMs=0;

  function hasFiles(data){
    try{return !!(data&&data.files&&Array.from(data.files).length)}catch(_){return false}
  }
  function activationKnownInactive(){
    try{
      return !!navigator.userActivation && navigator.userActivation.isActive===false;
    }catch(_){return false}
  }
  function pageStillForeground(){
    try{
      const visible=document.visibilityState!=='hidden';
      const focused=typeof document.hasFocus==='function'?document.hasFocus():true;
      return visible&&focused;
    }catch(_){return true}
  }
  function isRetryableGestureError(e){
    const n=S(e?.name);
    const m=S(e?.message||e).toLowerCase();
    return n==='NotAllowedError'
      ||n==='SecurityError'
      ||n==='InvalidStateError'
      ||m.includes('user activation')
      ||m.includes('user gesture')
      ||m.includes('not allowed')
      ||m.includes('permission');
  }

  function fileLabel(data){
    try{
      const f=Array.from(data?.files||[])[0];
      return S(f?.name)||'PDF';
    }catch(_){return 'PDF'}
  }

  function ensureReadyUi(){
    let box=document.getElementById('v229PdfReady');
    if(box)return box;

    const st=document.createElement('style');
    st.id='v229PdfReadyStyle';
    st.textContent=`
      #v229PdfReady{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);
        z-index:2147482000;width:min(92vw,470px);display:none;box-sizing:border-box;background:#fff;color:#17324d;
        border:1px solid #cbd9e6;border-radius:16px;padding:11px;box-shadow:0 10px 35px rgba(0,0,0,.28);font-family:Arial,sans-serif}
      #v229PdfReady.show{display:block}
      #v229PdfReady .v229row{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center}
      #v229PdfReady .v229title{font:900 14px/1.2 Arial;color:#0b5ea8}
      #v229PdfReady .v229sub{margin-top:3px;font:700 10px/1.3 Arial;color:#687c90;word-break:break-word}
      #v229PdfReady button{border:0;border-radius:11px;min-height:44px;padding:9px 13px;font:900 12px Arial}
      #v229PdfReadyShare{background:#e7f7ed;color:#176b3b}
      #v229PdfReadyClose{margin-top:7px;width:100%;background:#eef2f6;color:#536579;min-height:36px!important}
      @media print{#v229PdfReady{display:none!important}}
    `;
    document.head.appendChild(st);

    box=document.createElement('div');
    box.id='v229PdfReady';
    box.innerHTML=`
      <div class="v229row">
        <div>
          <div class="v229title">PDF ĐÃ TẠO XONG</div>
          <div id="v229PdfReadySub" class="v229sub">Bấm CHIA SẺ / LƯU để mở Share Sheet.</div>
        </div>
        <button id="v229PdfReadyShare" type="button">CHIA SẺ / LƯU PDF</button>
      </div>
      <button id="v229PdfReadyClose" type="button">ẨN THÔNG BÁO</button>
    `;
    document.body.appendChild(box);

    document.getElementById('v229PdfReadyClose').onclick=()=>box.classList.remove('show');
    document.getElementById('v229PdfReadyShare').onclick=()=>void retryPendingShare();
    return box;
  }

  function releaseStuckUi(message='PDF đã tạo xong.'){
    try{
      const all=[...document.querySelectorAll('body *')];
      for(const el of all){
        if(el.children?.length)continue;
        const t=S(el.textContent);
        if(/Đang\s+hoàn\s+tất\s+PDF/i.test(t)){
          el.textContent=message;
          const host=el.closest('[role="dialog"],.modal,.dialog,[class*="modal"],[class*="dialog"]')||el.parentElement?.parentElement;
          if(host){
            [...host.querySelectorAll('button')].forEach(b=>{
              if(/Đóng|Close/i.test(S(b.textContent))){
                b.disabled=false;
                b.removeAttribute('aria-disabled');
              }
            });
          }
        }
      }
    }catch(_){}
  }

  function rememberPending(data,reason,source){
    if(!hasFiles(data))return;
    pendingShareData=data;
    pendingShareSource=source||'share';
    deferredCount++;
    lastReason=reason||'deferred';
    lastAtMs=Date.now();

    releaseStuckUi('PDF đã tạo xong.');
    const box=ensureReadyUi();
    const sub=document.getElementById('v229PdfReadySub');
    if(sub){
      sub.textContent=`${fileLabel(data)} · PDF đã sẵn sàng. Bấm nút bên phải để chia sẻ/lưu.`;
    }
    box.classList.add('show');
  }

  function hideReady(){
    try{document.getElementById('v229PdfReady')?.classList.remove('show')}catch(_){}
  }

  async function retryPendingShare(){
    const data=pendingShareData;
    if(!data)return hideReady();

    const btn=document.getElementById('v229PdfReadyShare');
    if(btn){btn.disabled=true;btn.textContent='ĐANG MỞ…';}

    try{
      // This function is executed directly from the visible button's click:
      // user activation is fresh here.
      let r;
      if(pendingShareSource==='sagsV21ShareFile' && typeof baseSagsShareFile==='function'){
        const f=Array.from(data.files||[])[0];
        r=await baseSagsShareFile(f,{
          name:S(f?.name),
          type:S(f?.type)||'application/pdf',
          title:S(data.title),
          text:S(data.text)
        });
      }else if(typeof baseNavigatorShare==='function'){
        r=await baseNavigatorShare(data);
      }else if(typeof root.sagsV21ShareFile==='function'){
        const f=Array.from(data.files||[])[0];
        r=await root.sagsV21ShareFile(f,{name:S(f?.name),type:S(f?.type)||'application/pdf'});
      }else{
        throw new Error('Trình duyệt không có chức năng chia sẻ file.');
      }

      if(r?.cancelled){
        cancelledCount++;
        lastReason='user-cancelled-retry';
        return;
      }

      completedCount++;
      lastReason=r?.fallback?'fallback-complete':'share-complete';
      lastAtMs=Date.now();
      pendingShareData=null;
      pendingShareSource='';
      hideReady();
      releaseStuckUi('PDF đã tạo xong.');
    }catch(e){
      if(e?.name==='AbortError'){
        cancelledCount++;
        lastReason='user-cancelled-retry';
      }else{
        lastReason='retry-error: '+S(e?.message||e);
        const sub=document.getElementById('v229PdfReadySub');
        if(sub)sub.textContent='Chưa mở được Share Sheet. Có thể bấm lại CHIA SẺ / LƯU PDF.';
      }
    }finally{
      if(btn){btn.disabled=false;btn.textContent='CHIA SẺ / LƯU PDF';}
    }
  }

  function callWithWatchdog(call,data,source){
    // If the browser tells us the async PDF build already consumed the user
    // activation, do NOT enter navigator.share at all.
    if(hasFiles(data)&&activationKnownInactive()){
      rememberPending(data,'user-activation-expired',source);
      return Promise.resolve({deferred:true,reason:'user-activation-expired'});
    }

    let settled=false;
    let externalUi=false;
    let resolveOuter,rejectOuter;
    const outer=new Promise((resolve,reject)=>{resolveOuter=resolve;rejectOuter=reject});

    const onBlur=()=>{externalUi=true};
    const onVis=()=>{if(document.visibilityState==='hidden')externalUi=true};
    root.addEventListener('blur',onBlur,{once:true,capture:true});
    document.addEventListener('visibilitychange',onVis,{capture:true});

    let timer=0;
    const clean=()=>{
      clearTimeout(timer);
      root.removeEventListener('blur',onBlur,true);
      document.removeEventListener('visibilitychange',onVis,true);
    };

    timer=setTimeout(()=>{
      if(settled)return;
      // If the page lost focus/visibility, native Share is probably genuinely open.
      // Never time it out while the user is inside the Share Sheet.
      if(externalUi||!pageStillForeground())return;

      settled=true;
      watchdogCount++;
      rememberPending(data,'share-promise-watchdog',source);
      clean();
      resolveOuter({deferred:true,reason:'share-promise-watchdog'});
    },FILE_SHARE_TIMEOUT_MS);

    Promise.resolve().then(call).then(r=>{
      if(settled)return;
      settled=true;clean();
      if(r?.cancelled){
        cancelledCount++;
        lastReason='user-cancelled';
      }else{
        completedCount++;
        lastReason=r?.fallback?'fallback-complete':'share-complete';
      }
      lastAtMs=Date.now();
      releaseStuckUi('PDF đã tạo xong.');
      resolveOuter(r);
    }).catch(e=>{
      if(settled)return;
      settled=true;clean();

      if(e?.name==='AbortError'){
        cancelledCount++;
        lastReason='user-cancelled';
        lastAtMs=Date.now();
        releaseStuckUi('PDF đã tạo xong.');
        resolveOuter({cancelled:true});
        return;
      }

      if(hasFiles(data)&&isRetryableGestureError(e)){
        rememberPending(data,'share-gesture-error',source);
        resolveOuter({deferred:true,reason:'share-gesture-error'});
        return;
      }

      rejectOuter(e);
    });

    return outer;
  }

  function installNavigatorShare(){
    const cur=navigator.share;
    if(typeof cur!=='function')return false;
    if(cur.__sagsV229PdfExport)return true;

    baseNavigatorShare=cur.bind(navigator);

    const wrapped=function(data){
      if(!hasFiles(data))return baseNavigatorShare(data);
      return callWithWatchdog(()=>baseNavigatorShare(data),data,'navigator.share');
    };
    wrapped.__sagsV229PdfExport=1;
    wrapped.__sagsV229Base=cur;

    try{
      Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:wrapped});
      return navigator.share===wrapped;
    }catch(_){
      try{navigator.share=wrapped;return navigator.share===wrapped}catch(_2){return false}
    }
  }

  function installSagsShareFile(){
    const cur=root.sagsV21ShareFile;
    if(typeof cur!=='function')return false;
    if(cur.__sagsV229PdfExport)return true;

    baseSagsShareFile=cur;
    const wrapped=function(file,opts={}){
      const f=file instanceof File
        ?file
        :new File([file],S(opts.name)||'SAGS_EXPORT.pdf',{
            type:S(file?.type)||S(opts.type)||'application/pdf',
            lastModified:Date.now()
          });
      const data={
        title:S(opts.title)||S(f.name).replace(/\.[^.]+$/,''),
        text:S(opts.text)||undefined,
        files:[f]
      };
      return callWithWatchdog(()=>baseSagsShareFile.apply(this,arguments),data,'sagsV21ShareFile');
    };
    wrapped.__sagsV229PdfExport=1;
    wrapped.__sagsV229Base=cur;
    root.sagsV21ShareFile=wrapped;
    return true;
  }

  function install(){
    ensureReadyUi();
    installNavigatorShare();
    installSagsShareFile();
    installed=true;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80),{once:true});
  }else setTimeout(install,40);

  setTimeout(install,350);
  setTimeout(install,900);
  setTimeout(install,1800);
  window.addEventListener('pageshow',()=>setTimeout(install,60),{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)setTimeout(install,60);
  },{passive:true});

  root.sagsV229PdfExportDiagnostics=function(){
    return {
      build:BUILD,
      installed,
      navigatorSharePatched:!!navigator.share?.__sagsV229PdfExport,
      sagsShareFilePatched:!!root.sagsV21ShareFile?.__sagsV229PdfExport,
      userActivationSupported:!!navigator.userActivation,
      userActivationActive:navigator.userActivation?.isActive,
      pending:!!pendingShareData,
      pendingFile:pendingShareData?fileLabel(pendingShareData):'',
      deferredCount,watchdogCount,completedCount,cancelledCount,
      lastReason,lastAtMs
    };
  };
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.10-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.10 · INDEPENDENT DEP / SAME FLIGHT WORKSPACE
 * BUILD: V2.2.10-INDEPENDENT-DEP-SAME-WORKSPACE
 * Base production: V2.2.9 + V2.2.2 ARR/DEP
 *
 * Business rule:
 * - ONE FLIGHT = ONE flight_records/{date}/{flightId} workspace remains unchanged.
 * - ARR and DEP are separate form instances/tasks inside that SAME flight workspace.
 * - If ARR is completed: keep the existing V2.2.2 handover flow.
 * - If ARR is not received / not completed / missing: the assigned DEP operator may
 *   receive DEP immediately. The system auto-creates an INDEPENDENT DEP sheet.
 * - Independent DEP is departure-only: do not copy ARR operational data.
 * - If ARR is completed later, it must NOT reset/overwrite an already active
 *   independent DEP instance.
 * - One active DEP instance per flight/form remains enforced with RTDB transaction.
 *
 * No heartbeat. No separate flight record. No change to FINAL/CROSSCHECK/KẾT SỔ.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.10-INDEPENDENT-DEP-SAME-WORKSPACE';
  if(root.__SAGS_V2210_INDEPENDENT_DEP===BUILD)return;
  root.__SAGS_V2210_INDEPENDENT_DEP=BUILD;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return null}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  let receivePatched=false;
  let listPatched=false;
  let completePatched=false;
  let independentClaims=0;
  let eligibilityUpdates=0;
  let lateArrRepairs=0;
  let lastAction='';
  let lastAtMs=0;

  function profile(){
    try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}
    catch(_){return root.currentUserProfile||{}}
  }
  function norm(v){
    try{
      return typeof root.normalizePersonalUsername==='function'
        ? root.normalizePersonalUsername(v)
        : U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
    }catch(_){
      return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40);
    }
  }
  function me(){
    const p=profile();
    return norm(p.username||p.userName||p.code||'');
  }
  function today(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function opDate(){
    try{
      return S(document.getElementById('fwcDate')?.value)
        ||S(sessionStorage.getItem('sagsV36FwcDate'))
        ||S(root.currentFlightSessionMeta?.()?.rosterOpDate)
        ||today();
    }catch(_){return today()}
  }
  function db(path=''){
    if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');
    return root.sagsV470Ref(path);
  }
  async function once(path){
    return (await db(path).once('value')).val();
  }
  async function manifest(date){
    return (await once(`roster_manifests/${safe(date)}`).catch(()=>null))||{};
  }
  function items(man){
    const x=man?.items;
    return (Array.isArray(x)?x:Object.values(x||{}))
      .filter(v=>v&&v.active!==false&&!v.duplicateInactive&&!['ROSTER_REMOVED','ROSTER_REASSIGNED'].includes(U(v.rosterStatus)));
  }
  function fidOf(man,item,date=''){
    let fid=S(item?.flightId);
    if(!fid){
      try{fid=S(root.sagsV346ResolveRosterFlightId?.(S(date||man?.opDate)||opDate(),item,{}))}catch(_){}
    }
    if(fid&&item&&!item.flightId)item.flightId=fid;
    return fid;
  }
  function isArr(x){return U(x?.assignmentLeg)==='ARR'}
  function isDep(x){return U(x?.assignmentLeg)==='DEP'}
  function completed(st){
    const cs=U(st?.claimStatus),ws=U(st?.workPartStatus),ts=U(st?.taskStatusV333||st?.taskStatus);
    return !!st?.completionEnvelope
      ||Number(st?.completedAtMs||st?.completionEnvelopeAtMs||0)>0
      ||['PART_COMPLETED','COMPLETED','HANDED_OVER'].includes(cs)
      ||ws==='COMPLETED'
      ||ts==='COMPLETED';
  }
  function activelyClaimed(st){
    const cs=U(st?.claimStatus),ts=U(st?.taskStatusV333||st?.taskStatus),ws=U(st?.workPartStatus);
    return cs==='CLAIMED'||ts==='IN_PROGRESS'||ws==='IN_PROGRESS';
  }
  async function sessionState(aid){
    return (await once(`roster_sessions/${safe(aid)}`).catch(()=>null))||{};
  }

  function canonicalRecordForm(x){
    const g=U(x?.formGroup||x);
    if(g==='FSAGS'||g==='FSAGS423')return 'FSAGS423';
    return g||'FORM';
  }
  function localGroup(x){
    const g=U(x?.formGroup||x);
    if(g==='FSAGS'||g==='FSAGS423')return 'fsags';
    if(g==='FSAGS421')return 'fsags421';
    if(g==='FSAGS551')return 'fsags551';
    if(g==='FSAGS09')return 'fsags09';
    if(g==='LOADING208')return 'loading208';
    return S(x?.formGroup||x).toLowerCase()||'fsags';
  }
  function sourceFamily(x){
    const src=U(x?.sourceColumn),rk=U(x?.roleKey),fg=U(x?.formGroup);
    if(rk==='CBTT'||src.includes('GRND_LS')||fg==='FINAL')return 'GRND_LS';
    if(rk==='PAX09'||src.includes('PAX_SUPR')||fg==='FSAGS09')return 'PAX_SUPR';
    if((rk==='LD'||fg==='FSAGS551'||src==='GRND_LD')&&!src.includes('GRND_COR'))return 'GRND_LD';
    if(['COR','BOTH'].includes(rk)||src.includes('GRND_COR')||['FSAGS','FSAGS423','FSAGS421'].includes(fg))return 'GRND_COR';
    return src||rk||fg||'ROSTER';
  }
  function sameWorkFamily(a,b){
    return canonicalRecordForm(a)===canonicalRecordForm(b)&&sourceFamily(a)===sourceFamily(b);
  }

  function routeParts(item){
    const raw=U(item?.route||item?.sector||'');
    const parts=raw.split(/[-–—>\/]+/).map(S).filter(Boolean);
    const cxr=parts.indexOf('CXR');
    return {
      origin:S(item?.route1||(cxr>0?parts[cxr-1]:parts[0])),
      destination:S(item?.route3||(cxr>=0&&cxr<parts.length-1?parts[cxr+1]:parts[parts.length-1]))
    };
  }
  function displayDate(v){
    const x=S(v);
    let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(x);
    if(m)return `${m[3]}/${m[2]}/${m[1]}`;
    return x;
  }
  function startPage(g){
    return g==='fsags421'?6:(g==='fsags551'?9:(g==='fsags09'?11:(g==='loading208'?13:1)));
  }

  /* Departure-only baseline.
   * IMPORTANT: no fltBefore / STA / ARR route / ARR bay is written.
   */
  function depOnlySeed(item){
    const g=localGroup(item),r=routeParts(item);
    const base={
      date:displayDate(item?.opDate||item?.date||opDate()),
      dep:S(item?.depFlight||item?.flightAfter||item?.departureFlight),
      std:S(item?.std||item?.stdClock),
      etd:S(item?.etd||item?.etdClock),
      reg:S(item?.acReg||item?.regn||item?.registration),
      type:S(item?.acType||item?.aircraftType),
      dest:S(item?.route3||r.destination),
      bay:S(item?.bayAfter||item?.depBay||item?.bay)
    };
    const out={};

    if(g==='fsags421'){
      Object.assign(out,{
        f421_date:base.date,
        f421_fltAfter:base.dep,
        f421_std:base.std,
        f421_etd:base.etd,
        f421_regn:base.reg,
        f421_acType:base.type,
        f421_route3:base.dest,
        f421_bayAfter:base.bay
      });
    }else if(g==='fsags551'){
      Object.assign(out,{
        f551_date:base.date,
        f551_fltAfter:base.dep,
        f551_std:base.std,
        f551_etd:base.etd,
        f551_regn:base.reg,
        f551_acType:base.type,
        f551_route3:base.dest,
        f551_bay:base.bay
      });
    }else if(g==='fsags09'){
      Object.assign(out,{
        f09_date:base.date,
        f09_fltAfter:base.dep,
        f09_std:base.std,
        f09_etd:base.etd,
        f09_regn:base.reg,
        f09_acType:base.type,
        f09_route3:base.dest,
        f09_parkingDep:base.bay
      });
    }else{
      Object.assign(out,{
        date:base.date,
        fltAfter:base.dep,
        std:base.std,
        etd:base.etd,
        regn:base.reg,
        acType:base.type,
        route2:'CXR',
        route3:base.dest,
        bayAfter:base.bay
      });
    }
    for(const k of Object.keys(out))if(!S(out[k]))delete out[k];
    return out;
  }

  function independentEnvelope(dep,fid,reason){
    const g=localGroup(dep),seed=depOnlySeed(dep),now=Date.now();
    return {
      state:{...seed},
      rosterSeed:{...seed},
      mainForm:g,
      activeFormGroup:g,
      currentPage:startPage(g),
      scrollY:0,
      arrivalOp:'passenger',
      departureOp:'passenger',
      rosterAssignmentId:S(dep?.assignmentId),
      rosterFlightId:S(fid),
      v22Phase:'DEP',
      v22DepNewSheet:true,
      v222DepNewSheet:true,
      v2210IndependentDep:true,
      v2210IndependentReason:S(reason),
      v2210DepartureOnly:true,
      v2210CreatedAtMs:now
    };
  }

  async function predecessorInfo(date,man,dep){
    const fid=fidOf(man,dep,date),depOrder=Number(dep?.workPartOrder||999);
    if(!fid)return {exists:false,done:false,item:null,st:null,reason:'NO_FLIGHT_ID'};

    let arrs=items(man).filter(x=>
      isArr(x)
      &&fidOf(man,x,date)===fid
      &&canonicalRecordForm(x)===canonicalRecordForm(dep)
    );
    const exact=arrs.filter(x=>sameWorkFamily(x,dep));
    if(exact.length)arrs=exact;

    if(!arrs.length)return {exists:false,done:false,item:null,st:null,reason:'NO_ARR_ASSIGNMENT'};

    const rows=[];
    for(const item of arrs){
      const st=await sessionState(item.assignmentId);
      let score=0;
      if(sameWorkFamily(item,dep))score+=100;
      const ao=Number(item.workPartOrder||0);
      if(ao&&ao<=depOrder)score+=30;
      if(completed(st))score+=1000;
      if(activelyClaimed(st))score+=10;
      rows.push({item,st,score});
    }
    rows.sort((a,b)=>b.score-a.score||Number(b.item.workPartOrder||0)-Number(a.item.workPartOrder||0));
    const done=rows.find(x=>completed(x.st));
    if(done)return {exists:true,done:true,item:done.item,st:done.st,reason:'ARR_COMPLETED'};

    const best=rows[0];
    return {
      exists:true,
      done:false,
      item:best?.item||null,
      st:best?.st||null,
      reason:activelyClaimed(best?.st)?'ARR_IN_PROGRESS':'ARR_NOT_COMPLETED'
    };
  }

  async function acquireCoClaim(date,man,dep,fid){
    const gid=S(dep?.coAssigneeGroupId),u=me(),aid=S(dep?.assignmentId),now=Date.now();
    if(!gid)return {gid:'',peers:[]};

    const ref=db(`roster_co_claims/${safe(date)}/${safe(gid)}`);
    const tx=await ref.transaction(cur=>{
      const owner=norm(cur?.claimedBy),status=U(cur?.status);
      if(status==='CLAIMED'&&owner&&owner!==u)return;
      return {
        schema:1,
        groupId:gid,
        status:'CLAIMED',
        claimedBy:u,
        claimedAssignmentId:aid,
        claimedAtMs:Number(cur?.claimedAtMs||now)||now,
        updatedAtMs:now,
        opDate:date,
        flightId:fid,
        formGroup:S(dep.formGroup),
        sourceColumn:S(dep.sourceColumn),
        claimSource:'V2.2.10_INDEPENDENT_DEP'
      };
    });
    if(tx&&tx.committed===false){
      const cur=tx.snapshot?.val?.()||{};
      throw new Error(`DEP đang được ${norm(cur.claimedBy)||'người khác'} xử lý.`);
    }
    const peers=items(man).filter(x=>S(x.coAssigneeGroupId)===gid&&S(x.assignmentId)!==aid);
    return {gid,peers};
  }

  async function acquireDepInstance(date,man,dep,fid,reason){
    const form=canonicalRecordForm(dep),aid=S(dep.assignmentId),u=me(),now=Date.now();
    const base=`flight_records/${safe(date)}/${safe(fid)}/forms/${safe(form)}`;
    const instanceId=`DEP_${safe(aid)}_INDEPENDENT`;
    const ref=db(`${base}/activeDepInstance`);

    const tx=await ref.transaction(cur=>{
      const curAid=S(cur?.assignmentId),status=U(cur?.status);
      if(status==='ACTIVE'&&curAid&&curAid!==aid)return;
      return {
        schema:4,
        engine:BUILD,
        instanceId,
        assignmentId:aid,
        mode:'INDEPENDENT_DEP',
        status:'ACTIVE',
        ownerUser:u,
        sourceArrAssignmentId:null,
        independentReason:S(reason),
        createdAtMs:Number(cur?.createdAtMs||now)||now,
        updatedAtMs:now
      };
    });
    if(tx&&tx.committed===false){
      const cur=tx.snapshot?.val?.()||{};
      throw new Error(`Đang có tờ DEP khác hoạt động (${S(cur.instanceId)||'không xác định'}).`);
    }

    await db(`${base}/instances/${safe(instanceId)}`).update({
      schema:4,
      engine:BUILD,
      instanceId,
      phase:'DEP',
      mode:'INDEPENDENT_DEP',
      status:'ACTIVE',
      assignmentId:aid,
      ownerUser:u,
      sourceArrAssignmentId:null,
      independentReason:S(reason),
      departureOnly:true,
      flightId:fid,
      createdAtMs:now,
      updatedAtMs:now
    });
    return {instanceId,base};
  }

  async function markIndependentEligible(date,fidFilter=''){
    const man=await manifest(date),u=me(),patch={},now=Date.now();
    let changed=0;
    for(const dep of items(man)){
      const fid=fidOf(man,dep,date);
      if(!isDep(dep)||!fid||norm(dep.user||dep.targetUser)!==u)continue;
      if(fidFilter&&fid!==S(fidFilter))continue;

      const aid=S(dep.assignmentId),st=await sessionState(aid);
      if(!aid||completed(st)||st?.v2210IndependentDep===true||activelyClaimed(st))continue;

      const pred=await predecessorInfo(date,man,dep);
      if(pred.done)continue;

      patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
      patch[`roster_sessions/${safe(aid)}/handoverReady`]=false;
      patch[`roster_sessions/${safe(aid)}/claimStatus`]='READY';
      patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='UNCLAIMED';
      patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='READY';
      patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=now;
      patch[`roster_sessions/${safe(aid)}/v2210IndependentEligible`]=true;
      patch[`roster_sessions/${safe(aid)}/v2210IndependentReason`]=pred.reason;
      patch[`roster_sessions/${safe(aid)}/v2210EligibleAtMs`]=now;

      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/workPartReady`]=true;
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/handoverReady`]=false;
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/taskAvailabilityV333`]='READY';
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/v2210IndependentEligible`]=true;
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/v2210IndependentReason`]=pred.reason;
      patch[`roster_mail/${safe(u)}/items/${safe(aid)}/readyAtMs`]=now;

      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='UNCLAIMED';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='CHƯA NHẬN';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='READY';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/independentDepEligible`]=true;
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;
      changed++;
    }
    if(changed){
      await db('').update(patch);
      eligibilityUpdates+=changed;
      lastAction=`MARK_READY:${changed}`;
      lastAtMs=Date.now();
    }
    return changed;
  }

  async function independentCandidate(fid){
    const date=opDate(),man=await manifest(date),u=me(),rows=[];
    for(const dep of items(man)){
      if(!isDep(dep)||fidOf(man,dep,date)!==S(fid)||norm(dep.user||dep.targetUser)!==u)continue;
      const st=await sessionState(dep.assignmentId);
      if(completed(st))continue;

      // Once independent DEP exists, keep using it even if ARR is completed later.
      if(st?.v2210IndependentDep===true){
        rows.push({date,man,dep,st,pred:{exists:true,done:false,item:null,st:null,reason:S(st.v2210IndependentReason)||'INDEPENDENT_ALREADY_ACTIVE'},existing:true});
        continue;
      }

      const pred=await predecessorInfo(date,man,dep);
      if(!pred.done)rows.push({date,man,dep,st,pred,existing:false});
    }
    rows.sort((a,b)=>Number(a.dep.workPartOrder||999)-Number(b.dep.workPartOrder||999));
    return rows[0]||null;
  }

  async function ensureLocalAndOpen(dep,env){
    let meta=null;
    try{
      if(typeof root.sagsEnsureLocalSession==='function')meta=await root.sagsEnsureLocalSession(dep);
      else if(typeof root.sagsV340EnsureLocalSession==='function')meta=await root.sagsV340EnsureLocalSession(dep);
    }catch(e){console.info('V2.2.10 ensure local session',e?.message||e)}

    if(!meta){
      try{
        root.dailyRosterRestartMailbox?.();
        await sleep(450);
        meta=(root.readFlightSessionList?.()||[]).find(x=>S(x?.rosterAssignmentId)===S(dep.assignmentId))||null;
      }catch(_){}
    }
    if(!meta?.id)throw new Error('Biểu mẫu DEP chưa đồng bộ xuống thiết bị.');

    try{
      if(typeof root.flightSessionStorageKey==='function'){
        localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env));
      }
    }catch(e){
      throw new Error('Không lưu được tờ DEP trên máy: '+S(e?.message||e));
    }

    try{root.flightWorkspaceClose?.()}catch(_){}
    if(typeof root.switchFlightSession!=='function')throw new Error('Không mở được workspace DEP.');
    root.switchFlightSession(meta.id,true);
    return meta;
  }

  async function claimIndependent(cand){
    const {date,man,dep,pred}=cand;
    const aid=S(dep.assignmentId),fid=fidOf(man,dep,date),u=me(),now=Date.now();
    if(!aid||!fid||norm(dep.user||dep.targetUser)!==u)throw new Error('DEP không thuộc tài khoản hiện tại.');

    let st=await sessionState(aid);
    if(st?.v2210IndependentDep===true&&activelyClaimed(st)){
      const env=st.envelope&&typeof st.envelope==='object'
        ?clone(st.envelope)
        :independentEnvelope(dep,fid,S(st.v2210IndependentReason)||pred.reason);
      return {env,existing:true};
    }

    const instance=await acquireDepInstance(date,man,dep,fid,pred.reason);
    const co=await acquireCoClaim(date,man,dep,fid);
    const env=independentEnvelope(dep,fid,pred.reason);
    env.v22FormInstanceId=instance.instanceId;
    env.v22FormInstanceMode='INDEPENDENT_DEP';

    const ref=db(`roster_sessions/${safe(aid)}`);
    const tx=await ref.transaction(cur=>{
      cur=cur&&typeof cur==='object'?cur:{};
      if(completed(cur))return;
      const owner=norm(cur.claimedBy||cur.ownerUser);
      if(activelyClaimed(cur)&&owner&&owner!==u)return;
      return {
        ...cur,
        ownerUser:u,
        claimedBy:u,
        claimedAtMs:Number(cur.claimedAtMs||now)||now,
        claimStatus:'CLAIMED',
        workPartStatus:'IN_PROGRESS',
        taskStatusV333:'IN_PROGRESS',
        taskAvailabilityV333:'ACTIVE',
        taskStatusUpdatedAtMs:now,
        workPartReady:true,
        handoverReady:false,

        envelope:env,
        envelopeUpdatedAtMs:now,
        rosterSeed:{...env.rosterSeed},

        v22DepChoice:'NEW_DEP',
        v22DepChoiceAtMs:Number(cur.v22DepChoiceAtMs||now)||now,
        v22DepChoiceBy:u,
        v22DepNewSheet:true,
        v22FormInstanceId:instance.instanceId,
        v22FormInstanceMode:'INDEPENDENT_DEP',

        v2210IndependentEligible:true,
        v2210IndependentDep:true,
        v2210IndependentReason:pred.reason,
        v2210DepartureOnly:true,
        v2210IndependentClaimAtMs:now,
        v2210IndependentClaimBy:u,
        updatedAtMs:now
      };
    });
    if(tx&&tx.committed===false){
      const cur=tx.snapshot?.val?.()||{};
      if(completed(cur))throw new Error('DEP đã được hoàn tất.');
      throw new Error(`DEP đang được ${norm(cur.claimedBy||cur.ownerUser)||'người khác'} xử lý.`);
    }

    const patch={};
    for(const p of co.peers||[]){
      const pid=S(p.assignmentId);if(!pid)continue;
      patch[`roster_sessions/${safe(pid)}/claimStatus`]='STANDBY';
      patch[`roster_sessions/${safe(pid)}/taskStatusV333`]='UNCLAIMED';
      patch[`roster_sessions/${safe(pid)}/taskAvailabilityV333`]='STANDBY';
      patch[`roster_sessions/${safe(pid)}/coClaimedBy`]=u;
      patch[`roster_sessions/${safe(pid)}/coClaimedAssignmentId`]=aid;
      patch[`roster_sessions/${safe(pid)}/updatedAtMs`]=now;
    }

    if(co.gid){
      patch[`roster_sessions/${safe(aid)}/coClaimedBy`]=u;
      patch[`roster_sessions/${safe(aid)}/coClaimedAssignmentId`]=aid;
    }

    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/workPartReady`]=true;
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/handoverReady`]=false;
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/claimStatus`]='CLAIMED';
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/taskAvailabilityV333`]='ACTIVE';
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/v2210IndependentDep`]=true;
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/v2210IndependentReason`]=pred.reason;
    patch[`roster_mail/${safe(u)}/items/${safe(aid)}/updatedAtMs`]=now;

    patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(aid)}`]={
      assignmentId:aid,
      username:u,
      name:S(profile().name||profile().fullName||u),
      formGroup:S(dep.formGroup),
      sourceColumn:S(dep.sourceColumn),
      workPartOrder:Number(dep.workPartOrder||1),
      workPartTotal:Number(dep.workPartTotal||1),
      coAssigneeGroupId:co.gid||null,
      status:'CLAIMED',
      taskStatus:'IN_PROGRESS',
      claimedAtMs:now,
      updatedAtMs:now,
      claimSource:'V2.2.10_INDEPENDENT_DEP',
      independentDep:true,
      independentReason:pred.reason
    };
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='IN_PROGRESS';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='ĐANG LÀM';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='ACTIVE';
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/independentDep`]=true;
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/independentReason`]=pred.reason;
    patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;

    // Same ONE flight workspace. This is a work-part event, not the global Audit log.
    const eventId=`DEP_INDEPENDENT_${safe(aid)}_${now}`;
    patch[`flight_records/${safe(date)}/${safe(fid)}/workPartHistory/${safe(eventId)}`]={
      schema:1,
      type:'DEP_INDEPENDENT_CLAIMED',
      status:'IN_PROGRESS',
      assignmentId:aid,
      formGroup:S(dep.formGroup),
      username:u,
      reason:pred.reason,
      predecessorAssignmentId:S(pred?.item?.assignmentId),
      atMs:now
    };

    await db('').update(patch);

    independentClaims++;
    lastAction=`CLAIM:${aid}:${pred.reason}`;
    lastAtMs=Date.now();
    return {env,existing:false};
  }

  async function repairIndependentAfterLateArr(date,fid){
    const man=await manifest(date),patch={},now=Date.now();
    let count=0;

    for(const dep of items(man)){
      if(!isDep(dep)||fidOf(man,dep,date)!==S(fid))continue;
      const aid=S(dep.assignmentId),st=await sessionState(aid);
      if(!aid||st?.v2210IndependentDep!==true||completed(st))continue;

      const owner=norm(st.claimedBy||st.ownerUser||dep.user||dep.targetUser);
      if(!owner)continue;

      // V2.2.2 may publish late ARR handover as READY. Reassert the already-active
      // independent DEP without touching its working envelope.
      patch[`roster_sessions/${safe(aid)}/claimStatus`]='CLAIMED';
      patch[`roster_sessions/${safe(aid)}/workPartStatus`]='IN_PROGRESS';
      patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';
      patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='ACTIVE';
      patch[`roster_sessions/${safe(aid)}/workPartReady`]=true;
      patch[`roster_sessions/${safe(aid)}/handoverReady`]=false;
      patch[`roster_sessions/${safe(aid)}/handoverEnvelope`]=null;
      patch[`roster_sessions/${safe(aid)}/handoverEnvelopeAtMs`]=null;
      patch[`roster_sessions/${safe(aid)}/handoverFromAssignmentId`]=null;
      patch[`roster_sessions/${safe(aid)}/handoverFromUser`]=null;
      patch[`roster_sessions/${safe(aid)}/previousPartCompletedAtMs`]=null;
      patch[`roster_sessions/${safe(aid)}/v2210LateArrProtectedAtMs`]=now;
      patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=now;

      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/handoverReady`]=false;
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/workPartReady`]=true;
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/claimStatus`]='CLAIMED';
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/taskStatusV333`]='IN_PROGRESS';
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/taskAvailabilityV333`]='ACTIVE';
      patch[`roster_mail/${safe(owner)}/items/${safe(aid)}/updatedAtMs`]=now;

      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/status`]='IN_PROGRESS';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/statusLabel`]='ĐANG LÀM';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/availability`]='ACTIVE';
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/independentDep`]=true;
      patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}/updatedAtMs`]=now;
      count++;
    }

    if(count){
      await db('').update(patch);
      lateArrRepairs+=count;
      lastAction=`LATE_ARR_PROTECT:${count}`;
      lastAtMs=Date.now();
    }
    return count;
  }

  function currentArrContext(){
    try{
      const meta=root.currentFlightSessionMeta?.()||null;
      const aid=S(meta?.rosterAssignmentId),fid=S(meta?.rosterFlightId),date=S(meta?.rosterOpDate)||opDate();
      return aid&&fid?{aid,fid,date}:null;
    }catch(_){return null}
  }

  function patchReceive(){
    const base=root.v324ReceiveOrOpen;
    if(typeof base!=='function')return false;
    if(base.__v2210IndependentDep){receivePatched=true;return true}

    const wrapped=async function(fid){
      try{
        const cand=await independentCandidate(S(fid));
        if(cand){
          const result=await claimIndependent(cand);
          await ensureLocalAndOpen(cand.dep,result.env);
          independentClaims+=result.existing?0:0;
          return true;
        }
      }catch(e){
        alert('Không nhận được DEP độc lập: '+S(e?.message||e));
        return false;
      }
      return base.apply(this,arguments);
    };
    wrapped.__v2210IndependentDep=1;
    wrapped.__v2210Base=base;
    root.v324ReceiveOrOpen=wrapped;
    try{v324ReceiveOrOpen=wrapped}catch(_){}
    receivePatched=true;
    return true;
  }

  function patchList(){
    const base=root.flightWorkspaceOpenList;
    if(typeof base!=='function')return false;
    if(base.__v2210IndependentDep){listPatched=true;return true}

    let listRun=null;
    const wrapped=async function(d){
      const date=S(d)||opDate(),self=this,args=arguments;
      if(listRun)return listRun;
      listRun=(async()=>{
        try{await markIndependentEligible(date)}catch(e){console.info('V2.2.10 MY FLIGHT independent eligibility',e?.message||e)}
        return base.apply(self,args);
      })();
      try{return await listRun}finally{listRun=null}
    };
    wrapped.__v2210IndependentDep=1;
    wrapped.__v2210Base=base;
    root.flightWorkspaceOpenList=wrapped;
    listPatched=true;
    return true;
  }

  function patchComplete(){
    const base=root.v324ConfirmRosterHandover;
    if(typeof base!=='function')return false;
    if(base.__v2210IndependentDep){completePatched=true;return true}

    const wrapped=async function(){
      const before=currentArrContext();
      const r=await base.apply(this,arguments);
      if(before){
        setTimeout(()=>{
          repairIndependentAfterLateArr(before.date,before.fid).catch(e=>
            console.info('V2.2.10 late ARR protection',e?.message||e)
          );
        },80);
        setTimeout(()=>{
          repairIndependentAfterLateArr(before.date,before.fid).catch(()=>{});
        },500);
      }
      return r;
    };
    wrapped.__v2210IndependentDep=1;
    wrapped.__v2210Base=base;
    root.v324ConfirmRosterHandover=wrapped;
    try{v324ConfirmRosterHandover=wrapped}catch(_){}
    completePatched=true;
    return true;
  }

  function install(){
    patchReceive();
    patchList();
    patchComplete();
  }

  install();
  setTimeout(install,250);
  setTimeout(install,800);
  setTimeout(install,1600);
  setTimeout(install,3200);

  window.addEventListener('pageshow',()=>{
    setTimeout(install,70);
    setTimeout(()=>markIndependentEligible(opDate()).catch(()=>{}),180);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      setTimeout(install,70);
      // Event-driven refresh only. No heartbeat.
      setTimeout(()=>markIndependentEligible(opDate()).catch(()=>{}),180);
    }
  },{passive:true});

  root.sagsV2210DepDiagnostics=async function(fid=''){
    const date=opDate(),man=await manifest(date),f=S(fid),u=me(),rows=[];
    for(const dep of items(man)){
      const flightId=fidOf(man,dep,date);
      if(!isDep(dep)||norm(dep.user||dep.targetUser)!==u||(f&&flightId!==f))continue;
      const st=await sessionState(dep.assignmentId),pred=await predecessorInfo(date,man,dep);
      rows.push({
        assignmentId:S(dep.assignmentId),
        flightId,
        formGroup:S(dep.formGroup),
        workPartOrder:Number(dep.workPartOrder||0),
        claimStatus:S(st.claimStatus),
        taskStatus:S(st.taskStatusV333),
        availability:S(st.taskAvailabilityV333),
        predecessorExists:pred.exists,
        predecessorDone:pred.done,
        predecessorAssignmentId:S(pred?.item?.assignmentId),
        predecessorStatus:S(pred?.st?.claimStatus||pred?.st?.taskStatusV333),
        independentEligible:st?.v2210IndependentEligible===true,
        independentDep:st?.v2210IndependentDep===true,
        independentReason:S(st?.v2210IndependentReason),
        departureOnly:st?.v2210DepartureOnly===true,
        workspacePath:`flight_records/${date}/${flightId}`
      });
    }
    return {
      build:BUILD,
      oneFlightOneWorkspace:true,
      date,
      user:u,
      receivePatched:!!root.v324ReceiveOrOpen?.__v2210IndependentDep,
      listPatched:!!root.flightWorkspaceOpenList?.__v2210IndependentDep,
      completePatched:!!root.v324ConfirmRosterHandover?.__v2210IndependentDep,
      independentClaims,
      eligibilityUpdates,
      lateArrRepairs,
      lastAction,
      lastAtMs,
      rows
    };
  };
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.11-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.11 · UNIFIED AI LIMIT + AIRCRAFT CLEANING SCHEDULE
 * BUILD: V2.2.11-AI-LIMIT-CLEANING-MULTI-IMAGE
 *
 * - One multi-image picker for A/C LIMITS and aircraft-cleaning schedules.
 * - AI classifies each image, auto-saves confident rows, and sends uncertain rows
 *   to an AD review queue. It never invents unreadable values.
 * - Cleaning provider alerts are shown to DH at STA-10 and again at CHOCK ON.
 * - The alert queue is local/event based; there is no heartbeat.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.11-AI-LIMIT-CLEANING-MULTI-IMAGE';
  if(root.__SAGS_V2211_AI_LIMIT_CLEANING===BUILD)return;
  root.__SAGS_V2211_AI_LIMIT_CLEANING=BUILD;

  const AI_MODEL_FALLBACK='gemini-3.6-flash';
  const APP_CHECK_SITE_KEY_FALLBACK='6LeJjYotAAAAAELyLTYPzugn_Zn37U5qOz9tHjqV';
  const CLEAN_PUBLIC='aircraft_cleaning/catalog_public';
  const CLEAN_SIGNAL='aircraft_cleaning/catalog_signal';
  const CLEAN_REVIEW='ai_import_review_queue';
  const CLEAN_CACHE='sags_aircraft_cleaning_cache_v2211';
  const CLEAN_ACK='sags_aircraft_cleaning_ack_v2211';
  const LIMIT_PUBLIC='ac_limits/catalog_public';
  const LIMIT_SIGNAL='ac_limits/catalog_signal';
  const MAX_IMAGE_BYTES=10*1024*1024;
  const MAX_BATCH_IMAGES=12;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>{try{return JSON.parse(JSON.stringify(v??null))}catch(_){return null}};
  const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const normReg=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const displayReg=v=>U(v).replace(/^([A-Z]{2})A(?=\d)/,'$1-A');
  const uid=p=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`.toUpperCase();
  const $=id=>document.getElementById(id);

  let aiSdkPromise=null;
  let importing=false;
  let cleanCatalog={version:0,items:[]};
  let cleanSignalRef=null;
  let cleanQueue=[];
  let cleanCurrent=null;
  let cleanTimer=0;

  function profile(){try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}catch(_){return root.currentUserProfile||{}}}
  function role(){const r=U(root.currentRole||profile().role||profile().roleCode).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/[^A-Z0-9]/g,'');return r==='DIEUHANH'?'DH':r}
  function isAdmin(){return ['AD','ADMIN','ROLE-ADMIN'].includes(role())}
  function actor(){try{return root.currentActor?.()||{role:role(),username:S(profile().username||profile().userName)}}catch(_){return {role:role(),username:S(profile().username||profile().userName)}}}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function collectionName(){try{if(typeof HANDOVER_COLLECTION!=='undefined'&&HANDOVER_COLLECTION)return HANDOVER_COLLECTION}catch(_){}return ''}
  function firestore(){try{return typeof root.initHandoverFirebase==='function'?root.initHandoverFirebase():null}catch(_){return null}}

  function normalizeISO(v){
    const x=S(v);if(!x)return '';
    let m=/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)$/.exec(x);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    m=/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})$/.exec(x);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    m=/^([0-3]?\d)[-\s](JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-\s](\d{4})$/i.exec(x);if(m){const mon=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(U(m[2]))+1;return `${m[3]}-${String(mon).padStart(2,'0')}-${m[1].padStart(2,'0')}`}
    return '';
  }
  function clockMinutes(v){const d=S(v).replace(/[^0-9]/g,'');if(d.length<3||d.length>4)return null;const s=d.padStart(4,'0'),h=Number(s.slice(0,2)),m=Number(s.slice(2));return h<=23&&m<=59?h*60+m:null}
  function normalizeClock(v){const n=clockMinutes(v);return n===null?'':`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
  function clockMs(date,clock){const n=clockMinutes(clock),p=S(date).split('-').map(Number);if(n===null||p.length!==3||!p[0]||!p[1]||!p[2])return null;return new Date(p[0],p[1]-1,p[2],Math.floor(n/60),n%60,0,0).getTime()}

  function ensureCss(){
    if($('v2211Style'))return;
    const st=document.createElement('style');st.id='v2211Style';st.textContent=`
#v2211ImportModal,#v2211CleaningAlert{position:fixed;inset:0;z-index:19450;display:none;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));box-sizing:border-box;background:rgba(3,15,28,.72);backdrop-filter:blur(3px)}
.v2211-card{width:min(94vw,650px);max-height:92dvh;overflow:auto;background:#fff;border-radius:20px;padding:18px;box-sizing:border-box;box-shadow:0 24px 80px rgba(0,0,0,.42);font:14px/1.45 Arial;color:#19334d}.v2211-card h3{margin:0 0 8px;color:#064f9e;font:900 21px Arial}.v2211-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.v2211-btn{border:0;border-radius:11px;min-height:43px;padding:10px 14px;background:#075ea8;color:#fff;font-weight:900}.v2211-btn.secondary{background:#e8eef4;color:#29455e}.v2211-btn.good{background:#087443}.v2211-file{position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;opacity:.01}.v2211-status{margin:10px 0;padding:10px;border-radius:10px;background:#edf7ff;font-weight:800;white-space:pre-wrap}.v2211-status.err{background:#fff0ef;color:#a42318}.v2211-files{display:grid;gap:6px}.v2211-file-row{border:1px solid #d5e0e8;border-radius:9px;padding:8px;background:#f9fbfd;font-weight:800}.v2211-common-upload{width:100%;margin:8px 0 2px!important;background:#6a35b7!important;color:#fff!important;border:0!important;border-radius:11px!important;min-height:46px!important;font-weight:900!important}.v2211-clean-box{border:4px solid #087443}.v2211-clean-title{color:#087443;font:900 22px Arial;margin-bottom:8px}.v2211-clean-flight{font:900 16px Arial;color:#17324d;margin:6px 0}.v2211-clean-provider{border-radius:12px;background:#e9f8ef;padding:15px;text-align:center;color:#075f39;font:900 21px/1.35 Arial;margin:12px 0}.v2211-clean-meta{text-align:center;color:#5c7083;font-weight:800}.v2211-clean-ack{width:100%;border:0;border-radius:11px;padding:13px;background:#087443;color:#fff;font:900 16px Arial;margin-top:12px}
@media(max-width:620px){.v2211-card{padding:14px}.v2211-actions>*{flex:1}.v2211-clean-provider{font-size:19px}}
`;document.head.appendChild(st);
  }

  function ensureUi(){
    ensureCss();
    if(!$('v2211ImportModal')){
      const m=document.createElement('div');m.id='v2211ImportModal';m.innerHTML=`<div class="v2211-card"><h3>🤖 AI · LIMIT & LỊCH VỆ SINH</h3><div>Chọn chung một lần nhiều ảnh. AI tự phân loại và gán các dòng đọc chắc chắn; dòng chưa rõ chuyển AD xác nhận.</div><input id="v2211Images" class="v2211-file" type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple><div id="v2211Files" class="v2211-files"></div><div id="v2211Status" class="v2211-status">Chưa chọn ảnh.</div><div class="v2211-actions"><button id="v2211Pick" class="v2211-btn" type="button">CHỌN NHIỀU ẢNH</button><button id="v2211Run" class="v2211-btn good" type="button" disabled>AI ĐỌC & GÁN CẢNH BÁO</button><button id="v2211Close" class="v2211-btn secondary" type="button">ĐÓNG</button></div></div>`;document.body.appendChild(m);
      $('v2211Pick').onclick=()=>$('v2211Images')?.click();
      $('v2211Close').onclick=()=>{if(!importing)m.style.display='none'};
      $('v2211Run').onclick=runImport;
      $('v2211Images').onchange=renderSelectedFiles;
    }
    if(!$('v2211CleaningAlert')){
      const a=document.createElement('div');a.id='v2211CleaningAlert';a.innerHTML=`<div class="v2211-card v2211-clean-box"><div class="v2211-clean-title">🧹 VỆ SINH TÀU BAY</div><div id="v2211CleanFlight" class="v2211-clean-flight"></div><div id="v2211CleanProvider" class="v2211-clean-provider"></div><div id="v2211CleanMeta" class="v2211-clean-meta"></div><button class="v2211-clean-ack" type="button">ĐÃ BIẾT</button></div>`;document.body.appendChild(a);a.querySelector('button').onclick=ackCleaningAlert;
    }
    injectCommonButton();
  }

  function injectCommonButton(){
    const panel=$('aclSimplePanel');if(!panel)return;
    let b=$('v2211CommonUpload');if(!b){b=document.createElement('button');b.id='v2211CommonUpload';b.type='button';b.className='v2211-common-upload';b.textContent='📷 UP ẢNH LIMIT + LỊCH VỆ SINH';const top=panel.querySelector('.acls-top');top?.insertAdjacentElement('afterend',b);b.onclick=openImport}
    const old=$('aclLimitModeSwitch');if(old)old.style.display='none';const oldAi=$('aclAIMode');if(oldAi)oldAi.style.display='none';
  }
  function openImport(){if(!isAdmin())return popup('warning','KHÔNG CÓ QUYỀN','Chỉ AD được upload ảnh LIMIT và lịch vệ sinh.');ensureUi();$('v2211ImportModal').style.display='flex'}
  function renderSelectedFiles(){const files=[...($('v2211Images')?.files||[])],h=$('v2211Files');if(h)h.innerHTML=files.map((f,i)=>`<div class="v2211-file-row">${i+1}. ${esc(f.name)} · ${(f.size/1024).toFixed(0)} KB</div>`).join('');$('v2211Run').disabled=!files.length;setStatus(files.length?`Đã chọn ${files.length} ảnh. Bấm AI ĐỌC & GÁN CẢNH BÁO.`:'Chưa chọn ảnh.')}
  function setStatus(t,err=false){const e=$('v2211Status');if(e){e.textContent=t;e.classList.toggle('err',!!err)}}
  function popup(type,title,message){if(typeof root.sagsActionPopup==='function')return root.sagsActionPopup({type,title,message});alert(`${title}\n\n${message}`)}

  async function filePart(file){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(S(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error||new Error('Không đọc được ảnh.'));r.readAsDataURL(file)});return {inlineData:{data,mimeType:file.type||'image/jpeg'}}}
  async function aiSdk(){
    if(aiSdkPromise)return aiSdkPromise;
    aiSdkPromise=(async()=>{
      const [appMod,appCheckMod,aiMod]=await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js'),
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-ai.js')
      ]);
      const opts=root.firebase?.app?.().options;if(!opts?.apiKey||!opts?.projectId||!opts?.appId)throw new Error('Không lấy được Firebase config của E-REPORT.');
      let cfg={};try{cfg=await root.sagsAiLoadConfig?.(true)||{}}catch(_){}
      let app;try{app=appMod.getApp('sags-v2211-import-ai')}catch(_){app=appMod.initializeApp(opts,'sags-v2211-import-ai')}
      const siteKey=S(cfg.appCheckSiteKey||APP_CHECK_SITE_KEY_FALLBACK);if(!siteKey)throw new Error('Chưa cấu hình App Check cho AI.');
      let check=root.__SAGS_V2211_APP_CHECK_INSTANCE||null;
      if(!check)try{check=appCheckMod.initializeAppCheck(app,{provider:new appCheckMod.ReCaptchaEnterpriseProvider(siteKey),isTokenAutoRefreshEnabled:true});root.__SAGS_V2211_APP_CHECK_INSTANCE=check}catch(_){
        check=app?._container?.getProvider?.('app-check')?.getImmediate?.({optional:true})||null;
      }
      if(!check)throw new Error('Không khởi tạo được App Check cho AI.');
      const token=await appCheckMod.getToken(check,false);if(!token?.token)throw new Error('Không lấy được App Check token.');
      const ai=aiMod.getAI(app,{backend:new aiMod.GoogleAIBackend()});
      const modelName=S(cfg.fastModel||cfg.model||AI_MODEL_FALLBACK);
      return {model:aiMod.getGenerativeModel(ai,{model:modelName,generationConfig:{responseMimeType:'application/json',temperature:0.05}}),modelName};
    })();return aiSdkPromise;
  }
  function importPrompt(files){return `Bạn là AI nhập dữ liệu khai thác hàng không cho E-REPORT/SAGS CXR. Có ${files.length} ảnh, theo đúng thứ tự tên file bên dưới. Đọc từng ảnh và tự phân loại thành A/C LIMITS hoặc LỊCH VỆ SINH TÀU BAY. Không suy đoán ký tự không nhìn thấy.

PHÂN LOẠI:
- LIMIT: bảng/thông báo hạn chế tàu bay như APU INOP, GPU/ACU/ASU, HOLD/CARGO/SEAT INOP hoặc hạn chế khác.
- CLEANING: lịch vệ sinh cabin có cột Date, Flt No, Route, A/C Reg, Type.
- CLEANING có lời gửi "Dear VietSky Team" hoặc nội dung giao VietSky thì provider=VIETSKY.
- CLEANING có lời gửi "PVTT & ĐH SAGS", "PVTT SAGS" hoặc giao SAGS thì provider=SAGS.

QUY TẮC:
1) Giữ đúng Flight No, Route, A/C Reg và ngày đọc được. Một ô "VJ7621/VJ5512" phải tách arrivalFlight=VJ7621, departureFlight=VJ5512; nếu chỉ có một chuyến thì đặt vào trường phù hợp theo Route qua CXR và để trường kia rỗng.
2) Ngày phải là YYYY-MM-DD. Chỉ dùng năm nếu năm xuất hiện trong chính ảnh/email; không đoán năm bị thiếu.
3) LIMIT: category chỉ một trong APU INOP, HOLD INOP/ISSUES, SEAT INOP, OTHERS. Giữ nguyên restriction có nghĩa khai thác; action=CLEAR nếu dòng nói đã clear.
4) Nếu không chắc, confidence thấp và needsReview=true. Không tự bịa dữ liệu.
5) sourceImageIndex là số thứ tự ảnh bắt đầu từ 1.

Chỉ trả JSON hợp lệ, không markdown:
{"documents":[{"sourceImageIndex":1,"documentType":"LIMIT|CLEANING|UNKNOWN","documentDate":"YYYY-MM-DD hoặc rỗng","provider":"SAGS|VIETSKY|UNKNOWN","confidence":0.0,"items":[{"kind":"LIMIT","flightNo":"","acReg":"","category":"OTHERS","restriction":"","effectiveFrom":"","effectiveTo":"","action":"UPSERT","confidence":0.0,"needsReview":false},{"kind":"CLEANING","date":"","arrivalFlight":"","departureFlight":"","sta":"HH:MM hoặc rỗng","std":"HH:MM hoặc rỗng","route":"","acReg":"","acType":"","provider":"SAGS|VIETSKY|UNKNOWN","confidence":0.0,"needsReview":false}]}]}

TÊN ẢNH:
${files.map((f,i)=>String(i+1)+'. '+f.name).join('\n')}`;}
  function extractJson(text){const s=S(text).replace(/^```(?:json)?/i,'').replace(/```$/,'').trim(),a=s.indexOf('{'),b=s.lastIndexOf('}');if(a<0||b<a)throw new Error('AI không trả JSON hợp lệ.');return JSON.parse(s.slice(a,b+1))}

  function normalizeAi(obj,files){
    const limits=[],cleaning=[],review=[];
    for(const doc of (Array.isArray(obj?.documents)?obj.documents:[])){
      const imageIndex=Math.max(1,Number(doc?.sourceImageIndex||1)),sourceFile=S(files[imageIndex-1]?.name||''),docDate=normalizeISO(doc?.documentDate),docProvider=U(doc?.provider);
      for(const raw of (Array.isArray(doc?.items)?doc.items:[])){
        const kind=U(raw?.kind||doc?.documentType),confidence=Math.max(0,Math.min(1,Number(raw?.confidence??doc?.confidence??0))),needsReview=!!raw?.needsReview||confidence<.85;
        if(kind.includes('LIMIT')){
          const restriction=S(raw?.restriction),action=U(raw?.action)==='CLEAR'?'CLEAR':'UPSERT',row={kind:'LIMIT',sourceFile,imageIndex,flightNo:normFlight(raw?.flightNo),acReg:normReg(raw?.acReg),displayReg:displayReg(raw?.acReg),category:limitCategory(raw?.category),restriction,effectiveFrom:normalizeISO(raw?.effectiveFrom)||docDate||todayISO(),effectiveTo:normalizeISO(raw?.effectiveTo)||normalizeISO(raw?.effectiveFrom)||docDate||todayISO(),action,confidence,needsReview};
          if(action==='CLEAR'||needsReview||(!row.acReg&&!row.flightNo)||!restriction)review.push(row);else limits.push(row);
        }else if(kind.includes('CLEAN')){
          const provider=['SAGS','VIETSKY'].includes(U(raw?.provider))?U(raw.provider):(['SAGS','VIETSKY'].includes(docProvider)?docProvider:'UNKNOWN');
          const row={kind:'CLEANING',sourceFile,imageIndex,date:normalizeISO(raw?.date)||docDate,arrivalFlight:normFlight(raw?.arrivalFlight),departureFlight:normFlight(raw?.departureFlight),sta:normalizeClock(raw?.sta),std:normalizeClock(raw?.std),route:U(raw?.route),acReg:normReg(raw?.acReg),displayReg:displayReg(raw?.acReg),acType:U(raw?.acType),provider,confidence,needsReview};
          if(needsReview||!row.date||provider==='UNKNOWN'||(!row.arrivalFlight&&!row.departureFlight&&!row.acReg))review.push(row);else cleaning.push(row);
        }
      }
    }
    return {limits,cleaning,review};
  }
  function limitCategory(v){const x=U(v);if(x.includes('APU'))return 'APU INOP';if(x.includes('HOLD')||x.includes('CARGO'))return 'HOLD INOP/ISSUES';if(x.includes('SEAT'))return 'SEAT INOP';return 'OTHERS'}

  async function saveLimits(rows){
    if(!rows.length)return 0;const snap=await db(LIMIT_PUBLIC).once('value'),old=snap.val()||{},now=Date.now(),arr=Array.isArray(old.items)?old.items.slice():Object.values(old.items||{});
    for(const r of rows){const same=x=>U(x.source)==='AI_MULTI_IMAGE'&&S(x.effectiveFrom)===r.effectiveFrom&&normFlight(x.flightNo)===r.flightNo&&normReg(x.acReg)===r.acReg&&U(x.category)===r.category;const found=arr.find(same),item={...(found||{}),id:S(found?.id||uid('ACL')),source:'AI_MULTI_IMAGE',active:true,airline:(r.flightNo.match(/^([A-Z0-9]{2,3}?)(?=\d)/)||['',''])[1],flightNo:r.flightNo,acReg:r.acReg,displayReg:r.displayReg,matchMode:r.flightNo&&r.acReg?'BOTH':r.flightNo?'FLIGHT':'REG',category:r.category,restriction:r.restriction,effectiveFrom:r.effectiveFrom,effectiveTo:r.effectiveTo,batchDate:r.effectiveFrom,batchVersion:'V2.2.11',recipientRoles:['DH','CBTT','VHTTB','PVHK','PVHLNG'],sourceFile:r.sourceFile,aiConfidence:r.confidence,createdAtMs:Number(found?.createdAtMs||now),createdBy:found?.createdBy||actor(),updatedAtMs:now,updatedBy:actor()};if(found)arr[arr.indexOf(found)]=item;else arr.push(item)}
    const catalog={...old,kind:'sags_ac_limits_catalog_v1',version:now,items:arr,updatedAtMs:now,updatedBy:actor()};await db(LIMIT_PUBLIC).set(catalog);await db(LIMIT_SIGNAL).set({version:now,action:'AI_MULTI_IMAGE_UPSERT',updatedAtMs:now,updatedBy:actor()});
    try{const fs=firestore(),col=collectionName();if(fs&&col)await fs.collection(col).doc('AC_LIMITS_CATALOG_V1').set(catalog,{merge:false})}catch(e){console.info('V2.2.11 LIMIT Firestore mirror skipped',e?.message||e)}
    try{await root.ACLSimple?.refresh?.()}catch(_){}return rows.length;
  }
  function cleanKey(x){return [S(x.date),normFlight(x.arrivalFlight),normFlight(x.departureFlight),normReg(x.acReg)].join('|')}
  async function saveCleaning(rows){
    if(!rows.length)return 0;let old={};try{old=(await db(CLEAN_PUBLIC).once('value')).val()||{}}catch(_){}const now=Date.now(),arr=Array.isArray(old.items)?old.items.slice():Object.values(old.items||{});
    for(const r of rows){const found=arr.find(x=>cleanKey(x)===cleanKey(r)),item={...(found||{}),id:S(found?.id||uid('CLEAN')),source:'AI_MULTI_IMAGE',active:true,date:r.date,arrivalFlight:r.arrivalFlight,departureFlight:r.departureFlight,flights:[r.arrivalFlight,r.departureFlight].filter(Boolean),sta:r.sta,std:r.std,route:r.route,acReg:r.acReg,displayReg:r.displayReg,acType:r.acType,provider:r.provider,sourceFile:r.sourceFile,aiConfidence:r.confidence,createdAtMs:Number(found?.createdAtMs||now),createdBy:found?.createdBy||actor(),updatedAtMs:now,updatedBy:actor()};if(found)arr[arr.indexOf(found)]=item;else arr.push(item)}
    const catalog={schema:1,kind:'sags_aircraft_cleaning_catalog_v1',version:now,items:arr,updatedAtMs:now,updatedBy:actor()};await db(CLEAN_PUBLIC).set(catalog);await db(CLEAN_SIGNAL).set({version:now,action:'AI_MULTI_IMAGE_UPSERT',updatedAtMs:now,updatedBy:actor()});
    try{const fs=firestore(),col=collectionName();if(fs&&col)await fs.collection(col).doc('AIRCRAFT_CLEANING_CATALOG_V1').set(catalog,{merge:false})}catch(e){console.info('V2.2.11 CLEANING Firestore mirror skipped',e?.message||e)}
    applyCleanCatalog(catalog);return rows.length;
  }
  async function saveReview(rows,files){if(!rows.length)return 0;const id=uid('REVIEW'),payload={schema:1,id,status:'PENDING_AD_REVIEW',source:'AI_MULTI_IMAGE',rows,files:files.map(f=>({name:f.name,size:f.size,type:f.type})),createdAtMs:Date.now(),createdBy:actor(),build:BUILD};await db(`${CLEAN_REVIEW}/${safe(id)}`).set(payload);return rows.length}

  async function runImport(){
    if(importing)return;if(!isAdmin())return popup('warning','KHÔNG CÓ QUYỀN','Chỉ AD được dùng chức năng này.');
    const files=[...($('v2211Images')?.files||[])];if(!files.length)return popup('warning','CHƯA CHỌN ẢNH','Hãy chọn một hoặc nhiều ảnh.');if(files.length>MAX_BATCH_IMAGES)return popup('warning','QUÁ NHIỀU ẢNH',`Mỗi lượt tối đa ${MAX_BATCH_IMAGES} ảnh.`);
    const bad=files.find(f=>f.size>MAX_IMAGE_BYTES);if(bad)return popup('warning','ẢNH VƯỢT GIỚI HẠN',`${bad.name} vượt 10 MB.`);
    importing=true;const run=$('v2211Run'),close=$('v2211Close');run.disabled=true;close.disabled=true;setStatus(`AI đang đọc và phân loại ${files.length} ảnh…`);
    try{
      const {model,modelName}=await aiSdk(),parts=[];for(let i=0;i<files.length;i++){setStatus(`Đang chuẩn bị ảnh ${i+1}/${files.length}: ${files[i].name}`);parts.push({text:`IMAGE ${i+1}: ${files[i].name}`},await filePart(files[i]))}
      setStatus(`AI ${modelName} đang đọc ${files.length} ảnh…`);const result=await model.generateContent([{text:importPrompt(files)},...parts]),obj=extractJson(result?.response?.text?.()||''),out=normalizeAi(obj,files);
      setStatus('AI đã đọc xong. Đang gán cảnh báo vào hệ thống…');const nLimit=await saveLimits(out.limits),nClean=await saveCleaning(out.cleaning),nReview=await saveReview(out.review,files);
      const msg=`Đã xử lý ${files.length} ảnh.\nA/C LIMITS: ${nLimit} dòng.\nLịch vệ sinh: ${nClean} dòng.\nCần AD xác nhận: ${nReview} dòng.`;setStatus('✓ '+msg);popup(nReview?'warning':'success',nReview?'ĐÃ GÁN · CÓ DÒNG CẦN KIỂM TRA':'ĐÃ GÁN CẢNH BÁO',msg);$('v2211Images').value='';renderSelectedFiles();setStatus('✓ '+msg);
    }catch(e){aiSdkPromise=null;const msg='AI đọc/gán ảnh thất bại: '+S(e?.message||e);setStatus(msg,true);popup('error','AI IMPORT THẤT BẠI',msg)}finally{importing=false;run.disabled=false;close.disabled=false}
  }

  function applyCleanCatalog(v){v=v||{};cleanCatalog={version:Number(v.version||0),items:(Array.isArray(v.items)?v.items:Object.values(v.items||{})).filter(Boolean)};try{localStorage.setItem(CLEAN_CACHE,JSON.stringify(cleanCatalog))}catch(_){};cleanQueue=cleanQueue.filter(a=>cleanCatalog.items.some(x=>S(x.id)===S(a.item.id)&&x.active!==false));evaluateCleaningSoon()}
  function loadCleanCache(){try{const x=JSON.parse(localStorage.getItem(CLEAN_CACHE)||'null');if(x?.items)applyCleanCatalog(x)}catch(_){}}
  async function loadCleaning(){try{const v=(await db(CLEAN_PUBLIC).once('value')).val();if(v)applyCleanCatalog(v)}catch(e){console.info('V2.2.11 cleaning load',e?.message||e)}}
  function startCleanSignal(){try{if(cleanSignalRef)return;cleanSignalRef=db(CLEAN_SIGNAL);cleanSignalRef.on('value',snap=>{const v=Number(snap?.val?.()?.version||0);if(v&&v!==cleanCatalog.version)loadCleaning()})}catch(_){} }

  function pick(st,...keys){for(const k of keys){const v=S(st?.[k]);if(v&&U(v)!=='N/A')return v}return ''}
  function contextFor(sessionId,st,meta){
    st=st&&typeof st==='object'?st:{};let identity={};try{identity=root.fs09IdentityFromState?.(st,meta)||root.opsRampIdentity?.(st,meta)||{}}catch(_){}
    let flights=Array.isArray(identity.flights)?identity.flights.map(normFlight).filter(Boolean):[];if(!flights.length)flights=[pick(st,'fltBefore','f421_fltBefore','f551_fltBefore','f09_fltBefore'),pick(st,'fltAfter','f421_fltAfter','f551_fltAfter','f09_fltAfter')].map(normFlight).filter(Boolean);
    const reg=normReg(identity.acRegToken||identity.regn||pick(st,'regn','f421_regn','f551_regn','f09_regn','acReg'));
    const date=normalizeISO(identity.dateToken||pick(st,'date','f421_date','f551_date','f09_date'))||todayISO();
    return {sessionId:S(sessionId)||`CLEAN_${date}_${flights.join('_')}_${reg}`,flightLabel:flights.join('/')||S(meta?.name||'CHUYẾN'),flights,reg,date,sta:pick(st,'sta','f421_sta','f551_sta','f09_sta'),chockOn:pick(st,'h5Start','f421_h5Start','f551_h5Start','f09_h5Start','h5','f421_h5','f551_h5','f09_h5'),pushback:pick(st,'h24Start','f421_h24Start','f551_h24Start','f09_h24Start','pushback','f421_pushback','f551_pushback','f09_pushback')};
  }
  function contexts(){const out=[],seen=new Set(),add=(sid,st,meta)=>{const c=contextFor(sid,st,meta);if(!c.sessionId||seen.has(c.sessionId))return;seen.add(c.sessionId);out.push(c)};try{add(S(root.activeFlightSessionId),root.state||{},root.currentFlightSessionMeta?.()||null)}catch(_){}try{for(const meta of (root.readFlightSessionList?.()||[])){const sid=S(meta?.id);if(!sid||seen.has(sid))continue;const env=root.readFlightSessionEnvelope?.(sid)||{};add(sid,env.state||{},meta)}}catch(_){}return out}
  function cleanMatch(x,c){if(x.active===false||S(x.date)!==c.date)return false;const fs=[x.arrivalFlight,x.departureFlight,...(x.flights||[])].map(normFlight).filter(Boolean),fm=fs.some(f=>c.flights.includes(f)),rm=normReg(x.acReg)&&normReg(x.acReg)===c.reg;return fm||rm}
  function ackStore(){try{return JSON.parse(localStorage.getItem(CLEAN_ACK)||'{}')||{}}catch(_){return {}}}
  function alertKey(item,c,trigger){return `${S(item.id)}|${Number(item.updatedAtMs||0)}|${c.sessionId}|${c.date}|${trigger}`}
  function evaluateCleaningSoon(){clearTimeout(cleanTimer);cleanTimer=setTimeout(evaluateCleaning,120)}
  function evaluateCleaning(){
    if(role()!=='DH'||!cleanCatalog.version)return;const now=Date.now(),acks=ackStore();
    for(const c of contexts()){
      if(c.pushback)continue;const matches=cleanCatalog.items.filter(x=>cleanMatch(x,c));if(!matches.length)continue;
      const exactFlight=matches.filter(x=>[x.arrivalFlight,x.departureFlight,...(x.flights||[])].map(normFlight).some(f=>c.flights.includes(f))),pool=exactFlight.length?exactFlight:matches,latest=pool.slice().sort((a,b)=>Number(b.updatedAtMs||0)-Number(a.updatedAtMs||0))[0];if(!latest)continue;
      const triggers=[];const due=clockMs(c.date,c.sta);if(due&&now>=due-10*60000)triggers.push('STA_T10');if(c.chockOn)triggers.push('CHOCK_ON');
      for(const trigger of triggers){const key=alertKey(latest,c,trigger);if(acks[key]||cleanCurrent?.key===key||cleanQueue.some(a=>a.key===key))continue;cleanQueue.push({key,item:latest,ctx:c,trigger})}
    }tryShowCleaning();
  }
  function anotherPopupVisible(){for(const id of ['opsAlertModal','aclAlertModal','sagsActionPopup','globalActionPopup','v1178ActionPopup']){const e=$(id);if(e&&getComputedStyle(e).display!=='none')return true}return false}
  function tryShowCleaning(){if(cleanCurrent||!cleanQueue.length)return;if(anotherPopupVisible()){setTimeout(tryShowCleaning,900);return}cleanCurrent=cleanQueue.shift();showCleaning(cleanCurrent)}
  function showCleaning(a){ensureUi();const provider=U(a.item.provider)==='VIETSKY'?'VIETSKY':'SAGS',f=$('v2211CleanFlight'),p=$('v2211CleanProvider'),m=$('v2211CleanMeta');if(f)f.textContent=`${a.ctx.flightLabel}${a.ctx.reg?' · A/C '+displayReg(a.ctx.reg):''}`;if(p)p.textContent=`${provider} DỌN VỆ SINH TÀU BAY`;if(m)m.textContent=a.trigger==='CHOCK_ON'?`NHẮC LẠI KHI CHOCK ON ${a.ctx.chockOn||''}`:`CẢNH BÁO STA −10 PHÚT · STA ${a.ctx.sta||'—'}`;$('v2211CleaningAlert').style.display='flex';try{navigator.vibrate?.([350,160,350])}catch(_){}try{root.writeUserActivity?.(`VỆ SINH · ${a.trigger==='CHOCK_ON'?'CHOCK ON':'STA T-10'}`,`${a.ctx.flightLabel} · ${provider}`,{provider,flightLabel:a.ctx.flightLabel,reg:a.ctx.reg,trigger:a.trigger})}catch(_){} }
  function ackCleaningAlert(){if(!cleanCurrent)return;const acks=ackStore();acks[cleanCurrent.key]=Date.now();try{localStorage.setItem(CLEAN_ACK,JSON.stringify(acks))}catch(_){}$('v2211CleaningAlert').style.display='none';cleanCurrent=null;setTimeout(tryShowCleaning,180)}

  function install(){ensureUi();loadCleanCache();loadCleaning();startCleanSignal();setInterval(()=>{injectCommonButton();if(!cleanSignalRef)startCleanSignal();if(!cleanCatalog.version)loadCleaning();evaluateCleaning()},5000);document.addEventListener('input',e=>{if(/(^|_)h5(start)?$/i.test(S(e.target?.id)))setTimeout(evaluateCleaning,250)},true);document.addEventListener('visibilitychange',()=>{if(!document.hidden)evaluateCleaningSoon()});window.addEventListener('pageshow',evaluateCleaningSoon,{passive:true});setTimeout(injectCommonButton,500);setTimeout(injectCommonButton,1800)}
  root.sagsV2211OpenUnifiedImport=openImport;
  root.sagsV2211EvaluateCleaning=evaluateCleaning;
  root.sagsV2211AckCleaning=ackCleaningAlert;
  root.SAGS_V2211={build:BUILD,openImport,evaluateCleaning,loadCleaning};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else setTimeout(install,0);
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.12-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.12 · AI APP CHECK + PC MY FLIGHT STABILITY
 * BUILD: V2.2.12-AI-APP-CHECK-PC-MYFLIGHT-FIX
 */
(function(root){
  'use strict';
  if(root.__SAGS_V2212_RUNTIME__)return;
  root.__SAGS_V2212_RUNTIME__={build:'V2.2.12-AI-APP-CHECK-PC-MYFLIGHT-FIX',loadedAtMs:Date.now()};
  const st=document.createElement('style');
  st.id='v2212PcMyFlightStable';
  st.textContent='@media(min-width:621px){#fwcModal.show .fwcPanel{transform:translateZ(0);backface-visibility:hidden;contain:layout paint}}';
  document.head.appendChild(st);
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.13-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.13 · AIRCRAFT CLEANING SAVE + MANAGER
 * BUILD: V2.2.13-CLEANING-SAVE-MANAGER
 */
(function(root){
  'use strict';
  const BUILD='V2.2.13-CLEANING-SAVE-MANAGER';
  if(root.__SAGS_V2213_CLEANING_MANAGER===BUILD)return;
  root.__SAGS_V2213_CLEANING_MANAGER=BUILD;

  const PUBLIC='aircraft_cleaning/catalog_public';
  const SIGNAL='aircraft_cleaning/catalog_signal';
  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const $=id=>document.getElementById(id);
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const normReg=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const displayReg=v=>U(v).replace(/^([A-Z]{2})A(?=\d)/,'$1-A');
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const uid=()=>`CLEAN_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`.toUpperCase();
  let catalog={schema:1,kind:'sags_aircraft_cleaning_catalog_v1',version:0,items:[]};
  let editId='',signalRef=null,loading=false,panelObserver=null;

  function profile(){try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}catch(_){return root.currentUserProfile||{}}}
  function role(){return U(root.currentRole||profile().role||profile().roleCode).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/[^A-Z0-9]/g,'')}
  function isAdmin(){return ['AD','ADMIN','ROLEADMIN'].includes(role())}
  function actor(){const p=profile();return {role:role(),username:S(p.username||p.userName),name:S(p.name||p.fullName||p.displayName)}}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function itemsOf(v){return (Array.isArray(v?.items)?v.items:Object.values(v?.items||{})).filter(Boolean)}
  function keyOf(x){return [S(x.date),normFlight(x.arrivalFlight),normFlight(x.departureFlight),normReg(x.acReg)].join('|')}
  function popup(type,title,message){if(typeof root.sagsActionPopup==='function')return root.sagsActionPopup({type,title,message});alert(`${title}\n\n${message}`)}
  function status(message,error=false){const e=$('v2213Status');if(e){e.textContent=S(message);e.classList.toggle('err',!!error)}}

  function ensureCss(){
    if($('v2213Style'))return;
    const st=document.createElement('style');st.id='v2213Style';st.textContent=`
.v2213-tabs{display:flex;align-items:center;gap:6px;margin-left:auto}.v2213-tab{border:1px solid #c6d3dd;border-radius:9px;min-height:36px;padding:7px 10px;background:#eef3f7;color:#29475f;font:900 11px Arial;white-space:nowrap}.v2213-tab.active{border-color:#075ea8;background:#075ea8;color:#fff}.v2213-tab.clean{border-color:#87bea0;background:#eaf7ef;color:#087443}.v2213-tab.ai{border-color:#bca6df;background:#f2edfb;color:#6333a2}#v2211CommonUpload{display:none!important}
#v2213Modal{position:fixed;inset:0;z-index:19520;display:none;align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));box-sizing:border-box;background:rgba(3,15,28,.72);backdrop-filter:blur(3px)}
.v2213-panel{width:min(96vw,930px);max-height:94dvh;overflow:auto;background:#f7f9fb;border-radius:18px;padding:15px;box-sizing:border-box;box-shadow:0 24px 80px rgba(0,0,0,.42);font:14px/1.4 Arial;color:#19334d}.v2213-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.v2213-head h3{margin:0;color:#087443;font:900 21px Arial}.v2213-close,.v2213-btn{border:0;border-radius:10px;min-height:42px;padding:9px 13px;font-weight:900;cursor:pointer}.v2213-close{background:#e7edf2;color:#30495d}.v2213-btn{background:#075ea8;color:#fff}.v2213-btn.good{background:#087443}.v2213-btn.gray{background:#e7edf2;color:#30495d}.v2213-box{margin-top:11px;padding:12px;border:1px solid #cfdae3;border-radius:13px;background:#fff}.v2213-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.v2213-field{display:flex;flex-direction:column;gap:4px}.v2213-field.wide{grid-column:span 2}.v2213-field label{font-size:11px;font-weight:900;color:#52687a}.v2213-field input,.v2213-field select{width:100%;box-sizing:border-box;border:1px solid #aebdca;border-radius:9px;padding:10px;background:#fff;color:#17354d;font-weight:800}.v2213-check{display:flex;align-items:center;gap:8px;font-weight:900;padding-top:22px}.v2213-check input{width:20px;height:20px;accent-color:#087443}.v2213-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.v2213-status{min-height:20px;margin-top:8px;color:#087443;font-weight:900;white-space:pre-wrap}.v2213-status.err{color:#b42318}.v2213-filter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}.v2213-filter input{min-width:180px;flex:1;border:1px solid #aebdca;border-radius:9px;padding:9px;font-weight:800}.v2213-list{display:grid;gap:8px}.v2213-item{border:1px solid #d2dde6;border-radius:12px;padding:10px;background:#fff}.v2213-item.off{opacity:.58}.v2213-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.v2213-title{font:900 16px Arial;color:#173f60}.v2213-provider{display:inline-block;border-radius:999px;padding:5px 9px;background:#e8f7ee;color:#087443;font:900 11px Arial}.v2213-provider.vietsky{background:#fff0dc;color:#995500}.v2213-meta{margin-top:5px;color:#5a7082;font-size:12px;font-weight:800}.v2213-source{margin-top:4px;color:#748493;font-size:10px}.v2213-item-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.v2213-item-actions button{border:1px solid #bdcad4;border-radius:8px;padding:7px 10px;background:#f1f5f8;color:#29475f;font-weight:900}.v2213-item-actions .danger{border-color:#e3b4b0;background:#fff5f4;color:#a51f16}.v2213-empty{padding:18px;text-align:center;color:#66798a;font-weight:800}
.v2213-head{position:sticky;top:-15px;z-index:5;padding:8px 0 10px;background:#f7f9fb;border-bottom:1px solid #d6e0e8}.v2213-head h3{font-size:19px}.v2213-head-actions{display:flex;gap:6px;align-items:center}.v2213-head-actions .v2213-btn,.v2213-head-actions .v2213-close{min-height:36px;padding:7px 10px}.v2213-btn.ai{background:#6333a2}.v2213-form-box{display:none;border-color:#8fc7a7;background:#fbfffc}.v2213-form-box.show{display:block}.v2213-box{margin-top:9px;padding:10px}.v2213-grid{gap:7px}.v2213-field input,.v2213-field select{padding:8px}.v2213-filter{gap:7px;margin-bottom:7px}.v2213-filter input{padding:8px}.v2213-list{gap:6px}.v2213-item{padding:9px}.v2213-title{font-size:14px}.v2213-meta{font-size:11px}.v2213-item-actions{margin-top:6px}.v2213-item-actions button{padding:6px 9px;font-size:11px}
@media(max-width:720px){.v2213-grid{grid-template-columns:1fr 1fr}.v2213-field.wide{grid-column:span 2}.acls-top>h3{display:none}.v2213-tabs{margin-left:0;flex:1}.v2213-tab{flex:1;padding:7px 5px}.v2213-head h3{font-size:16px}}@media(max-width:470px){.v2213-grid{grid-template-columns:1fr}.v2213-field.wide{grid-column:span 1}.v2213-check{padding-top:5px}.v2213-actions>*{flex:1}.v2213-head-actions .v2213-btn.ai{display:none}.v2213-tab{font-size:10px}.v2213-item-head{flex-direction:column}.v2213-provider{align-self:flex-start}}
`;document.head.appendChild(st);
  }

  function ensureUi(){
    ensureCss();if($('v2213Modal'))return;
    const m=document.createElement('div');m.id='v2213Modal';m.innerHTML=`<div class="v2213-panel"><div class="v2213-head"><h3>🧹 LỊCH VỆ SINH</h3><div class="v2213-head-actions"><button id="v2213Ai" class="v2213-btn ai" type="button">📷 AI ẢNH</button><button id="v2213New" class="v2213-btn good" type="button">＋ THÊM LỊCH</button><button id="v2213Close" class="v2213-close" type="button">ĐÓNG</button></div></div><div id="v2213FormBox" class="v2213-box v2213-form-box"><div class="v2213-grid"><div class="v2213-field"><label>NGÀY</label><input id="v2213Date" type="date"></div><div class="v2213-field"><label>CHUYẾN ĐẾN</label><input id="v2213Arr" placeholder="VJ5347"></div><div class="v2213-field"><label>CHUYẾN ĐI</label><input id="v2213Dep" placeholder="VJ5513"></div><div class="v2213-field"><label>A/C REG</label><input id="v2213Reg" placeholder="VN-A202"></div><div class="v2213-field"><label>STA</label><input id="v2213Sta" type="time"></div><div class="v2213-field"><label>STD</label><input id="v2213Std" type="time"></div><div class="v2213-field wide"><label>ROUTE</label><input id="v2213Route" placeholder="TPE-CXR-ICN"></div><div class="v2213-field"><label>LOẠI TÀU BAY</label><input id="v2213Type" placeholder="A21N-Y240"></div><div class="v2213-field"><label>ĐƠN VỊ DỌN VỆ SINH</label><select id="v2213Provider"><option value="SAGS">SAGS</option><option value="VIETSKY">VIETSKY</option></select></div><label class="v2213-check"><input id="v2213Active" type="checkbox" checked> ĐANG ÁP DỤNG</label></div><div class="v2213-actions"><button id="v2213Save" class="v2213-btn good" type="button">LƯU LỊCH VỆ SINH</button><button id="v2213Clear" class="v2213-btn gray" type="button">XÓA Ô</button></div><div id="v2213Status" class="v2213-status"></div></div><div class="v2213-box"><div class="v2213-filter"><b>CHỌN NGÀY XEM:</b><input id="v2213FilterDate" type="date"><input id="v2213FilterText" placeholder="Tìm Flight No, A/C Reg, route..."><button id="v2213Refresh" class="v2213-btn" type="button">TẢI LẠI</button></div><div id="v2213List" class="v2213-list"></div></div></div>`;document.body.appendChild(m);
    $('v2213Close').onclick=close;$('v2213New').onclick=()=>{clearForm(false);showForm(true)};$('v2213Ai').onclick=()=>$('v2211CommonUpload')?.click();$('v2213Save').onclick=save;$('v2213Clear').onclick=()=>clearForm(true);$('v2213Refresh').onclick=load;$('v2213FilterDate').oninput=render;$('v2213FilterText').oninput=render;
    $('v2213List').onclick=e=>{const b=e.target.closest('button[data-action]');if(!b)return;const id=S(b.dataset.id),action=S(b.dataset.action);if(action==='edit')edit(id);else if(action==='toggle')toggle(id);else if(action==='delete')remove(id)};
    clearForm(false);
  }

  function injectButton(){
    const panel=$('aclSimplePanel');if(!panel||$('v2213Open'))return false;const top=panel.querySelector('.acls-top');if(!top)return false;
    const tabs=document.createElement('div');tabs.className='v2213-tabs';tabs.innerHTML='<button class="v2213-tab active" type="button">📋 LIMIT</button><button id="v2213Open" class="v2213-tab clean" type="button">🧹 LỊCH VỆ SINH</button><button id="v2213TopAi" class="v2213-tab ai" type="button">📷 AI ẢNH</button>';
    const closeBtn=top.querySelector('.acls-close');top.insertBefore(tabs,closeBtn||null);$('v2213Open').onclick=open;$('v2213TopAi').onclick=()=>$('v2211CommonUpload')?.click();return true;
  }
  function watchPanel(){if(injectButton()){panelObserver?.disconnect();panelObserver=null;return}if(panelObserver||!document.body)return;panelObserver=new MutationObserver(()=>{if(injectButton()){panelObserver.disconnect();panelObserver=null}});panelObserver.observe(document.body,{childList:true,subtree:true})}
  function clearForm(message=true){editId='';if($('v2213Date'))$('v2213Date').value=today();for(const id of ['v2213Arr','v2213Dep','v2213Reg','v2213Sta','v2213Std','v2213Route','v2213Type'])if($(id))$(id).value='';if($('v2213Provider'))$('v2213Provider').value='SAGS';if($('v2213Active'))$('v2213Active').checked=true;if($('v2213Save'))$('v2213Save').textContent='LƯU LỊCH VỆ SINH';if(message)status('Đã xóa các ô nhập.')}
  function showForm(on){$('v2213FormBox')?.classList.toggle('show',!!on);if(on)document.querySelector('#v2213Modal .v2213-panel')?.scrollTo({top:0,behavior:'smooth'})}
  function readForm(){return {date:S($('v2213Date')?.value),arrivalFlight:normFlight($('v2213Arr')?.value),departureFlight:normFlight($('v2213Dep')?.value),sta:S($('v2213Sta')?.value),std:S($('v2213Std')?.value),route:U($('v2213Route')?.value),acReg:normReg($('v2213Reg')?.value),displayReg:displayReg($('v2213Reg')?.value),acType:U($('v2213Type')?.value),provider:U($('v2213Provider')?.value),active:!!$('v2213Active')?.checked}}
  async function load(){
    if(loading)return;loading=true;status('Đang tải lịch vệ sinh...');
    try{const v=(await db(PUBLIC).once('value')).val()||{};catalog={...v,schema:1,kind:'sags_aircraft_cleaning_catalog_v1',version:Number(v.version||0),items:itemsOf(v)};render();status(`Đã tải ${catalog.items.length} dòng lịch vệ sinh.`)}catch(e){status('Không tải được lịch vệ sinh: '+S(e?.message||e),true)}finally{loading=false}
  }
  async function write(action){const now=Date.now();catalog={...catalog,schema:1,kind:'sags_aircraft_cleaning_catalog_v1',version:now,updatedAtMs:now,updatedBy:actor(),items:catalog.items};await db(PUBLIC).set(catalog);await db(SIGNAL).set({version:now,action,updatedAtMs:now,updatedBy:actor()});render()}
  async function save(){
    if(!isAdmin())return popup('warning','KHÔNG CÓ QUYỀN','Chỉ AD được lưu lịch vệ sinh.');const row=readForm();
    if(!row.date)return status('Phải chọn NGÀY.',true);if(!['SAGS','VIETSKY'].includes(row.provider))return status('Phải chọn SAGS hoặc VIETSKY.',true);if(!row.arrivalFlight&&!row.departureFlight&&!row.acReg)return status('Phải có Flight No hoặc A/C Reg.',true);
    const now=Date.now(),found=editId?catalog.items.find(x=>S(x.id)===editId):catalog.items.find(x=>keyOf(x)===keyOf(row));const item={...(found||{}),...row,id:S(found?.id||uid()),flights:[row.arrivalFlight,row.departureFlight].filter(Boolean),source:S(found?.source||'MANUAL_AD'),createdAtMs:Number(found?.createdAtMs||now),createdBy:found?.createdBy||actor(),updatedAtMs:now,updatedBy:actor()};
    if(found)catalog.items[catalog.items.indexOf(found)]=item;else catalog.items.push(item);
    try{status('Đang lưu...');await write(editId?'MANUAL_UPDATE':'MANUAL_UPSERT');clearForm(false);showForm(false);popup('success','ĐÃ LƯU LỊCH VỆ SINH',`${[row.arrivalFlight,row.departureFlight].filter(Boolean).join('/')||displayReg(row.acReg)} · ${row.provider} dọn vệ sinh tàu bay.`)}catch(e){status('Lưu thất bại: '+S(e?.message||e),true)}
  }
  function edit(id){const x=catalog.items.find(v=>S(v.id)===id);if(!x)return;showForm(true);editId=id;$('v2213Date').value=S(x.date);$('v2213Arr').value=S(x.arrivalFlight);$('v2213Dep').value=S(x.departureFlight);$('v2213Reg').value=S(x.displayReg||displayReg(x.acReg));$('v2213Sta').value=S(x.sta);$('v2213Std').value=S(x.std);$('v2213Route').value=S(x.route);$('v2213Type').value=S(x.acType);$('v2213Provider').value=U(x.provider)==='VIETSKY'?'VIETSKY':'SAGS';$('v2213Active').checked=x.active!==false;$('v2213Save').textContent='LƯU THAY ĐỔI';status(`Đang sửa ${S(x.date)} · ${S(x.provider)}.`)}
  async function toggle(id){const x=catalog.items.find(v=>S(v.id)===id);if(!x)return;x.active=x.active===false;x.updatedAtMs=Date.now();x.updatedBy=actor();try{await write('MANUAL_TOGGLE')}catch(e){status('Không đổi được trạng thái: '+S(e?.message||e),true)}}
  async function remove(id){const x=catalog.items.find(v=>S(v.id)===id);if(!x||!confirm(`XÓA LỊCH VỆ SINH\n\n${S(x.date)} · ${[x.arrivalFlight,x.departureFlight].filter(Boolean).join('/')} · ${S(x.provider)}?`))return;catalog.items=catalog.items.filter(v=>S(v.id)!==id);try{await write('MANUAL_DELETE');if(editId===id)clearForm(false);status('Đã xóa lịch vệ sinh.')}catch(e){status('Xóa thất bại: '+S(e?.message||e),true)}}
  function render(){
    const host=$('v2213List');if(!host)return;const d=S($('v2213FilterDate')?.value),q=U($('v2213FilterText')?.value);if(!d){host.innerHTML='<div class="v2213-empty">📅 Chọn ngày để xem lịch vệ sinh.</div>';return}const rows=catalog.items.filter(x=>S(x.date)===d&&(!q||U([x.arrivalFlight,x.departureFlight,x.route,x.acReg,x.displayReg,x.acType,x.provider].join(' ')).includes(q))).sort((a,b)=>S(a.sta||a.std).localeCompare(S(b.sta||b.std))||S(a.arrivalFlight||a.departureFlight).localeCompare(S(b.arrivalFlight||b.departureFlight)));
    host.innerHTML=rows.length?rows.map(x=>{const provider=U(x.provider)==='VIETSKY'?'VIETSKY':'SAGS',flight=[x.arrivalFlight,x.departureFlight].filter(Boolean).join(' / ')||'CHƯA CÓ FLIGHT NO',times=[x.sta?`STA ${x.sta}`:'',x.std?`STD ${x.std}`:''].filter(Boolean).join(' · ');return `<div class="v2213-item ${x.active===false?'off':''}"><div class="v2213-item-head"><div><div class="v2213-title">${esc(S(x.date))} · ${esc(flight)}${times?' · '+esc(times):''}</div><div class="v2213-meta">${esc(S(x.route)||'—')} · A/C ${esc(S(x.displayReg||displayReg(x.acReg))||'—')} · ${esc(S(x.acType)||'—')}</div></div><span class="v2213-provider ${provider==='VIETSKY'?'vietsky':''}">${provider} DỌN VỆ SINH</span></div><div class="v2213-source">${x.active===false?'TẠM TẮT · ':''}${esc(S(x.source||'MANUAL'))}${x.sourceFile?' · '+esc(x.sourceFile):''}</div><div class="v2213-item-actions"><button data-action="edit" data-id="${esc(x.id)}">SỬA</button><button data-action="toggle" data-id="${esc(x.id)}">${x.active===false?'BẬT LẠI':'TẠM TẮT'}</button><button class="danger" data-action="delete" data-id="${esc(x.id)}">XÓA</button></div></div>`}).join(''):'<div class="v2213-empty">Chưa có lịch vệ sinh phù hợp.</div>';
  }
  async function open(){if(!isAdmin())return popup('warning','KHÔNG CÓ QUYỀN','Chỉ AD được quản lý lịch vệ sinh.');ensureUi();clearForm(false);showForm(false);$('v2213FilterDate').value='';$('v2213FilterText').value='';$('v2213Modal').style.display='flex';await load()}
  function close(){$('v2213Modal').style.display='none'}
  function startSignal(){try{if(signalRef)return;signalRef=db(SIGNAL);signalRef.on('value',snap=>{const v=Number(snap?.val?.()?.version||0);if(v&&v!==Number(catalog.version||0)&&$('v2213Modal')?.style.display==='flex')load()})}catch(_){}}
  function install(){ensureUi();watchPanel();startSignal()}
  install();setTimeout(install,400);setTimeout(install,1400);root.addEventListener('pageshow',()=>setTimeout(install,100),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,100)},{passive:true});
  root.SAGSCleaningAdmin={build:BUILD,open,close,refresh:load};
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.14-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.14 · COMPACT LIMIT + CLEANING UI
 * BUILD: V2.2.14-COMPACT-LIMIT-CLEANING-STA-STD
 */
(function(root){
  'use strict';
  if(root.__SAGS_V2214_RUNTIME__)return;
  root.__SAGS_V2214_RUNTIME__={build:'V2.2.14-COMPACT-LIMIT-CLEANING-STA-STD',loadedAtMs:Date.now()};
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.15-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.15 · DATE-FIRST LIMIT + CLEANING LISTS
 * BUILD: V2.2.15-DATE-FIRST-LIMIT-CLEANING
 */
(function(root){
  'use strict';
  const BUILD='V2.2.15-DATE-FIRST-LIMIT-CLEANING';
  if(root.__SAGS_V2215_DATE_FIRST===BUILD)return;
  root.__SAGS_V2215_DATE_FIRST=BUILD;
  const $=id=>document.getElementById(id);
  let listObserver=null,modalObserver=null,wasOpen=false;
  function css(){if($('v2215Style'))return;const s=document.createElement('style');s.id='v2215Style';s.textContent=`#v2215LimitDateLabel{font:900 11px Arial;color:#173f60;white-space:nowrap;align-self:center}#v2215LimitPrompt{padding:22px 12px;border:1px dashed #aabac7;border-radius:11px;background:#f8fbfd;text-align:center;color:#587083;font:900 13px Arial}.v2213-filter>b{font:900 11px Arial;color:#173f60;align-self:center;white-space:nowrap}@media(max-width:620px){#v2215LimitDateLabel,.v2213-filter>b{grid-column:1/-1}.v2213-filter>b{width:100%}}`;document.head.appendChild(s)}
  function gate(){const input=$('aclSDateFilter'),list=$('aclSList');if(!input||!list)return false;let p=$('v2215LimitPrompt');if(!p){p=document.createElement('div');p.id='v2215LimitPrompt';p.textContent='📅 Chọn ngày để xem danh sách A/C LIMITS.';list.insertAdjacentElement('beforebegin',p)}const selected=!!String(input.value||'').trim();list.style.display=selected?'block':'none';p.style.display=selected?'none':'block';const n=$('aclSVisibleCount');if(n&&!selected)n.textContent='CHỌN NGÀY';return true}
  function setup(){css();const input=$('aclSDateFilter'),list=$('aclSList'),modal=$('aclSimpleModal');if(!input||!list||!modal)return false;if(!$('v2215LimitDateLabel')){const label=document.createElement('span');label.id='v2215LimitDateLabel';label.textContent='CHỌN NGÀY XEM:';input.insertAdjacentElement('beforebegin',label);input.addEventListener('input',()=>setTimeout(gate,0));input.addEventListener('change',()=>setTimeout(gate,0))}if(!listObserver){listObserver=new MutationObserver(gate);listObserver.observe(list,{childList:true})}if(!modalObserver){modalObserver=new MutationObserver(()=>{const open=modal.style.display==='flex';if(open&&!wasOpen){input.value='';setTimeout(gate,0)}wasOpen=open});modalObserver.observe(modal,{attributes:true,attributeFilter:['style']})}gate();return true}
  function install(){if(setup())return;const mo=new MutationObserver(()=>{if(setup())mo.disconnect()});mo.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();root.addEventListener('pageshow',()=>setTimeout(setup,80),{passive:true});
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.16-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.16 · DATA HUB SEMANTIC ICONS
 * BUILD: V2.2.16-DATAHUB-COMBINED-LIMIT-CLEANING-ICON
 */
(function(root){
  'use strict';
  const BUILD='V2.2.16-DATAHUB-COMBINED-LIMIT-CLEANING-ICON';
  if(root.__SAGS_V2216_DATAHUB===BUILD)return;
  root.__SAGS_V2216_DATAHUB=BUILD;
  const $=id=>document.getElementById(id);
  let observer=null;

  const icons={
    roster:`<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="11" y="9" width="26" height="32" rx="4" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="M19 7h10a2 2 0 0 1 2 2v4H17V9a2 2 0 0 1 2-2Z" fill="#ff9f68" stroke="currentColor" stroke-width="2"/><path d="M17 20h14M17 26h14M17 32h9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    limits:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 22h13l7-12h4l-4 12h8l4-4h2l-2 8-12 3-4 7h-3l2-8-15-3Z" fill="#d9e9ff" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/><path d="M10 5 3 18h14L10 5Z" fill="#fff4cf" stroke="#a46600" stroke-width="1.9" stroke-linejoin="round"/><path d="M10 9v4m0 2.5v.2" stroke="#a46600" stroke-width="2.2" stroke-linecap="round"/><path d="m37 28-8 12" stroke="#087443" stroke-width="3" stroke-linecap="round"/><path d="m25 38 9 5-4 4h-9l4-9Z" fill="#bcebd5" stroke="#087443" stroke-width="1.8" stroke-linejoin="round"/><path d="m40 31 3 3m0-3-3 3" stroke="#f0a000" stroke-width="2" stroke-linecap="round"/></svg>`,
    fleet:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 27h14L28 8h4l-4 19h10l5-6h2l-3 11-14 4-5 8h-4l3-9-17-4Z" fill="#dceaff" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="13" cy="17" r="3" fill="#8fb8ef"/><circle cx="40" cy="11" r="2" fill="#8fb8ef"/></svg>`
  };

  function setIcon(cardId,kind){
    const el=$(cardId)?.querySelector('.v174DataIcon');
    if(!el||el.dataset.v2216Icon===kind)return;
    el.dataset.v2216Icon=kind;el.classList.add('v2216Icon',`v2216-${kind}`);el.innerHTML=icons[kind];
  }
  function css(){
    if($('v2216Style'))return;const s=document.createElement('style');s.id='v2216Style';s.textContent=`
#v174DataHub .v2216Icon{display:grid;place-items:center;color:#183f73;overflow:hidden}
#v174DataHub .v2216Icon svg{width:36px;height:36px;display:block;filter:drop-shadow(0 2px 2px rgba(22,63,115,.10))}
#v174DataHub .v2216-limits{background:linear-gradient(145deg,#fff7d9,#edf5ff)}
#v174DataHub .v2216-roster{background:linear-gradient(145deg,#fff1e7,#edf4ff)}
#v174DataHub .v2216-fleet{background:linear-gradient(145deg,#e8f1ff,#f2f6ff)}
`;document.head.appendChild(s)
  }
  function install(){
    const grid=document.querySelector('#v174DataHub .v174DataHubGrid');
    if(!grid)return false;css();
    const subtitle=document.querySelector('#v174DataHub .v174DataHubHead p');if(subtitle)subtitle.textContent='DAILY ROSTER · A/C LIMITS + LỊCH VỆ SINH · FLEET';
    setIcon('v174RosterCard','roster');setIcon('v174AclCard','limits');setIcon('v174FleetCard','fleet');
    const acl=$('v174AclCard');if(acl){const title=acl.querySelector('b'),note=acl.querySelector('small');if(title)title.textContent='A/C LIMITS + LỊCH VỆ SINH';if(note)note.textContent='Quản lý hạn chế tàu bay và lịch dọn vệ sinh SAGS / VIETSKY'}
    return true;
  }
  function start(){
    if(install())return;
    if(observer||!document.body)return;observer=new MutationObserver(()=>{if(install()){observer.disconnect();observer=null}});observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  setTimeout(start,500);setTimeout(start,1600);root.addEventListener('pageshow',()=>setTimeout(install,100),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,100)},{passive:true});
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.17-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V2.2.17 · TODAY DEFAULT + ARRIVAL-ONLY CLEANING
 * BUILD: V2.2.17-TODAY-DEFAULT-ARRIVAL-CLEANING
 */
(function(root){
  'use strict';
  const BUILD='V2.2.19-REMOVE-LITERAL-NEWLINES';
  if(root.__SAGS_V2217_TODAY_DEFAULT===BUILD)return;
  root.__SAGS_V2217_TODAY_DEFAULT=BUILD;
  const $=id=>document.getElementById(id),S=v=>String(v??'').trim();
  const flight=v=>S(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const db=path=>typeof root.sagsV470Ref==='function'?root.sagsV470Ref(path):null;
  let cleanTimer=0;
  function removeLiteralNewlines(){const walker=document.createTreeWalker(document.body||document.documentElement,NodeFilter.SHOW_TEXT);const bad=[];let node;while(node=walker.nextNode()){const tag=node.parentElement?.tagName;if(tag==='SCRIPT'||tag==='STYLE'||tag==='TEXTAREA')continue;const value=S(node.nodeValue);if(value&&value.replace(/\\n/g,'').trim()==='')bad.push(node)}bad.forEach(n=>n.remove())}
  function css(){if($('v2217Style'))return;const style=document.createElement('style');style.id='v2217Style';style.textContent='#v2215LimitDateLabel:after{content:" (MẶC ĐỊNH HÔM NAY)";color:#087443}#v2213FilterDate{cursor:pointer}';document.head.appendChild(style)}
  function isOpen(el){return !!el&&getComputedStyle(el).display!=='none'}
  function useToday(input){if(input&&!S(input.value))input.value=today()}
  function defaults(){css();const limitModal=$('aclSimpleModal'),cleanModal=$('v2213Modal');if(isOpen(limitModal))useToday($('aclSDateFilter'));if(isOpen(cleanModal))useToday($('v2213FilterDate'));for(const input of [isOpen(limitModal)?$('aclSDateFilter'):null,isOpen(cleanModal)?$('v2213FilterDate'):null])if(input&&input.dataset.v2217Date!==input.value){input.dataset.v2217Date=input.value;input.dispatchEvent(new Event('input',{bubbles:true}))}}
  async function collapseArrivalDuplicates(){const ref=db('aircraft_cleaning/catalog_public');if(!ref)return;const snap=await ref.once('value'),raw=snap.val()||{},rows=Array.isArray(raw.items)?raw.items:Object.values(raw.items||{}),keep=new Map(),out=[];let changed=false;for(const row of rows.filter(Boolean)){const arr=flight(row.arrivalFlight);if(!arr){out.push(row);continue}const key=`${S(row.date)}|${arr}`,previous=keep.get(key);if(!previous){keep.set(key,row);out.push(row);continue}const newer=Number(row.updatedAtMs||0)>=Number(previous.updatedAtMs||0)?row:previous,older=newer===row?previous:row;Object.assign(newer,{departureFlight:S(newer.departureFlight||older.departureFlight),std:S(newer.std||older.std),route:S(newer.route||older.route),acReg:S(newer.acReg||older.acReg),displayReg:S(newer.displayReg||older.displayReg),acType:S(newer.acType||older.acType)});const index=out.indexOf(previous);if(index>=0)out[index]=newer;keep.set(key,newer);changed=true}if(changed){const now=Date.now();await ref.set({...raw,items:out,version:now,updatedAtMs:now});const signal=db('aircraft_cleaning/catalog_signal');if(signal)await signal.set({version:now,action:'ARRIVAL_KEY_DEDUP',updatedAtMs:now})}}
  function scheduleCleanup(){clearTimeout(cleanTimer);cleanTimer=setTimeout(()=>collapseArrivalDuplicates().catch(()=>{}),850);setTimeout(()=>collapseArrivalDuplicates().catch(()=>{}),2200)}
  function install(){removeLiteralNewlines();defaults();const save=$('v2213Save');if(save&&!save.dataset.v2217Bound){save.dataset.v2217Bound='1';save.addEventListener('click',scheduleCleanup)}}
  const observer=new MutationObserver(install);
  function start(){install();if(document.body)observer.observe(document.body,{childList:true,subtree:true});setTimeout(defaults,100);setTimeout(defaults,450);setTimeout(()=>collapseArrivalDuplicates().catch(()=>{}),1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();root.addEventListener('pageshow',()=>setTimeout(defaults,80),{passive:true});
})(typeof window!=='undefined'?window:globalThis);


/* ===== RUNTIME · bundled from v2.2.18-runtime-patch.js · V4.3.0 ===== */
/* E-REPORT/SAGS V4.2.52 · V2.2.18-LEFT-ONLY-PDF-FAST
   ONLY AD -> AD Control Center -> CĂN CHỈNH BIỂU MẪU.
   Clean coordinate model:
   - drag vx/vy
   - resize vw/vh
   - ALL managed text values render LEFT only
   - the left edge of the AD display region is always the text start
   - no center/right mode, no field-specific signer patch
   - CTRL/CMD multi-select and edit together
   - LƯU TẠM to localStorage (this AD device only)
   - TEST HIỂN THỊ on real page*.png background
   - XUẤT FILE CẬP NHẬT once -> fsags-display-coordinates.json
   No Firebase. */
(function(root){
  "use strict";
  const BUILD="V2.2.18-LEFT-ONLY-PDF-FAST";
  if(root.__SAGS_AD_FSAGS_BBBT_COORD===BUILD)return;
  root.__SAGS_AD_FSAGS_BBBT_COORD=BUILD;

  const CONFIG_URL="./fsags-display-coordinates.json";
  const TEMP_KEY="sags.fsags-bbbt-coordinate-draft.left-only.v1";
  const LEGACY_TEMP_KEY="sags.fsags-bbbt-coordinate-draft.v1";
  const $=id=>document.getElementById(id);
  const S=v=>String(v??"").trim();
  const U=v=>S(v).toUpperCase();
  const clone=v=>{try{return JSON.parse(JSON.stringify(v||{}))}catch(_){return {}}};

  const FORMS={
    fsags:{label:"FSAGS 42.3",pages:[1,2]},
    fsags421:{label:"FSAGS 42.1",pages:[6,7]},
    fsags551:{label:"FSAGS 55.1",pages:[9,10]},
    fsags09:{label:"FSAGS 09",pages:[11,12]},
    loading208:{label:"FSAGS 208",pages:[13]},
    bbbt:{label:"BBBT · F/SAGS-CXR/56",pages:[4]}
  };
  const MANAGED_PAGES=new Set(Object.values(FORMS).flatMap(x=>x.pages));

  let config={schema:3,build:"FSAGS-BBBT-DISPLAY-COORDINATES-LEFT-ONLY-V1",pages:{}};
  let temp=null,draft=null,editing=false,testMode=false,activeGroup="",activePage=0,selected=null,selectedRects=[],drag=null;
  let baseByField=new WeakMap(),fetchAt=0,fetchJob=null,drawRaf=0;
  let managedIndexArray=null,managedIndexLength=-1,managedFieldsCache=[],managedByPageCache=new Map();
  let lastRenderPerf=null,lastPdfPerf=null;

  function session(){
    try{
      const s=root.__sagsGetSession?.()||{},p=s.profile||{};
      return {
        role:U(s.role||p.role||p.systemRole||root.currentRole),
        username:S(s.username||p.username||p.userName||p.login||p.account||root.currentUserProfile?.username)
      };
    }catch(_){
      return {role:U(root.currentRole),username:S(root.currentUserProfile?.username)};
    }
  }
  const isAdmin=()=>{
    const s=session();
    return U(s.role)==="AD" ||
      U(root.currentRole)==="AD" ||
      U(root.currentUserProfile?.role)==="AD" ||
      U(root.currentUserProfile?.systemRole)==="AD" ||
      document.body?.classList.contains("role-admin")===true;
  };

  function globalFields(){
    try{
      if(typeof fields!=="undefined"&&Array.isArray(fields))return fields;
    }catch(_){}
    return [];
  }
  function appState(){
    try{
      if(typeof state!=="undefined"&&state&&typeof state==="object")return state;
    }catch(_){}
    return {};
  }
  function redraw(){
    if(drawRaf)return;
    drawRaf=requestAnimationFrame(()=>{
      drawRaf=0;
      try{if(typeof draw==="function")draw()}catch(_){}
    });
  }
  function isManagedDisplayField(f){
    return MANAGED_PAGES.has(Number(f?.page)) &&
      !!S(f?.key) &&
      !["SIGNATURE","CHECK"].includes(U(f?.type));
  }
  function rememberBase(f){
    if(!baseByField.has(f)){
      baseByField.set(f,{
        vx:Number(f.vx)||0,vy:Number(f.vy)||0,
        vw:Number(f.vw)||0,vh:Number(f.vh)||0,
        align:f.align,leftValue:f.leftValue,manualInset:f.manualInset
      });
    }
    return baseByField.get(f);
  }
  function forceFieldModelLeft(f){
    if(!isManagedDisplayField(f))return;
    f.align="left";
    f.leftValue=true;
    f.manualInset=0;
  }

  function managedIndex(){
    const fs=globalFields();
    if(fs===managedIndexArray && fs.length===managedIndexLength){
      return {fields:managedFieldsCache,byPage:managedByPageCache};
    }
    managedIndexArray=fs;
    managedIndexLength=fs.length;
    managedFieldsCache=[];
    managedByPageCache=new Map();

    for(const f of fs){
      if(!isManagedDisplayField(f))continue;
      managedFieldsCache.push(f);
      const p=Number(f.page),key=S(f.key);
      if(!managedByPageCache.has(p))managedByPageCache.set(p,new Map());
      managedByPageCache.get(p).set(key,f);
    }
    return {fields:managedFieldsCache,byPage:managedByPageCache};
  }

  function exportPageScope(){
    const a=root.__SAGS_COORD_EXPORT_PAGES;
    if(!Array.isArray(a)||!a.length)return null;
    return new Set(a.map(Number).filter(n=>MANAGED_PAGES.has(n)));
  }
  function resetFieldToBase(f){
    const b=rememberBase(f);
    f.vx=b.vx;f.vy=b.vy;f.vw=b.vw;f.vh=b.vh;
    if(isManagedDisplayField(f))forceFieldModelLeft(f);
    else{
      f.align=b.align;f.leftValue=b.leftValue;f.manualInset=b.manualInset;
    }
    f.__sagsCoordOverride=false;
  }
  function pageCfg(page,source){
    return source?.pages?.[String(page)]||{fields:{}};
  }
  function cleanNumber(v){
    const n=Number(v);
    return Number.isFinite(n)?n:null;
  }
  function sanitizeCoordinates(source,keepTempMeta=false){
    const out={
      schema:3,
      build:"FSAGS-BBBT-DISPLAY-COORDINATES-LEFT-ONLY-V1",
      pages:{}
    };
    for(const [pKey,pCfg] of Object.entries(source?.pages||{})){
      const page=Number(pKey);
      if(!MANAGED_PAGES.has(page))continue;
      const fieldsOut={};
      for(const [key,c] of Object.entries(pCfg?.fields||{})){
        const g={};
        for(const n of ["vx","vy","vw","vh"]){
          const v=cleanNumber(c?.[n]);
          if(v!==null)g[n]=+v.toFixed(7);
        }
        if(Object.keys(g).length)fieldsOut[S(key)]=g;
      }
      if(Object.keys(fieldsOut).length)out.pages[String(page)]={fields:fieldsOut};
    }
    if(source?.updatedAt)out.updatedAt=source.updatedAt;
    if(source?.updatedBy)out.updatedBy=source.updatedBy;
    if(source?.note)out.note=source.note;
    if(keepTempMeta){
      if(source?.tempSavedAt)out.tempSavedAt=source.tempSavedAt;
      if(source?.tempSavedBy)out.tempSavedBy=source.tempSavedBy;
    }
    return out;
  }
  function applyConfig(source,opts){
    if(root.__SAGS_V450_FORM_MANAGER_LAYOUT)return false;
    source=(source&&source.pages)?source:config;
    const idx=managedIndex();
    if(!idx.fields.length)return false;

    // Hot path: config/temp/draft are already sanitized when loaded/saved.
    // Do not JSON-clone / rebuild the coordinate object on every draw.
    for(const f of idx.fields){
      const b=rememberBase(f);
      const c=pageCfg(f.page,source)?.fields?.[S(f.key)];

      f.vx=Number.isFinite(Number(c?.vx))?Number(c.vx):b.vx;
      f.vy=Number.isFinite(Number(c?.vy))?Number(c.vy):b.vy;
      f.vw=Number.isFinite(Number(c?.vw))?Number(c.vw):b.vw;
      f.vh=Number.isFinite(Number(c?.vh))?Number(c.vh):b.vh;
      f.__sagsCoordOverride=!!c;

      // Single global rule retained from V4.2.51.
      forceFieldModelLeft(f);
    }

    if(opts?.redraw===true)redraw();
    else if(opts?.enforce===true)requestAnimationFrame(()=>enforceLeftRender(source));
    return true;
  }

  function loadTemp(){
    try{
      const raw=localStorage.getItem(TEMP_KEY)||localStorage.getItem(LEGACY_TEMP_KEY)||"null";
      const x=JSON.parse(raw);
      if(x&&x.pages&&typeof x.pages==="object"){
        temp=sanitizeCoordinates(x,true);
        if(!temp.tempSavedAt)temp.tempSavedAt=x.tempSavedAt;
        if(!temp.tempSavedBy)temp.tempSavedBy=x.tempSavedBy;
        localStorage.setItem(TEMP_KEY,JSON.stringify(temp));
        return temp;
      }
    }catch(_){}
    temp=null;
    return null;
  }
  function saveTempObject(obj){
    const x=sanitizeCoordinates(obj);
    x.tempSavedAt=new Date().toISOString();
    x.tempSavedBy=session().username||"AD";
    localStorage.setItem(TEMP_KEY,JSON.stringify(x));
    temp=x;
    updateTempSummary();
    return x;
  }
  function clearTemp(){
    try{
      localStorage.removeItem(TEMP_KEY);
      localStorage.removeItem(LEGACY_TEMP_KEY);
    }catch(_){}
    temp=null;
    updateTempSummary();
  }
  function workingBase(){
    return sanitizeCoordinates(temp||config,true);
  }
  function tempStats(){
    const src=temp;
    let pages=0,fields=0;
    for(const p of Object.values(src?.pages||{})){
      const n=Object.keys(p?.fields||{}).length;
      if(n){pages++;fields+=n}
    }
    return {pages,fields};
  }


  function coordSource(){
    return editing ? (draft||temp||config) : (temp||config);
  }
  function cssEsc(v){
    try{return CSS.escape(String(v))}
    catch(_){return String(v).replace(/["\\]/g,"\\$&")}
  }

  function suppressExactSingleLineDuplicate(nodes){
    const texts=(nodes||[]).filter(el=>el.tagName?.toLowerCase()==="text");
    texts.forEach(el=>{
      if(el.getAttribute("data-sags-dedup-hidden")==="1"){
        el.style.removeProperty("display");
        el.removeAttribute("data-sags-dedup-hidden");
      }
    });
    if(texts.length<2)return;

    const native=texts.filter(el=>!el.classList.contains("v373-line-render"));
    const generated=texts.filter(el=>el.classList.contains("v373-line-render"));
    if(!native.length||generated.length!==1)return;

    const g=generated[0],gt=S(g.textContent);
    if(!gt)return;
    const sameNative=native.find(n=>S(n.textContent)===gt);
    if(sameNative){
      g.style.display="none";
      g.setAttribute("data-sags-dedup-hidden","1");
    }
  }

  function forceSvgTextLeft(el,x){
    if(!el||el.tagName?.toLowerCase()!=="text")return;
    el.setAttribute("x",String(x));
    el.setAttribute("text-anchor","start");
    el.classList.remove("center","right");
    el.classList.add("left");
    el.removeAttribute("transform");
    el.style.removeProperty("transform");
    el.style.removeProperty("translate");

    // Avoid a new querySelectorAll allocation for every text node.
    for(const t of el.children){
      if(t.tagName?.toLowerCase()!=="tspan")continue;
      t.setAttribute("x",String(x));
      t.setAttribute("text-anchor","start");
      t.removeAttribute("transform");
      t.style.removeProperty("transform");
      t.style.removeProperty("translate");
    }
  }

  /* SINGLE RENDER AUTHORITY
     No left/center/right modes exist anymore.

     For every managed FSAGS/BBBT display field:
       - geometry = vx/vy/vw/vh from the coordinate file when present;
       - otherwise geometry = the form's original geometry;
       - text starts exactly at the field's LEFT edge (vx);
       - text-anchor is always "start";
       - leftValue=true and manualInset=0;
       - old center/right values in existing JSON are ignored;
       - signature images and touch/input x/y/w/h are untouched.

     This one generic rule replaces all field-specific signer/Refer fixes. */
  function enforceLeftRender(source=coordSource()){
    if(root.__SAGS_V450_FORM_MANAGER_LAYOUT)return false;
    try{
      source=(source&&source.pages)?source:config;
      const idx=managedIndex();
      if(!idx.fields.length)return false;

      const scope=exportPageScope();
      let pageScans=0,nodeCount=0,fieldGroups=0;

      for(const [page,pageFields] of idx.byPage.entries()){
        if(scope && !scope.has(page))continue;
        const svg=document.getElementById("svg"+page);
        if(!svg)continue;

        // IMPORTANT PERFORMANCE FIX:
        // exactly ONE selector scan per SVG page, not one scan per field.
        const raw=svg.querySelectorAll("text[data-field-key],foreignObject[data-field-key]");
        pageScans++;

        const groups=new Map();
        for(const el of raw){
          const key=S(el.getAttribute("data-field-key"));
          if(!key||!pageFields.has(key))continue;
          if(!groups.has(key))groups.set(key,[]);
          groups.get(key).push(el);
          nodeCount++;
        }

        for(const [key,nodes] of groups.entries()){
          const f=pageFields.get(key);
          if(!f)continue;
          fieldGroups++;

          // Geometry is already placed into the field model before native draw().
          // Re-read coordinate source only as a safeguard for a direct enforce call.
          const b=rememberBase(f);
          const c=pageCfg(page,source)?.fields?.[key];
          f.vx=Number.isFinite(Number(c?.vx))?Number(c.vx):b.vx;
          f.vy=Number.isFinite(Number(c?.vy))?Number(c.vy):b.vy;
          f.vw=Number.isFinite(Number(c?.vw))?Number(c.vw):b.vw;
          f.vh=Number.isFinite(Number(c?.vh))?Number(c.vh):b.vh;
          f.__sagsCoordOverride=!!c;
          forceFieldModelLeft(f);

          const x=Math.max(0,Number(f.vx)||0)*1241;
          const y=Math.max(0,Number(f.vy)||0)*1755;
          const w=Math.max(.001,Number(f.vw)||.001)*1241;
          const h=Math.max(.001,Number(f.vh)||.001)*1755;

          if(nodes.length>1)suppressExactSingleLineDuplicate(nodes);

          for(const el of nodes){
            if(el.getAttribute("data-sags-dedup-hidden")==="1")continue;
            const tag=el.tagName?.toLowerCase();

            if(tag==="foreignobject"){
              el.setAttribute("x",String(x));
              el.setAttribute("y",String(y));
              el.setAttribute("width",String(w));
              el.setAttribute("height",String(h));
              el.removeAttribute("transform");
              el.style.removeProperty("transform");
              el.style.removeProperty("translate");
              const d=el.firstElementChild;
              if(d){
                d.style.width="100%";
                d.style.height="100%";
                d.style.boxSizing="border-box";
                d.style.textAlign="left";
                d.style.padding="0";
                d.style.margin="0";
                d.style.textIndent="0";
                d.style.transform="none";
              }
            }else if(tag==="text"){
              forceSvgTextLeft(el,x);
            }
          }
        }
      }

      root.__SAGS_COORD_RENDER_SCAN_LAST={pageScans,nodeCount,fieldGroups,exportScoped:!!scope,at:Date.now()};
      return true;
    }catch(e){
      console.warn("V4.2.52 left-only fast render",e);
      return false;
    }
  }


  let drawWrapped=false;
  function unwrapCoordinateDraw(fn){
    let cur=fn,guard=0;
    while(cur&&cur.__sagsOriginal&&guard++<8){
      if(cur.__sagsLeftOnlyWrapped||cur.__sagsAdAuthorityWrapped||cur.__sagsStrictLeftWrapped){
        cur=cur.__sagsOriginal;
        continue;
      }
      break;
    }
    return cur;
  }
  function installDrawAuthority(){
    if(drawWrapped)return true;
    let current=null;
    try{current=root.draw||draw}catch(_){current=root.draw}
    if(typeof current!=="function")return false;
    if(current.__sagsLeftOnlyFastWrapped){drawWrapped=true;return true}

    // Prevent accumulated coordinate wrappers after several releases.
    const old=unwrapCoordinateDraw(current);
    const wrapped=function(){
      const t0=(root.performance?.now?.()??Date.now());

      // 1) Cheap model-only sync.
      applyConfig(coordSource(),{redraw:false,enforce:false});
      const t1=(root.performance?.now?.()??Date.now());

      // 2) Native app draw once.
      const r=old.apply(this,arguments);
      const t2=(root.performance?.now?.()??Date.now());

      // 3) One batched scan per relevant SVG page.
      enforceLeftRender(coordSource());
      const t3=(root.performance?.now?.()??Date.now());

      lastRenderPerf={
        modelMs:+(t1-t0).toFixed(1),
        nativeDrawMs:+(t2-t1).toFixed(1),
        enforceMs:+(t3-t2).toFixed(1),
        totalMs:+(t3-t0).toFixed(1),
        exportScoped:!!exportPageScope(),
        at:Date.now()
      };
      root.__SAGS_COORD_PERF_LAST=lastRenderPerf;
      return r;
    };
    wrapped.__sagsLeftOnlyFastWrapped=true;
    wrapped.__sagsOriginal=old;
    root.draw=wrapped;
    try{draw=wrapped}catch(_){}
    drawWrapped=true;
    return true;
  }

  async function refreshConfig(force=false){
    if(root.__SAGS_V450_FORM_MANAGER_LAYOUT)return config;
    if(fetchJob)return fetchJob;
    if(!force&&Date.now()-fetchAt<30000)return config;
    fetchJob=(async()=>{
      try{
        const r=await fetch(CONFIG_URL+"?t="+Date.now(),{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
        if(r.ok){
          const j=await r.json();
          if(j&&typeof j==="object"&&j.pages){
            config=sanitizeCoordinates(j);
          }
        }
      }catch(_){}
      fetchAt=Date.now();fetchJob=null;
      if(!editing)applyConfig(temp||config,{redraw:false,enforce:false});
      updateTempSummary();
      return config;
    })();
    return fetchJob;
  }

  function ensureStyle(){
    if($("sagsCoord44Style"))return;
    const st=document.createElement("style");
    st.id="sagsCoord44Style";
    st.textContent=`
#sagsCoord44Center[hidden],#sagsCoord44Preview[hidden],#sagsCoord44Panel[hidden]{display:none!important}
#sagsCoord44Center{position:fixed;inset:0;z-index:2147482500;background:#17364ac4;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font:14px/1.4 Arial;color:#17364a}
.s44centerBox{width:min(720px,96vw);max-height:92dvh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 15px 50px #0005}
.s44head{display:flex;justify-content:space-between;align-items:center;gap:10px}.s44head h3{margin:0;color:#0b5cab}.s44head button{width:44px;height:44px;border-radius:10px}
.s44help{margin:8px 0 10px;color:#516879}.s44managerLaunch{margin:0 0 10px;padding:10px;border:2px solid #2d6cdf;border-radius:12px;background:linear-gradient(135deg,#eef5ff,#f8fbff)}.s44managerLaunch b{display:block;color:#174ea6;font-size:15px;margin-bottom:3px}.s44managerLaunch small{display:block;color:#516879;margin-bottom:9px}.s44managerActions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.s44managerActions button{min-height:44px;border:0;border-radius:10px;padding:8px 10px;font-weight:900;cursor:pointer}.s44managerActions #s44openManager{background:#185abc;color:#fff}.s44managerActions #s44newFormManager{background:#087a55;color:#fff}.s44legacyTitle{margin:10px 0 6px;font-weight:900;color:#17364a}.s44temp{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;margin-bottom:10px;background:#eef5fa;border-radius:10px}
.s44temp b{color:#0b5cab}.s44tempActions{display:flex;gap:6px;flex-wrap:wrap}.s44tempActions button{min-height:38px;border:1px solid #aebfca;border-radius:9px;background:#fff;color:#17364a;font-weight:900;padding:7px 10px}.s44tempActions #s44exportAll{background:#0b6398;color:#fff}
.s44list{display:grid;grid-template-columns:1fr 1fr;gap:9px}.s44choice{min-height:64px;border:1px solid #b9cbd8;border-radius:12px;background:#fff;text-align:left;padding:10px 12px;color:#17364a;font-weight:900;font-size:15px}.s44choice small{display:block;font-weight:500;color:#5c7283;margin-top:3px}

#sagsCoord44Preview{position:fixed;inset:0;z-index:2147482700;background:#dfe6ec;overflow:auto;padding:max(60px,env(safe-area-inset-top)) 8px calc(250px + env(safe-area-inset-bottom));box-sizing:border-box}
.s44previewTop{position:fixed;left:0;right:0;top:0;z-index:2147483150;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#17364a;color:#fff;padding:max(8px,env(safe-area-inset-top)) 10px 8px;box-sizing:border-box}
.s44previewTop b{font:900 14px Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s44previewTop button{min-height:40px;border:0;border-radius:9px;background:#fff;color:#17364a;font-weight:900;padding:7px 10px}
#s44tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:0 auto 8px;max-width:920px}#s44tabs button{min-height:40px;border:1px solid #aabdc9;border-radius:999px;background:#fff;color:#17364a;padding:7px 14px;font-weight:900}#s44tabs button.active{background:#0b6398;color:#fff;border-color:#0b6398}
#s44sheet{position:relative;width:min(100%,1241px);aspect-ratio:1241/1755;margin:0 auto;background:#fff;overflow:hidden;box-shadow:0 5px 20px #0004}
#s44bg,#s44values,#s44test,#s44layer{position:absolute;inset:0;width:100%;height:100%;display:block}#s44bg{z-index:1;object-fit:fill}#s44values{z-index:2;pointer-events:none}#s44test{z-index:3;pointer-events:none}#s44layer{z-index:4;pointer-events:none}
.s44rect{position:absolute;pointer-events:auto;border:2px dashed #e08a00;background:rgba(255,193,7,.08);box-sizing:border-box;cursor:move;touch-action:none;user-select:none;min-width:8px;min-height:8px}.s44rect::before{content:"";position:absolute;left:-2px;top:-2px;bottom:-2px;width:3px;background:#d82432}.s44rect.s44chosen{border:3px solid #c72130;background:rgba(199,33,48,.08)}.s44rect.s44multi{box-shadow:0 0 0 3px rgba(11,99,152,.34) inset}
.s44label{display:none;position:absolute;left:3px;top:3px;max-width:calc(100% - 6px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#17364a;color:#fff;padding:1px 3px;border-radius:3px;font:700 9px Arial;pointer-events:none}.s44rect.s44chosen .s44label{display:block}
.s44handle{position:absolute;z-index:5;background:#0b6398;border:2px solid #fff;box-shadow:0 1px 4px #0005;pointer-events:auto;touch-action:none}.s44handle.e{right:-7px;top:50%;width:14px;height:28px;transform:translateY(-50%);border-radius:7px;cursor:ew-resize}.s44handle.s{left:50%;bottom:-7px;width:28px;height:14px;transform:translateX(-50%);border-radius:7px;cursor:ns-resize}.s44handle.se{right:-8px;bottom:-8px;width:18px;height:18px;border-radius:50%;cursor:nwse-resize}
#sagsCoord44Preview.s44testing #s44layer{display:none!important}#sagsCoord44Preview.s44testing #s44test{display:block!important}#sagsCoord44Preview:not(.s44testing) #s44test{display:none!important}

#sagsCoord44Panel{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483200;width:min(740px,calc(100vw - 16px));max-height:46dvh;overflow:auto;background:#fff;color:#17364a;border:1px solid #adc2d1;border-radius:16px;padding:11px;box-shadow:0 16px 48px #0006;font:14px/1.35 Arial}
.s44panelHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.s44panelHead b{font-size:16px}.s44panelHead small{display:block;color:#5a7081}
#s44selected{margin:8px 0;padding:8px 10px;background:#eef5fa;border-radius:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s44sizeTools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:7px 0}.s44sizeBox{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center}.s44sizeBox span{text-align:center;font-weight:900}.s44sizeBox button{min-height:40px;border:1px solid #adc1cf;border-radius:9px;background:#f7fafc;font-weight:900}
.s44actions{display:grid;grid-template-columns:1fr 1fr 1fr 1.25fr;gap:7px}.s44actions button{min-height:44px;border:1px solid #adc1cf;border-radius:10px;background:#f7fafc;color:#17364a;font-weight:900}.s44actions #s44tempSave{background:#0b6398;color:#fff}.s44actions #s44testBtn{background:#e9f5ec;color:#176438}
#s44status{min-height:18px;margin:7px 0 0;font-weight:700}
@media(max-width:640px){.s44managerActions{grid-template-columns:1fr}.s44list{grid-template-columns:1fr}.s44actions{grid-template-columns:1fr 1fr}.s44sizeTools{grid-template-columns:1fr}.s44temp{align-items:flex-start;flex-direction:column}#sagsCoord44Panel{max-height:56dvh}}
`;
    document.head.appendChild(st);
  }

  function ensureUi(){
    ensureStyle();

    if(!$("sagsCoord44Center")){
      const m=document.createElement("section");m.id="sagsCoord44Center";m.hidden=true;
      m.innerHTML=`<div class="s44centerBox">
        <div class="s44head"><h3>QUẢN LÝ / CĂN CHỈNH BIỂU MẪU</h3><button id="s44centerClose" type="button">✕</button></div>
        <p class="s44help">Chỉ dành cho AD. Form cũ vẫn căn nhanh như trước; form mới dùng Form Manager để upload ảnh, thêm trang và tạo field.</p>
        <div class="s44managerLaunch">
          <b>🧩 FORM MANAGER MỚI</b>
          <small>Upload / thay ảnh · thêm nhiều trang · thêm field · kéo / resize · Shift+click chọn nhiều · căn hàng/cột · Undo/Redo · xuất gói form.</small>
          <div class="s44managerActions">
            <button id="s44openManager" type="button">🧩 MỞ FORM MANAGER</button>
            <button id="s44newFormManager" type="button">➕ TẠO FORM MỚI + ẢNH</button>
          </div>
        </div>
        <div class="s44temp"><div><b id="s44tempInfo">BẢN TẠM FORM CŨ: CHƯA CÓ</b><div id="s44tempTime"></div></div>
          <div class="s44tempActions"><button id="s44clearTemp" type="button">XÓA BẢN TẠM</button><button id="s44exportAll" type="button">XUẤT FILE CẬP NHẬT</button></div>
        </div>
        <div class="s44legacyTitle">CĂN NHANH BIỂU MẪU HIỆN CÓ</div>
        <div id="s44list" class="s44list"></div>
      </div>`;
      document.body.appendChild(m);
      $("s44centerClose").onclick=closeCenter;
      $("s44openManager").onclick=()=>{closeCenter();if(typeof root.sagsV440OpenFormManager==="function")root.sagsV440OpenFormManager();else alert("Form Manager chưa tải xong. Vui lòng đóng cửa sổ và mở lại sau 1 giây.")};
      $("s44newFormManager").onclick=()=>{closeCenter();if(typeof root.sagsV440CreateNewForm==="function")root.sagsV440CreateNewForm();else if(typeof root.sagsV440OpenFormManager==="function")root.sagsV440OpenFormManager();else alert("Form Manager chưa tải xong. Vui lòng thử lại.")};
      $("s44clearTemp").onclick=clearTempConfirm;
      $("s44exportAll").onclick=exportAll;
      m.addEventListener("click",e=>{if(e.target===m)closeCenter()});
      const list=$("s44list");
      for(const [group,meta] of Object.entries(FORMS)){
        const b=document.createElement("button");b.type="button";b.className="s44choice";
        b.innerHTML=`${meta.label}<small>${meta.pages.length>1?"Trang "+meta.pages.join(" + "):"Trang "+meta.pages[0]}</small>`;
        b.onclick=()=>openEditor(group);list.appendChild(b);
      }
    }

    if(!$("sagsCoord44Preview")){
      const pv=document.createElement("section");pv.id="sagsCoord44Preview";pv.hidden=true;
      pv.innerHTML=`<div class="s44previewTop"><button id="s44back" type="button">← DANH SÁCH</button><b id="s44previewTitle">CĂN BIỂU MẪU</b><button id="s44previewClose" type="button">ĐÓNG</button></div>
      <div id="s44tabs"></div><div id="s44sheet"><img id="s44bg" alt="Nền biểu mẫu"><svg id="s44values" viewBox="0 0 1241 1755" preserveAspectRatio="none"></svg><svg id="s44test" viewBox="0 0 1241 1755" preserveAspectRatio="none"></svg><div id="s44layer"></div></div>`;
      document.body.appendChild(pv);
      $("s44back").onclick=()=>{closeEditorKeepDraft();openCenter()};
      $("s44previewClose").onclick=cancelEditor;
    }

    if(!$("sagsCoord44Panel")){
      const p=document.createElement("section");p.id="sagsCoord44Panel";p.hidden=true;
      p.innerHTML=`<div class="s44panelHead"><div><b id="s44title">CĂN TỌA ĐỘ</b><small>Kéo khung = vị trí · CTRL + bấm = chọn nhiều · tay nắm = rộng/cao</small></div></div>
      <div id="s44selected">Chạm một khung màu cam để chỉnh. Chữ luôn bắt đầu tại mép trái.</div>
      <div class="s44sizeTools"><div class="s44sizeBox"><button id="s44wMinus" type="button">−</button><span id="s44wInfo">RỘNG</span><button id="s44wPlus" type="button">+</button></div><div class="s44sizeBox"><button id="s44hMinus" type="button">−</button><span id="s44hInfo">CAO</span><button id="s44hPlus" type="button">+</button></div></div>
      <div class="s44actions"><button id="s44cancel" type="button">HỦY</button><button id="s44reset" type="button">VỀ GỐC VÙNG</button><button id="s44testBtn" type="button">TEST HIỂN THỊ</button><button id="s44tempSave" type="button">LƯU TẠM</button></div>
      <p id="s44status" role="status"></p>`;
      document.body.appendChild(p);
      $("s44cancel").onclick=cancelEditor;$("s44reset").onclick=resetSelected;$("s44testBtn").onclick=toggleTest;$("s44tempSave").onclick=saveTempAndBack;
      $("s44wMinus").onclick=()=>resizeSelected(-3,0);$("s44wPlus").onclick=()=>resizeSelected(3,0);$("s44hMinus").onclick=()=>resizeSelected(0,-3);$("s44hPlus").onclick=()=>resizeSelected(0,3);
    }
  }

  let adminSlotObserver=null,adminDashObserver=null;

  function makeDashCard(){
    let card=$("sagsCoord49AdminDashboardCard");
    if(card)return card;
    card=document.createElement("button");
    card.id="sagsCoord49AdminDashboardCard";
    card.type="button";
    card.className="v181AdminCard";
    card.setAttribute("data-sags-coord-entry","dashboard");
    card.innerHTML='<span class="v181AdminIcon">↔</span><span class="v181AdminCardText"><b>FORM MANAGER</b><small>Tất cả biểu mẫu · vị trí · kích thước · font · căn lề · TEST · PDF</small></span><em>MỞ</em>';
    card.onclick=openCenter;
    return card;
  }

  function makeToolbarButton(){
    let card=$("sagsCoord49AdminToolbarBtn");
    if(card)return card;
    card=document.createElement("button");
    card.id="sagsCoord49AdminToolbarBtn";
    card.type="button";
    card.setAttribute("data-sags-coord-entry","toolbar");
    card.textContent="🧩 FORM MANAGER";
    card.title="Tất cả biểu mẫu · Shift chọn nhiều · vị trí + kích thước + font + căn lề · TEST · PDF";
    card.style.background="#7c3aed";
    card.style.color="#fff";
    card.style.fontWeight="900";
    card.onclick=openCenter;
    return card;
  }

  function bindDashboardEntry(){
    const center=$("v181AdminCenter");
    if(!center)return false;

    const grids=[...center.querySelectorAll(".v181AdminGrid")];
    let grid=grids[grids.length-1]||null;
    if(!grid){
      grid=document.createElement("div");
      grid.className="v181AdminGrid sagsCoord49FallbackGrid";
      grid.setAttribute("data-sags-coord-grid","1");
      center.appendChild(grid);
    }

    const card=makeDashCard();
    if(card.parentElement!==grid)grid.appendChild(card);
    card.style.display=isAdmin()?"":"none";

    // Observe only the dashboard grid. No whole-document observer.
    if(!adminDashObserver){
      adminDashObserver=new MutationObserver(()=>{
        const c=$("v181AdminCenter");
        const gs=c?[...c.querySelectorAll(".v181AdminGrid")]:[];
        const g=gs[gs.length-1];
        const b=$("sagsCoord49AdminDashboardCard");
        if(g&&(!b||b.parentElement!==g))queueMicrotask(bindDashboardEntry);
      });
      adminDashObserver.observe(grid,{childList:true});
    }
    return true;
  }

  function bindToolbarEntry(){
    const row=$("v377AdminFormToolsRow");
    const slot=$("v377LayoutTuneSlot");
    if(!row||!slot)return false;

    // Retire the old generic layout button in this dedicated slot.
    $("v368LayoutTuneBtn")?.remove();

    const card=makeToolbarButton();
    if(card.parentElement!==slot)slot.replaceChildren(card);
    else [...slot.children].forEach(x=>{if(x!==card)x.remove()});

    card.style.display=isAdmin()?"block":"none";

    if(!adminSlotObserver){
      adminSlotObserver=new MutationObserver(()=>{
        const s=$("v377LayoutTuneSlot");
        if(!s)return;
        const b=$("sagsCoord49AdminToolbarBtn");
        if(!b||b.parentElement!==s||s.children.length!==1){
          queueMicrotask(bindToolbarEntry);
        }
      });
      adminSlotObserver.observe(slot,{childList:true});
    }
    return true;
  }

  function ensureAdminCard(){
    const admin=isAdmin();

    if(!admin){
      $("sagsCoord49AdminDashboardCard")?.remove();
      const tb=$("sagsCoord49AdminToolbarBtn");
      if(tb)tb.style.display="none";
      return false;
    }

    // The original AD Control Center is preferred because this is where the
    // user previously saw the coordinate function. The current form-tools
    // row remains a second entry point/fallback.
    const dash=bindDashboardEntry();
    const toolbar=bindToolbarEntry();

    return dash||toolbar;
  }

  function scheduleAdminEntry(){
    // Opening AD management can create/reveal its DOM after the click.
    // A few lightweight delayed checks are enough and do not redraw forms.
    [0,80,250,700].forEach(ms=>setTimeout(ensureAdminCard,ms));
  }

  function installAdminClickWakeup(){
    if(root.__SAGS_COORD49_CLICK_WAKEUP)return;
    root.__SAGS_COORD49_CLICK_WAKEUP=true;
    document.addEventListener("click",()=>{
      if(isAdmin())scheduleAdminEntry();
    },{capture:true,passive:true});
    root.addEventListener?.("pageshow",scheduleAdminEntry);
    root.addEventListener?.("focus",scheduleAdminEntry);
    if(document.readyState==="loading"){
      document.addEventListener("DOMContentLoaded",scheduleAdminEntry,{once:true});
    }else{
      scheduleAdminEntry();
    }
  }

  function updateTempSummary(){
    ensureUi();
    const s=tempStats(),info=$("s44tempInfo"),time=$("s44tempTime"),btn=$("s44exportAll");
    if(info)info.textContent=s.fields?`BẢN TẠM: ${s.fields} vùng · ${s.pages} trang`:"BẢN TẠM: CHƯA CÓ";
    if(time)time.textContent=temp?.tempSavedAt?`Lưu gần nhất: ${new Date(temp.tempSavedAt).toLocaleString("vi-VN")}`:"";
    if(btn)btn.disabled=!s.fields;
  }
  function openCenter(){if(!isAdmin())return;if(typeof root.sagsV440OpenFormManager==="function")return root.sagsV440OpenFormManager();setTimeout(()=>root.sagsV440OpenFormManager?.(),80)}
  function closeCenter(){const m=$("sagsCoord44Center");if(m)m.hidden=true}
  function clearTempConfirm(){
    if(!tempStats().fields)return;
    if(!confirm("Xóa toàn bộ bản tọa độ đang lưu tạm trên máy AD này?"))return;
    clearTemp();applyConfig(config,{redraw:false,enforce:true});
  }

  function fieldCandidates(group,page=null){
    const allowed=new Set(FORMS[group]?.pages||[]);
    return globalFields().filter(f=>{
      if(!allowed.has(Number(f.page)))return false;
      if(page!==null&&Number(f.page)!==Number(page))return false;
      if(!S(f.key))return false;
      if(["SIGNATURE","CHECK"].includes(U(f.type)))return false;
      return [f.vx,f.vy,f.vw,f.vh].every(v=>Number.isFinite(Number(v)));
    });
  }
  function getSourcePage(page){return $("page"+page)}
  function getBackgroundSrc(page){return getSourcePage(page)?.querySelector("img")?.getAttribute("src")||`./page${page}.png`}
  function cloneRenderedSvg(page){
    const dst=$("s44values");dst.innerHTML="";
    const src=getSourcePage(page)?.querySelector("svg");if(!src)return;
    try{
      dst.innerHTML=src.innerHTML;
      dst.querySelectorAll(".hit,.selected-region").forEach(n=>n.remove());
    }catch(_){}
  }
  function renderTabs(){
    const box=$("s44tabs");box.innerHTML="";
    for(const p of FORMS[activeGroup]?.pages||[]){
      const b=document.createElement("button");b.type="button";b.textContent="TRANG "+p;b.classList.toggle("active",Number(p)===Number(activePage));b.onclick=()=>buildPage(p);box.appendChild(b);
    }
  }
  function rectFromField(f){
    const rect=document.createElement("div");rect.className="s44rect";rect._field=f;
    rect.style.left=(Number(f.vx)*100)+"%";rect.style.top=(Number(f.vy)*100)+"%";rect.style.width=(Math.max(Number(f.vw),.006)*100)+"%";rect.style.height=(Math.max(Number(f.vh),.006)*100)+"%";
    const lab=document.createElement("span");lab.className="s44label";lab.textContent=S(f.label||f.key);rect.appendChild(lab);
    for(const mode of ["e","s","se"]){const h=document.createElement("i");h.className="s44handle "+mode;h.dataset.resize=mode;rect.appendChild(h)}
    return rect;
  }
  function buildPage(page){
    activePage=Number(page)||0;testMode=false;$("sagsCoord44Preview").classList.remove("s44testing");$("s44testBtn").textContent="TEST HIỂN THỊ";
    applyConfig(draft||temp||config,{redraw:false,enforce:false});
    enforceLeftRender(draft||temp||config);
    $("s44bg").src=getBackgroundSrc(activePage);cloneRenderedSvg(activePage);$("s44test").innerHTML="";
    const layer=$("s44layer");layer.innerHTML="";
    for(const f of fieldCandidates(activeGroup,activePage)){rememberBase(f);layer.appendChild(rectFromField(f))}
    $("s44previewTitle").textContent=`${FORMS[activeGroup]?.label||activeGroup} · TRANG ${activePage}`;renderTabs();clearSelection();
    $("s44status").textContent=layer.children.length?`Có ${layer.children.length} vùng hiển thị.`:"Không tìm thấy vùng hiển thị của trang này.";
  }

  function selectedList(){return selectedRects.filter(r=>r&&r.isConnected&&r._field)}
  function paintSelection(){
    const set=new Set(selectedList());
    $("s44layer")?.querySelectorAll(".s44rect").forEach(r=>{
      r.classList.toggle("s44chosen",set.has(r));
      r.classList.toggle("s44multi",set.size>1&&set.has(r));
    });
  }
  function clearSelection(){
    selectedRects=[];
    selected=null;
    paintSelection();
    updateSelectedInfo();
  }
  function selectRect(rect,additive=false){
    if(!rect){
      clearSelection();
      return;
    }
    selectedRects=selectedList();
    const i=selectedRects.indexOf(rect);

    if(additive){
      if(i>=0){
        selectedRects.splice(i,1);
        if(selected===rect)selected=selectedRects[selectedRects.length-1]||null;
      }else{
        selectedRects.push(rect);
        selected=rect;
      }
    }else{
      if(i>=0&&selectedRects.length>1){
        // Clicking an already selected region without CTRL keeps the group,
        // making it possible to drag/resize the whole group immediately.
        selected=rect;
      }else{
        selectedRects=[rect];
        selected=rect;
      }
    }
    paintSelection();
    updateSelectedInfo();
  }
  function updateSelectedInfo(){
    const info=$("s44selected"),wi=$("s44wInfo"),hi=$("s44hInfo"),rs=selectedList();
    if(!rs.length){
      if(info)info.textContent="Chạm một khung màu cam để chỉnh. Giữ CTRL để chọn nhiều. Chữ luôn bắt đầu tại mép trái.";
      if(wi)wi.textContent="RỘNG";
      if(hi)hi.textContent="CAO";
      return;
    }
    if(rs.length===1){
      const r=rs[0],f=r._field,rr=r.getBoundingClientRect();
      info.textContent=`${S(f.label||f.key)} · ${S(f.key)} · Trang ${f.page} · RENDER TRÁI`;
      wi.textContent=`RỘNG ${Math.round(rr.width)} px`;
      hi.textContent=`CAO ${Math.round(rr.height)} px`;
    }else{
      info.textContent=`ĐÃ CHỌN ${rs.length} VÙNG · TẤT CẢ RENDER TRÁI`;
      wi.textContent=`RỘNG · ${rs.length} VÙNG`;
      hi.textContent=`CAO · ${rs.length} VÙNG`;
    }
  }
  function draftMap(f){draft.pages||={};const p=String(f.page);draft.pages[p]||={fields:{}};draft.pages[p].fields||={};return draft.pages[p].fields}
  function configFromRect(rect){
    if(!rect?._field)return null;
    const lr=$("s44layer").getBoundingClientRect(),rr=rect.getBoundingClientRect();
    if(!lr.width||!lr.height)return null;
    const vx=Math.max(0,Math.min(1,(rr.left-lr.left)/lr.width));
    const vy=Math.max(0,Math.min(1,(rr.top-lr.top)/lr.height));
    const vw=Math.max(.004,Math.min(1-vx,rr.width/lr.width));
    const vh=Math.max(.004,Math.min(1-vy,rr.height/lr.height));
    return {vx:+vx.toFixed(7),vy:+vy.toFixed(7),vw:+vw.toFixed(7),vh:+vh.toFixed(7)};
  }
  function commitRect(rect,doRedraw=true){
    const c=configFromRect(rect);
    if(!c)return false;
    const f=rect._field;
    draftMap(f)[S(f.key)]=c;
    f.vx=c.vx;f.vy=c.vy;f.vw=c.vw;f.vh=c.vh;
    forceFieldModelLeft(f);
    if(doRedraw)redraw();
    return true;
  }
  function commitRects(rects){
    let changed=false;
    for(const r of rects||[])changed=commitRect(r,false)||changed;
    if(changed)redraw();
    updateSelectedInfo();
    return changed;
  }

  function startPointer(e,rect){
    if(!editing||testMode)return;
    e.preventDefault();e.stopImmediatePropagation();

    const handle=e.target.closest?.(".s44handle");
    const multiKey=!!(e.ctrlKey||e.metaKey);

    // CTRL/CMD + click toggles selection only. Release CTRL then drag one
    // selected region to move/resize the whole selected group.
    if(multiKey&&!handle){
      selectRect(rect,true);
      drag=null;
      return;
    }

    const current=selectedList();
    if(!current.includes(rect))selectRect(rect,false);
    else{selected=rect;paintSelection();updateSelectedInfo()}

    const lr=$("s44layer").getBoundingClientRect();
    const mode=handle?.dataset?.resize||"move";
    const group=(selectedList().length>1?selectedList():[rect]).map(r=>{
      const rr=r.getBoundingClientRect();
      return {rect:r,left:rr.left-lr.left,top:rr.top-lr.top,width:rr.width,height:rr.height};
    });
    drag={rect,mode,startX:e.clientX,startY:e.clientY,layerW:lr.width,layerH:lr.height,group};
  }
  function movePointer(e){
    if(!drag)return;
    e.preventDefault();e.stopImmediatePropagation();
    const d=drag;
    let dx=e.clientX-d.startX,dy=e.clientY-d.startY;

    if(d.mode==="move"){
      // Clamp once for the whole group so relative spacing is preserved.
      const minLeft=Math.min(...d.group.map(g=>g.left));
      const minTop=Math.min(...d.group.map(g=>g.top));
      const maxRight=Math.max(...d.group.map(g=>g.left+g.width));
      const maxBottom=Math.max(...d.group.map(g=>g.top+g.height));
      dx=Math.max(-minLeft,Math.min(d.layerW-maxRight,dx));
      dy=Math.max(-minTop,Math.min(d.layerH-maxBottom,dy));

      d.group.forEach(g=>{
        g.rect.style.left=((g.left+dx)/d.layerW*100)+"%";
        g.rect.style.top=((g.top+dy)/d.layerH*100)+"%";
      });
    }else{
      d.group.forEach(g=>{
        let width=g.width,height=g.height;
        if(d.mode.includes("e"))width=Math.max(12,Math.min(d.layerW-g.left,g.width+dx));
        if(d.mode.includes("s"))height=Math.max(10,Math.min(d.layerH-g.top,g.height+dy));
        g.rect.style.width=(width/d.layerW*100)+"%";
        g.rect.style.height=(height/d.layerH*100)+"%";
      });
    }
    updateSelectedInfo();
  }
  function endPointer(){
    if(!drag)return;
    const rs=drag.group.map(g=>g.rect);
    commitRects(rs);
    drag=null;
  }
  document.addEventListener("pointerdown",e=>{
    const rect=e.target.closest?.(".s44rect");
    if(rect&&$("s44layer")?.contains(rect))startPointer(e,rect)
  },true);
  document.addEventListener("pointermove",movePointer,true);
  document.addEventListener("pointerup",endPointer,true);
  document.addEventListener("pointercancel",endPointer,true);

  function resizeSelected(dw,dh){
    if(testMode){$("s44status").textContent="Đang TEST. Bấm QUAY LẠI CHỈNH trước.";return}
    const rs=selectedList();
    if(!rs.length){$("s44status").textContent="Chọn ít nhất một vùng trước.";return}
    const lr=$("s44layer").getBoundingClientRect();
    for(const r of rs){
      const rr=r.getBoundingClientRect();
      r.style.width=(Math.max(12,Math.min(lr.right-rr.left,rr.width+dw))/lr.width*100)+"%";
      r.style.height=(Math.max(10,Math.min(lr.bottom-rr.top,rr.height+dh))/lr.height*100)+"%";
    }
    commitRects(rs);
    $("s44status").textContent=`Đã chỉnh kích thước ${rs.length} vùng.`;
  }
  function resetSelected(){
    const rs=selectedList();
    if(!rs.length){$("s44status").textContent="Chọn ít nhất một vùng trước.";return}
    for(const r of rs){
      const f=r._field,b=rememberBase(f);
      delete draftMap(f)[S(f.key)];
      f.vx=b.vx;f.vy=b.vy;f.vw=b.vw;f.vh=b.vh;forceFieldModelLeft(f);
      r.style.left=(b.vx*100)+"%";r.style.top=(b.vy*100)+"%";r.style.width=(b.vw*100)+"%";r.style.height=(b.vh*100)+"%";
    }
    redraw();updateSelectedInfo();
    $("s44status").textContent=`Đã đưa ${rs.length} vùng về cấu hình gốc.`;
  }

  function testValue(f){
    const real=appState()?.[f.key];
    if(real!==undefined&&real!==null&&S(real))return S(real).slice(0,60);
    const type=U(f.type),key=U(f.key),filter=U(f.filter);
    if(key.includes("DATE")||type==="DATEAUTO")return "11/09/2026";
    if(key.includes("TIME")||["TIMENOW","TIME"].includes(type)||filter==="TIME"||key.includes("STA")||key.includes("STD")||key.includes("ETA")||key.includes("ETD"))return "08:25";
    if(type==="NUMBER"||filter==="NUMBER"||/(PAX|TTL|PCS|KG|BAY|WEIGHT|PIECE)/.test(key))return "123";
    if(key.includes("ROUTE2"))return "CXR";
    return "TEST";
  }
  function renderTest(){
    const svg=$("s44test");svg.innerHTML="";
    const NS="http://www.w3.org/2000/svg",W=1241,H=1755;
    let i=0;
    for(const f of fieldCandidates(activeGroup,activePage)){
      const x=Number(f.vx)*W,y=Number(f.vy)*H,w=Math.max(4,Number(f.vw)*W),h=Math.max(4,Number(f.vh)*H);
      const clip=document.createElementNS(NS,"clipPath");clip.id="s44c"+activePage+"_"+i;
      const cr=document.createElementNS(NS,"rect");cr.setAttribute("x",x);cr.setAttribute("y",y);cr.setAttribute("width",w);cr.setAttribute("height",h);clip.appendChild(cr);
      let defs=svg.querySelector("defs");if(!defs){defs=document.createElementNS(NS,"defs");svg.appendChild(defs)}defs.appendChild(clip);
      const tx=x,ta="start";
      const t=document.createElementNS(NS,"text");t.setAttribute("x",tx);t.setAttribute("y",y+h/2);t.setAttribute("dominant-baseline","middle");t.setAttribute("text-anchor",ta);t.setAttribute("font-family","Times New Roman");t.setAttribute("font-weight","700");t.setAttribute("font-size",Math.max(10,Number(f.font)||16));t.setAttribute("fill","#003B8E");t.setAttribute("clip-path",`url(#${clip.id})`);t.textContent=testValue(f);svg.appendChild(t);
      i++;
    }
  }
  function toggleTest(){
    if(!editing)return;
    testMode=!testMode;
    const pv=$("sagsCoord44Preview"),btn=$("s44testBtn");
    pv.classList.toggle("s44testing",testMode);
    if(testMode){renderTest();btn.textContent="QUAY LẠI CHỈNH";$("s44status").textContent="TEST: khung chỉnh đã ẩn. Đang xem dữ liệu tại vị trí/kích thước vừa chỉnh."}
    else{btn.textContent="TEST HIỂN THỊ";$("s44test").innerHTML="";$("s44status").textContent="Đã quay lại chế độ chỉnh."}
  }

  function openEditor(group){
    if(!isAdmin()||!FORMS[group])return;closeCenter();activeGroup=group;activePage=FORMS[group].pages[0];editing=true;testMode=false;selected=null;selectedRects=[];drag=null;
    draft=workingBase();draft.schema=3;draft.build="FSAGS-BBBT-DISPLAY-COORDINATES-LEFT-ONLY-V1";draft.pages||={};applyConfig(draft,{redraw:false,enforce:true});
    $("sagsCoord44Preview").hidden=false;$("sagsCoord44Panel").hidden=false;$("sagsCoord44Preview").classList.remove("s44testing");$("s44testBtn").textContent="TEST HIỂN THỊ";$("s44title").textContent="CĂN TỌA ĐỘ · "+FORMS[group].label;buildPage(activePage);
  }
  function closeEditorKeepDraft(){editing=false;testMode=false;selected=null;selectedRects=[];drag=null;$("s44layer").innerHTML="";$("s44test").innerHTML="";$("sagsCoord44Preview").classList.remove("s44testing");$("sagsCoord44Preview").hidden=true;$("sagsCoord44Panel").hidden=true;applyConfig(temp||config,{redraw:false,enforce:true})}
  function cancelEditor(){closeEditorKeepDraft()}
  function saveTempAndBack(){
    if(!editing)return;
    saveTempObject(draft);applyConfig(temp,{redraw:false,enforce:true});
    $("s44status").textContent="ĐÃ LƯU TẠM trên máy AD này.";
    setTimeout(()=>{closeEditorKeepDraft();openCenter()},350);
  }

  function finalExportObject(){
    const src=sanitizeCoordinates(temp||draft||config);
    return {
      schema:3,
      build:"FSAGS-BBBT-DISPLAY-COORDINATES-LEFT-ONLY-V1",
      updatedAt:new Date().toISOString(),
      updatedBy:session().username||"AD",
      note:"AD coordinate-only file. All managed FSAGS/BBBT text renders LEFT from vx; no center/right setting exists.",
      pages:src.pages||{}
    };
  }
  async function exportAll(){
    const stats=tempStats();
    if(!stats.fields){alert("Chưa có bản tạm để xuất.");return}
    try{
      const cfg=finalExportObject(),text=JSON.stringify(cfg,null,2)+"\n",blob=new Blob([text],{type:"application/json;charset=utf-8"}),name="fsags-display-coordinates.json";
      let shared=false;
      try{
        if(typeof File!=="undefined"&&navigator.share){
          const file=new File([blob],name,{type:"application/json"});
          if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});shared=true}
        }
      }catch(_){}
      if(!shared){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
      config=clone(cfg);applyConfig(config,{redraw:false,enforce:true});
      alert("Đã xuất fsags-display-coordinates.json. Sau khi thay file trên GitHub và xác nhận hoạt động, có thể XÓA BẢN TẠM.");
    }catch(e){alert("Chưa xuất được file: "+S(e?.message||e))}
  }


  function pagesForPdfKind(kind){
    switch(S(kind||"all").toLowerCase()){
      case "fsags":return [1,2];
      case "bbbt":return [4];
      case "fsags421":return [6,7];
      case "fsags551":return [9,10];
      case "fsags09":return [11,12];
      case "loading208":return [13];
      default:return [1,2,4];
    }
  }

  function unwrapOldPdfAuthority(fn){
    let cur=fn,guard=0;
    while(cur&&cur.__sagsOriginal&&guard++<8){
      if(cur.__sagsAdPdfWrapped||cur.__sagsCoordPdfScopeWrapped){
        cur=cur.__sagsOriginal;
        continue;
      }
      break;
    }
    return cur;
  }

  function installPdfScope(){
    try{
      let current=root.sendReport;
      if(typeof current!=="function")return false;
      if(current.__sagsCoordPdfFastScopeWrapped)return true;

      // V4.2.47–V4.2.51 wrapped sendReport just to call applyConfig again.
      // Remove that redundant wrapper. Preserve iOS-export's own sendReport wrapper.
      const old=unwrapOldPdfAuthority(current);

      const wrapped=async function(kind="all"){
        const prev=root.__SAGS_COORD_EXPORT_PAGES;
        root.__SAGS_COORD_EXPORT_PAGES=pagesForPdfKind(kind);
        const t0=(root.performance?.now?.()??Date.now());
        try{
          return await old.apply(this,arguments);
        }finally{
          const t1=(root.performance?.now?.()??Date.now());
          lastPdfPerf={
            kind:S(kind||"all"),
            pages:[...root.__SAGS_COORD_EXPORT_PAGES],
            totalMs:+(t1-t0).toFixed(1),
            lastDraw:lastRenderPerf,
            at:Date.now()
          };
          root.__SAGS_PDF_PERF_LAST=lastPdfPerf;
          root.__SAGS_COORD_EXPORT_PAGES=prev;
        }
      };
      wrapped.__sagsCoordPdfFastScopeWrapped=true;
      wrapped.__sagsOriginal=old;
      root.sendReport=wrapped;
      try{sendReport=wrapped}catch(_){}
      return true;
    }catch(_){return false}
  }

  function stripQuickIncidentUi(){
    try{
      document.querySelectorAll("button").forEach(b=>{
        const t=S(b.textContent).toUpperCase();
        if(t.includes("GHI NHẬN NHANH")||t.includes("NÓI / ẢNH"))b.remove();
      });
      $("qiModal")?.remove();
      $("srIncident")?.remove();
      document.querySelectorAll('link[href*="quick-incident.css"],script[src*="quick-incident.js"]').forEach(x=>x.remove());
    }catch(_){}
  }

  function installQuickIncidentRemoval(){
    // Hard-disable the old public entry point.
    const disabled=function(){return false};
    disabled.__sagsQuickIncidentRemoved=true;
    root.sagsQuickOpen=disabled;

    // MY FLIGHT can recreate its workspace HTML when another flight is opened.
    const fw=root.flightWorkspaceOpenFlight;
    if(typeof fw==="function"&&!fw.__sagsQuickIncidentRemoved){
      const wrapped=function(){
        const r=fw.apply(this,arguments);
        stripQuickIncidentUi();
        requestAnimationFrame(stripQuickIncidentUi);
        return r;
      };
      wrapped.__sagsQuickIncidentRemoved=true;
      wrapped.__sagsOriginal=fw;
      root.flightWorkspaceOpenFlight=wrapped;
    }

    // Shift report creates its modal lazily. Remove the retired action if opened.
    const sr=root.sagsShiftOpen;
    if(typeof sr==="function"&&!sr.__sagsQuickIncidentRemoved){
      const wrapped=function(){
        const r=sr.apply(this,arguments);
        stripQuickIncidentUi();
        requestAnimationFrame(stripQuickIncidentUi);
        return r;
      };
      wrapped.__sagsQuickIncidentRemoved=true;
      wrapped.__sagsOriginal=sr;
      root.sagsShiftOpen=wrapped;
    }

    stripQuickIncidentUi();
    return true;
  }

  function installRoleUiHook(){
    const old=root.applyRoleUI;
    if(typeof old!=="function")return false;
    if(old.__sagsCoord48Wrapped)return true;
    const wrapped=function(){
      const r=old.apply(this,arguments);
      setTimeout(()=>{
        ensureAdminCard();
        installQuickIncidentRemoval();
      },0);
      return r;
    };
    wrapped.__sagsCoord48Wrapped=true;
    wrapped.__sagsOriginal=old;
    root.applyRoleUI=wrapped;
    try{applyRoleUI=wrapped}catch(_){}
    return true;
  }

  function scan(){
    // Lightweight only: create/update the AD entry point.
    // DO NOT applyConfig()/draw() from generic DOM changes.
    ensureUi();
    ensureAdminCard();
    installAdminClickWakeup();
    installQuickIncidentRemoval();
    installRoleUiHook();
  }

  // Role/session events are enough to maintain the AD menu entry.
  ["sags:login","sags:rolechange","sags:profilechange","sags:ui-ready"].forEach(n=>
    root.addEventListener?.(n,()=>{scan();scheduleAdminEntry()})
  );

  // Reload coordinate JSON when app regains focus, but update the model only.
  root.addEventListener("focus",()=>{
    refreshConfig(false).then(()=>applyConfig(temp||config,{redraw:false,enforce:false}));
  });
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden){
      refreshConfig(false).then(()=>applyConfig(temp||config,{redraw:false,enforce:false}));
    }
  });

  root.sagsOpenCoordinateCenter=()=>{if(isAdmin())openCenter()};
  root.sagsCoordinateInfo=()=>({
    build:BUILD,admin:isAdmin(),editing,testMode,group:activeGroup,page:activePage,
    selectedCount:selectedList().length,tempStats:tempStats(),
    activeFields:activeGroup?fieldCandidates(activeGroup,activePage).length:0,
    configUpdatedAt:S(config.updatedAt),
    performanceMode:"EVENT_DRIVEN_BATCHED_RENDER_SCAN",
    performance:{
      lastDraw:lastRenderPerf,
      lastPdf:lastPdfPerf,
      lastScan:root.__SAGS_COORD_RENDER_SCAN_LAST||null
    },
    renderModel:{
      rule:"LEFT_ONLY_GLOBAL",
      textStart:"vx",
      textAnchor:"start",
      alignmentSettings:"REMOVED",
      configSchema:3
    },
    adDetection:{
      sessionRole:session().role,
      currentRole:U(root.currentRole),
      bodyRoleAdmin:document.body?.classList.contains("role-admin")===true,
      dashboard:!!$("v181AdminCenter"),
      toolbar:!!$("v377AdminFormToolsRow"),
      dashboardButton:!!$("sagsCoord49AdminDashboardCard"),
      toolbarButton:!!$("sagsCoord49AdminToolbarBtn")
    }
  });

  ensureUi();
  loadTemp();
  updateTempSummary();
  scan();

  // Install wrappers without forcing a redraw. Retry briefly because native
  // functions can be declared after runtime patch injection.
  let tries=0;
  const bootTimer=setInterval(()=>{
    tries++;
    const b=installDrawAuthority();
    const p=installPdfScope();
    const q=installQuickIncidentRemoval();
    const u=installRoleUiHook();
    ensureAdminCard();
    installAdminClickWakeup();
    const c=applyConfig(temp||config,{redraw:false,enforce:false});
    if((b&&p&&q&&c)||tries>=20)clearInterval(bootTimer);
  },250);

  refreshConfig(true).then(()=>{
    applyConfig(temp||config,{redraw:false,enforce:false});
    installDrawAuthority();
    installPdfScope();
    installQuickIncidentRemoval();
    installRoleUiHook();
    installAdminClickWakeup();
    ensureAdminCard();
    scheduleAdminEntry();
  });
})(typeof window==="undefined"?globalThis:window);



/* ===== V4.4.0 · FORM MANAGER + GENERIC CUSTOM FORM ENGINE ===== */
(function(root){
'use strict';
if(root.__SAGS_V440_FORM_MANAGER_LOADED)return;root.__SAGS_V440_FORM_MANAGER_LOADED=true;
const BUILD='V4.7.1-LOCAL-CARRIER-GUIDE-MANAGER',REG_URL='./forms.registry.json',LOCAL_KEY='sagsFormRegistryDraftV450',OLD_LOCAL_KEY='sagsFormRegistryDraftV440',DB_NAME='sags-form-assets-v440',STORE='assets';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
let published={schema:2,forms:[]},draft=null,currentId='',pageIndex=0,selectedKey='',selectedMany=new Set(),history=[],future=[],objectUrls=[],testMode=false,testEditMode=true,testValuesV462={};
let editorZoom=(()=>{try{const n=Number(sessionStorage.getItem('sagsFormManagerZoomV451')||1);return Number.isFinite(n)?Math.max(.5,Math.min(4,n)):1}catch(_){return 1}})();
let aiPreviewV460=[],aiWorkerV460=null,aiWorkerLangV460='',aiBusyV460=false,aiLibPromiseV460=null;
function isAD(){try{return String(root.currentRole||root.currentUserProfile?.role||'').toUpperCase()==='AD'||document.body?.classList.contains('role-admin')}catch(_){return false}}
function sid(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)}
function fieldKey(v){return String(v||'').trim().replace(/[^A-Za-z0-9_.:-]+/g,'_').slice(0,80)}
function globalFieldsV45(){try{return (typeof fields!=="undefined"&&Array.isArray(fields))?fields:[]}catch(_){return []}}
function liveStateV45(){try{return (typeof state!=="undefined"&&state&&typeof state==="object")?state:(root.state||{})}catch(_){return root.state||{}}}
function pageNoV45(p){const m=String(p?.image||'').match(/page(\d+)\./i);return m?Number(m[1]):Number(p?.sourcePage||0)}
function mapFieldTypeV45(g){const t=String(g?.type||'text').toLowerCase();if(t==='check'||t==='displaycheck')return 'checkbox';if(t==='signature')return 'signature';if(g?.multiline)return 'textarea';if(t.includes('time'))return 'time';if(t.includes('date'))return 'date';if(t==='number')return 'number';if(t==='display')return 'computed';return 'text'}
function hydrateLegacyForms(){const gs=globalFieldsV45();if(!draft?.forms||!gs.length)return draft;for(const fm of draft.forms){if(!fm?.legacy)continue;fm.engine='form-manager-v450';fm.fields=Array.isArray(fm.fields)?fm.fields:[];const pageMap=new Map((fm.pages||[]).map(p=>[pageNoV45(p),p.id]));const existing=new Map(fm.fields.map(x=>[String(x.key),x]));for(const g of gs){const pid=pageMap.get(Number(g.page));if(!pid||!g?.key)continue;let x=existing.get(String(g.key));if(!x){x={key:String(g.key),label:String(g.label||g.key),type:mapFieldTypeV45(g),bind:String(g.key),pageId:pid,x:Number(g.vx??g.x??0),y:Number(g.vy??g.y??0),w:Number(g.vw??g.w??.1),h:Number(g.vh??g.h??.03),fontSize:Number(g.font||14),fontWeight:700,align:String(g.align||((g.leftValue)?'left':'center')),valign:String(g.valign||'middle'),sourcePage:Number(g.page),sourceType:String(g.type||'text'),generatedFromLegacy:true};fm.fields.push(x);existing.set(String(g.key),x)}else{x.pageId=x.pageId||pid;x.sourcePage=Number(g.page);x.sourceType=x.sourceType||String(g.type||'text');if(!Number.isFinite(Number(x.fontSize)))x.fontSize=Number(g.font||14);if(!x.align)x.align=String(g.align||'left');if(!x.valign)x.valign=String(g.valign||'middle')}}}return draft}
function runtimeTypeV463(x){const t=String(x?.type||'text').toLowerCase();if(t==='checkbox')return 'check';if(t==='signature')return 'signature';if(t==='time')return 'time';if(t==='date')return 'dateAuto';if(t==='number')return 'number';if(t==='computed'||t==='static-text')return 'display';return 'text'}
function syncLegacyToLive(redraw=false){const gs=globalFieldsV45();if(!gs.length)return false;const source=draft?.forms?.length?draft:published?.forms?.length?published:null;if(!source)return false;
  // Rebuild Form-Manager-created legacy fields on every sync. Native/original fields are never removed.
  for(let i=gs.length-1;i>=0;i--)if(gs[i]?.__formManagerCustomV463)gs.splice(i,1);
  const byKey=new Map(gs.filter(g=>!g?.__formManagerCustomV463).map(g=>[String(g.key),g]));
  for(const fm of source.forms||[]){if(!fm?.legacy)continue;const pageById=new Map((fm.pages||[]).map(p=>[String(p.id),Number(p.sourcePage||pageNoV45(p)||0)]));
    for(const x of fm.fields||[]){
      const original=x.generatedFromLegacy!==false&&!x.customFieldV463?byKey.get(String(x.key)):null;
      if(original){original.vx=Number(x.x);original.vy=Number(x.y);original.vw=Number(x.w);original.vh=Number(x.h);if(Number.isFinite(Number(x.fontSize)))original.font=Number(x.fontSize);original.align=String(x.align||'left');original.valign=String(x.valign||'middle');original.leftValue=original.align==='left';if(original.leftValue)original.manualInset=0;continue}
      // A new field created in Form Manager on a SYSTEM form becomes a real runtime field.
      const pg=Number(x.sourcePage||pageById.get(String(x.pageId))||0);if(!pg)continue;
      const key=String(x.bind||x.key||'').trim();if(!key)continue;
      const gx=Number(x.x||0),gy=Number(x.y||0),gw=Math.max(.005,Number(x.w||.12)),gh=Math.max(.005,Number(x.h||.035));
      const rt=runtimeTypeV463(x),al=String(x.align||'left'),va=String(x.valign||'middle');
      gs.push({page:pg,key,type:rt,label:String(x.label||x.key||key),x:gx,y:gy,w:gw,h:gh,vx:gx,vy:gy,vw:gw,vh:gh,tickX:gx+gw/2,tickY:gy+gh/2,font:Math.max(6,Number(x.fontSize||14)),align:al,valign:va,multiline:String(x.type||'')==='textarea',inputMode:String(x.type||'')==='number'?'numeric':'text',filter:String(x.type||'')==='number'?'number':String(x.type||'')==='time'?'time':String(x.type||'')==='date'?'date':null,manualInset:0,leftValue:al==='left',dotRects:null,displayDy:0,autoFitLines:String(x.type||'')==='textarea'?4:0,aboveDots:false,writeOnLine:false,lineRatio:null,hitPadX:0,hitPadY:0,__formManagerCustomV463:true,__formManagerFieldKey:String(x.key||key),__formManagerFormId:String(fm.id||''),__formManagerOriginalType:String(x.type||'text')});
    }}
  if(redraw){try{if(typeof draw==='function')draw()}catch(_){}}return true}
function saveLocal(){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(draft||{schema:2,forms:[]}))}catch(e){console.warn('V4.5 form local save',e)}try{syncLegacyToLive(false)}catch(_){}}
function loadLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||localStorage.getItem(OLD_LOCAL_KEY)||'null')}catch(_){return null}}
async function loadPublished(force=false){if(published.forms?.length&&!force)return published;try{const r=await fetch(REG_URL+(force?'?t='+Date.now():''),{cache:force?'no-store':'default'});if(r.ok)published=await r.json()}catch(e){console.info('V4.5 form registry offline',e?.message||e)}return published}
function mergeRegistry(){const local=isAD()?loadLocal():null;draft=local?.forms?.length?local:clone(published);draft.schema=2;draft.version='V4.7.1';draft.build=BUILD;draft.forms=Array.isArray(draft.forms)?draft.forms:[];hydrateLegacyForms();syncLegacyToLive(false);return draft}
function form(){return draft?.forms?.find(x=>x.id===currentId)||null}function page(){return form()?.pages?.[pageIndex]||null}
function clearUrls(){objectUrls.forEach(x=>{try{URL.revokeObjectURL(x)}catch(_){}});objectUrls=[]}
function dbOpen(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'key'})};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function assetPut(rec){const d=await dbOpen();return new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(rec);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error)})}
async function assetGet(key){if(!key)return null;try{const d=await dbOpen();return await new Promise((res,rej)=>{const q=d.transaction(STORE).objectStore(STORE).get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}catch(_){return null}}
async function assetDel(key){if(!key)return;try{const d=await dbOpen();await new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}catch(_){}}
async function sha256(blob){try{const b=await blob.arrayBuffer(),h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(_){return ''}}
async function dimensions(blob){if('createImageBitmap'in root){const im=await createImageBitmap(blob);const x={width:im.width,height:im.height};im.close?.();return x}return await new Promise((res,rej)=>{const u=URL.createObjectURL(blob),im=new Image();im.onload=()=>{res({width:im.naturalWidth,height:im.naturalHeight});URL.revokeObjectURL(u)};im.onerror=e=>{URL.revokeObjectURL(u);rej(e)};im.src=u})}
async function optimizeImage(file){let blob=file,meta=await dimensions(file),ext=(file.type||'image/png').includes('jpeg')?'jpg':(file.type||'').includes('webp')?'webp':'png';if(file.size>2500000||Math.max(meta.width,meta.height)>2400){try{const max=2400,scale=Math.min(1,max/Math.max(meta.width,meta.height)),w=Math.max(1,Math.round(meta.width*scale)),h=Math.max(1,Math.round(meta.height*scale)),im=await createImageBitmap(file),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d',{alpha:false}).drawImage(im,0,0,w,h);im.close?.();const webp=await new Promise(r=>c.toBlob(r,'image/webp',.92));if(webp&&webp.size<file.size){blob=webp;meta={width:w,height:h};ext='webp'}}catch(e){console.info('V4.4 image optimize skipped',e?.message||e)}}return {blob,meta,ext,hash:await sha256(blob)}}
let pdfJsPromiseV464=null,pdfWorkerUrlV464='';
async function loadPdfJsV464(){if(root.pdfjsLib?.getDocument)return root.pdfjsLib;if(pdfJsPromiseV464)return pdfJsPromiseV464;pdfJsPromiseV464=(async()=>{const sources=[['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'],['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js','https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js']];let last=null;for(const [src,worker] of sources){try{await new Promise((resolve,reject)=>{const old=[...document.scripts].find(s=>s.src===src);if(old&&root.pdfjsLib?.getDocument)return resolve();const sc=document.createElement('script');sc.src=src;sc.async=true;sc.crossOrigin='anonymous';sc.onload=resolve;sc.onerror=()=>reject(new Error('Không tải được PDF engine'));document.head.appendChild(sc)});if(root.pdfjsLib?.getDocument){pdfWorkerUrlV464=worker;root.pdfjsLib.GlobalWorkerOptions.workerSrc=worker;return root.pdfjsLib}}catch(e){last=e}}throw last||new Error('Không tải được PDF.js. Kiểm tra mạng rồi thử lại.')})();try{return await pdfJsPromiseV464}catch(e){pdfJsPromiseV464=null;throw e}}
function canvasBlobV464(c,type,quality){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Không tạo được ảnh từ PDF.')),type,quality))}
async function pdfPageImageV464(pg,pageNo,total){const base=pg.getViewport({scale:1}),portrait=base.height>=base.width,target=1241,scale=target/Math.max(1,portrait?base.width:base.height),vp=pg.getViewport({scale});const c=document.createElement('canvas');c.width=Math.max(1,Math.round(vp.width));c.height=Math.max(1,Math.round(vp.height));const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);status(`Đang chuyển PDF → ảnh · trang ${pageNo}/${total} · ${c.width}×${c.height}…`);await pg.render({canvasContext:ctx,viewport:vp,background:'white'}).promise;const png=await canvasBlobV464(c,'image/png');let blob=png,ext='png';try{if(png.size>1800000){const webp=await canvasBlobV464(c,'image/webp',.97);if(webp&&webp.size<png.size*.9){blob=webp;ext='webp'}}}catch(_){}return {blob,ext,meta:{width:c.width,height:c.height},hash:await sha256(blob),sourcePage:pageNo}}
async function pdfToImagesV464(file){const lib=await loadPdfJsV464(),data=new Uint8Array(await file.arrayBuffer()),task=lib.getDocument({data}),doc=await task.promise,out=[];try{for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i);out.push(await pdfPageImageV464(pg,i,doc.numPages));try{pg.cleanup?.()}catch(_){}}}finally{try{await doc.destroy?.()}catch(_){}}return out}
async function storePageImageV464(f,p,x,name,sourcePdfPage=0){const key=`${f.id}/${p.id}/${Date.now()}-${Math.random().toString(36).slice(2,7)}`;if(p.blobKey)await assetDel(p.blobKey);await assetPut({key,blob:x.blob,name:name||'page',type:x.blob.type,size:x.blob.size,sha256:x.hash,width:x.meta.width,height:x.meta.height,updatedAtMs:Date.now(),sourcePdfPage:Number(sourcePdfPage||0)});p.blobKey=key;p.image='';p.width=x.meta.width;p.height=x.meta.height;p.sha256=x.hash;p.ext=x.ext;p.importedFromPdf=!!sourcePdfPage;if(sourcePdfPage)p.sourcePdfPage=sourcePdfPage;return p}
async function importPdfV464(file,f,startIndex){status('Đang mở PDF…');const imgs=await pdfToImagesV464(file);if(!imgs.length)throw new Error('PDF không có trang nào đọc được.');pushHistory();let replaced=0,added=0,skipped=0;for(let i=0;i<imgs.length;i++){let idx=startIndex+i,p=f.pages?.[idx];if(!p){if(f.legacy){skipped++;continue}const id='p'+String((f.pages?.length||0)+1);p={id,image:'',blobKey:'',width:1241,height:1755,sha256:''};f.pages=f.pages||[];f.pages.push(p);idx=f.pages.length-1;added++}await storePageImageV464(f,p,imgs[i],`${file.name}#page-${i+1}`,i+1);p.sourcePdfName=file.name;replaced++}pageIndex=Math.min(startIndex,Math.max(0,(f.pages||[]).length-1));saveLocal();const extra=skipped?` · bỏ qua ${skipped} trang dư vì đây là FORM HỆ THỐNG`:'';status(`✓ PDF ${imgs.length} trang → ${replaced} ảnh nền${added?` · tạo thêm ${added} trang`:''}${extra}. Ảnh đã sẵn sàng cho EDIT / TEST / PDF.`);renderAll()}

function snapshot(){return clone(form())}function pushHistory(){const s=snapshot();if(!s)return;history.push(s);if(history.length>40)history.shift();future=[]}
function restore(s){const i=draft.forms.findIndex(x=>x.id===currentId);if(i>=0)draft.forms[i]=clone(s);selectedKey='';selectedMany.clear();saveLocal();renderAll()}
function undo(){if(!history.length)return;future.push(snapshot());restore(history.pop())}function redo(){if(!future.length)return;history.push(snapshot());restore(future.pop())}
function ensureStyle(){if($('v440FormManagerStyle'))return;const st=document.createElement('style');st.id='v440FormManagerStyle';st.textContent=`
#v440Fm{position:fixed;inset:0;z-index:16050;background:rgba(11,18,32,.72);display:none;align-items:stretch;justify-content:center;padding:8px;box-sizing:border-box;font:13px Arial;color:#172033}#v440Fm.show{display:flex}#v440FmCard{width:min(99vw,1500px);height:calc(100vh - 16px);background:#f8fafc;border-radius:15px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;box-shadow:0 18px 50px rgba(0,0,0,.38)}.v440FmHead{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#0b4a7b;color:#fff}.v440FmHead b{font-size:15px}.v440FmHead .grow{flex:1}.v440Btn{border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:7px 9px;font-weight:800;cursor:pointer}.v440Btn.primary{background:#0569ad;color:#fff;border-color:#0569ad}.v440Btn.green{background:#087a55;color:#fff;border-color:#087a55}.v440Btn.danger{background:#fff1f2;color:#b42318;border-color:#fda4af}.v440Btn:disabled{opacity:.45}.v440FmBody{min-height:0;display:grid;grid-template-columns:260px 1fr 300px;gap:8px;padding:8px}.v440Pane{min-height:0;overflow:auto;background:#fff;border:1px solid #d0d5dd;border-radius:11px;padding:9px;box-sizing:border-box}.v440FormItem{display:block;width:100%;text-align:left;border:1px solid #e4e7ec;background:#fff;border-radius:9px;padding:8px;margin-bottom:6px;font-weight:800}.v440FormItem.active{border-color:#7c3aed;background:#f5f3ff}.v440Tag{display:inline-block;font-size:9px;border-radius:999px;padding:2px 5px;margin-left:5px;background:#eef2ff;color:#4338ca}.v440Row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}.v440Field{display:grid;gap:3px;margin:7px 0}.v440Field label{font-size:10px;font-weight:900;color:#475467}.v440Field input,.v440Field select,.v440Field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:7px;padding:7px;background:#fff}.v440EditorViewport{width:100%;height:calc(100vh - 155px);min-height:420px;overflow:auto;background:#e9eef3;border:1px solid #d0d5dd;border-radius:10px;padding:12px;box-sizing:border-box;overscroll-behavior:contain}.v440EditorWrap{position:relative;margin:0 auto;width:max-content;max-width:none;background:#e5e7eb;box-shadow:0 0 0 1px #cbd5e1;user-select:none;transform-origin:top left}.v440EditorWrap img{display:block;width:100%;height:auto;max-width:none;max-height:none}.v440Overlay{position:absolute;inset:0}.v451ZoomTools{display:flex;align-items:center;gap:5px;flex-wrap:wrap;position:sticky;top:0;z-index:12;background:#fff8d8;border:2px solid #f59e0b;border-radius:10px;padding:6px 8px;box-shadow:0 2px 8px rgba(0,0,0,.08)}.v453ZoomTitle{font-weight:1000;color:#8a4b00;white-space:nowrap}.v451ZoomTools .v451ZoomLabel{min-width:58px;text-align:center;font-weight:900;color:#173d67;background:#eef5fb;border-radius:8px;padding:7px 8px}.v451ZoomTools input[type=range]{width:130px;accent-color:#0b67b2}.v461TextAlignBox{margin:8px 0;padding:9px;border:2px solid #60a5fa;border-radius:10px;background:#eff6ff}.v461TextAlignTitle{font-weight:1000;color:#0b4a7b;margin-bottom:7px}.v461TextAlignRow{display:grid;grid-template-columns:54px repeat(3,1fr);gap:5px;align-items:center;margin:5px 0}.v461TextAlignRow>span{font-size:10px;font-weight:900;color:#475467}.v461AlignBtn{min-height:36px;border:1px solid #b7c6d7;border-radius:8px;background:#fff;color:#173d67;font-weight:900;cursor:pointer}.v461AlignBtn.active{background:#075ea8;border-color:#075ea8;color:#fff;box-shadow:0 0 0 2px #bfdbfe}.v461CenterBoth{width:100%;margin-top:6px;min-height:38px;border:1px solid #087a55;border-radius:8px;background:#ecfdf3;color:#087a55;font-weight:1000;cursor:pointer}.v461AlignHint{margin-top:6px;font-size:10px;line-height:1.35;color:#52687a;font-weight:700}.v461FieldPositionTitle{margin-top:8px;font-size:10px;font-weight:1000;color:#7c3aed;text-transform:uppercase}.v440Box{position:absolute;border:2px solid #7c3aed;background:rgba(124,58,237,.08);box-sizing:border-box;min-width:8px;min-height:8px;cursor:move}.v440Box.ai{border-color:#0284c7;background:rgba(14,165,233,.09)}.v440Box.ai>span{background:#0369a1}.v440Box.ai-preview{border:2px dashed #16a34a;background:rgba(34,197,94,.10);pointer-events:none;z-index:8}.v440Box.ai-preview>span{background:#166534}.v460AiModal{position:fixed;inset:0;z-index:19550;background:#0b1220cc;display:none;align-items:center;justify-content:center;padding:12px}.v460AiModal.show{display:flex}.v460AiCard{width:min(94vw,760px);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:16px;box-shadow:0 22px 70px #0007}.v460AiHead{display:flex;align-items:center;gap:8px}.v460AiHead b{font-size:18px;color:#075ea8}.v460AiInfo{margin:9px 0;padding:10px;border-radius:10px;background:#eef7ff;color:#244761;font-weight:700}.v460AiGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v460AiProgress{height:10px;border-radius:999px;background:#e5e7eb;overflow:hidden;margin:9px 0}.v460AiProgress>i{display:block;height:100%;width:0;background:#0b67b2;transition:width .15s}.v460AiStatus{white-space:pre-wrap;min-height:42px;padding:9px;border-radius:9px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700}.v460AiList{max-height:250px;overflow:auto;border:1px solid #e2e8f0;border-radius:9px;margin-top:8px}.v460AiRow{display:grid;grid-template-columns:64px 1fr 100px 100px;gap:6px;padding:7px;border-bottom:1px solid #eef2f7;font-size:11px;align-items:center}.v460AiRow:last-child{border-bottom:0}.v460AiScore{font-weight:900;color:#067647}.v460AiWarn{color:#b54708}.v460AiBtn{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:8px 10px;font-weight:900;cursor:pointer}.v460AiBtn.primary{background:#075ea8;color:#fff;border-color:#075ea8}.v460AiBtn.good{background:#087a55;color:#fff;border-color:#087a55}.v460AiBtn.danger{background:#fff1f2;color:#b42318;border-color:#fda4af}.v460AiActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}@media(max-width:700px){.v460AiGrid{grid-template-columns:1fr}.v460AiRow{grid-template-columns:54px 1fr 80px}}.v440Box.sel{border-color:#dc2626;background:rgba(220,38,38,.10);z-index:3}.v440Box.multi{border-color:#f59e0b}.v450TestValue{position:absolute;inset:0;display:flex;align-items:center;overflow:hidden;padding:1px 3px;box-sizing:border-box;color:#003b8e;pointer-events:none;white-space:pre-wrap}.v450TestMode .v440Box{border-color:rgba(16,185,129,.28);background:rgba(255,255,255,.02)}.v450TestMode .v440Box>span,.v450TestMode .v440Resize{display:none!important}.v462TestModeBtn{display:none!important;min-width:190px}.v462TestModeBtn.show{display:inline-flex!important;align-items:center;justify-content:center}.v462TestModeBtn.edit{background:#ecfdf3;color:#067647;border-color:#6ce9a6}.v462TestModeBtn.interact{background:#eff8ff;color:#175cd3;border-color:#84caff}.v462TestHint{margin:6px 0;padding:7px 9px;border-radius:9px;font-size:10px;font-weight:900;line-height:1.35}.v462TestHint.edit{background:#ecfdf3;color:#067647}.v462TestHint.interact{background:#eff8ff;color:#175cd3}.v450TestMode.v462TestEdit .v440Box{border-color:rgba(124,58,237,.55);background:rgba(255,255,255,.03);cursor:move}.v450TestMode.v462TestEdit .v440Box.sel{border-color:#dc2626;background:rgba(220,38,38,.08)}.v450TestMode.v462TestEdit .v440Box.sel>span,.v450TestMode.v462TestEdit .v440Box.sel>.v440Resize{display:block!important}.v450TestMode.v462TestInteract .v440Box{border-color:transparent!important;background:transparent!important;cursor:default}.v450TestMode.v462TestInteract .v440Box.sel{outline:1px dashed rgba(37,99,235,.4)}.v462TestControl{width:100%;height:100%;box-sizing:border-box;border:1px solid rgba(37,99,235,.28);background:rgba(255,255,255,.88);color:#003b8e;padding:1px 3px;margin:0;font-family:'Times New Roman';font-weight:700;outline:none}.v462TestControl:focus{border-color:#2563eb;box-shadow:0 0 0 1px #93c5fd}.v462TestCheck{width:100%;height:100%;margin:0;accent-color:#075ea8}.v462TestStatic{position:absolute;inset:0;display:flex;overflow:hidden;padding:1px 3px;box-sizing:border-box;color:#003b8e}.v462KeyboardHelp{font-size:10px;color:#52687a;font-weight:800;margin-top:5px}.v450Perf{font:800 10px/1.35 Arial;color:#dff7ea;white-space:nowrap}.v440Box span{position:absolute;left:0;top:-17px;background:#4c1d95;color:#fff;font:800 9px Arial;padding:2px 4px;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis}.v440Resize{position:absolute;right:-5px;bottom:-5px;width:11px;height:11px;border-radius:50%;background:#dc2626;border:2px solid #fff;cursor:nwse-resize}.v440PageTabs{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin:4px 0 8px}.v440PageTabs button.active{background:#0b4a7b;color:#fff}.v440Empty{padding:30px;text-align:center;color:#667085;font-weight:800}.v440Status{font-size:11px;color:#067647;font-weight:800;min-height:15px;margin-top:5px}.v440Grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}.v440Grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.v440Runtime{position:fixed;inset:0;z-index:15500;background:#eef2f6;display:none;overflow:auto;padding:8px}.v440Runtime.show{display:block}.v440RuntimeTop{position:sticky;top:0;z-index:20;background:#fff;border:1px solid #d0d5dd;border-radius:10px;padding:8px;display:flex;gap:8px;align-items:center;margin-bottom:8px}.v440RuntimePage{position:relative;width:min(100%,900px);margin:0 auto 12px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.16)}.v440RuntimePage>img{display:block;width:100%;height:auto}.v440RuntimeField{position:absolute;box-sizing:border-box}.v440RuntimeField input,.v440RuntimeField textarea,.v440RuntimeField select,.v440RuntimeField button{width:100%;height:100%;box-sizing:border-box;border:1px solid rgba(0,82,160,.35);background:rgba(255,255,255,.82);font:inherit;padding:2px}.v440RuntimeField input[type=checkbox]{width:100%;height:100%}@media(max-width:900px){.v440FmBody{grid-template-columns:1fr}.v440Pane.left,.v440Pane.right{max-height:34vh}.v440EditorViewport{height:58vh;min-height:360px}}@media print{body.v440Printing>*:not(#v440CustomRuntime){display:none!important}body.v440Printing #v440CustomRuntime{display:block!important;position:static!important;padding:0!important;background:#fff!important}.v440RuntimeTop{display:none!important}.v440RuntimePage{break-after:page;box-shadow:none;width:100%!important;margin:0!important}}
`;document.head.appendChild(st)}
function ensureUi(){ensureStyle();if($('v440Fm'))return;const m=document.createElement('div');m.id='v440Fm';m.innerHTML=`<div id="v440FmCard"><div class="v440FmHead"><b>🧩 FORM MANAGER · NGUỒN LAYOUT DUY NHẤT</b><span id="v450Perf" class="v450Perf"></span><span class="grow"></span><button class="v440Btn" id="v450Test">👁 TEST HIỂN THỊ</button><button class="v440Btn v462TestModeBtn" id="v462TestMode" type="button">🔓 TEST · CHỈNH VỊ TRÍ</button><button class="v440Btn" id="v450PdfPreview">📄 PDF PREVIEW</button><button class="v440Btn" id="v460AiRecognize">🤖 AI NHẬN DẠNG</button><button class="v440Btn" id="v440Undo">↶ UNDO</button><button class="v440Btn" id="v440Redo">↷ REDO</button><button class="v440Btn green" id="v440Export">📦 XUẤT GÓI FORM</button><button class="v440Btn" id="v440ExportRegistry">XUẤT REGISTRY</button><button class="v440Btn" id="v440Close">ĐÓNG</button></div><div class="v440FmBody"><div class="v440Pane left"><div class="v440Row"><button class="v440Btn primary" id="v440NewForm">+ FORM MỚI</button><button class="v440Btn" id="v440RefreshReg">↻</button></div><div id="v440FormList"></div></div><div class="v440Pane"><div class="v440Row" style="justify-content:space-between"><div id="v440PageTabs" class="v440PageTabs"></div><div class="v451ZoomTools"><span class="v453ZoomTitle">🔎 ZOOM FORM</span><button class="v440Btn" id="v451ZoomFit" type="button">VỪA KHUNG</button><button class="v440Btn" id="v451ZoomOut" type="button">−</button><span id="v451ZoomLabel" class="v451ZoomLabel">100%</span><input id="v451ZoomRange" type="range" min="50" max="400" step="25" value="100" aria-label="Zoom biểu mẫu"><button class="v440Btn" id="v451ZoomIn" type="button">+</button><button class="v440Btn" id="v440AddPage">+ TRANG</button><button class="v440Btn danger" id="v440DelPage">XÓA TRANG</button></div></div><div id="v440Editor" class="v440Empty">Chọn biểu mẫu.</div></div><div class="v440Pane right"><div id="v440Inspector"></div><div class="v440Status" id="v440Status"></div></div></div></div>`;document.body.appendChild(m);
$('v440Close').onclick=close;$('v450Test').onclick=toggleTestV45;$('v462TestMode').onclick=toggleTestSubModeV462;$('v450PdfPreview').onclick=previewPdfV45;$('v460AiRecognize').onclick=aiOpenV460;$('v440NewForm').onclick=createForm;$('v440RefreshReg').onclick=async()=>{published={schema:1,forms:[]};await loadPublished(true);mergeRegistry();renderAll()};$('v440Undo').onclick=undo;$('v440Redo').onclick=redo;$('v440AddPage').onclick=addPage;$('v440DelPage').onclick=deletePage;$('v440Export').onclick=exportCurrent;$('v440ExportRegistry').onclick=exportRegistry;$('v451ZoomFit').onclick=()=>setEditorZoom(1);$('v451ZoomOut').onclick=()=>setEditorZoom(editorZoom-.25);$('v451ZoomIn').onclick=()=>setEditorZoom(editorZoom+.25);$('v451ZoomRange').oninput=e=>setEditorZoom(Number(e.target.value)/100);renderZoomUi();if(!root.__SAGS_V462_KEYBOARD_NUDGE){root.__SAGS_V462_KEYBOARD_NUDGE=true;document.addEventListener('keydown',e=>{const fm=$('v440Fm');if(!fm?.classList.contains('show'))return;const tag=String(e.target?.tagName||'').toUpperCase();if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(tag)||e.target?.isContentEditable)return;if(testMode&&!testEditMode)return;const map={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=map[e.key];if(!d||!selectedFields().length)return;e.preventDefault();const mul=e.shiftKey?5:1;nudge(d[0]*mul,d[1]*mul)},{capture:true})}}
function status(t,err=false){const e=$('v440Status');if(e){e.textContent=String(t||'');e.style.color=err?'#b42318':'#067647'}}
function open(){if(!isAD())return alert('Chỉ AD được phép quản lý biểu mẫu.');ensureUi();loadPublished().then(()=>{mergeRegistry();if(!currentId)currentId=draft.forms?.[0]?.id||'';$('v440Fm').classList.add('show');renderAll()})}
function close(){clearUrls();$('v440Fm')?.classList.remove('show')}
root.sagsV440OpenFormManager=open;
root.sagsV440CreateNewForm=function(){if(!isAD())return alert('Chỉ AD được phép tạo biểu mẫu.');ensureUi();loadPublished().then(()=>{mergeRegistry();$('v440Fm').classList.add('show');renderAll();setTimeout(createForm,60)})};
function renderZoomUi(){const z=Math.round(editorZoom*100),lab=$('v451ZoomLabel'),rng=$('v451ZoomRange');if(lab)lab.textContent=z+'%';if(rng)rng.value=String(Math.max(50,Math.min(400,z)))}
function applyEditorZoom(preserveCenter=true){const wrap=$('v440Canvas'),vp=$('v440EditorViewport');if(!wrap||!vp){renderZoomUi();return}const base=Number(wrap.dataset.baseWidth||0)||Math.min(Number(page()?.width||1241),Math.max(300,vp.clientWidth-24),1000);let rx=.5,ry=.5;if(preserveCenter&&vp.scrollWidth>0&&vp.scrollHeight>0){rx=(vp.scrollLeft+vp.clientWidth/2)/vp.scrollWidth;ry=(vp.scrollTop+vp.clientHeight/2)/vp.scrollHeight}const natural=Number(page()?.width||1241),display=Math.round(base*editorZoom);wrap.style.width=display+'px';wrap.style.setProperty('--v451-page-scale',String(display/Math.max(1,natural)));renderZoomUi();if(preserveCenter)requestAnimationFrame(()=>{vp.scrollLeft=Math.max(0,rx*vp.scrollWidth-vp.clientWidth/2);vp.scrollTop=Math.max(0,ry*vp.scrollHeight-vp.clientHeight/2)})}
function setEditorZoom(z){editorZoom=Math.max(.5,Math.min(4,Math.round(Number(z||1)*4)/4));try{sessionStorage.setItem('sagsFormManagerZoomV451',String(editorZoom))}catch(_){}applyEditorZoom(true)}

function aiNormV460(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function aiSlugV460(s){let x=aiNormV460(s).toLowerCase().replace(/\b(no|number|name|type|information|info|time)\b/g,' ').replace(/\s+/g,' ').trim();if(!x)x='field';const a=x.split(' ').filter(Boolean),first=(a.shift()||'field').replace(/[^a-z0-9]/g,'');return (first+a.map(v=>v.charAt(0).toUpperCase()+v.slice(1)).join('')).slice(0,52)||'field'}
function aiTokensV460(s){return new Set(aiNormV460(s).split(' ').filter(x=>x.length>1))}
function aiScoreTextV460(a,b){a=aiNormV460(a);b=aiNormV460(b);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return .88;const A=aiTokensV460(a),B=aiTokensV460(b);if(!A.size||!B.size)return 0;let hit=0;A.forEach(x=>{if(B.has(x))hit++});return 2*hit/(A.size+B.size)}
function aiTypeV460(txt){const n=aiNormV460(txt);if(/\b(SIGNATURE|SIGNED|SIGN|CHU KY|KY TEN)\b/.test(n))return 'signature';if(/\b(REMARKS?|NOTES?|REASON|COMMENT|GHI CHU|LY DO)\b/.test(n))return 'textarea';if(/\b(DATE|NGAY)\b/.test(n))return 'date';if(/\b(STD|STA|ETD|ETA|START|FINISH|TIME|ARR TIME|DEP TIME|GIO)\b/.test(n))return 'time';if(/\b(CHECK|YES|NO|OK|Y N)\b/.test(n))return 'checkbox';if(/\b(TOTAL|QTY|QUANTITY|PAX|BAG|BAGS|CARGO|WEIGHT|KG|PCS)\b/.test(n))return 'number';return 'text'}
function aiSignalV460(txt){const n=aiNormV460(txt);const strong=/\b(DATE|FLT|FLIGHT|ROUTE|REGN|REG|A C|AIRCRAFT|STD|STA|ETD|ETA|ARR|DEP|START|FINISH|BAY|GATE|PAX|BAG|CARGO|TOTAL|NAME|SIGNATURE|REMARKS?|NOTES?|REASON|SPECIAL|DELAY|TIME|DATE|TURNAROUND)\b/.test(n);const colon=/:\s*$/.test(String(txt||''));return strong?1:colon?.78:.35}
function aiKnownBaseV460(txt){const n=aiNormV460(txt);const map=[[/\b(FLT|FLIGHT)\s*(NO|NUMBER)?\b/,'flightNo'],[/\bA C\s*TYPE\b|\bAIRCRAFT\s*TYPE\b/,'aircraftType'],[/\bREGN\b|\bREGISTRATION\b|\bA C\s*REG\b/,'acReg'],[/\bROUTE\b/,'route'],[/\bSTD\b/,'std'],[/\bSTA\b/,'sta'],[/\bETD\b/,'etd'],[/\bETA\b/,'eta'],[/\bDATE\b/,'date'],[/\bBAY\b/,'bay'],[/\bGATE\b/,'gate'],[/\bPAX\b/,'pax'],[/\bTOTAL\s*BAGS?\b/,'totalBags'],[/\bREMARKS?\b/,'remarks'],[/\bDELAY\s*REASON\b/,'delayReason'],[/\bSIGNATURE\b/,'signature']];for(const [re,k] of map)if(re.test(n))return k;return aiSlugV460(txt)}
function aiBestBindV460(label,used){let best=null,score=0;for(const g of globalFieldsV45()){const s=Math.max(aiScoreTextV460(label,g?.label),aiScoreTextV460(label,g?.key));if(s>score){score=s;best=g}}if(best&&score>=.82&&!used.has(String(best.key)))return {key:String(best.key),bind:String(best.key),label:String(best.label||label),match:score};const base=aiKnownBaseV460(label);let key=fieldKey(base)||'field',n=2;while(used.has(key))key=(fieldKey(base)||'field')+'_'+n++;return {key,bind:key,label:String(label||key),match:0}}
function aiFlattenWordsV460(data){if(Array.isArray(data?.words)&&data.words.length)return data.words;const out=[];for(const b of data?.blocks||[])for(const p of b?.paragraphs||[])for(const l of p?.lines||[])for(const w of l?.words||[])out.push(w);return out}
function aiLinesV460(words){const a=(words||[]).map(w=>{const b=w.bbox||w.boundingBox||{};return {text:String(w.text||'').trim(),conf:Number(w.confidence??w.conf??0),x0:Number(b.x0??b.left??0),y0:Number(b.y0??b.top??0),x1:Number(b.x1??b.right??0),y1:Number(b.y1??b.bottom??0)}}).filter(w=>w.text&&w.x1>w.x0&&w.y1>w.y0&&w.conf>=25).sort((x,y)=>x.y0-y.y0||x.x0-y.x0);const lines=[];for(const w of a){const cy=(w.y0+w.y1)/2,h=w.y1-w.y0;let best=null,bd=1e9;for(const l of lines){const d=Math.abs(cy-l.cy);if(d<Math.max(7,Math.min(24,(h+l.h)/1.7))&&d<bd){best=l;bd=d}}if(!best){best={words:[],cy,h};lines.push(best)}best.words.push(w);best.cy=(best.cy*(best.words.length-1)+cy)/best.words.length;best.h=Math.max(best.h,h)}return lines.map(l=>{l.words.sort((a,b)=>a.x0-b.x0);const x0=Math.min(...l.words.map(w=>w.x0)),y0=Math.min(...l.words.map(w=>w.y0)),x1=Math.max(...l.words.map(w=>w.x1)),y1=Math.max(...l.words.map(w=>w.y1));return {text:l.words.map(w=>w.text).join(' '),conf:l.words.reduce((s,w)=>s+w.conf,0)/l.words.length,x0,y0,x1,y1,words:l.words}}).sort((a,b)=>a.y0-b.y0||a.x0-b.x0)}
function aiOverlapV460(a,b){const x=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),y=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)),i=x*y;if(!i)return 0;return i/Math.min(Math.max(.000001,a.w*a.h),Math.max(.000001,b.w*b.h))}
function aiCandidatesV460(data,threshold){const p=page(),f=form(),W=Number(p?.width||1241),H=Number(p?.height||1755),lines=aiLinesV460(aiFlattenWordsV460(data)),existing=pageFields(),used=new Set((f?.fields||[]).map(x=>String(x.key))),out=[];for(const ln of lines){const raw=String(ln.text||'').replace(/\s+/g,' ').trim(),norm=aiNormV460(raw),signal=aiSignalV460(raw);if(!raw||raw.length<2||raw.length>80||ln.conf<threshold)continue;if(signal<.7&&ln.words.length>3)continue;if(signal<.7&&!/:\s*$/.test(raw))continue;if(/^(RAMP CO ORDINATOR REPORT|HANDLING|ONLOAD|ARR INFORMATION|DEP INFORMATION|OTHERS|VERIFY|PAGE|REVISION|EFFECTIVE DATE|ISSUING DATE)$/i.test(norm))continue;const type=aiTypeV460(raw);let x=(ln.x1+Math.max(5,W*.004))/W,y=(ln.y0-Math.max(1,H*.001))/H,w=.13,h=Math.max(.018,(ln.y1-ln.y0)*1.35/H);const compact=/^(STD|STA|ETD|ETA|START|FINISH|ARR|DEP)$/i.test(norm);if(compact){x=Math.max(0,(ln.x0-W*.003)/W);y=(ln.y1+H*.002)/H;w=Math.max(.042,(ln.x1-ln.x0+W*.01)/W);h=Math.max(.018,(ln.y1-ln.y0)*1.45/H)}else{const next=ln.words.find(z=>z.x0>ln.x1+W*.02);if(next)w=Math.min(.18,Math.max(.055,(next.x0-ln.x1-W*.012)/W));if(x+w>.985){x=Math.max(0,ln.x0/W);y=Math.min(.97,(ln.y1+H*.002)/H);w=Math.max(.08,Math.min(.22,(ln.x1-ln.x0)/W));}}x=clamp(x,0,.96);y=clamp(y,0,.975);w=clamp(w,.025,1-x);h=clamp(h,.012,Math.min(.08,1-y));const geo={x,y,w,h};if(existing.some(e=>aiOverlapV460(geo,e)>.55)||out.some(e=>aiOverlapV460(geo,e)>.72))continue;const bind=aiBestBindV460(raw,used);used.add(bind.key);const conf=Math.round(Math.max(0,Math.min(100,ln.conf*.76+signal*18+bind.match*6)));out.push({key:bind.key,label:bind.label||raw,type,bind:bind.bind,pageId:p.id,x,y,w,h,fontSize:type==='textarea'?12:14,fontWeight:700,align:type==='number'||type==='time'?'center':'left',valign:'middle',aiGenerated:true,aiConfidence:conf,aiText:raw,aiOcrConfidence:Math.round(ln.conf),aiBindScore:Number(bind.match.toFixed(3))})}return out.slice(0,220)}
function aiEnsureModalV460(){if($('v460AiModal'))return;const m=document.createElement('div');m.id='v460AiModal';m.className='v460AiModal';m.innerHTML=`<div class="v460AiCard"><div class="v460AiHead"><b>🤖 AI NHẬN DẠNG FORM · LOCAL OCR</b><span style="flex:1"></span><button class="v460AiBtn" id="v460AiClose">ĐÓNG</button></div><div class="v460AiInfo">AI chạy trong trình duyệt để đọc ảnh và tạo gợi ý field. Ảnh form không cần gửi lên server E‑Report. Lần đầu cần Internet để tải engine/model OCR; sau đó trình duyệt thường dùng cache.</div><div class="v460AiGrid"><div class="v440Field"><label>NGÔN NGỮ OCR</label><select id="v460AiLang"><option value="eng">English · nhẹ/nhanh</option><option value="eng+vie">English + Vietnamese</option></select></div><div class="v440Field"><label>ĐỘ TIN CẬY OCR TỐI THIỂU</label><input id="v460AiThreshold" type="number" min="40" max="95" step="5" value="60"></div></div><div class="v460AiProgress"><i id="v460AiBar"></i></div><div class="v460AiStatus" id="v460AiStatus">Sẵn sàng. AI sẽ phân tích trang đang mở.</div><div id="v460AiList" class="v460AiList" style="display:none"></div><div class="v460AiActions"><button class="v460AiBtn primary" id="v460AiRun">🤖 PHÂN TÍCH TRANG NÀY</button><button class="v460AiBtn good" id="v460AiApply" style="display:none">✓ ÁP DỤNG GỢI Ý</button><button class="v460AiBtn" id="v460AiApply85" style="display:none">ÁP DỤNG ≥ 85%</button><button class="v460AiBtn danger" id="v460AiClear">XÓA FIELD AI TRANG NÀY</button></div></div>`;document.body.appendChild(m);$('v460AiClose').onclick=()=>aiCloseV460();$('v460AiRun').onclick=()=>aiRunV460();$('v460AiApply').onclick=()=>aiApplyV460(0);$('v460AiApply85').onclick=()=>aiApplyV460(85);$('v460AiClear').onclick=()=>aiClearFieldsV460()}
function aiSetV460(msg,pct=null,err=false){const e=$('v460AiStatus'),b=$('v460AiBar');if(e){e.textContent=String(msg||'');e.style.color=err?'#b42318':'#17324d'}if(b&&pct!==null)b.style.width=Math.max(0,Math.min(100,Number(pct)||0))+'%'}
function aiOpenV460(){if(!isAD())return alert('Chỉ AD được dùng AI nhận dạng form.');if(!form()||!page())return alert('Hãy chọn biểu mẫu và trang trước.');aiEnsureModalV460();aiPreviewV460=[];$('v460AiApply').style.display='none';$('v460AiApply85').style.display='none';$('v460AiList').style.display='none';aiSetV460('Sẵn sàng. AI sẽ phân tích trang đang mở.',0);$('v460AiModal').classList.add('show')}
function aiCloseV460(){aiPreviewV460=[];drawBoxes();$('v460AiModal')?.classList.remove('show')}
function aiLoadLibV460(){if(root.Tesseract?.createWorker)return Promise.resolve(root.Tesseract);if(aiLibPromiseV460)return aiLibPromiseV460;aiLibPromiseV460=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.async=true;s.crossOrigin='anonymous';s.onload=()=>root.Tesseract?.createWorker?resolve(root.Tesseract):reject(new Error('Tesseract chưa khởi tạo'));s.onerror=()=>reject(new Error('Không tải được engine OCR. Kiểm tra Internet/CDN.'));document.head.appendChild(s)}).catch(e=>{aiLibPromiseV460=null;throw e});return aiLibPromiseV460}
async function aiGetWorkerV460(lang){if(aiWorkerV460&&aiWorkerLangV460===lang)return aiWorkerV460;if(aiWorkerV460)try{await aiWorkerV460.terminate()}catch(_){}aiWorkerV460=null;aiWorkerLangV460='';const T=await aiLoadLibV460();aiWorkerV460=await T.createWorker(lang,1,{logger:m=>{const p=Number(m?.progress||0),txt=String(m?.status||'Đang xử lý');aiSetV460(txt+(p?` · ${Math.round(p*100)}%`:''),Math.max(4,p*88))}});aiWorkerLangV460=lang;return aiWorkerV460}
function aiRenderListV460(){const h=$('v460AiList');if(!h)return;if(!aiPreviewV460.length){h.style.display='none';h.innerHTML='';return}h.style.display='block';h.innerHTML=aiPreviewV460.slice(0,80).map(x=>`<div class="v460AiRow"><span class="v460AiScore ${x.aiConfidence<75?'v460AiWarn':''}">${Number(x.aiConfidence||0)}%</span><span><b>${esc(x.label||x.aiText||x.key)}</b><br><small>${esc(x.aiText||'')}</small></span><span>${esc(x.type)}</span><span>${esc(x.bind||x.key)}</span></div>`).join('')+(aiPreviewV460.length>80?`<div style="padding:8px;font-weight:800">… và ${aiPreviewV460.length-80} gợi ý khác</div>`:'')}
async function aiRunV460(){if(aiBusyV460)return;const f=form(),p=page();if(!f||!p)return;aiBusyV460=true;$('v460AiRun').disabled=true;try{aiPreviewV460=[];drawBoxes();const src=await pageSrc(p);if(!src)throw new Error('Trang chưa có ảnh nền.');const lang=$('v460AiLang')?.value||'eng',threshold=Math.max(40,Math.min(95,Number($('v460AiThreshold')?.value||60)));aiSetV460('Đang tải/khởi tạo OCR…',2);const w=await aiGetWorkerV460(lang);aiSetV460('Đang nhận dạng chữ và cấu trúc form…',8);const ret=await w.recognize(src);aiSetV460('Đang suy luận field + kiểu dữ liệu + bind…',92);aiPreviewV460=aiCandidatesV460(ret?.data||{},threshold);drawBoxes();aiRenderListV460();const avg=aiPreviewV460.length?Math.round(aiPreviewV460.reduce((s,x)=>s+Number(x.aiConfidence||0),0)/aiPreviewV460.length):0;aiSetV460(aiPreviewV460.length?`✓ Phát hiện ${aiPreviewV460.length} gợi ý field · độ tin cậy TB ${avg}%. Các khung nét đứt xanh là preview; chưa lưu vào form.`:'Không tìm thấy field đủ tin cậy. Thử hạ ngưỡng hoặc đổi ngôn ngữ.',100,!aiPreviewV460.length);$('v460AiApply').style.display=aiPreviewV460.length?'':'none';$('v460AiApply85').style.display=aiPreviewV460.some(x=>x.aiConfidence>=85)?'':'none'}catch(e){console.error('V4.6 AI form',e);aiSetV460('AI không chạy được: '+(e?.message||e),0,true)}finally{aiBusyV460=false;$('v460AiRun').disabled=false}}
function aiApplyV460(minConf){const f=form(),p=page();if(!f||!p||!aiPreviewV460.length)return;const add=aiPreviewV460.filter(x=>Number(x.aiConfidence||0)>=Number(minConf||0));if(!add.length)return alert('Không có gợi ý đạt ngưỡng.');pushHistory();f.fields=Array.isArray(f.fields)?f.fields:[];for(const x0 of add){const x=clone(x0);if(f.legacy){x.customFieldV463=true;x.generatedFromLegacy=false;x.createdByFormManager=true;x.sourcePage=Number(p.sourcePage||pageNoV45(p)||0)}f.fields.push(x)}saveLocal();aiPreviewV460=[];renderAll();aiRenderListV460();$('v460AiApply').style.display='none';$('v460AiApply85').style.display='none';aiSetV460(`✓ Đã thêm ${add.length} field AI. Có thể Undo ngay nếu chưa phù hợp.`,100);status(`✓ AI đã thêm ${add.length} field trên trang ${pageIndex+1}.`)}
function aiClearFieldsV460(){const f=form(),p=page();if(!f||!p)return;const n=(f.fields||[]).filter(x=>x.pageId===p.id&&x.aiGenerated).length;if(!n)return alert('Trang này chưa có field do AI tạo.');if(!confirm(`Xóa ${n} field AI trên trang này? Field tạo/chỉnh tay sẽ giữ nguyên.`))return;pushHistory();f.fields=(f.fields||[]).filter(x=>!(x.pageId===p.id&&x.aiGenerated));aiPreviewV460=[];saveLocal();renderAll();aiSetV460(`✓ Đã xóa ${n} field AI.`,0)}

function renderAll(){renderList();renderPages();renderEditor();renderInspector();$('v440Undo').disabled=!history.length;$('v440Redo').disabled=!future.length;if($('v450Test'))$('v450Test').textContent=testMode?'✕ THOÁT TEST':'👁 TEST HIỂN THỊ';renderTestModeUiV462();renderPerfV45();renderZoomUi()}
function renderList(){const h=$('v440FormList');if(!h)return;h.innerHTML=(draft?.forms||[]).map(f=>`<button class="v440FormItem ${f.id===currentId?'active':''}" data-id="${esc(f.id)}"><div>${esc(f.name||f.code||f.id)} ${f.legacy?'<span class="v440Tag">HỆ THỐNG</span>':'<span class="v440Tag">MỚI</span>'}</div><small>${esc(f.code||f.id)} · ${(f.pages||[]).length} trang · ${(f.fields||[]).length} field</small></button>`).join('')||'<div class="v440Empty">Chưa có form.</div>';h.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{currentId=b.dataset.id;pageIndex=0;selectedKey='';selectedMany.clear();history=[];future=[];renderAll()})}
function renderPages(){const h=$('v440PageTabs'),f=form();if(!h)return;h.innerHTML=(f?.pages||[]).map((p,i)=>`<button class="v440Btn ${i===pageIndex?'active':''}" data-p="${i}">TRANG ${i+1}</button>`).join('');h.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{pageIndex=Number(b.dataset.p)||0;selectedKey='';selectedMany.clear();renderAll()})}
async function pageSrc(p){if(!p)return '';if(p.blobKey){const a=await assetGet(p.blobKey);if(a?.blob){const u=URL.createObjectURL(a.blob);objectUrls.push(u);return u}}return p.image||''}
function pageFields(){const f=form(),p=page();return (f?.fields||[]).filter(x=>String(x.pageId||'')===String(p?.id||''))}
async function renderEditor(){clearUrls();const ed=$('v440Editor'),f=form(),p=page();if(!ed)return;if(!f){ed.className='v440Empty';ed.innerHTML='Chọn biểu mẫu.';return}if(!p){ed.className='v440Empty';ed.innerHTML='Biểu mẫu chưa có trang. Bấm + TRANG.';return}const src=await pageSrc(p);ed.className='';if(!src){ed.innerHTML='<div class="v440Empty">Chưa có ảnh nền. Chọn TẢI ẢNH ở bảng bên phải.</div>';return}ed.innerHTML=`<div class="v440EditorViewport" id="v440EditorViewport"><div class="v440EditorWrap" id="v440Canvas"><img id="v440Bg" src="${esc(src)}" alt="Form background"><div class="v440Overlay" id="v440Overlay"></div></div></div>`;const img=$('v440Bg'),vp=$('v440EditorViewport'),wrap=$('v440Canvas');const ready=()=>{const natural=Number(p.width||img.naturalWidth||1241),base=Math.min(natural,Math.max(300,(vp?.clientWidth||900)-24),1000);wrap.dataset.baseWidth=String(base);const display=Math.round(base*editorZoom);wrap.style.width=display+'px';wrap.style.setProperty('--v451-page-scale',String(display/Math.max(1,natural)));drawBoxes();renderZoomUi()};img.onload=ready;if(img.complete)ready();vp?.addEventListener('dblclick',e=>{if(e.target.closest?.('.v440Box'))return;setEditorZoom(editorZoom>=1.75?1:2)})}
function testValueV45(fld){const key=fld.bind||fld.key;if(Object.prototype.hasOwnProperty.call(testValuesV462,key))return testValuesV462[key];const st=liveStateV45(),v=st?.[key];if(v!==undefined&&v!==null&&String(v)!=='')return v;if(fld.type==='checkbox')return true;if(fld.type==='date')return '2026-09-16';if(fld.type==='time')return '08:25';if(fld.type==='number')return '123';if(fld.type==='signature')return '';return fld.type==='textarea'?'NỘI DUNG TEST\nDÒNG 2':'TEST'}
function testHtmlV45(fld){const v=testValueV45(fld),fs=Math.max(7,Number(fld.fontSize||14)),al=String(fld.align||'left'),va=String(fld.valign||'middle');const just=al==='center'?'center':al==='right'?'flex-end':'flex-start',items=va==='top'?'flex-start':va==='bottom'?'flex-end':'center';if(fld.type==='signature'){if(typeof v==='string'&&v.startsWith('data:image/'))return `<div class="v450TestValue" style="justify-content:center;align-items:center"><img src="${esc(v)}" style="max-width:100%;max-height:100%;object-fit:contain"></div>`;return '<div class="v450TestValue" style="justify-content:center;align-items:center;color:#64748b">CHỮ KÝ</div>'}if(fld.type==='checkbox')return `<div class="v450TestValue" style="justify-content:center;align-items:center;font-size:calc(${fs}px * var(--v451-page-scale,1))">${v?'✓':''}</div>`;return `<div class="v450TestValue" style="justify-content:${just};align-items:${items};text-align:${esc(al)};font:700 calc(${fs}px * var(--v451-page-scale,1))/1.08 'Times New Roman';">${esc(v)}</div>`}
function testControlHtmlV462(fld){const v=testValueV45(fld),key=esc(fld.bind||fld.key),fs=Math.max(7,Number(fld.fontSize||14)),al=String(fld.align||'left'),common=`font-size:calc(${fs}px * var(--v451-page-scale,1));text-align:${esc(al)}`;if(fld.type==='checkbox')return `<input class="v462TestCheck" data-v462-test-bind="${key}" type="checkbox" ${v?'checked':''}>`;if(fld.type==='textarea')return `<textarea class="v462TestControl" data-v462-test-bind="${key}" style="${common};resize:none">${esc(v??'')}</textarea>`;if(fld.type==='select'){const opts=Array.isArray(fld.options)&&fld.options.length?fld.options:[v||'TEST','A','B'];return `<select class="v462TestControl" data-v462-test-bind="${key}" style="${common}">${opts.map(x=>`<option ${String(x)===String(v)?'selected':''}>${esc(x)}</option>`).join('')}</select>`}if(fld.type==='signature')return `<div class="v462TestStatic" style="align-items:center;justify-content:center;color:#64748b">${typeof v==='string'&&v.startsWith('data:image/')?`<img src="${esc(v)}" style="max-width:100%;max-height:100%;object-fit:contain">`:'CHỮ KÝ'}</div>`;if(fld.type==='computed'||fld.type==='static-text')return `<div class="v462TestStatic" style="align-items:center;justify-content:${al==='center'?'center':al==='right'?'flex-end':'flex-start'}">${esc(fld.type==='static-text'?(fld.text||fld.label||v):v)}</div>`;const typ=['number','time','date'].includes(fld.type)?fld.type:'text';return `<input class="v462TestControl" data-v462-test-bind="${key}" type="${typ}" value="${esc(v??'')}" style="${common}">`}
function wireTestControlsV462(ov){if(!testMode||testEditMode||!ov)return;ov.querySelectorAll('[data-v462-test-bind]').forEach(el=>{const key=el.dataset.v462TestBind;const save=()=>{testValuesV462[key]=el.type==='checkbox'?!!el.checked:el.value};el.addEventListener('input',save);el.addEventListener('change',save);el.addEventListener('pointerdown',e=>e.stopPropagation())})}
function renderTestModeUiV462(){const b=$('v462TestMode');if(!b)return;b.classList.toggle('show',testMode);b.classList.toggle('edit',testMode&&testEditMode);b.classList.toggle('interact',testMode&&!testEditMode);b.textContent=testEditMode?'🔓 TEST · CHỈNH VỊ TRÍ':'🔒 TEST · TƯƠNG TÁC FORM';b.title=testEditMode?'Kéo/resize field ngay khi đang xem dữ liệu test. Mũi tên = 1 px, Shift+mũi tên = 5 px.':'Khóa vị trí field để thử nhập/check/select bằng dữ liệu test riêng.'}
function toggleTestSubModeV462(){if(!testMode)return;testEditMode=!testEditMode;drawBoxes();renderInspector();renderTestModeUiV462();status(testEditMode?'TEST · CHỈNH VỊ TRÍ: kéo/resize/căn chữ trực tiếp trên dữ liệu đang hiển thị.':'TEST · TƯƠNG TÁC FORM: vị trí đã khóa, có thể nhập/check/select mà không ghi vào dữ liệu chuyến.')}
function toggleTestV45(){testMode=!testMode;if(testMode)testEditMode=true;drawBoxes();renderAll()}
function renderPerfV45(){const e=$('v450Perf');if(!e)return;let p=null;try{p=JSON.parse(localStorage.getItem('sags.v450.pdfPerf')||'null')}catch(_){}e.textContent=p?.totalMs?`PDF gần nhất: ${(p.totalMs/1000).toFixed(2)}s · render ${((p.renderMs||0)/1000).toFixed(2)}s · encode ${((p.encodeMs||0)/1000).toFixed(2)}s`:''}
function previewPdfV45(){const f=form(),p=page();if(!f||!p)return;if(f.legacy){const no=Number(p.sourcePage||pageNoV45(p));if(no&&typeof root.sagsV450PreviewPdfPage==='function')return root.sagsV450PreviewPdfPage(no)}return previewCustomPageV45(f,p)}
async function previewCustomPageV45(f,p){status('Đang dựng PDF preview…');try{const src=await pageSrc(p);if(!src)throw new Error('Trang chưa có ảnh nền.');const im=await new Promise((res,rej)=>{const x=new Image();x.onload=()=>res(x);x.onerror=rej;x.src=src}),c=document.createElement('canvas');c.width=Number(p.width||im.naturalWidth||1241);c.height=Number(p.height||im.naturalHeight||1755);const x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);for(const fld of (f.fields||[]).filter(z=>z.pageId===p.id)){const v=testValueV45(fld),px=Number(fld.x||0)*c.width,py=Number(fld.y||0)*c.height,pw=Number(fld.w||.1)*c.width,ph=Number(fld.h||.03)*c.height,al=String(fld.align||'left'),va=String(fld.valign||'middle');if(fld.type==='checkbox'){if(v){x.font=`900 ${Math.max(10,Number(fld.fontSize||14))}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#111';x.fillText('✓',px+pw/2,py+ph/2)}continue}if(fld.type==='signature')continue;x.save();x.beginPath();x.rect(px,py,pw,ph);x.clip();const fs=Math.max(7,Number(fld.fontSize||14));x.font=`700 ${fs}px 'Times New Roman'`;x.fillStyle='#003b8e';x.textAlign=al==='right'?'right':al==='center'?'center':'left';x.textBaseline='middle';const tx=al==='right'?px+pw-2:al==='center'?px+pw/2:px+2;const inset=Math.min(ph/2,Math.max(2,fs*.58)),ty=va==='top'?py+inset:va==='bottom'?py+ph-inset:py+ph/2;x.fillText(String(v??''),tx,ty);x.restore()}showCanvasPreviewV45(c,`${f.name||f.id} · Trang ${pageIndex+1}`);status('✓ PDF preview dùng cùng tọa độ + căn chữ của Form Manager.')}catch(e){status('Không preview được: '+(e?.message||e),true)}}
function showCanvasPreviewV45(c,title){let m=$('v450PreviewModal');if(!m){m=document.createElement('div');m.id='v450PreviewModal';m.style.cssText='position:fixed;inset:0;z-index:19000;background:#111c;display:none;padding:12px;overflow:auto';m.innerHTML='<div style="position:sticky;top:0;z-index:2;background:#fff;border-radius:10px;padding:8px;display:flex;gap:8px;align-items:center"><b id="v450PreviewTitle"></b><span style="flex:1"></span><button class="v440Btn" id="v450PreviewClose">ĐÓNG</button></div><div style="text-align:center;padding:10px"><img id="v450PreviewImg" style="max-width:min(96vw,1000px);height:auto;background:#fff"></div>';document.body.appendChild(m);$('v450PreviewClose').onclick=()=>m.style.display='none'}$('v450PreviewTitle').textContent=title;$('v450PreviewImg').src=c.toDataURL('image/jpeg',.9);m.style.display='block'}
function drawBoxes(){const ov=$('v440Overlay');if(!ov)return;ov.classList.toggle('v450TestMode',testMode);ov.classList.toggle('v462TestEdit',testMode&&testEditMode);ov.classList.toggle('v462TestInteract',testMode&&!testEditMode);ov.innerHTML='';for(const fld of pageFields()){const b=document.createElement('div');b.className='v440Box'+(fld.key===selectedKey?' sel':'')+(selectedMany.has(fld.key)?' multi':'')+(fld.aiGenerated?' ai':'');b.dataset.key=fld.key;b.style.left=(Number(fld.x||0)*100)+'%';b.style.top=(Number(fld.y||0)*100)+'%';b.style.width=(Number(fld.w||.12)*100)+'%';b.style.height=(Number(fld.h||.035)*100)+'%';b.innerHTML=`<span>${esc(fld.label||fld.key)}${fld.aiGenerated?` · AI ${Math.round(Number(fld.aiConfidence||0))}%`:''}</span>${testMode?(testEditMode?testHtmlV45(fld):testControlHtmlV462(fld)):''}<i class="v440Resize" data-resize="1"></i>`;ov.appendChild(b);bindBox(b,fld)}wireTestControlsV462(ov);for(const fld of aiPreviewV460){if(String(fld.pageId||'')!==String(page()?.id||''))continue;const b=document.createElement('div');b.className='v440Box ai-preview';b.style.left=(Number(fld.x||0)*100)+'%';b.style.top=(Number(fld.y||0)*100)+'%';b.style.width=(Number(fld.w||.12)*100)+'%';b.style.height=(Number(fld.h||.035)*100)+'%';b.innerHTML=`<span>AI ${Math.round(Number(fld.aiConfidence||0))}% · ${esc(fld.label||fld.aiText||fld.key)}</span>`;ov.appendChild(b)}}
function snap(v,axis){const p=page(),px=4,den=axis==='x'?Number(p?.width||1241):Number(p?.height||1755),step=Math.max(.0005,px/den);return Math.round(v/step)*step}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function bindBox(el,fld){el.onpointerdown=e=>{if(testMode&&!testEditMode)return;e.preventDefault();e.stopPropagation();if(e.shiftKey){if(selectedMany.has(fld.key))selectedMany.delete(fld.key);else selectedMany.add(fld.key);selectedKey=fld.key;drawBoxes();renderInspector();return}selectedKey=fld.key;if(!selectedMany.has(fld.key)){selectedMany.clear();selectedMany.add(fld.key)};pushHistory();const r=$('v440Overlay').getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ox=Number(fld.x||0),oy=Number(fld.y||0),ow=Number(fld.w||.12),oh=Number(fld.h||.035),resize=!!e.target.dataset.resize;el.setPointerCapture?.(e.pointerId);const move=ev=>{const dx=(ev.clientX-sx)/r.width,dy=(ev.clientY-sy)/r.height;if(resize){fld.w=clamp(snap(ow+dx,'x'),.008,1-ox);fld.h=clamp(snap(oh+dy,'y'),.008,1-oy)}else{fld.x=clamp(snap(ox+dx,'x'),0,1-ow);fld.y=clamp(snap(oy+dy,'y'),0,1-oh)}drawBoxes();renderInspector()};const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);saveLocal();renderList()};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});renderInspector()}}
function selectedFields(){const ks=selectedMany.size?[...selectedMany]:selectedKey?[selectedKey]:[];return pageFields().filter(x=>ks.includes(x.key))}
function renderInspector(){const h=$('v440Inspector'),f=form(),p=page();if(!h)return;if(!f){h.innerHTML='';return}const fld=(f.fields||[]).find(x=>x.key===selectedKey),testHint=testMode?`<div class="v462TestHint ${testEditMode?'edit':'interact'}">${testEditMode?'🔓 LIVE TEST/EDIT: dữ liệu TEST đang hiển thị nhưng field vẫn kéo, resize và căn chữ được ngay.':'🔒 TEST TƯƠNG TÁC: vị trí field đang khóa; nhập/check/select chỉ thay dữ liệu test tạm.'}</div>`:'';h.innerHTML=`${testHint}<div class="v440Field"><label>MÃ FORM</label><input id="v440FormId" value="${esc(f.id)}" ${f.legacy?'disabled':''}></div><div class="v440Field"><label>TÊN BIỂU MẪU</label><input id="v440FormName" value="${esc(f.name||'')}"></div><div class="v440Field"><label>MÃ HIỂN THỊ</label><input id="v440FormCode" value="${esc(f.code||'')}"></div><hr><b>ẢNH NỀN · TRANG ${pageIndex+1}</b><div class="v440Row"><button class="v440Btn primary" id="v440UploadBtn">TẢI ẢNH / PDF</button><button class="v440Btn" id="v440ExistingBtn">CHỌN ẢNH ĐÃ CÓ</button></div><input id="v440Upload" type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" style="display:none"><div style="font-size:10px;color:#075985;background:#eff8ff;border:1px solid #bae6fd;border-radius:7px;padding:6px 8px;margin:5px 0">PDF được tự tách từng trang thành ảnh nền chuẩn hệ thống. PDF 1 trang thay trang đang chọn; PDF nhiều trang thay các trang kế tiếp. Form mới có thể tự thêm trang; form hệ thống giữ nguyên số trang.</div><select id="v440Existing" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:7px"></select><div style="font-size:10px;color:#667085;margin-top:4px">${p?`${Number(p.width||0)}×${Number(p.height||0)} · ${esc(p.sha256?String(p.sha256).slice(0,12)+'…':'chưa hash')}`:'Chưa có trang'}</div><div style="margin:8px 0;padding:7px;border-radius:8px;background:#ecfdf3;color:#067647;font-weight:800">Layout này dùng trực tiếp cho màn hình + PDF. Zoom chỉ phóng vùng chỉnh, không làm đổi tọa độ.</div>${f.legacy?`<div style="margin:6px 0;padding:7px;border-radius:8px;background:#fff7ed;color:#9a3412;font-size:10px;font-weight:900">FORM HỆ THỐNG: được phép thêm FIELD mới. Field mới/AI là bản nháp trên máy AD cho tới khi bạn XUẤT forms.registry.json và đưa lên GitHub.</div>`:''}<hr><div class="v440Row"><b>FIELD</b><button class="v440Btn primary" id="v440AddField">+ THÊM FIELD</button>${fld?'<button class="v440Btn" id="v440Dup">NHÂN BẢN</button><button class="v440Btn danger" id="v440DelField">XÓA</button>':''}</div>${fld?`<div class="v440Field"><label>KEY</label><input id="v440FldKey" value="${esc(fld.key)}"></div><div class="v440Field"><label>LABEL</label><input id="v440FldLabel" value="${esc(fld.label||'')}"></div>${fld.aiGenerated?`<div style="padding:6px 8px;border-radius:8px;background:#eef8ff;color:#075985;font-size:10px;font-weight:800">🤖 AI ${Math.round(Number(fld.aiConfidence||0))}% · OCR: ${esc(fld.aiText||'')}</div>`:''}${f.legacy&&fld.customFieldV463?`<div style="padding:6px 8px;border-radius:8px;background:#fff7ed;color:#9a3412;font-size:10px;font-weight:900">＋ FIELD MỚI · FORM MANAGER CUSTOM · bind: ${esc(fld.bind||fld.key)}</div>`:''}<div class="v440Grid2"><div class="v440Field"><label>TYPE</label><select id="v440FldType">${['text','number','time','date','checkbox','select','textarea','signature','computed','static-text'].map(t=>`<option ${t===fld.type?'selected':''}>${t}</option>`).join('')}</select></div><div class="v440Field"><label>BIND → STATE</label><input id="v440FldBind" value="${esc(fld.bind||fld.key)}"></div></div><div class="v440Grid4">${['x','y','w','h'].map(k=>`<div class="v440Field"><label>${k.toUpperCase()} %</label><input data-geom="${k}" value="${(Number(fld[k]||0)*100).toFixed(3)}"></div>`).join('')}</div><div class="v440Field"><label>FONT PX</label><input id="v440FldFont" type="number" min="6" max="80" value="${Number(fld.fontSize||14)}"></div><div class="v461TextAlignBox"><div class="v461TextAlignTitle">📝 CĂN CHỮ TRONG FIELD</div><div class="v461TextAlignRow"><span>NGANG</span><button class="v461AlignBtn ${String(fld.align||'left')==='left'?'active':''}" data-text-align="left">⬅ TRÁI</button><button class="v461AlignBtn ${String(fld.align||'left')==='center'?'active':''}" data-text-align="center">↔ GIỮA</button><button class="v461AlignBtn ${String(fld.align||'left')==='right'?'active':''}" data-text-align="right">PHẢI ➡</button></div><div class="v461TextAlignRow"><span>DỌC</span><button class="v461AlignBtn ${String(fld.valign||'middle')==='top'?'active':''}" data-text-valign="top">↑ TRÊN</button><button class="v461AlignBtn ${String(fld.valign||'middle')==='middle'?'active':''}" data-text-valign="middle">↕ GIỮA</button><button class="v461AlignBtn ${String(fld.valign||'middle')==='bottom'?'active':''}" data-text-valign="bottom">↓ DƯỚI</button></div><button class="v461CenterBoth" id="v461CenterBoth">◎ CĂN GIỮA Ô · NGANG + DỌC</button><div class="v461AlignHint">Căn chữ nằm BÊN TRONG field. Nếu đang chọn nhiều field, nút này áp dụng cho toàn bộ field đã chọn.</div><div class="v462KeyboardHelp">⌨ Trong EDIT/LIVE TEST: phím mũi tên dịch 1 px · Shift + mũi tên dịch 5 px.</div></div><div class="v461FieldPositionTitle">CĂN VỊ TRÍ NHIỀU FIELD</div><div class="v440Row"><button class="v440Btn" data-nudge="-1,0">← 1px</button><button class="v440Btn" data-nudge="1,0">1px →</button><button class="v440Btn" data-nudge="0,-1">↑ 1px</button><button class="v440Btn" data-nudge="0,1">↓ 1px</button></div><div class="v440Row"><button class="v440Btn" data-align="left">CĂN TRÁI</button><button class="v440Btn" data-align="right">CĂN PHẢI</button><button class="v440Btn" data-align="top">CĂN TRÊN</button><button class="v440Btn" data-align="bottom">CĂN DƯỚI</button><button class="v440Btn" data-align="midX">GIỮA X</button><button class="v440Btn" data-align="midY">GIỮA Y</button><button class="v440Btn" data-align="sameW">CÙNG RỘNG</button><button class="v440Btn" data-align="sameH">CÙNG CAO</button><button class="v440Btn" data-align="distX">DÀN NGANG</button><button class="v440Btn" data-align="distY">DÀN DỌC</button></div>`:'<div style="font-size:11px;color:#667085">Chọn field trên ảnh hoặc bấm THÊM FIELD. Shift+click để chọn nhiều field rồi căn hàng/cột.</div>'}<hr><div class="v440Row"><button class="v440Btn green" id="v440Save">💾 LƯU NHÁP TRÊN MÁY</button>${!f.legacy?'<button class="v440Btn danger" id="v440DeleteForm">XÓA FORM</button>':''}</div>`;
wireInspector(f,p,fld)}
async function existingOptions(){const s=new Set();for(const f of published.forms||[])for(const p of f.pages||[])if(p.image)s.add(p.image);try{const r=await fetch('./asset-manifest.json');if(r.ok){const m=await r.json();Object.keys(m.assets||{}).filter(x=>/\.(png|jpe?g|webp)$/i.test(x)).forEach(x=>s.add(x))}}catch(_){}return [...s].sort()}
function wireInspector(f,p,fld){$('v440FormName').onchange=e=>{pushHistory();f.name=e.target.value;saveLocal();renderList()};$('v440FormCode').onchange=e=>{pushHistory();f.code=e.target.value;saveLocal();renderList()};if($('v440FormId')&&!f.legacy)$('v440FormId').onchange=e=>{const id=sid(e.target.value);if(!id||draft.forms.some(x=>x!==f&&x.id===id)){e.target.value=f.id;return alert('Mã form không hợp lệ hoặc đã tồn tại.')}pushHistory();f.id=id;currentId=id;saveLocal();renderAll()};
const up=$('v440Upload');$('v440UploadBtn').onclick=()=>{up.value='';up.click()};up.onchange=async()=>{const file=up.files?.[0];if(!file||!p)return;const isPdf=(file.type==='application/pdf'||/\.pdf$/i.test(file.name||''));try{if(isPdf){await importPdfV464(file,f,pageIndex);return}status('Đang đọc/tối ưu ảnh…');pushHistory();const x=await optimizeImage(file);await storePageImageV464(f,p,x,file.name,0);p.sourcePdfName='';delete p.sourcePdfPage;saveLocal();status(`✓ Ảnh ${Math.round(x.blob.size/1024)} KB · ${x.meta.width}×${x.meta.height}`);renderAll()}catch(e){status((isPdf?'Không chuyển được PDF: ':'Không đọc được ảnh: ')+(e?.message||e),true)}};
existingOptions().then(a=>{const sel=$('v440Existing');if(sel)sel.innerHTML='<option value="">— chọn ảnh đã có —</option>'+a.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')});$('v440ExistingBtn').onclick=async()=>{const path=$('v440Existing').value;if(!path||!p)return alert('Chọn ảnh trong danh sách trước.');pushHistory();if(p.blobKey)await assetDel(p.blobKey);p.blobKey='';p.image=path;try{const im=new Image();im.onload=()=>{p.width=im.naturalWidth;p.height=im.naturalHeight;saveLocal();renderAll()};im.src=path}catch(_){}saveLocal();renderAll()};
$('v440AddField').onclick=()=>addField();if(!fld){$('v440Save').onclick=()=>{saveLocal();status('✓ Đã lưu nháp trên thiết bị.')};if($('v440DeleteForm'))$('v440DeleteForm').onclick=deleteForm;return}
$('v440FldKey').onchange=e=>{const k=fieldKey(e.target.value);if(!k||f.fields.some(x=>x!==fld&&x.key===k)){e.target.value=fld.key;return alert('KEY trống hoặc đã tồn tại.')}pushHistory();selectedMany.delete(fld.key);fld.key=k;selectedKey=k;selectedMany.add(k);if(!fld.bind)fld.bind=k;saveLocal();renderAll()};$('v440FldLabel').onchange=e=>{pushHistory();fld.label=e.target.value;saveLocal();drawBoxes()};$('v440FldType').onchange=e=>{pushHistory();fld.type=e.target.value;saveLocal()};$('v440FldBind').onchange=e=>{pushHistory();fld.bind=fieldKey(e.target.value)||fld.key;saveLocal()};$('v440FldFont').onchange=e=>{pushHistory();fld.fontSize=Math.max(6,Math.min(80,Number(e.target.value)||14));saveLocal();drawBoxes()};const textTargets=()=>{const a=selectedFields();return a.length?a:[fld]};document.querySelectorAll('#v440Inspector [data-text-align]').forEach(b=>b.onclick=()=>{pushHistory();for(const x of textTargets())x.align=b.dataset.textAlign;saveLocal();drawBoxes();renderInspector()});document.querySelectorAll('#v440Inspector [data-text-valign]').forEach(b=>b.onclick=()=>{pushHistory();for(const x of textTargets())x.valign=b.dataset.textValign;saveLocal();drawBoxes();renderInspector()});$('v461CenterBoth').onclick=()=>{pushHistory();for(const x of textTargets()){x.align='center';x.valign='middle'}saveLocal();drawBoxes();renderInspector()};document.querySelectorAll('#v440Inspector [data-geom]').forEach(i=>i.onchange=()=>{pushHistory();const k=i.dataset.geom,v=Number(i.value)/100;if(Number.isFinite(v))fld[k]=clamp(v,(k==='w'||k==='h')?0.005:0,1);saveLocal();drawBoxes()});
$('v440Dup').onclick=()=>duplicateField(fld);$('v440DelField').onclick=()=>deleteField(fld);document.querySelectorAll('#v440Inspector [data-nudge]').forEach(b=>b.onclick=()=>{const [dx,dy]=b.dataset.nudge.split(',').map(Number);nudge(dx,dy)});document.querySelectorAll('#v440Inspector [data-align]').forEach(b=>b.onclick=()=>alignMany(b.dataset.align));$('v440Save').onclick=()=>{saveLocal();status('✓ Đã lưu nháp trên thiết bị.')};if($('v440DeleteForm'))$('v440DeleteForm').onclick=deleteForm}
function createForm(){const name=prompt('Tên biểu mẫu mới, ví dụ FSAGS 60.1:','');if(!name)return;let id=sid(name);if(!id)id='form-'+Date.now();let base=id,n=2;while((draft?.forms||[]).some(x=>x.id===id))id=base+'-'+n++;const f={id,code:name,name,legacy:false,engine:'generic-v440',pages:[],fields:[],createdAtMs:Date.now(),updatedAtMs:Date.now()};draft.forms.push(f);currentId=id;pageIndex=0;history=[];future=[];saveLocal();addPage(false);renderAll()}
function deleteForm(){const f=form();if(!f||f.legacy)return;if(!confirm(`Xóa nháp biểu mẫu ${f.name||f.id} trên thiết bị này?`))return;(f.pages||[]).forEach(p=>{if(p.blobKey)assetDel(p.blobKey)});draft.forms=draft.forms.filter(x=>x!==f);currentId=draft.forms[0]?.id||'';pageIndex=0;saveLocal();renderAll()}
function addPage(push=true){const f=form();if(!f)return;if(push)pushHistory();const id='p'+String((f.pages?.length||0)+1);f.pages=f.pages||[];f.pages.push({id,image:'',blobKey:'',width:1241,height:1755,sha256:''});pageIndex=f.pages.length-1;saveLocal();renderAll()}
function deletePage(){const f=form(),p=page();if(!f||!p)return;if(f.legacy)return alert('Trang của form LEGACY không xóa trong Form Manager mới.');if(!confirm('Xóa trang này và các field trên trang?'))return;pushHistory();if(p.blobKey)assetDel(p.blobKey);f.fields=(f.fields||[]).filter(x=>x.pageId!==p.id);f.pages.splice(pageIndex,1);pageIndex=Math.max(0,pageIndex-1);saveLocal();renderAll()}
function addField(){const f=form(),p=page();if(!f||!p)return alert('Cần có trang trước.');const key=fieldKey(prompt(f.legacy?'KEY field mới trên FORM HỆ THỐNG (ví dụ extraRemark):':'KEY field, ví dụ std hoặc cargoStart:','field'+((f.fields||[]).length+1)));if(!key)return;if(f.fields.some(x=>x.key===key))return alert('KEY đã tồn tại.');pushHistory();const fld={key,label:key,type:'text',bind:key,pageId:p.id,sourcePage:Number(p.sourcePage||pageNoV45(p)||0),x:.35,y:.35,w:.20,h:.035,fontSize:14,fontWeight:700,align:'left',valign:'middle',customFieldV463:!!f.legacy,generatedFromLegacy:false,createdByFormManager:true};f.fields=f.fields||[];f.fields.push(fld);selectedKey=key;selectedMany=new Set([key]);saveLocal();renderAll();status(f.legacy?'✓ Đã thêm FIELD MỚI vào form hệ thống. Đây là bản nháp trên máy AD; xuất forms.registry.json để phát hành.':'✓ Đã thêm field mới.')}
function duplicateField(fld){const f=form();if(!f||!fld)return;pushHistory();let base=fld.key+'_copy',k=base,n=2;while(f.fields.some(x=>x.key===k))k=base+n++;const x={...clone(fld),key:k,bind:k,label:(fld.label||fld.key)+' copy',x:clamp(Number(fld.x||0)+.012,0,.95),y:clamp(Number(fld.y||0)+.012,0,.95)};if(f.legacy){x.customFieldV463=true;x.generatedFromLegacy=false;x.createdByFormManager=true;x.sourcePage=Number(page()?.sourcePage||pageNoV45(page())||x.sourcePage||0)}f.fields.push(x);selectedKey=k;selectedMany=new Set([k]);saveLocal();renderAll()}
function deleteField(fld){const f=form();if(!f||!fld)return;if(!confirm('Xóa field '+fld.key+'?'))return;pushHistory();f.fields=f.fields.filter(x=>x!==fld);selectedKey='';selectedMany.clear();saveLocal();renderAll()}
function nudge(dx,dy){const p=page(),arr=selectedFields();if(!arr.length)return;pushHistory();for(const x of arr){x.x=clamp(Number(x.x||0)+dx/Number(p.width||1241),0,1-Number(x.w||0));x.y=clamp(Number(x.y||0)+dy/Number(p.height||1755),0,1-Number(x.h||0))}saveLocal();drawBoxes();renderInspector()}
function alignMany(kind){const a=selectedFields();if(a.length<2)return alert('Shift+click để chọn ít nhất 2 field.');pushHistory();if(kind==='left'){const v=Math.min(...a.map(x=>Number(x.x||0)));a.forEach(x=>x.x=v)}if(kind==='right'){const v=Math.max(...a.map(x=>Number(x.x||0)+Number(x.w||0)));a.forEach(x=>x.x=clamp(v-Number(x.w||0),0,1-Number(x.w||0)))}if(kind==='top'){const v=Math.min(...a.map(x=>Number(x.y||0)));a.forEach(x=>x.y=v)}if(kind==='bottom'){const v=Math.max(...a.map(x=>Number(x.y||0)+Number(x.h||0)));a.forEach(x=>x.y=clamp(v-Number(x.h||0),0,1-Number(x.h||0)))}if(kind==='midX'){const v=a.reduce((s,x)=>s+Number(x.x||0)+Number(x.w||0)/2,0)/a.length;a.forEach(x=>x.x=clamp(v-Number(x.w||0)/2,0,1-Number(x.w||0)))}if(kind==='midY'){const v=a.reduce((s,x)=>s+Number(x.y||0)+Number(x.h||0)/2,0)/a.length;a.forEach(x=>x.y=clamp(v-Number(x.h||0)/2,0,1-Number(x.h||0)))}if(kind==='sameW'){const v=Number(a[0].w||.1);a.forEach(x=>x.w=Math.min(v,1-Number(x.x||0)))}if(kind==='sameH'){const v=Number(a[0].h||.03);a.forEach(x=>x.h=Math.min(v,1-Number(x.y||0)))}if(kind==='distX'&&a.length>2){const q=[...a].sort((x,y)=>Number(x.x)-Number(y.x)),start=Number(q[0].x),end=Number(q.at(-1).x),step=(end-start)/(q.length-1);q.forEach((x,i)=>x.x=clamp(start+step*i,0,1-Number(x.w||0)))}if(kind==='distY'&&a.length>2){const q=[...a].sort((x,y)=>Number(x.y)-Number(y.y)),start=Number(q[0].y),end=Number(q.at(-1).y),step=(end-start)/(q.length-1);q.forEach((x,i)=>x.y=clamp(start+step*i,0,1-Number(x.h||0)))}saveLocal();drawBoxes();renderInspector()}
function u16(dv,o,v){dv.setUint16(o,v,true)}function u32(dv,o,v){dv.setUint32(o,v>>>0,true)}
const crcTable=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();function crc32(a){let c=0xffffffff;for(const b of a)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function enc(s){return new TextEncoder().encode(s)}async function bytes(x){if(x instanceof Uint8Array)return x;if(x instanceof Blob)return new Uint8Array(await x.arrayBuffer());return enc(String(x))}
async function makeZip(files){let offset=0;const chunks=[],cent=[];for(const f of files){const name=enc(f.name),data=await bytes(f.data),crc=crc32(data),lh=new Uint8Array(30+name.length),dv=new DataView(lh.buffer);u32(dv,0,0x04034b50);u16(dv,4,20);u16(dv,6,0x800);u16(dv,8,0);u16(dv,10,0);u16(dv,12,0);u32(dv,14,crc);u32(dv,18,data.length);u32(dv,22,data.length);u16(dv,26,name.length);u16(dv,28,0);lh.set(name,30);chunks.push(lh,data);const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x800);u16(cv,10,0);u16(cv,12,0);u16(cv,14,0);u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,name.length);u16(cv,30,0);u16(cv,32,0);u16(cv,34,0);u16(cv,36,0);u32(cv,38,0);u32(cv,42,offset);ch.set(name,46);cent.push(ch);offset+=lh.length+data.length}const csize=cent.reduce((s,x)=>s+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);u32(ev,0,0x06054b50);u16(ev,4,0);u16(ev,6,0);u16(ev,8,files.length);u16(ev,10,files.length);u32(ev,12,csize);u32(ev,16,offset);u16(ev,20,0);return new Blob([...chunks,...cent,end],{type:'application/zip'})}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},3000)}
async function pageBlob(p){if(p.blobKey){const a=await assetGet(p.blobKey);if(a?.blob)return {blob:a.blob,ext:p.ext||(/jpeg/.test(a.type)?'jpg':/webp/.test(a.type)?'webp':'png')}}if(p.image){const rr=await fetch(p.image);if(rr.ok){const b=await rr.blob(),ext=(p.image.split('.').pop()||'png').split('?')[0];return {blob:b,ext}}}return null}
async function exportCurrent(){const f=form();if(!f)return;status('Đang đóng gói form…');try{const out=clone(f),files=[];for(let i=0;i<(f.pages||[]).length;i++){const p=f.pages[i],x=await pageBlob(p);if(!x)throw new Error('Trang '+(i+1)+' chưa có ảnh.');const name=`page-${String(i+1).padStart(2,'0')}.${x.ext}`;files.push({name,data:x.blob});out.pages[i].image=name;delete out.pages[i].blobKey;out.pages[i].sha256=await sha256(x.blob);out.pages[i].bytes=x.blob.size}out.schema=2;out.engine='form-manager-v464';out.exportedAt=new Date().toISOString();files.unshift({name:'form.json',data:JSON.stringify(out,null,2)+'\n'});files.push({name:'README.txt',data:'E-REPORT FORM PACKAGE V4.7.1 PDF BACKGROUND IMPORT\nUpload page images to forms/'+f.id+'/ and add the form.json metadata to forms.registry.json. PDF nguồn đã được chuyển thành ảnh page-XX.png/webp khi xuất gói; runtime không cần PDF.js để chạy form.\nRuntime JS does not need a new per-form file.\n'});download(await makeZip(files),`${f.id}-ereport-form.zip`);status('✓ Đã xuất gói ZIP: form.json + ảnh riêng, không nhúng base64.')}catch(e){status('Không xuất được: '+(e?.message||e),true)}}
async function exportRegistry(){const out=clone(draft);for(const f of out.forms||[]){for(let i=0;i<(f.pages||[]).length;i++){const p=f.pages[i];if(p.blobKey){p.image=`./forms/${f.id}/page-${String(i+1).padStart(2,'0')}.${p.ext||'png'}`;delete p.blobKey}}}out.schema=2;out.version='V4.7.1';out.build=BUILD;out.updatedAt=new Date().toISOString();download(new Blob([JSON.stringify(out,null,2)+'\n'],{type:'application/json'}),'forms.registry.json');status('✓ Đã xuất forms.registry.json · layout duy nhất cho màn hình + PDF.')} 
// ---------- generic runtime: no new JS per form ----------
async function publishedCustomForms(){await loadPublished();return (published.forms||[]).filter(f=>!f.legacy)}
function ensureRuntime(){ensureStyle();if($('v440CustomRuntime'))return;const m=document.createElement('div');m.id='v440CustomRuntime';m.className='v440Runtime';m.innerHTML='<div class="v440RuntimeTop"><b id="v440RuntimeTitle">BIỂU MẪU</b><span style="flex:1"></span><button class="v440Btn" id="v440RuntimePrint">IN / PDF</button><button class="v440Btn" id="v440RuntimeClose">ĐÓNG</button></div><div id="v440RuntimeBody"></div>';document.body.appendChild(m);$('v440RuntimeClose').onclick=()=>m.classList.remove('show');$('v440RuntimePrint').onclick=()=>{document.body.classList.add('v440Printing');setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove('v440Printing'),200)},40)}}
function stateObj(){try{return root.state&&typeof root.state==='object'?root.state:(typeof state!=='undefined'&&state&&typeof state==='object'?state:(root.__v440TestState||(root.__v440TestState={})))}catch(_){return root.__v440TestState||(root.__v440TestState={})}}
function persistState(){try{if(typeof root.persist==='function')root.persist();else if(typeof persist==='function')persist()}catch(_){}}
function runtimeControl(fld,val){const k=esc(fld.bind||fld.key),va=String(fld.valign||'middle'),style=`font-size:${Number(fld.fontSize||14)}px;text-align:${esc(fld.align||'left')}`,flexStyle=`display:flex;align-items:${va==='top'?'flex-start':va==='bottom'?'flex-end':'center'};justify-content:${String(fld.align||'left')==='center'?'center':String(fld.align||'left')==='right'?'flex-end':'flex-start'};`;if(fld.type==='checkbox')return `<input data-v440-bind="${k}" type="checkbox" ${val?'checked':''}>`;if(fld.type==='textarea')return `<textarea data-v440-bind="${k}" style="${style}">${esc(val||'')}</textarea>`;if(fld.type==='select')return `<select data-v440-bind="${k}" style="${style}">${(fld.options||[]).map(x=>`<option ${String(x)===String(val)?'selected':''}>${esc(x)}</option>`).join('')}</select>`;if(fld.type==='signature')return `<button data-v440-sign="${k}" style="${style}">${val?'✓ ĐÃ KÝ':'KÝ'}</button>`;if(fld.type==='static-text')return `<div style="${style};${flexStyle};width:100%;height:100%;overflow:hidden">${esc(fld.text||fld.label||'')}</div>`;return `<input data-v440-bind="${k}" type="${['number','time','date'].includes(fld.type)?fld.type:'text'}" value="${esc(val??'')}" style="${style}">`}
async function openCustomForm(id,sourceRegistry=null){ensureRuntime();const reg=sourceRegistry||await loadPublished(),f=(reg.forms||[]).find(x=>x.id===id);if(!f)return alert('Không tìm thấy biểu mẫu '+id);$('v440RuntimeTitle').textContent=f.name||f.code||f.id;const st=stateObj(),body=$('v440RuntimeBody');body.innerHTML=(f.pages||[]).map((p,i)=>`<div class="v440RuntimePage" data-page="${esc(p.id)}"><img src="${esc(p.image||'')}" alt="Trang ${i+1}">${(f.fields||[]).filter(x=>x.pageId===p.id).map(x=>`<div class="v440RuntimeField" style="left:${Number(x.x||0)*100}%;top:${Number(x.y||0)*100}%;width:${Number(x.w||.1)*100}%;height:${Number(x.h||.03)*100}%">${runtimeControl(x,st[x.bind||x.key])}</div>`).join('')}</div>`).join('');body.querySelectorAll('[data-v440-bind]').forEach(e=>{const key=e.dataset.v440Bind,fn=()=>{st[key]=e.type==='checkbox'?!!e.checked:e.value;persistState()};e.addEventListener('change',fn);if(e.tagName==='TEXTAREA'||e.type==='text'||e.type==='number'||e.type==='time'||e.type==='date')e.addEventListener('input',fn)});body.querySelectorAll('[data-v440-sign]').forEach(b=>b.onclick=()=>{const key=b.dataset.v440Sign;try{if(typeof root.openSignature==='function')root.openSignature({key,label:key});else if(typeof openSignature==='function')openSignature({key,label:key});else alert('Module chữ ký chưa sẵn sàng.')}catch(e){alert('Không mở được chữ ký: '+(e?.message||e))}});$('v440CustomRuntime').classList.add('show')}
root.sagsV440OpenCustomForm=openCustomForm;
async function customPicker(){const forms=await publishedCustomForms();if(!forms.length)return alert('Chưa có biểu mẫu CUSTOM trong forms.registry.json. AD có thể tạo bằng QUẢN LÝ / THÊM BIỂU MẪU.');const id=prompt('Chọn mã biểu mẫu:\n'+forms.map((f,i)=>`${i+1}. ${f.id} · ${f.name||f.code}`).join('\n'),forms[0].id);if(id)openCustomForm(String(id).trim())}
root.sagsV440OpenCustomFormPicker=customPicker;
async function injectRuntimeButton(){await loadPublished();const forms=(published.forms||[]).filter(f=>!f.legacy),bar=document.querySelector('.toolbar-row.main-actions');if(!bar)return;let b=$('roleBtnCustomForms');if(!forms.length){if(b)b.style.display='none';return}if(!b){b=document.createElement('button');b.id='roleBtnCustomForms';b.textContent='BIỂU MẪU+';b.onclick=customPicker;bar.appendChild(b)}b.style.display=''}
async function bootV45Layout(){await loadPublished();mergeRegistry();syncLegacyToLive(true);await injectRuntimeButton()}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{bootV45Layout();},350),{once:true});else setTimeout(()=>bootV45Layout(),350);root.addEventListener('pageshow',()=>setTimeout(()=>{mergeRegistry();syncLegacyToLive(true);injectRuntimeButton()},300),{passive:true});root.sagsV450GetFormRegistry=()=>clone(draft||published);root.sagsV450ApplyLayout=()=>syncLegacyToLive(true);
})(typeof window!=='undefined'?window:globalThis);
/* ===== END V4.4.0 FORM MANAGER ===== */


/* ===== V4.5.1 TEST · DIRECT CANVAS FAST PDF RENDERER =====
   Form Manager is the single geometry authority. Native draw() still produces the
   exact special-case text layout, but PDF export NO LONGER serializes/rasterizes SVG.
   Text/foreignObject/check/signature are painted directly to Canvas. */
(function(root){
'use strict';
const BUILD='V4.6.2-LIVE-TEST-EDIT';if(root.__SAGS_V450_FAST_PDF===BUILD)return;root.__SAGS_V450_FAST_PDF=BUILD;
const perf=()=>root.performance?.now?.()??Date.now(),sigCache=new Map();
function S(v){return String(v??'')}
function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
function globalFields(){try{return (typeof fields!=='undefined'&&Array.isArray(fields))?fields:[]}catch(_){return []}}
function stateObj(){try{return (typeof state!=='undefined'&&state&&typeof state==='object')?state:(root.state||{})}catch(_){return root.state||{}}}
function baseW(){try{return Number(BASE_W)||1241}catch(_){return 1241}}function baseH(){try{return Number(BASE_H)||1755}catch(_){return 1755}}
function colorForText(el){const c=S(el.getAttribute('fill'));if(c&&c!=='currentColor')return c;const cls=S(el.getAttribute('class'));if(/tick/.test(cls))return '#111';if(/value|manual-value|time-value/.test(cls)){try{return String(ENTRY_COLOR||'#0057b8')}catch(_){return '#0057b8'}}return '#111'}
function firstNumAttr(el,name,d=0){return num(S(el.getAttribute(name)).split(/[ ,]+/)[0],d)}
function fontForText(el,scaleY=1){const cls=S(el.getAttribute('class')),fs=Math.max(5,firstNumAttr(el,'font-size',parseFloat(el.style?.fontSize)||16)*scaleY),weight=S(el.getAttribute('font-weight')||el.style?.fontWeight||(cls.includes('tick')?'900':'700')),style=S(el.getAttribute('font-style')||el.style?.fontStyle||'normal'),family=S(el.getAttribute('font-family')||el.style?.fontFamily||(cls.includes('tick')?'Arial':'Times New Roman'));return `${style} ${weight} ${fs}px ${family}`}
function anchorAlign(el){const a=S(el.getAttribute('text-anchor'));return a==='middle'?'center':a==='end'?'right':'left'}
function drawScaledText(ctx,text,x,y,targetWidth){if(!text)return;const mw=ctx.measureText(text).width;if(targetWidth>0&&mw>0&&Math.abs(mw-targetWidth)>1){const r=Math.max(.25,Math.min(4,targetWidth/mw));ctx.save();ctx.translate(x,y);ctx.scale(r,1);ctx.fillText(text,0,0);ctx.restore()}else ctx.fillText(text,x,y)}
function drawText(ctx,el,sx,sy){if(el.style?.display==='none'||el.getAttribute('data-sags-dedup-hidden')==='1')return;const text=S(el.textContent);if(!text)return;let x=firstNumAttr(el,'x')*sx,y=firstNumAttr(el,'y')*sy;ctx.save();ctx.font=fontForText(el,sy);ctx.fillStyle=colorForText(el);ctx.textAlign=anchorAlign(el);const db=S(el.getAttribute('dominant-baseline'));ctx.textBaseline=db==='middle'?'middle':db==='hanging'?'top':'alphabetic';const target=num(el.getAttribute('textLength'))*sx;drawScaledText(ctx,text,x,y,target);ctx.restore()}
function wrapCanvas(ctx,text,maxW){const out=[];for(const para of S(text).replace(/\r\n/g,'\n').split('\n')){if(!para){out.push('');continue}const words=para.split(/\s+/),line=[];for(const w of words){const test=[...line,w].join(' ');if(line.length&&ctx.measureText(test).width>maxW){out.push(line.join(' '));line.length=0}line.push(w)}if(line.length)out.push(line.join(' '))}return out}
function drawForeign(ctx,fo,sx,sy){if(fo.style?.display==='none')return;const d=fo.firstElementChild,text=S(d?.textContent);if(!text)return;const x=firstNumAttr(fo,'x')*sx,y=firstNumAttr(fo,'y')*sy,w=firstNumAttr(fo,'width')*sx,h=firstNumAttr(fo,'height')*sy,fs=Math.max(6,(parseFloat(d?.style?.fontSize)||15)*sy),weight=S(d?.style?.fontWeight||'700'),style=S(d?.style?.fontStyle||'normal'),family="Times New Roman",align=S(d?.style?.textAlign||'left');let lh=parseFloat(d?.style?.lineHeight);if(!Number.isFinite(lh))lh=fs*1.15;else if(!S(d?.style?.lineHeight).endsWith('px')&&lh<=4)lh*=fs;else lh*=sy;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.font=`${style} ${weight} ${fs}px '${family}'`;try{ctx.fillStyle=d?.style?.color||ENTRY_COLOR||'#0057b8'}catch(_){ctx.fillStyle='#0057b8'}ctx.textAlign=align==='center'?'center':align==='right'?'right':'left';ctx.textBaseline='alphabetic';const lines=wrapCanvas(ctx,text,Math.max(8,w-6)),max=Math.max(1,Math.floor(h/Math.max(lh,1))),tx=align==='center'?x+w/2:align==='right'?x+w-3:x+3;lines.slice(0,max).forEach((line,i)=>ctx.fillText(line,tx,y+fs*.86+i*lh));ctx.restore()}
function drawDynamicLines(ctx,svg,sx,sy){for(const el of svg.querySelectorAll('line')){if(el.style?.display==='none')continue;const x1=firstNumAttr(el,'x1')*sx,y1=firstNumAttr(el,'y1')*sy,x2=firstNumAttr(el,'x2')*sx,y2=firstNumAttr(el,'y2')*sy;ctx.save();ctx.strokeStyle=S(el.getAttribute('stroke')||'#111');ctx.lineWidth=Math.max(.5,num(el.getAttribute('stroke-width'),1)*((sx+sy)/2));ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}}
function drawBbbtTicks(ctx,pageNo,sx,sy){if(Number(pageNo)!==4)return;const st=stateObj(),bw=baseW(),bh=baseH();for(const f of globalFields()){if(Number(f.page)!==4||!['check','displayCheck'].includes(String(f.type)))continue;if(!st[f.key])continue;const x=num(f.tickX)*bw*sx,y=num(f.tickY)*bh*sy;ctx.save();ctx.strokeStyle='#111';ctx.lineWidth=Math.max(1,1.5*((sx+sy)/2));ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x-3*sx,y);ctx.lineTo(x-.8*sx,y+2.3*sy);ctx.lineTo(x+4*sx,y-3.1*sy);ctx.stroke();ctx.restore()}}
function loadImage(src){if(!src)return Promise.reject(new Error('Ảnh rỗng'));if(sigCache.has(src))return sigCache.get(src);const p=new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('Không đọc được ảnh'));im.src=src});sigCache.set(src,p);if(sigCache.size>40){const k=sigCache.keys().next().value;sigCache.delete(k)}return p}
async function drawSignatures(ctx,pageNo,sx,sy){const st=stateObj(),bw=baseW(),bh=baseH();for(const f of globalFields()){if(Number(f.page)!==Number(pageNo)||String(f.type)!=='signature'||!st[f.key])continue;const im=await loadImage(st[f.key]),vx=num(f.vx)*bw*sx,vy=num(f.vy)*bh*sy,vw=num(f.vw)*bw*sx,vh=num(f.vh)*bh*sy,padX=Math.min(14*sx,Math.max(6*sx,vw*.035)),padY=Math.min(10*sy,Math.max(5*sy,vh*.075)),x=vx+padX,y=vy+padY,w=Math.max(1,vw-padX*2),h=Math.max(1,vh-padY*2),r=Math.min(w/(im.naturalWidth||im.width),h/(im.naturalHeight||im.height)),dw=(im.naturalWidth||im.width)*r,dh=(im.naturalHeight||im.height)*r;ctx.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}}
async function waitBg(bg,label){if(bg?.complete&&bg.naturalWidth)return;await new Promise((res,rej)=>{if(!bg)return rej(new Error('Không tìm thấy nền '+label));const a=bg.onload,b=bg.onerror;bg.onload=e=>{try{a?.call(bg,e)}catch(_){}res()};bg.onerror=e=>{try{b?.call(bg,e)}catch(_){}rej(new Error('Không tải được nền '+label))}})}
function drawSvgDirect(ctx,svg,sx,sy){for(const t of svg.querySelectorAll('text'))drawText(ctx,t,sx,sy);for(const fo of svg.querySelectorAll('foreignObject'))drawForeign(ctx,fo,sx,sy);drawDynamicLines(ctx,svg,sx,sy)}
async function fastPage(pageNo,landscape=false){const t0=perf(),page=document.getElementById('page'+pageNo),bg=page?.querySelector('img'),svg=document.getElementById('svg'+pageNo);if(!page||!bg||!svg)throw new Error('Không tìm thấy Trang '+pageNo);await waitBg(bg,'Trang '+pageNo);const bw=baseW(),bh=baseH(),cw=landscape?(Number(typeof F208_W!=='undefined'?F208_W:1491)||1491):bw,ch=landscape?(Number(typeof F208_H!=='undefined'?F208_H:1055)||1055):bh,c=document.createElement('canvas');c.width=cw;c.height=ch;c.__sagsOriginalWidth=cw;c.__sagsOriginalHeight=ch;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);const t1=perf();ctx.drawImage(bg,0,0,cw,ch);const t2=perf(),sx=cw/bw,sy=ch/bh;drawSvgDirect(ctx,svg,sx,sy);drawBbbtTicks(ctx,pageNo,sx,sy);const t3=perf();await drawSignatures(ctx,pageNo,sx,sy);if(Number(pageNo)===4&&stateObj().bbbtCxrNo!==undefined&&stateObj().bbbtCxrNo!==null&&stateObj().bbbtCxrNo!==''){ctx.save();ctx.font=`900 ${28*sy}px Times New Roman`;ctx.fillStyle='#b54032';ctx.textAlign='right';ctx.textBaseline='top';let n=stateObj().bbbtCxrNo;try{if(typeof formatBBBTCxrNo==='function')n=formatBBBTCxrNo(n)}catch(_){}ctx.fillText('CXR No: '+n,(bw-42)*sx,30*sy);ctx.restore()}const t4=perf(),row={page:Number(pageNo),bgMs:+(t2-t1).toFixed(1),overlayMs:+(t3-t2).toFixed(1),signatureMs:+(t4-t3).toFixed(1),totalMs:+(t4-t0).toFixed(1)};const P=root.__SAGS_V450_PDF_RUN;if(P){P.pages.push(row);P.renderMs=(P.renderMs||0)+row.totalMs}root.__SAGS_V450_LAST_PAGE=row;return c}
const fastPortrait=pageNo=>fastPage(pageNo,false),fastLandscape=()=>fastPage(13,true);root.sagsV450FastRenderPage=fastPortrait;root.renderReportPage=fastPortrait;try{renderReportPage=fastPortrait}catch(_){}root.renderLoading208Page=fastLandscape;try{renderLoading208Page=fastLandscape}catch(_){}
function showPreviewCanvas(c,title){let m=document.getElementById('v450PdfFastPreview');if(!m){m=document.createElement('div');m.id='v450PdfFastPreview';m.style.cssText='position:fixed;inset:0;z-index:20000;background:#07111dcc;padding:10px;overflow:auto;display:none';m.innerHTML='<div style="position:sticky;top:0;background:#fff;padding:8px;border-radius:10px;display:flex;align-items:center;gap:8px;z-index:2"><b id="v450PdfFastTitle">PDF PREVIEW</b><span style="flex:1"></span><button id="v450PdfFastClose" style="padding:8px 12px">ĐÓNG</button></div><div style="text-align:center;padding:10px"><img id="v450PdfFastImg" style="max-width:min(98vw,1000px);height:auto;background:#fff"></div>';document.body.appendChild(m);document.getElementById('v450PdfFastClose').onclick=()=>m.style.display='none'}document.getElementById('v450PdfFastTitle').textContent=title;document.getElementById('v450PdfFastImg').src=c.toDataURL('image/jpeg',.9);m.style.display='block'}
root.sagsV450PreviewPdfPage=async function(pageNo){const t=perf();try{root.sagsV450ApplyLayout?.();try{if(typeof draw==='function')draw()}catch(_){}const c=await fastPage(pageNo,Number(pageNo)===13);showPreviewCanvas(c,`PDF PREVIEW · Trang ${pageNo} · ${(perf()-t).toFixed(0)} ms`)}catch(e){alert('Không preview được PDF: '+S(e?.message||e))}};
function wrapEncoder(name){const base=root[name];if(typeof base!=='function'||base.__sagsV450Perf)return;const fn=async function(){const t=perf(),r=await base.apply(this,arguments),ms=perf()-t,P=root.__SAGS_V450_PDF_RUN;if(P)P.encodeMs=(P.encodeMs||0)+ms;return r};fn.__sagsV450Perf=true;fn.__sagsOriginal=base;root[name]=fn;try{if(name==='canvasesToPdfFile')canvasesToPdfFile=fn;else canvasesToLandscapePdfFile=fn}catch(_){}}
wrapEncoder('canvasesToPdfFile');wrapEncoder('canvasesToLandscapePdfFile');
const baseSend=root.sendReport;if(typeof baseSend==='function'&&!baseSend.__sagsV450Fast){const send=async function(kind='all'){const P={build:BUILD,kind:S(kind),startedAt:Date.now(),pages:[],renderMs:0,encodeMs:0,totalMs:0};root.__SAGS_V450_PDF_RUN=P;const t=perf();try{return await baseSend.apply(this,arguments)}finally{P.totalMs=perf()-t;P.finishedAt=Date.now();root.__SAGS_V450_PDF_PERF=P;try{localStorage.setItem('sags.v450.pdfPerf',JSON.stringify(P))}catch(_){}root.__SAGS_V450_PDF_RUN=null;try{const st=document.getElementById('exportStatus');if(st&&P.totalMs)st.textContent+=` · FAST PDF ${(P.totalMs/1000).toFixed(2)}s`}catch(_){}}};send.__sagsV450Fast=true;send.__sagsOriginal=baseSend;root.sendReport=send;try{sendReport=send}catch(_){}}
root.sagsV450PdfPerformance=()=>root.__SAGS_V450_PDF_PERF||(()=>{try{return JSON.parse(localStorage.getItem('sags.v450.pdfPerf')||'null')}catch(_){return null}})();
console.info('E-REPORT/SAGS V4.7.1 PDF Background Import + Fast PDF active');
})(typeof window!=='undefined'?window:globalThis);
