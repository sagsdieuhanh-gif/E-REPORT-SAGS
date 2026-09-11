/* E-REPORT/SAGS V4.2.42 · V2.2.18-AD-FSAGS-BBBT-COORD
   ONLY AD -> AD Control Center -> CĂN CHỈNH BIỂU MẪU.
   Choose FSAGS/BBBT, drag DISPLAY rectangles (vx/vy), SAVE exports GitHub config.
   No Firebase. No floating editor button in normal operation screens. */
(function(root){
  "use strict";
  const BUILD="V2.2.18-AD-FSAGS-BBBT-COORD";
  if(root.__SAGS_AD_FSAGS_BBBT_COORD===BUILD)return;
  root.__SAGS_AD_FSAGS_BBBT_COORD=BUILD;

  const CONFIG_URL="./fsags-display-coordinates.json";
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
    bbbt:{label:"BBBT · F/SAGS-CXR/56",pages:[4,5]}
  };

  let config={schema:2,build:"FSAGS-BBBT-DISPLAY-COORDINATES-V1",pages:{}};
  let draft=null, editing=false, activeGroup="", selected=null, drag=null;
  let baseByField=new WeakMap(), layers=[], fetchAt=0, fetchJob=null, rafDraw=0;

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
  const isAdmin=()=>session().role==="AD";

  function globalFields(){
    try{
      if(typeof fields!=="undefined"&&Array.isArray(fields))return fields;
    }catch(_){}
    return [];
  }
  function redraw(){
    if(rafDraw)return;
    rafDraw=requestAnimationFrame(()=>{
      rafDraw=0;
      try{if(typeof draw==="function")draw()}catch(_){}
    });
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
  function resetFieldToBase(f){
    const b=rememberBase(f);
    f.vx=b.vx;f.vy=b.vy;f.vw=b.vw;f.vh=b.vh;
    f.align=b.align;f.leftValue=b.leftValue;f.manualInset=b.manualInset;
  }
  function pageCfg(page,source=config){
    return source?.pages?.[String(page)]||{fields:{}};
  }
  function applyConfig(source=config){
    const fs=globalFields();
    if(!fs.length)return false;
    for(const f of fs){
      rememberBase(f);
      resetFieldToBase(f);
      const c=pageCfg(f.page,source)?.fields?.[S(f.key)];
      if(!c)continue;
      if(Number.isFinite(Number(c.vx)))f.vx=Number(c.vx);
      if(Number.isFinite(Number(c.vy)))f.vy=Number(c.vy);
      // User rule: left edge of dragged display box is the text start.
      f.align="left";
      f.leftValue=true;
      f.manualInset=0;
    }
    redraw();
    return true;
  }
  async function refreshConfig(force=false){
    if(fetchJob)return fetchJob;
    if(!force&&Date.now()-fetchAt<30000)return config;
    fetchJob=(async()=>{
      try{
        const r=await fetch(CONFIG_URL+"?t="+Date.now(),{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
        if(r.ok){
          const j=await r.json();
          if(j&&typeof j==="object"&&j.pages){
            config={schema:2,build:"FSAGS-BBBT-DISPLAY-COORDINATES-V1",...j,pages:j.pages||{}};
          }
        }
      }catch(_){}
      fetchAt=Date.now();fetchJob=null;
      if(!editing)applyConfig(config);
      return config;
    })();
    return fetchJob;
  }

  function ensureStyles(){
    if($("sagsCoord42Style"))return;
    const st=document.createElement("style");st.id="sagsCoord42Style";
    st.textContent=`
#sagsCoord42Modal[hidden],#sagsCoord42Editor[hidden]{display:none!important}
#sagsCoord42Modal{position:fixed;inset:0;z-index:2147482500;background:#17364ac4;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font:14px/1.4 Arial;color:#17364a}
.s42box{width:min(680px,96vw);max-height:90dvh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 15px 50px #0005}
.s42head{display:flex;justify-content:space-between;align-items:center;gap:10px}.s42head h3{margin:0;color:#0b5cab}.s42head button{width:44px;height:44px;border-radius:10px}
.s42help{margin:8px 0 12px;color:#516879}.s42list{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.s42choice{min-height:64px;border:1px solid #b9cbd8;border-radius:12px;background:#fff;text-align:left;padding:10px 12px;color:#17364a;font-weight:900;font-size:15px}
.s42choice small{display:block;font-weight:500;color:#5c7283;margin-top:3px}
#sagsCoord42Editor{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483200;width:min(720px,calc(100vw - 16px));background:#fff;color:#17364a;border:1px solid #adc2d1;border-radius:16px;padding:11px;box-shadow:0 16px 48px #0006;font:14px/1.35 Arial}
.s42editHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.s42editHead b{font-size:16px}.s42editHead small{display:block;color:#5a7081}
#s42selected{margin:8px 0;padding:8px 10px;background:#eef5fa;border-radius:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s42editActions{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:7px}.s42editActions button{min-height:44px;border:1px solid #adc1cf;border-radius:10px;background:#f7fafc;color:#17364a;font-weight:900}.s42editActions #s42save{background:#0b6398;color:#fff}
#s42status{min-height:18px;margin:7px 0 0;font-weight:700}
.s42layer{position:absolute!important;inset:0!important;z-index:2147482000!important;pointer-events:none!important}
.s42rect{position:absolute!important;pointer-events:auto!important;border:2px dashed #e08a00!important;background:rgba(255,193,7,.08)!important;box-sizing:border-box!important;cursor:move!important;touch-action:none!important;user-select:none!important}
.s42rect::before{content:"";position:absolute;left:-2px;top:-2px;bottom:-2px;width:3px;background:#d82432}
.s42rect.s42chosen{border:3px solid #c72130!important;background:rgba(199,33,48,.08)!important}
.s42rect span{display:none;position:absolute;left:2px;top:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#17364a;color:#fff;padding:1px 3px;border-radius:3px;font:700 9px Arial}
.s42rect.s42chosen span{display:block}
body.s42editing .toolbar{opacity:.18;pointer-events:none}
@media(max-width:640px){.s42list{grid-template-columns:1fr}.s42editActions{grid-template-columns:1fr}#sagsCoord42Editor{max-height:48dvh;overflow:auto}}
`;
    document.head.appendChild(st);
  }

  function ensureUi(){
    ensureStyles();
    if(!$("sagsCoord42Modal")){
      const m=document.createElement("section");m.id="sagsCoord42Modal";m.hidden=true;
      m.innerHTML=`<div class="s42box"><div class="s42head"><h3>CĂN CHỈNH BIỂU MẪU</h3><button id="s42close" type="button">✕</button></div>
      <p class="s42help">Chỉ dành cho AD. Chọn FSAGS hoặc BBBT cần căn tọa độ hiển thị.</p>
      <div id="s42list" class="s42list"></div></div>`;
      document.body.appendChild(m);
      $("s42close").onclick=closeCenter;
      m.addEventListener("click",e=>{if(e.target===m)closeCenter()});
      const list=$("s42list");
      for(const [group,meta] of Object.entries(FORMS)){
        const b=document.createElement("button");b.type="button";b.className="s42choice";b.dataset.group=group;
        b.innerHTML=`${meta.label}<small>${meta.pages.length>1?"Trang "+meta.pages.join(" + "):"Trang "+meta.pages[0]}</small>`;
        b.onclick=()=>openEditor(group);
        list.appendChild(b);
      }
    }
    if(!$("sagsCoord42Editor")){
      const p=document.createElement("section");p.id="sagsCoord42Editor";p.hidden=true;
      p.innerHTML=`<div class="s42editHead"><div><b id="s42title">CĂN TỌA ĐỘ</b><small>Kéo KHUNG HIỂN THỊ đến đúng vị trí</small></div></div>
      <div id="s42selected">Chạm/kéo một khung màu cam. Mép đỏ bên trái = điểm bắt đầu chữ.</div>
      <div class="s42editActions"><button id="s42cancel" type="button">HỦY</button><button id="s42reset" type="button">VỀ GỐC Ô</button><button id="s42save" type="button">LƯU & XUẤT FILE</button></div>
      <p id="s42status" role="status"></p>`;
      document.body.appendChild(p);
      $("s42cancel").onclick=cancelEdit;
      $("s42reset").onclick=resetSelected;
      $("s42save").onclick=saveExport;
    }
  }

  function ensureAdminCard(){
    const center=$("v181AdminCenter");
    let card=$("sagsCoord42AdminCard");
    if(!isAdmin()){
      card?.remove();
      return;
    }
    if(!center||card)return;
    const grids=center.querySelectorAll(".v181AdminGrid");
    const grid=grids[grids.length-1];
    if(!grid)return;
    card=document.createElement("button");
    card.id="sagsCoord42AdminCard";
    card.type="button";
    card.className="v181AdminCard";
    card.innerHTML='<span class="v181AdminIcon">↔</span><span class="v181AdminCardText"><b>CĂN CHỈNH BIỂU MẪU</b><small>FSAGS 42.3 / 42.1 / 55.1 / 09 / 208 / BBBT</small></span><em>MỞ</em>';
    card.onclick=openCenter;
    grid.appendChild(card);
  }

  function openCenter(){
    if(!isAdmin())return;
    ensureUi();
    $("sagsCoord42Modal").hidden=false;
  }
  function closeCenter(){
    const m=$("sagsCoord42Modal");if(m)m.hidden=true;
  }

  function showGroup(group){
    let ok=false;
    try{
      if(typeof showFormGroup==="function"){showFormGroup(group,false);ok=true}
    }catch(_){}
    if(!ok){
      // Safe direct fallback: only display the requested pages.
      const wanted=new Set(FORMS[group]?.pages||[]);
      for(let p=1;p<=14;p++){
        const el=$("page"+p);if(!el)continue;
        const on=wanted.has(p);
        el.classList.toggle("hide",!on);
        el.style.display=on?"block":"none";
      }
    }
    setTimeout(()=>{
      const first=$("page"+(FORMS[group]?.pages?.[0]||1));
      try{first?.scrollIntoView({behavior:"smooth",block:"start"})}catch(_){}
    },80);
  }

  function fieldCandidates(group){
    const pages=new Set(FORMS[group]?.pages||[]);
    return globalFields().filter(f=>{
      if(!pages.has(Number(f.page)))return false;
      if(!S(f.key))return false;
      // Display-coordinate editor: exclude signatures/images; checks/ticks are not text-start regions.
      const type=U(f.type);
      if(["SIGNATURE","CHECK"].includes(type))return false;
      return Number.isFinite(Number(f.vx))&&Number.isFinite(Number(f.vy))
        &&Number.isFinite(Number(f.vw))&&Number.isFinite(Number(f.vh));
    });
  }

  function removeLayers(){
    layers.forEach(x=>x.remove());layers=[];
  }
  function pageElement(page){return $("page"+page)}
  function createLayers(group){
    removeLayers();
    const byPage=new Map();
    for(const f of fieldCandidates(group)){
      rememberBase(f);
      const p=Number(f.page),page=pageElement(p);
      if(!page)continue;
      let layer=byPage.get(p);
      if(!layer){
        const pos=getComputedStyle(page).position;
        if(pos==="static")page.style.position="relative";
        layer=document.createElement("div");layer.className="s42layer";layer.dataset.page=String(p);
        page.appendChild(layer);byPage.set(p,layer);layers.push(layer);
      }
      const rect=document.createElement("div");
      rect.className="s42rect";rect.dataset.page=String(p);rect.dataset.key=S(f.key);
      rect.style.left=(Number(f.vx)*100)+"%";
      rect.style.top=(Number(f.vy)*100)+"%";
      rect.style.width=(Math.max(Number(f.vw),.008)*100)+"%";
      rect.style.height=(Math.max(Number(f.vh),.008)*100)+"%";
      const lab=document.createElement("span");lab.textContent=S(f.label||f.key);rect.appendChild(lab);
      rect._field=f;
      layer.appendChild(rect);
    }
  }

  function selectRect(rect){
    layers.forEach(l=>l.querySelectorAll(".s42chosen").forEach(x=>x.classList.remove("s42chosen")));
    selected=rect||null;
    if(rect)rect.classList.add("s42chosen");
    const info=$("s42selected");
    if(!info)return;
    if(!rect){info.textContent="Chạm/kéo một khung màu cam. Mép đỏ bên trái = điểm bắt đầu chữ.";return}
    const f=rect._field;
    info.textContent=`${S(f.label||f.key)} · ${S(f.key)} · Trang ${f.page}`;
  }

  function draftField(f){
    draft.pages||={};
    const p=String(f.page);
    draft.pages[p]||={fields:{}};
    draft.pages[p].fields||={};
    return draft.pages[p].fields;
  }
  function commitRect(rect){
    if(!rect?._field)return;
    const f=rect._field,layer=rect.parentElement;
    const lr=layer.getBoundingClientRect(),rr=rect.getBoundingClientRect();
    const vx=(rr.left-lr.left)/Math.max(1,lr.width);
    const vy=(rr.top-lr.top)/Math.max(1,lr.height);
    const map=draftField(f);
    map[S(f.key)]={
      vx:+Math.max(0,Math.min(1,vx)).toFixed(7),
      vy:+Math.max(0,Math.min(1,vy)).toFixed(7),
      align:"left",
      leftValue:true,
      manualInset:0
    };
    f.vx=map[S(f.key)].vx;
    f.vy=map[S(f.key)].vy;
    f.align="left";f.leftValue=true;f.manualInset=0;
    redraw();
  }

  function enterDrag(e,rect){
    if(!editing)return;
    e.preventDefault();e.stopImmediatePropagation();selectRect(rect);
    const rr=rect.getBoundingClientRect();
    drag={rect,dx:e.clientX-rr.left,dy:e.clientY-rr.top};
    try{rect.setPointerCapture?.(e.pointerId)}catch(_){}
  }
  function moveDrag(e){
    if(!drag)return;
    e.preventDefault();
    const rect=drag.rect,layer=rect.parentElement,lr=layer.getBoundingClientRect(),rr=rect.getBoundingClientRect();
    const maxX=Math.max(0,lr.width-rr.width),maxY=Math.max(0,lr.height-rr.height);
    const x=Math.max(0,Math.min(maxX,e.clientX-lr.left-drag.dx));
    const y=Math.max(0,Math.min(maxY,e.clientY-lr.top-drag.dy));
    rect.style.left=(x/Math.max(1,lr.width)*100)+"%";
    rect.style.top=(y/Math.max(1,lr.height)*100)+"%";
  }
  function endDrag(){
    if(!drag)return;
    commitRect(drag.rect);drag=null;
  }

  document.addEventListener("pointerdown",e=>{
    const rect=e.target.closest?.(".s42rect");
    if(rect)enterDrag(e,rect);
  },true);
  document.addEventListener("pointermove",moveDrag,true);
  document.addEventListener("pointerup",endDrag,true);
  document.addEventListener("pointercancel",endDrag,true);

  function openEditor(group){
    if(!isAdmin()||!FORMS[group])return;
    closeCenter();
    activeGroup=group;editing=true;selected=null;drag=null;
    draft=clone(config);draft.schema=2;draft.pages||={};
    document.body.classList.add("s42editing");
    showGroup(group);
    applyConfig(draft);
    setTimeout(()=>{
      createLayers(group);
      $("sagsCoord42Editor").hidden=false;
      $("s42title").textContent="CĂN TỌA ĐỘ · "+FORMS[group].label;
      $("s42status").textContent="Kéo khung màu cam. Mép đỏ bên trái là điểm bắt đầu hiển thị chữ.";
      if(!fieldCandidates(group).length){
        $("s42status").textContent="Không tìm thấy vùng hiển thị của mẫu này. Hãy đợi biểu mẫu tải xong rồi mở lại.";
      }
    },180);
  }

  function resetSelected(){
    if(!selected?._field){
      $("s42status").textContent="Chọn một khung trước.";
      return;
    }
    const f=selected._field,b=rememberBase(f),map=draftField(f);
    delete map[S(f.key)];
    f.vx=b.vx;f.vy=b.vy;f.align=b.align;f.leftValue=b.leftValue;f.manualInset=b.manualInset;
    selected.style.left=(b.vx*100)+"%";
    selected.style.top=(b.vy*100)+"%";
    redraw();
    $("s42status").textContent="Đã đưa vùng đang chọn về tọa độ gốc.";
  }

  function cancelEdit(){
    if(!editing)return;
    editing=false;drag=null;selected=null;
    removeLayers();document.body.classList.remove("s42editing");
    $("sagsCoord42Editor").hidden=true;
    applyConfig(config);
  }

  function cleanConfigForExport(){
    const out={
      schema:2,
      build:"FSAGS-BBBT-DISPLAY-COORDINATES-V1",
      updatedAt:new Date().toISOString(),
      updatedBy:session().username||"AD",
      note:"Generated from AD > CĂN CHỈNH BIỂU MẪU. Replace this file in GitHub root.",
      pages:clone(draft?.pages||{})
    };
    for(const p of Object.keys(out.pages)){
      const fm=out.pages[p]?.fields||{};
      if(!Object.keys(fm).length)delete out.pages[p];
    }
    return out;
  }

  async function saveExport(){
    if(!editing)return;
    const cfg=cleanConfigForExport();
    try{
      const text=JSON.stringify(cfg,null,2)+"\n";
      const blob=new Blob([text],{type:"application/json;charset=utf-8"});
      const name="fsags-display-coordinates.json";
      let shared=false;
      try{
        if(typeof File!=="undefined"&&navigator.share){
          const file=new File([blob],name,{type:"application/json"});
          if(!navigator.canShare||navigator.canShare({files:[file]})){
            await navigator.share({files:[file],title:name});
            shared=true;
          }
        }
      }catch(_){}
      if(!shared){
        const url=URL.createObjectURL(blob),a=document.createElement("a");
        a.href=url;a.download=name;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1500);
      }
      config=clone(cfg);fetchAt=Date.now();
      $("s42status").textContent="ĐÃ XUẤT fsags-display-coordinates.json · thay file này trên GitHub.";
      setTimeout(()=>{
        editing=false;removeLayers();document.body.classList.remove("s42editing");
        $("sagsCoord42Editor").hidden=true;applyConfig(config);
      },800);
    }catch(e){
      $("s42status").textContent="Chưa xuất được file: "+S(e?.message||e);
    }
  }

  function scan(){
    ensureUi();
    ensureAdminCard();
    if(!editing)applyConfig(config);
  }
  let queued=false;
  function schedule(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;scan()});
  }
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["style","class","hidden"]});
  ["sags:login","sags:rolechange","sags:profilechange","sags:ui-ready"].forEach(n=>root.addEventListener?.(n,schedule));
  root.addEventListener("focus",()=>refreshConfig(false));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshConfig(false)});

  root.sagsOpenCoordinateCenter=()=>{if(isAdmin())openCenter()};
  root.sagsCoordinateInfo=()=>({
    build:BUILD,admin:isAdmin(),editing,group:activeGroup,
    fieldCount:activeGroup?fieldCandidates(activeGroup).length:globalFields().length,
    configUpdatedAt:S(config.updatedAt)
  });

  ensureUi();
  refreshConfig(true).finally(scan);
})(typeof window==="undefined"?globalThis:window);
