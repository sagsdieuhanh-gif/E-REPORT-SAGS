/* E-REPORT/SAGS V4.2.36 · V2.2.18-AD-FORM-ALIGN
   AD visual form alignment editor.
   Saved config lives in Firebase and auto-applies on other devices. */
(function(root){
  "use strict";
  if(root.__SAGS_V2218_FORM_ALIGN)return;
  root.__SAGS_V2218_FORM_ALIGN=true;

  const $=id=>document.getElementById(id);
  const S=v=>String(v??"").trim();
  const U=v=>S(v).toUpperCase();
  const EDITABLE='input:not([type="hidden"]):not([type="file"]):not([type="button"]):not([type="submit"]),textarea,select,[contenteditable="true"]';
  const EXCLUDE='#sagsAlignPanel,#sagsAlignLaunch,#roleLoginModal,#v181AdminCenter,#srModal,#qiModal';

  let activeStage=null, activeKey="", activeLabel="", activeRef=null, activeListener=null;
  let savedConfig={schema:1,fields:{}}, draftConfig=null, editing=false, selected=null;
  let scanQueued=false, applying=false, pointerState=null;

  function session(){
    try{
      const s=root.__sagsGetSession?.()||{},p=s.profile||{};
      return {username:S(s.username||p.username||p.userName||p.login||p.account||root.currentUserProfile?.username),
              role:U(s.role||p.role||p.systemRole||root.currentRole),
              profile:p};
    }catch(_){
      return {username:S(root.currentUserProfile?.username),role:U(root.currentRole),profile:root.currentUserProfile||{}};
    }
  }
  const isAdmin=()=>session().role==="AD";
  const ref=path=>{
    if(typeof root.sagsV470Ref!=="function")throw Error("Chưa kết nối Firebase.");
    return root.sagsV470Ref(path);
  };
  function safe(v){return S(v).replace(/[.#$\[\]\/]/g,"_").slice(0,120)}
  function hash(v){
    let h=2166136261>>>0;
    for(const ch of String(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
    return (h>>>0).toString(36);
  }
  function visible(el){
    if(!el||!el.isConnected)return false;
    if(el.closest(EXCLUDE))return false;
    const r=el.getBoundingClientRect();
    if(r.width<8||r.height<8)return false;
    const cs=getComputedStyle(el);
    return cs.display!=="none"&&cs.visibility!=="hidden"&&Number(cs.opacity||1)!==0;
  }
  function fieldsOf(stage){
    return [...stage.querySelectorAll(EDITABLE)].filter(visible);
  }
  function backgroundHint(stage){
    const img=[...stage.querySelectorAll("img")].find(visible);
    if(img?.currentSrc||img?.src)return (img.currentSrc||img.src).split("/").pop().split("?")[0];
    const bg=getComputedStyle(stage).backgroundImage||"";
    const m=bg.match(/url\(["']?([^"')]+)["']?\)/);
    return m?.[1]?.split("/").pop().split("?")[0]||"";
  }
  function keywordScore(el){
    const s=U([el.id,el.className,el.getAttribute?.("data-template-id"),el.getAttribute?.("data-form-id"),
      el.getAttribute?.("aria-label")].filter(Boolean).join(" "));
    let n=0;
    ["FORM","TEMPLATE","SHEET","PAGE","FINAL","FSAGS","CLOSEOUT","DOCUMENT","ENVELOPE"].forEach(k=>{if(s.includes(k))n+=2});
    return n;
  }
  function candidateScore(el){
    if(!el||el===document.body||el===document.documentElement||el.closest(EXCLUDE))return -999;
    const fs=fieldsOf(el);
    if(fs.length<2)return -999;
    const r=el.getBoundingClientRect();
    if(r.width<260||r.height<180)return -999;
    let score=keywordScore(el);
    if([...el.querySelectorAll("img,canvas,svg")].some(visible))score+=6;
    const bg=getComputedStyle(el).backgroundImage;
    if(bg&&bg!=="none")score+=5;
    const abs=fs.filter(f=>["absolute","fixed"].includes(getComputedStyle(f).position)).length;
    if(abs>=2)score+=5;
    if(abs>=Math.max(2,Math.floor(fs.length*.5)))score+=3;
    score+=Math.min(fs.length,12)*.15;
    // Prefer the smallest meaningful container around the fields.
    score-=Math.log10(Math.max(1,r.width*r.height))/8;
    return score;
  }
  function detectStage(){
    const explicit=[...document.querySelectorAll('[data-template-id],[data-form-id],.form-page,.template-page,.form-canvas,.sheet-page,.document-page')]
      .filter(visible).map(el=>[candidateScore(el)+4,el]).sort((a,b)=>b[0]-a[0]);
    if(explicit[0]?.[0]>=4)return explicit[0][1];

    const visibleFields=[...document.querySelectorAll(EDITABLE)].filter(visible);
    const candidates=new Map();
    for(const f of visibleFields){
      let p=f.parentElement,depth=0;
      while(p&&p!==document.body&&depth++<7){
        if(!candidates.has(p))candidates.set(p,candidateScore(p));
        p=p.parentElement;
      }
    }
    const ranked=[...candidates].sort((a,b)=>b[1]-a[1]);
    return ranked[0]?.[1]>=4?ranked[0][0]:null;
  }
  function domHint(el){
    if(el.id)return "#"+el.id;
    const d=el.dataset||{};
    for(const k of ["templateId","formId","page","pageId","form","template"])if(d[k])return k+"="+d[k];
    const cls=typeof el.className==="string"?el.className.split(/\s+/).filter(Boolean).slice(0,3).join("."):"";
    return cls?el.tagName.toLowerCase()+"."+cls:el.tagName.toLowerCase();
  }
  function templateInfo(stage){
    const bg=backgroundHint(stage);
    const explicit=S(stage.dataset?.templateId||stage.dataset?.formId||stage.getAttribute("data-template")||stage.getAttribute("data-form"));
    const title=S(stage.querySelector("h1,h2,h3")?.textContent);
    const sig=[explicit,domHint(stage),bg,title,fieldsOf(stage).length].join("|");
    const label=explicit||bg||title||domHint(stage);
    return {key:"FORM_"+hash(sig),label:label.slice(0,100)};
  }
  function fieldBase(el){
    const d=el.dataset||{};
    for(const k of ["alignKey","field","fieldKey","key","bind","name"])if(d[k])return k+":"+d[k];
    if(el.name)return "name:"+el.name;
    if(el.id)return "id:"+el.id;
    const aria=S(el.getAttribute("aria-label"));
    if(aria)return "aria:"+aria;
    const ph=S(el.getAttribute("placeholder"));
    if(ph)return "ph:"+ph;
    return el.tagName.toLowerCase();
  }
  function prepareFields(stage){
    const list=fieldsOf(stage),counts=new Map();
    for(const el of list){
      const base=fieldBase(el),n=counts.get(base)||0;
      counts.set(base,n+1);
      const key=safe(base)+(n?("__"+n):"");
      el.dataset.sagsAlignKey=key;
      if(editing)el.classList.add("sagsAlignField");
      else el.classList.remove("sagsAlignField","sagsAlignSelected");
    }
    return list;
  }
  function stageRect(){return activeStage?.getBoundingClientRect()}
  function fieldConfig(key,source=draftConfig||savedConfig){
    return source?.fields?.[key]||{x:0,y:0};
  }
  function pxFromCfg(cfg){
    const r=stageRect();
    return {x:(Number(cfg?.x)||0)*(r?.width||1)/100,y:(Number(cfg?.y)||0)*(r?.height||1)/100};
  }
  function applyOne(el,cfg){
    const r=stageRect(); if(!r)return;
    const x=(Number(cfg?.x)||0)*r.width/100,y=(Number(cfg?.y)||0)*r.height/100;
    el.style.setProperty("translate",`${x.toFixed(2)}px ${y.toFixed(2)}px`,"important");
  }
  function applyConfig(config){
    if(!activeStage||applying)return;
    applying=true;
    try{
      const fields=prepareFields(activeStage);
      for(const el of fields){
        const cfg=config?.fields?.[el.dataset.sagsAlignKey];
        applyOne(el,cfg||{x:0,y:0});
      }
      refreshSelectedInfo();
    }finally{applying=false}
  }
  function cacheKey(key){return "sagsFormAlign:"+key}
  function readCache(key){
    try{return JSON.parse(localStorage.getItem(cacheKey(key))||"null")}catch(_){return null}
  }
  function writeCache(key,cfg){try{localStorage.setItem(cacheKey(key),JSON.stringify(cfg))}catch(_){}}
  function unsubscribe(){
    try{if(activeRef&&activeListener&&typeof activeRef.off==="function")activeRef.off("value",activeListener)}catch(_){}
    activeRef=null;activeListener=null;
  }
  function subscribe(stage){
    const info=templateInfo(stage);
    if(stage===activeStage&&info.key===activeKey)return;
    unsubscribe();
    activeStage=stage;activeKey=info.key;activeLabel=info.label;selected=null;
    savedConfig=readCache(activeKey)||{schema:1,fields:{}};
    if(!editing)applyConfig(savedConfig);
    try{
      activeRef=ref("ui_form_alignment/"+activeKey);
      activeListener=snap=>{
        const cfg=snap?.val?.()||{schema:1,fields:{}};
        savedConfig={schema:1,fields:{},...cfg,fields:cfg.fields||{}};
        writeCache(activeKey,savedConfig);
        if(!editing)applyConfig(savedConfig);
        updateLaunch();
      };
      if(typeof activeRef.on==="function")activeRef.on("value",activeListener);
      else activeRef.once?.("value").then(activeListener).catch(()=>{});
    }catch(_){}
    updateLaunch();
  }
  function updateLaunch(){
    ensureUi();
    const b=$("sagsAlignLaunch");
    if(!b)return;
    const ok=isAdmin()&&!!activeStage&&visible(activeStage);
    b.hidden=!ok;
    b.style.display=ok?"block":"none";
    if(ok)b.textContent="🛠 CĂN BIỂU MẪU";
  }
  function selectField(el){
    if(!editing||!activeStage?.contains(el))return;
    prepareFields(activeStage).forEach(x=>x.classList.toggle("sagsAlignSelected",x===el));
    selected=el;
    refreshSelectedInfo();
  }
  function selectedLabel(){
    if(!selected)return "Chưa chọn ô";
    return S(selected.getAttribute("aria-label")||selected.getAttribute("placeholder")||selected.name||selected.id||selected.dataset.sagsAlignKey);
  }
  function refreshSelectedInfo(){
    const el=$("sagsAlignSelectedInfo"); if(!el)return;
    if(!selected){el.textContent="CHẠM VÀO Ô CẦN CĂN";return}
    const cfg=fieldConfig(selected.dataset.sagsAlignKey),px=pxFromCfg(cfg);
    el.textContent=`${selectedLabel()} · X ${Math.round(px.x)} px · Y ${Math.round(px.y)} px`;
  }
  function cloneConfig(cfg){
    return JSON.parse(JSON.stringify(cfg||{schema:1,fields:{}}));
  }
  function sameRowMembers(){
    if(!selected)return [];
    const sr=selected.getBoundingClientRect(),cy=sr.top+sr.height/2,tol=Math.max(10,sr.height*.55);
    return prepareFields(activeStage).filter(el=>{
      const r=el.getBoundingClientRect(),ey=r.top+r.height/2;
      return Math.abs(ey-cy)<=tol;
    });
  }
  function moveElements(elements,dxPx,dyPx){
    const r=stageRect(); if(!r)return;
    draftConfig.fields||={};
    for(const el of elements){
      const key=el.dataset.sagsAlignKey,c={...fieldConfig(key,draftConfig)};
      c.x=(Number(c.x)||0)+dxPx/r.width*100;
      c.y=(Number(c.y)||0)+dyPx/r.height*100;
      if(Math.abs(c.x)<1e-7)c.x=0;if(Math.abs(c.y)<1e-7)c.y=0;
      draftConfig.fields[key]=c;
      applyOne(el,c);
    }
    refreshSelectedInfo();
  }
  function moveSelected(dx,dy){
    if(!selected)return status("Chạm vào ô cần căn trước.");
    const row=$("sagsAlignWholeRow")?.checked;
    moveElements(row?sameRowMembers():[selected],dx,dy);
  }
  function resetSelected(){
    if(!selected)return;
    const list=$("sagsAlignWholeRow")?.checked?sameRowMembers():[selected];
    for(const el of list){
      delete draftConfig.fields[el.dataset.sagsAlignKey];
      applyOne(el,{x:0,y:0});
    }
    refreshSelectedInfo();
  }
  function status(t){
    const el=$("sagsAlignStatus");if(el)el.textContent=t;
  }
  function enterEdit(){
    if(!isAdmin())return;
    if(!activeStage)return alert("Hãy mở biểu mẫu cần căn chỉnh trước.");
    editing=true;
    draftConfig=cloneConfig(savedConfig);
    document.body.classList.add("sagsAlignEditing");
    prepareFields(activeStage);
    applyConfig(draftConfig);
    const p=$("sagsAlignPanel");if(p)p.hidden=false;
    const lab=$("sagsAlignTemplate");if(lab)lab.textContent=activeLabel||activeKey;
    status("Chạm vào ô bị lệch rồi kéo trực tiếp hoặc dùng các nút mũi tên.");
  }
  function exitEdit(saveApplied=false){
    editing=false;pointerState=null;selected=null;
    document.body.classList.remove("sagsAlignEditing");
    const p=$("sagsAlignPanel");if(p)p.hidden=true;
    prepareFields(activeStage);
    applyConfig(saveApplied?savedConfig:savedConfig);
  }
  async function saveDraft(){
    if(!isAdmin())return;
    if(!activeStage||!activeKey)return status("Không xác định được biểu mẫu.");
    const s=session(),payload={
      schema:1,
      templateKey:activeKey,
      label:activeLabel,
      fields:draftConfig.fields||{},
      updatedAtMs:Date.now(),
      updatedBy:s.username||"AD",
      updatedRole:s.role,
      revision:Number(savedConfig.revision||0)+1
    };
    try{
      status("Đang lưu Firebase…");
      const r=ref("ui_form_alignment/"+activeKey);
      if(typeof r.set==="function")await r.set(payload);
      else throw Error("Firebase chưa hỗ trợ set.");
      savedConfig=payload;writeCache(activeKey,payload);
      applyConfig(savedConfig);
      status("ĐÃ LƯU · các máy khác sẽ tự áp dụng khi mở mẫu này.");
      setTimeout(()=>exitEdit(true),450);
    }catch(e){
      status("Chưa lưu được: "+S(e?.message||e));
    }
  }
  async function resetTemplate(){
    if(!isAdmin()||!activeKey)return;
    if(!confirm("Xóa toàn bộ căn chỉnh đã lưu của mẫu này?"))return;
    try{
      const payload={schema:1,templateKey:activeKey,label:activeLabel,fields:{},updatedAtMs:Date.now(),
        updatedBy:session().username||"AD",updatedRole:"AD",revision:Number(savedConfig.revision||0)+1};
      await ref("ui_form_alignment/"+activeKey).set(payload);
      savedConfig=payload;draftConfig=cloneConfig(payload);writeCache(activeKey,payload);applyConfig(payload);
      status("Đã đưa mẫu về vị trí gốc và đồng bộ cho các máy.");
    }catch(e){status("Chưa khôi phục được: "+S(e?.message||e))}
  }

  function ensureStyle(){
    if($("sagsAlignStyle"))return;
    const st=document.createElement("style");st.id="sagsAlignStyle";
    st.textContent=`
#sagsAlignLaunch{position:fixed;right:14px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:100500;min-height:46px;padding:10px 14px;border:0;border-radius:999px;background:#0b6398;color:#fff;font:800 14px Arial;box-shadow:0 5px 18px #0003}
#sagsAlignPanel[hidden],#sagsAlignLaunch[hidden]{display:none!important}
#sagsAlignPanel{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100700;width:min(560px,calc(100vw - 16px));max-height:48dvh;overflow:auto;background:#fff;color:#17364a;border:1px solid #b8cad8;border-radius:16px;padding:12px;box-shadow:0 12px 40px #0005;font:14px/1.35 Arial}
.sagsAlignHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.sagsAlignHead>div{display:flex;flex-direction:column;gap:3px}.sagsAlignHead small{font-weight:400;max-width:390px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#sagsAlignPanel button,#sagsAlignPanel select{min-height:42px;border:1px solid #a9bdcc;border-radius:10px;background:#f7fafc;color:#17364a;font-weight:800}
#sagsAlignClose{width:44px}.sagsAlignOptions{display:flex;align-items:center;gap:14px;margin:10px 0}.sagsAlignOptions label{display:flex;align-items:center;gap:6px;font-weight:800}.sagsAlignOptions input{width:22px;height:22px}
#sagsAlignSelectedInfo{margin-top:10px;padding:9px 10px;background:#eef5fa;border-radius:10px;font-weight:800}
.sagsAlignArrows{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;max-width:330px;margin:10px auto}.sagsAlignArrows button{font-size:18px}.sagsAlignArrows [data-reset-one]{font-size:11px}
.sagsAlignHelp{margin:8px 0;color:#4e6475}.sagsAlignActions{display:grid;grid-template-columns:1fr 1fr 1.35fr;gap:7px}.sagsAlignActions #sagsAlignSave{background:#0b6398;color:#fff}.sagsAlignActions #sagsAlignResetAll{background:#fff6e5}
#sagsAlignStatus{min-height:19px;margin:8px 0 0;font-weight:700}
.sagsAlignEditing .sagsAlignField{outline:2px dashed #e39300!important;outline-offset:1px;cursor:move!important;touch-action:none!important;user-select:none!important}
.sagsAlignEditing .sagsAlignSelected{outline:3px solid #c72532!important;outline-offset:2px;z-index:999!important}
@media(max-width:620px){#sagsAlignPanel{max-height:54dvh}.sagsAlignActions{grid-template-columns:1fr}.sagsAlignHead small{max-width:250px}}
`;
    document.head.appendChild(st);
  }

  function ensureUi(){
    ensureStyle();
    if(!$("sagsAlignLaunch")){
      const b=document.createElement("button");
      b.id="sagsAlignLaunch";b.type="button";b.hidden=true;b.textContent="🛠 CĂN BIỂU MẪU";
      b.onclick=enterEdit;document.body.appendChild(b);
    }
    if(!$("sagsAlignPanel")){
      const p=document.createElement("section");
      p.id="sagsAlignPanel";p.hidden=true;
      p.innerHTML=`<div class="sagsAlignHead"><div><b>CĂN CHỈNH BIỂU MẪU</b><small id="sagsAlignTemplate"></small></div><button id="sagsAlignClose" type="button">✕</button></div>
        <div id="sagsAlignSelectedInfo">CHẠM VÀO Ô CẦN CĂN</div>
        <div class="sagsAlignOptions"><label>Bước <select id="sagsAlignStep"><option value="1">1 px</option><option value="5">5 px</option></select></label><label><input id="sagsAlignWholeRow" type="checkbox"> CẢ DÒNG</label></div>
        <div class="sagsAlignArrows">
          <span></span><button data-move="0,-1">↑</button><span></span>
          <button data-move="-1,0">←</button><button data-reset-one="1">VỀ GỐC Ô</button><button data-move="1,0">→</button>
          <span></span><button data-move="0,1">↓</button><span></span>
        </div>
        <p class="sagsAlignHelp">Có thể kéo trực tiếp ô trên biểu mẫu. Bật <b>CẢ DÒNG</b> nếu muốn dịch cả hàng cùng nhau.</p>
        <div class="sagsAlignActions"><button id="sagsAlignCancel" type="button">HỦY</button><button id="sagsAlignResetAll" type="button">VỀ GỐC MẪU</button><button id="sagsAlignSave" type="button">LƯU ÁP DỤNG</button></div>
        <p id="sagsAlignStatus" role="status"></p>`;
      document.body.appendChild(p);
      $("sagsAlignClose").onclick=$("sagsAlignCancel").onclick=()=>exitEdit(false);
      $("sagsAlignResetAll").onclick=resetTemplate;
      $("sagsAlignSave").onclick=saveDraft;
      p.querySelector('[data-reset-one]').onclick=resetSelected;
      p.querySelectorAll("[data-move]").forEach(b=>b.onclick=()=>{
        const [x,y]=b.dataset.move.split(",").map(Number),step=Number($("sagsAlignStep").value)||1;
        moveSelected(x*step,y*step);
      });
    }
  }

  // Capture input interactions only while AD alignment mode is active.
  document.addEventListener("pointerdown",e=>{
    if(!editing||!activeStage)return;
    const el=e.target.closest?.(EDITABLE);
    if(!el||!activeStage.contains(el))return;
    e.preventDefault();e.stopImmediatePropagation();
    selectField(el);
    pointerState={el,x:e.clientX,y:e.clientY,moved:false};
    try{el.setPointerCapture?.(e.pointerId)}catch(_){}
  },true);
  document.addEventListener("pointermove",e=>{
    if(!editing||!pointerState)return;
    const dx=e.clientX-pointerState.x,dy=e.clientY-pointerState.y;
    if(Math.abs(dx)+Math.abs(dy)<1)return;
    pointerState.x=e.clientX;pointerState.y=e.clientY;pointerState.moved=true;
    moveElements($("sagsAlignWholeRow")?.checked?sameRowMembers():[pointerState.el],dx,dy);
    e.preventDefault();
  },true);
  document.addEventListener("pointerup",()=>{pointerState=null},true);
  document.addEventListener("keydown",e=>{
    if(!editing||!selected||!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key))return;
    e.preventDefault();
    const step=e.shiftKey?5:(Number($("sagsAlignStep")?.value)||1);
    moveSelected(e.key==="ArrowLeft"?-step:e.key==="ArrowRight"?step:0,e.key==="ArrowUp"?-step:e.key==="ArrowDown"?step:0);
  },true);

  function ensureAdminCard(){
    const center=$("v181AdminCenter");
    if(!center||!isAdmin()||$("sagsAlignAdminCard"))return;
    const grids=center.querySelectorAll(".v181AdminGrid");
    const grid=grids[grids.length-1];if(!grid)return;
    const b=document.createElement("button");
    b.id="sagsAlignAdminCard";b.className="v181AdminCard";b.type="button";
    b.innerHTML='<span class="v181AdminIcon">↕</span><span class="v181AdminCardText"><b>CĂN CHỈNH BIỂU MẪU</b><small>Mở biểu mẫu → chọn ô → kéo/căn → lưu đồng bộ</small></span><em>MỞ</em>';
    b.onclick=()=>{
      if(activeStage&&visible(activeStage)){enterEdit();return}
      alert("Hãy mở biểu mẫu cần căn chỉnh trước. Khi biểu mẫu đang hiển thị, nút “CĂN BIỂU MẪU” sẽ xuất hiện.");
    };
    grid.appendChild(b);
  }

  function scan(){
    ensureUi();ensureAdminCard();
    const stage=detectStage();
    if(stage)subscribe(stage);
    else{
      if(!editing){activeStage=null;activeKey="";activeLabel="";unsubscribe()}
      updateLaunch();
    }
    if(activeStage&&!editing)applyConfig(savedConfig);
    updateLaunch();
  }
  function scheduleScan(){
    if(scanQueued)return;scanQueued=true;
    requestAnimationFrame(()=>{scanQueued=false;scan()});
  }
  new MutationObserver(scheduleScan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","class","style","aria-hidden"]});
  root.addEventListener("resize",scheduleScan);
  ["sags:login","sags:rolechange","sags:profilechange","sags:ui-ready"].forEach(n=>root.addEventListener?.(n,scheduleScan));

  root.sagsFormAlignOpen=()=>{scan();enterEdit()};
  root.sagsFormAlignInfo=()=>({templateKey:activeKey,label:activeLabel,editing,admin:isAdmin(),fieldCount:activeStage?fieldsOf(activeStage).length:0});

  ensureUi();scan();
})(typeof window==="undefined"?globalThis:window);
