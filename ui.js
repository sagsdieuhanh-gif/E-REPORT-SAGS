
/* E-REPORT/SAGS V1.1.87 · VER PC MOBILE UI
   UI shell only: legacy chrome removed; only the new drawer/home shell remains. */
(function(root){
  "use strict";
  if(root.__SAGS_V1183_UI)return;
  root.__SAGS_V1183_UI=true;

  const $=id=>document.getElementById(id);
  let v187SyncTimer=0,v187Syncing=false;
  const setText=(el,value)=>{if(el&&el.textContent!==String(value??""))el.textContent=String(value??"")};
  const V201_GREETING_KEY="sagsV201LoginGreeting";
  const V200_WEATHER_KEY="sagsV200CxrWeather";
  let v201GreetingSessionKey="";
  const v200Greetings=[
    "Chúc bạn một ca làm việc năng động, an toàn và hiệu quả!",
    "Khởi đầu thật hứng khởi — cùng vận hành mỗi chuyến bay thật trơn tru nhé!",
    "Chúc bạn nhiều năng lượng tích cực và một ngày khai thác thuận lợi!",
    "Một ngày mới, một tinh thần mới — làm việc tập trung và hiệu quả nhé!",
    "Chúc ca trực hôm nay phối hợp nhịp nhàng, an toàn và thành công!",
    "Sẵn sàng cho một ngày làm việc chuyên nghiệp và đầy cảm hứng nhé!"
  ];
  // The greeting is intentionally scoped to the signed-in account, never to AD.
  // This keeps a fresh message for every role after each login on a shared device.
  function v200Greeting(accountKey){
    try{
      const key=`${V201_GREETING_KEY}:${String(accountKey||"user")}`;
      v201GreetingSessionKey=key;
      let message=sessionStorage.getItem(key)||"";
      if(!message){
        message=v200Greetings[Math.floor(Math.random()*v200Greetings.length)];
        sessionStorage.setItem(key,message);
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
    // This dashboard is shared by every authenticated role; do not gate the
    // welcome or weather card behind Administrator permissions.
    const greetingAccount=String(profile.username||profile.email||profile.uid||profile.id||name||role||"user").trim().toLowerCase();
    setText($("v200GreetingText"),v200Greeting(greetingAccount));
    if(auth&&home&&!$("v200WeatherMain")?.dataset.loaded){
      $("v200WeatherMain").dataset.loaded="1";
      v200RefreshWeather();
    }
    if(!auth){
      try{if(v201GreetingSessionKey)sessionStorage.removeItem(v201GreetingSessionKey)}catch(_){}
      v201GreetingSessionKey="";
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
