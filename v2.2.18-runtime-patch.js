/* E-REPORT/SAGS V4.2.41 · V2.2.18-FSAGS-COORD-EDITOR
   Scope: FSAGS423 / FSAGS421 / FSAGS551 / FSAGS09 only.
   AD drags the actual display field. The field's LEFT EDGE is the text start anchor.
   SAVE exports fsags-display-coordinates.json for GitHub. No Firebase storage. */
(function(root){
  "use strict";
  const BUILD="V2.2.18-FSAGS-COORD-EDITOR";
  if(root.__SAGS_FSAGS_COORD_EDITOR===BUILD)return;
  root.__SAGS_FSAGS_COORD_EDITOR=BUILD;

  const CONFIG_URL="./fsags-display-coordinates.json";
  const $=id=>document.getElementById(id);
  const S=v=>String(v??"").trim();
  const U=v=>S(v).toUpperCase();
  const FIELD_SELECTOR='input:not([type="hidden"]):not([type="file"]):not([type="button"]):not([type="submit"]),textarea,select,[contenteditable="true"]';
  const FSAGS_BG={
    "page1.png":"FSAGS423","page2.png":"FSAGS423","page4.png":"FSAGS423",
    "page6.png":"FSAGS421","page7.png":"FSAGS421",
    "page9.png":"FSAGS551","page10.png":"FSAGS551",
    "page11.png":"FSAGS09","page12.png":"FSAGS09"
  };

  let remote={schema:1,build:"FSAGS-DISPLAY-COORDINATES-V1",pages:{}};
  let draft=null, activeStage=null, activePageKey="", editing=false, selected=null;
  let drag=null, scanQueued=false, lastFetch=0, fetching=null, beforeEditSnapshot=new Map();

  function session(){
    try{
      const s=root.__sagsGetSession?.()||{},p=s.profile||{};
      return {role:U(s.role||p.role||p.systemRole||root.currentRole),
              username:S(s.username||p.username||p.userName||p.login||p.account||root.currentUserProfile?.username)};
    }catch(_){return {role:U(root.currentRole),username:S(root.currentUserProfile?.username)}}
  }
  const isAdmin=()=>session().role==="AD";
  function norm(v){return U(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/Đ/g,"D")}
  function visible(el){
    if(!el||!el.isConnected)return false;
    const r=el.getBoundingClientRect();
    if(r.width<5||r.height<5)return false;
    const c=getComputedStyle(el);
    return c.display!=="none"&&c.visibility!=="hidden"&&Number(c.opacity||1)!==0;
  }
  function bgFile(el){
    const img=[...el.querySelectorAll(":scope > img,img")].find(x=>visible(x)&&S(x.currentSrc||x.src));
    if(img){
      const src=S(img.currentSrc||img.src);
      const f=decodeURIComponent(src.split("/").pop().split("?")[0]);
      if(FSAGS_BG[f])return f;
    }
    let bg="";
    try{bg=getComputedStyle(el).backgroundImage||""}catch(_){}
    const m=bg.match(/url\(["']?([^"')]+)["']?\)/);
    if(m){
      const f=decodeURIComponent(m[1].split("/").pop().split("?")[0]);
      if(FSAGS_BG[f])return f;
    }
    return "";
  }
  function fieldGroup(el){
    const t=norm([el.id,el.name,el.dataset?.field,el.dataset?.bind,el.dataset?.key,el.getAttribute("data-field")].filter(Boolean).join(" "));
    if(/\bF421[_-]/.test(t)||t.includes("FSAGS421"))return "FSAGS421";
    if(/\bF551[_-]/.test(t)||t.includes("FSAGS551"))return "FSAGS551";
    if(/\bF09[_-]/.test(t)||t.includes("FSAGS09"))return "FSAGS09";
    if(/\bF423[_-]/.test(t)||t.includes("FSAGS423"))return "FSAGS423";
    return "";
  }
  function stageGroup(stage){
    const bg=bgFile(stage); if(bg)return FSAGS_BG[bg]||"";
    const sig=norm([stage.id,stage.className,stage.dataset?.formId,stage.dataset?.templateId,
      stage.getAttribute?.("data-form"),stage.getAttribute?.("data-template")].filter(Boolean).join(" "));
    for(const g of ["FSAGS423","FSAGS421","FSAGS551","FSAGS09"])if(sig.includes(g))return g;
    const groups=[...stage.querySelectorAll(FIELD_SELECTOR)].map(fieldGroup).filter(Boolean);
    if(!groups.length)return "";
    return groups.sort((a,b)=>groups.filter(x=>x===b).length-groups.filter(x=>x===a).length)[0]||"";
  }
  function candidateScore(stage){
    if(!stage||stage===document.body||stage===document.documentElement)return -999;
    const r=stage.getBoundingClientRect();
    if(r.width<260||r.height<180)return -999;
    const fields=[...stage.querySelectorAll(FIELD_SELECTOR)].filter(visible);
    if(fields.length<2)return -999;
    const g=stageGroup(stage); if(!g)return -999;
    let score=10;
    if(bgFile(stage))score+=12;
    if(fields.some(x=>fieldGroup(x)===g))score+=5;
    score+=Math.min(fields.length,16)*.15;
    score-=Math.log10(Math.max(1,r.width*r.height))/10;
    return score;
  }
  function detectStage(){
    const map=new Map();
    for(const f of [...document.querySelectorAll(FIELD_SELECTOR)].filter(visible)){
      let p=f.parentElement,d=0;
      while(p&&p!==document.body&&d++<8){
        if(!map.has(p))map.set(p,candidateScore(p));
        p=p.parentElement;
      }
    }
    const ranked=[...map].sort((a,b)=>b[1]-a[1]);
    return ranked[0]?.[1]>=10?ranked[0][0]:null;
  }
  function pageKey(stage){
    const g=stageGroup(stage)||"FSAGS";
    const bg=bgFile(stage);
    const hint=S(stage.dataset?.page||stage.dataset?.pageId||stage.getAttribute?.("data-page"));
    return [g,bg||hint||"PAGE"].join("|");
  }
  function fields(stage){
    const g=stageGroup(stage);
    return [...stage.querySelectorAll(FIELD_SELECTOR)].filter(el=>{
      if(!visible(el))return false;
      const fg=fieldGroup(el);
      return !fg||fg===g;
    });
  }
  function fieldKey(el,index){
    const d=el.dataset||{};
    for(const k of ["field","fieldKey","bind","key"])if(S(d[k]))return k+":"+S(d[k]);
    if(S(el.id))return "id:"+S(el.id);
    if(S(el.name))return "name:"+S(el.name);
    const aria=S(el.getAttribute("aria-label"));if(aria)return "aria:"+aria;
    const ph=S(el.getAttribute("placeholder"));if(ph)return "ph:"+ph;
    return "index:"+index;
  }
  function prepare(stage){
    const counts=new Map();
    return fields(stage).map((el,i)=>{
      const base=fieldKey(el,i),n=counts.get(base)||0;counts.set(base,n+1);
      const key=base+(n?"#"+n:"");
      el.dataset.sagsFsagsCoordKey=key;
      return el;
    });
  }
  function pageCfg(key,source=remote){
    return source?.pages?.[key]||{fields:{}};
  }
  function clearMove(el){
    try{el.style.removeProperty("translate")}catch(_){}
  }
  function applyOne(el,cfg,stage){
    if(!el||!stage)return;
    const sr=stage.getBoundingClientRect();
    if(!sr.width||!sr.height)return;
    clearMove(el);
    const br=el.getBoundingClientRect();
    const baseX=br.left-sr.left,baseY=br.top-sr.top;
    const targetX=(Number(cfg?.xPct)||0)*sr.width/100;
    const targetY=(Number(cfg?.yPct)||0)*sr.height/100;
    const dx=targetX-baseX,dy=targetY-baseY;
    el.style.setProperty("translate",`${dx.toFixed(2)}px ${dy.toFixed(2)}px`,"important");
    // User rule: text begins immediately at the LEFT EDGE of the dragged display box.
    el.style.setProperty("text-align","left","important");
    el.style.setProperty("padding-left","1px","important");
    el.style.setProperty("box-sizing","border-box","important");
  }
  function applyStage(stage,source=remote){
    if(!stage)return;
    const key=pageKey(stage),cfg=pageCfg(key,source);
    prepare(stage).forEach(el=>{
      const c=cfg.fields?.[el.dataset.sagsFsagsCoordKey];
      if(c)applyOne(el,c,stage);
    });
  }
  async function refreshConfig(force=false){
    if(fetching)return fetching;
    if(!force&&Date.now()-lastFetch<30000)return remote;
    fetching=(async()=>{
      try{
        const r=await fetch(CONFIG_URL+"?t="+Date.now(),{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
        if(r.ok){
          const j=await r.json();
          if(j&&typeof j==="object"&&j.pages){
            remote={schema:1,build:"FSAGS-DISPLAY-COORDINATES-V1",...j,pages:j.pages||{}};
          }
        }
      }catch(_){}
      lastFetch=Date.now();fetching=null;
      if(activeStage&&!editing)applyStage(activeStage,remote);
      return remote;
    })();
    return fetching;
  }
  function clone(v){return JSON.parse(JSON.stringify(v||{}))}
  function ensureUi(){
    if(!$("sagsFsagsCoordStyle")){
      const st=document.createElement("style");st.id="sagsFsagsCoordStyle";
      st.textContent=`
#sagsFsagsCoordBtn[hidden],#sagsFsagsCoordPanel[hidden]{display:none!important}
#sagsFsagsCoordBtn{position:fixed;right:14px;bottom:calc(78px + env(safe-area-inset-bottom));z-index:2147482900;min-height:48px;padding:10px 15px;border:0;border-radius:999px;background:#0b6398;color:#fff;font:900 14px Arial;box-shadow:0 6px 20px #0004}
#sagsFsagsCoordPanel{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;width:min(590px,calc(100vw - 16px));max-height:46dvh;overflow:auto;background:#fff;color:#17364a;border:1px solid #b8cad8;border-radius:15px;padding:12px;box-shadow:0 14px 44px #0005;font:14px/1.38 Arial}
.sfcHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.sfcHead b{font-size:16px}.sfcHead small{display:block;color:#597080;margin-top:2px}.sfcHead button{width:42px;height:42px;border-radius:10px}
#sfcSelected{margin:9px 0;padding:9px 10px;background:#eef5fa;border-radius:10px;font-weight:800}.sfcHelp{margin:7px 0;color:#4f6576}.sfcActions{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:7px}.sfcActions button{min-height:44px;border:1px solid #acc0cf;border-radius:10px;background:#f7fafc;color:#17364a;font-weight:900}.sfcActions #sfcSave{background:#0b6398;color:#fff}
#sfcStatus{min-height:19px;margin:8px 0 0;font-weight:700}
.sagsFsagsEditing [data-sags-fsags-coord-key]{outline:2px dashed #e38a00!important;outline-offset:2px;cursor:move!important;touch-action:none!important;user-select:none!important}
.sagsFsagsEditing [data-sags-fsags-coord-key].sfcChosen{outline:3px solid #c52331!important;outline-offset:2px;z-index:999!important}
@media(max-width:620px){.sfcActions{grid-template-columns:1fr}#sagsFsagsCoordPanel{max-height:52dvh}}
`;
      document.head.appendChild(st);
    }
    if(!$("sagsFsagsCoordBtn")){
      const b=document.createElement("button");
      b.id="sagsFsagsCoordBtn";b.type="button";b.hidden=true;b.textContent="🛠 CĂN FSAGS";
      b.onclick=enterEdit;document.body.appendChild(b);
    }
    if(!$("sagsFsagsCoordPanel")){
      const p=document.createElement("section");p.id="sagsFsagsCoordPanel";p.hidden=true;
      p.innerHTML=`<div class="sfcHead"><div><b>CĂN TỌA ĐỘ FSAGS</b><small id="sfcPage"></small></div><button id="sfcClose" type="button">✕</button></div>
      <div id="sfcSelected">CHẠM VÀ KÉO Ô HIỂN THỊ CẦN CĂN</div>
      <p class="sfcHelp">Kéo ô đến đúng vị trí. <b>Mép trái của ô chính là điểm bắt đầu hiển thị chữ.</b> Không chỉnh kích thước ô.</p>
      <div class="sfcActions"><button id="sfcCancel" type="button">HỦY</button><button id="sfcReset" type="button">VỀ GỐC Ô</button><button id="sfcSave" type="button">LƯU & XUẤT FILE</button></div>
      <p id="sfcStatus" role="status"></p>`;
      document.body.appendChild(p);
      $("sfcClose").onclick=$("sfcCancel").onclick=cancelEdit;
      $("sfcReset").onclick=resetSelected;
      $("sfcSave").onclick=saveExport;
    }
  }
  function updateButton(){
    ensureUi();
    const b=$("sagsFsagsCoordBtn");
    const ok=isAdmin()&&!!activeStage&&visible(activeStage);
    b.hidden=!ok;b.style.display=ok?"block":"none";
  }
  function status(t){const el=$("sfcStatus");if(el)el.textContent=S(t)}
  function selectField(el){
    if(!editing||!activeStage?.contains(el))return;
    prepare(activeStage).forEach(x=>x.classList.toggle("sfcChosen",x===el));
    selected=el;
    const info=$("sfcSelected");
    if(info){
      const r=el.getBoundingClientRect(),sr=activeStage.getBoundingClientRect();
      info.textContent=`${el.dataset.sagsFsagsCoordKey} · X ${Math.round(r.left-sr.left)} · Y ${Math.round(r.top-sr.top)}`;
    }
  }
  function snapshotStyles(){
    beforeEditSnapshot.clear();
    for(const el of prepare(activeStage)){
      beforeEditSnapshot.set(el,{
        translate:el.style.getPropertyValue("translate"),
        textAlign:el.style.getPropertyValue("text-align"),
        paddingLeft:el.style.getPropertyValue("padding-left"),
        boxSizing:el.style.getPropertyValue("box-sizing")
      });
    }
  }
  function restoreSnapshot(){
    for(const [el,s] of beforeEditSnapshot){
      if(!el?.isConnected)continue;
      for(const [prop,val] of [["translate",s.translate],["text-align",s.textAlign],["padding-left",s.paddingLeft],["box-sizing",s.boxSizing]]){
        if(val)el.style.setProperty(prop,val,"important");else el.style.removeProperty(prop);
      }
      el.classList.remove("sfcChosen");
    }
  }
  function enterEdit(){
    if(!isAdmin()||!activeStage)return;
    editing=true;selected=null;draft=clone(remote);draft.pages||={};
    snapshotStyles();
    document.body.classList.add("sagsFsagsEditing");
    prepare(activeStage);
    $("sagsFsagsCoordPanel").hidden=false;
    $("sfcPage").textContent=pageKey(activeStage);
    status("Kéo trực tiếp ô hiển thị đến đúng tọa độ.");
  }
  function exitEdit(){
    editing=false;selected=null;drag=null;document.body.classList.remove("sagsFsagsEditing");
    $("sagsFsagsCoordPanel").hidden=true;
    prepare(activeStage).forEach(x=>x.classList.remove("sfcChosen"));
  }
  function cancelEdit(){
    restoreSnapshot();exitEdit();
  }
  function currentCfgFor(el){
    const pk=activePageKey||pageKey(activeStage);
    draft.pages||={};draft.pages[pk]||={fields:{}};draft.pages[pk].fields||={};
    return draft.pages[pk].fields;
  }
  function setTarget(el,left,top){
    const sr=activeStage.getBoundingClientRect();
    if(!sr.width||!sr.height)return;
    const xPct=Math.max(0,Math.min(100,left/sr.width*100));
    const yPct=Math.max(0,Math.min(100,top/sr.height*100));
    const map=currentCfgFor(el);
    map[el.dataset.sagsFsagsCoordKey]={xPct:+xPct.toFixed(5),yPct:+yPct.toFixed(5)};
    applyOne(el,map[el.dataset.sagsFsagsCoordKey],activeStage);
    selectField(el);
  }
  function resetSelected(){
    if(!selected)return status("Chạm chọn ô cần đưa về gốc.");
    const map=currentCfgFor(selected);
    delete map[selected.dataset.sagsFsagsCoordKey];
    clearMove(selected);
    selected.style.setProperty("text-align","left","important");
    selected.style.setProperty("padding-left","1px","important");
    selectField(selected);status("Đã đưa ô về tọa độ gốc trong bản đang chỉnh.");
  }
  function exportedConfig(){
    const now=new Date().toISOString(),u=session().username||"AD";
    const out={
      schema:1,
      build:"FSAGS-DISPLAY-COORDINATES-V1",
      updatedAt:now,
      updatedBy:u,
      note:"Generated by SAGS AD FSAGS coordinate editor. Replace this file in GitHub root.",
      pages:draft?.pages||{}
    };
    // Remove empty pages.
    for(const k of Object.keys(out.pages||{}))if(!Object.keys(out.pages[k]?.fields||{}).length)delete out.pages[k];
    return out;
  }
  async function saveExport(){
    if(!editing)return;
    try{
      const cfg=exportedConfig();
      const text=JSON.stringify(cfg,null,2)+"\n";
      const blob=new Blob([text],{type:"application/json;charset=utf-8"});
      const fileName="fsags-display-coordinates.json";
      let shared=false;
      try{
        if(typeof File!=="undefined"&&navigator.share){
          const file=new File([blob],fileName,{type:"application/json"});
          if(!navigator.canShare||navigator.canShare({files:[file]})){
            await navigator.share({files:[file],title:fileName});
            shared=true;
          }
        }
      }catch(_){}
      if(!shared){
        const url=URL.createObjectURL(blob),a=document.createElement("a");
        a.href=url;a.download=fileName;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1500);
      }
      remote=clone(cfg);lastFetch=Date.now();
      status("ĐÃ XUẤT fsags-display-coordinates.json · thay file này trên GitHub để áp dụng cho các máy.");
      setTimeout(exitEdit,900);
    }catch(e){status("Chưa xuất được file: "+S(e?.message||e))}
  }

  document.addEventListener("pointerdown",e=>{
    if(!editing||!activeStage)return;
    const el=e.target.closest?.("[data-sags-fsags-coord-key]");
    if(!el||!activeStage.contains(el))return;
    e.preventDefault();e.stopImmediatePropagation();selectField(el);
    const sr=activeStage.getBoundingClientRect(),r=el.getBoundingClientRect();
    drag={el,dx:e.clientX-r.left,dy:e.clientY-r.top,sr};
    try{el.setPointerCapture?.(e.pointerId)}catch(_){}
  },true);
  document.addEventListener("pointermove",e=>{
    if(!editing||!drag)return;
    e.preventDefault();e.stopImmediatePropagation();
    const sr=activeStage.getBoundingClientRect(),r=drag.el.getBoundingClientRect();
    const left=Math.max(0,Math.min(sr.width-r.width,e.clientX-sr.left-drag.dx));
    const top=Math.max(0,Math.min(sr.height-r.height,e.clientY-sr.top-drag.dy));
    setTarget(drag.el,left,top);
  },true);
  document.addEventListener("pointerup",()=>{drag=null},true);

  function scan(){
    ensureUi();
    const next=detectStage();
    if(next!==activeStage){
      if(editing){restoreSnapshot();exitEdit()}
      activeStage=next;activePageKey=next?pageKey(next):"";
      if(next){
        refreshConfig(false).finally(()=>applyStage(next,remote));
      }
    }else if(next&&!editing){
      applyStage(next,remote);
      refreshConfig(false);
    }
    updateButton();
  }
  function scheduleScan(){
    if(scanQueued)return;scanQueued=true;
    requestAnimationFrame(()=>{scanQueued=false;scan()});
  }
  new MutationObserver(scheduleScan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style","hidden","aria-hidden"]});
  root.addEventListener("resize",scheduleScan);
  root.addEventListener("focus",()=>refreshConfig(false));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshConfig(false)});
  setInterval(()=>refreshConfig(false),5*60*1000);

  root.sagsFsagsCoordInfo=()=>({
    build:BUILD,admin:isAdmin(),editing,pageKey:activePageKey,
    fieldCount:activeStage?prepare(activeStage).length:0,
    configUpdatedAt:remote?.updatedAt||""
  });

  ensureUi();refreshConfig(true).finally(scan);
})(typeof window==="undefined"?globalThis:window);
