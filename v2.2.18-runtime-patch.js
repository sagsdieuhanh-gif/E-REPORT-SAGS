/* E-REPORT/SAGS V4.2.43 · V2.2.18-AD-FSAGS-BBBT-COORD-PREVIEW-RESIZE
   ONLY AD -> AD Control Center -> CĂN CHỈNH BIỂU MẪU.
   Choose FSAGS/BBBT -> preview actual page*.png -> drag DISPLAY rectangle.
   Drag right/bottom/corner handles to resize vw/vh.
   Left edge of rectangle is the text start anchor.
   SAVE exports fsags-display-coordinates.json for GitHub. No Firebase. */
(function(root){
  "use strict";
  const BUILD="V2.2.18-AD-FSAGS-BBBT-COORD-PREVIEW-RESIZE";
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
    bbbt:{label:"BBBT · F/SAGS-CXR/56",pages:[4]}
  };

  let config={schema:2,build:"FSAGS-BBBT-DISPLAY-COORDINATES-V1",pages:{}};
  let draft=null, editing=false, activeGroup="", activePage=0, selected=null, drag=null;
  let baseByField=new WeakMap(), fetchAt=0, fetchJob=null, drawRaf=0;

  function session(){
    try{
      const s=root.__sagsGetSession?.()||{},p=s.profile||{};
      return {role:U(s.role||p.role||p.systemRole||root.currentRole),username:S(s.username||p.username||p.userName||p.login||p.account||root.currentUserProfile?.username)};
    }catch(_){return {role:U(root.currentRole),username:S(root.currentUserProfile?.username)}}
  }
  const isAdmin=()=>session().role==="AD";

  function globalFields(){
    try{if(typeof fields!=="undefined"&&Array.isArray(fields))return fields}catch(_){}
    return [];
  }
  function redraw(){
    if(drawRaf)return;
    drawRaf=requestAnimationFrame(()=>{drawRaf=0;try{if(typeof draw==="function")draw()}catch(_){}});
  }
  function rememberBase(f){
    if(!baseByField.has(f))baseByField.set(f,{vx:Number(f.vx)||0,vy:Number(f.vy)||0,vw:Number(f.vw)||0,vh:Number(f.vh)||0,align:f.align,leftValue:f.leftValue,manualInset:f.manualInset});
    return baseByField.get(f);
  }
  function resetFieldToBase(f){
    const b=rememberBase(f);f.vx=b.vx;f.vy=b.vy;f.vw=b.vw;f.vh=b.vh;f.align=b.align;f.leftValue=b.leftValue;f.manualInset=b.manualInset;
  }
  function pageCfg(page,source=config){return source?.pages?.[String(page)]||{fields:{}}}
  function applyConfig(source=config){
    const fs=globalFields();if(!fs.length)return false;
    for(const f of fs){
      rememberBase(f);resetFieldToBase(f);
      const c=pageCfg(f.page,source)?.fields?.[S(f.key)];if(!c)continue;
      if(Number.isFinite(Number(c.vx)))f.vx=Number(c.vx);
      if(Number.isFinite(Number(c.vy)))f.vy=Number(c.vy);
      if(Number.isFinite(Number(c.vw)))f.vw=Number(c.vw);
      if(Number.isFinite(Number(c.vh)))f.vh=Number(c.vh);
      f.align="left";f.leftValue=true;f.manualInset=0;
    }
    redraw();return true;
  }
  async function refreshConfig(force=false){
    if(fetchJob)return fetchJob;
    if(!force&&Date.now()-fetchAt<30000)return config;
    fetchJob=(async()=>{
      try{
        const r=await fetch(CONFIG_URL+"?t="+Date.now(),{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
        if(r.ok){const j=await r.json();if(j&&typeof j==="object"&&j.pages)config={schema:2,build:"FSAGS-BBBT-DISPLAY-COORDINATES-V1",...j,pages:j.pages||{}}}
      }catch(_){}
      fetchAt=Date.now();fetchJob=null;if(!editing)applyConfig(config);return config;
    })();
    return fetchJob;
  }

  function ensureStyle(){
    if($("sagsCoord43Style"))return;
    const st=document.createElement("style");st.id="sagsCoord43Style";
    st.textContent=`
#sagsCoord43Center[hidden],#sagsCoord43Preview[hidden],#sagsCoord43Panel[hidden]{display:none!important}
#sagsCoord43Center{position:fixed;inset:0;z-index:2147482500;background:#17364ac4;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font:14px/1.4 Arial;color:#17364a}
.s43centerBox{width:min(700px,96vw);max-height:90dvh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 15px 50px #0005}.s43head{display:flex;justify-content:space-between;align-items:center;gap:10px}.s43head h3{margin:0;color:#0b5cab}.s43head button{width:44px;height:44px;border-radius:10px}.s43help{margin:8px 0 12px;color:#516879}.s43list{display:grid;grid-template-columns:1fr 1fr;gap:9px}.s43choice{min-height:64px;border:1px solid #b9cbd8;border-radius:12px;background:#fff;text-align:left;padding:10px 12px;color:#17364a;font-weight:900;font-size:15px}.s43choice small{display:block;font-weight:500;color:#5c7283;margin-top:3px}
#sagsCoord43Preview{position:fixed;inset:0;z-index:2147482700;background:#dfe6ec;overflow:auto;padding:max(60px,env(safe-area-inset-top)) 8px calc(235px + env(safe-area-inset-bottom));box-sizing:border-box}.s43previewTop{position:fixed;left:0;right:0;top:0;z-index:2147483150;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#17364a;color:#fff;padding:max(8px,env(safe-area-inset-top)) 10px 8px;box-sizing:border-box}.s43previewTop b{font:900 14px Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s43previewTop button{min-height:40px;border:0;border-radius:9px;background:#fff;color:#17364a;font-weight:900;padding:7px 10px}
#s43tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:0 auto 8px;max-width:920px}#s43tabs button{min-height:40px;border:1px solid #aabdc9;border-radius:999px;background:#fff;color:#17364a;padding:7px 14px;font-weight:900}#s43tabs button.active{background:#0b6398;color:#fff;border-color:#0b6398}
#s43sheet{position:relative;width:min(100%,1241px);aspect-ratio:1241/1755;margin:0 auto;background:#fff;overflow:hidden;box-shadow:0 5px 20px #0004}#s43bg,#s43svg,#s43layer{position:absolute;inset:0;width:100%;height:100%;display:block}#s43bg{z-index:1;object-fit:fill}#s43svg{z-index:2;pointer-events:none}#s43layer{z-index:3;pointer-events:none}
.s43rect{position:absolute;pointer-events:auto;border:2px dashed #e08a00;background:rgba(255,193,7,.08);box-sizing:border-box;cursor:move;touch-action:none;user-select:none;min-width:8px;min-height:8px}.s43rect::before{content:"";position:absolute;left:-2px;top:-2px;bottom:-2px;width:3px;background:#d82432}.s43rect.s43chosen{border:3px solid #c72130;background:rgba(199,33,48,.08)}.s43label{display:none;position:absolute;left:3px;top:3px;max-width:calc(100% - 6px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#17364a;color:#fff;padding:1px 3px;border-radius:3px;font:700 9px Arial;pointer-events:none}.s43rect.s43chosen .s43label{display:block}.s43handle{position:absolute;z-index:5;background:#0b6398;border:2px solid #fff;box-shadow:0 1px 4px #0005;pointer-events:auto;touch-action:none}.s43handle.e{right:-7px;top:50%;width:14px;height:28px;transform:translateY(-50%);border-radius:7px;cursor:ew-resize}.s43handle.s{left:50%;bottom:-7px;width:28px;height:14px;transform:translateX(-50%);border-radius:7px;cursor:ns-resize}.s43handle.se{right:-8px;bottom:-8px;width:18px;height:18px;border-radius:50%;cursor:nwse-resize}
#sagsCoord43Panel{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483200;width:min(730px,calc(100vw - 16px));max-height:44dvh;overflow:auto;background:#fff;color:#17364a;border:1px solid #adc2d1;border-radius:16px;padding:11px;box-shadow:0 16px 48px #0006;font:14px/1.35 Arial}.s43panelHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.s43panelHead b{font-size:16px}.s43panelHead small{display:block;color:#5a7081}#s43selected{margin:8px 0;padding:8px 10px;background:#eef5fa;border-radius:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s43sizeTools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:7px 0}.s43sizeBox{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center}.s43sizeBox span{text-align:center;font-weight:900}.s43sizeBox button{min-height:40px;border:1px solid #adc1cf;border-radius:9px;background:#f7fafc;font-weight:900}.s43actions{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:7px}.s43actions button{min-height:44px;border:1px solid #adc1cf;border-radius:10px;background:#f7fafc;color:#17364a;font-weight:900}.s43actions #s43save{background:#0b6398;color:#fff}#s43status{min-height:18px;margin:7px 0 0;font-weight:700}
@media(max-width:640px){.s43list{grid-template-columns:1fr}.s43actions{grid-template-columns:1fr}.s43sizeTools{grid-template-columns:1fr}#sagsCoord43Panel{max-height:50dvh}}
`;
    document.head.appendChild(st);
  }

  function ensureUi(){
    ensureStyle();
    if(!$("sagsCoord43Center")){
      const m=document.createElement("section");m.id="sagsCoord43Center";m.hidden=true;
      m.innerHTML=`<div class="s43centerBox"><div class="s43head"><h3>CĂN CHỈNH BIỂU MẪU</h3><button id="s43centerClose" type="button">✕</button></div><p class="s43help">Chỉ dành cho AD. Chọn FSAGS hoặc BBBT cần căn tọa độ hiển thị.</p><div id="s43list" class="s43list"></div></div>`;
      document.body.appendChild(m);$("s43centerClose").onclick=closeCenter;m.addEventListener("click",e=>{if(e.target===m)closeCenter()});
      const list=$("s43list");
      for(const [group,meta] of Object.entries(FORMS)){
        const b=document.createElement("button");b.type="button";b.className="s43choice";b.innerHTML=`${meta.label}<small>${meta.pages.length>1?"Trang "+meta.pages.join(" + "):"Trang "+meta.pages[0]}</small>`;b.onclick=()=>openEditor(group);list.appendChild(b);
      }
    }
    if(!$("sagsCoord43Preview")){
      const pv=document.createElement("section");pv.id="sagsCoord43Preview";pv.hidden=true;
      pv.innerHTML=`<div class="s43previewTop"><button id="s43back" type="button">← DANH SÁCH</button><b id="s43previewTitle">CĂN BIỂU MẪU</b><button id="s43previewClose" type="button">ĐÓNG</button></div><div id="s43tabs"></div><div id="s43sheet"><img id="s43bg" alt="Nền biểu mẫu"><svg id="s43svg" viewBox="0 0 1241 1755" preserveAspectRatio="none"></svg><div id="s43layer"></div></div>`;
      document.body.appendChild(pv);$("s43back").onclick=()=>{cancelEdit();openCenter()};$("s43previewClose").onclick=cancelEdit;
    }
    if(!$("sagsCoord43Panel")){
      const p=document.createElement("section");p.id="sagsCoord43Panel";p.hidden=true;
      p.innerHTML=`<div class="s43panelHead"><div><b id="s43title">CĂN TỌA ĐỘ</b><small>Kéo khung = vị trí · kéo tay nắm = rộng/cao</small></div></div><div id="s43selected">Chạm một khung màu cam để chỉnh.</div><div class="s43sizeTools"><div class="s43sizeBox"><button id="s43wMinus" type="button">−</button><span id="s43wInfo">RỘNG</span><button id="s43wPlus" type="button">+</button></div><div class="s43sizeBox"><button id="s43hMinus" type="button">−</button><span id="s43hInfo">CAO</span><button id="s43hPlus" type="button">+</button></div></div><div class="s43actions"><button id="s43cancel" type="button">HỦY</button><button id="s43reset" type="button">VỀ GỐC Ô</button><button id="s43save" type="button">LƯU & XUẤT FILE</button></div><p id="s43status" role="status"></p>`;
      document.body.appendChild(p);$("s43cancel").onclick=cancelEdit;$("s43reset").onclick=resetSelected;$("s43save").onclick=saveExport;$("s43wMinus").onclick=()=>resizeSelected(-3,0);$("s43wPlus").onclick=()=>resizeSelected(3,0);$("s43hMinus").onclick=()=>resizeSelected(0,-3);$("s43hPlus").onclick=()=>resizeSelected(0,3);
    }
  }

  function ensureAdminCard(){
    const center=$("v181AdminCenter");let card=$("sagsCoord43AdminCard");if(!isAdmin()){card?.remove();return}if(!center||card)return;const grids=center.querySelectorAll(".v181AdminGrid"),grid=grids[grids.length-1];if(!grid)return;
    card=document.createElement("button");card.id="sagsCoord43AdminCard";card.type="button";card.className="v181AdminCard";card.innerHTML='<span class="v181AdminIcon">↔</span><span class="v181AdminCardText"><b>CĂN CHỈNH BIỂU MẪU</b><small>FSAGS 42.3 / 42.1 / 55.1 / 09 / 208 / BBBT</small></span><em>MỞ</em>';card.onclick=openCenter;grid.appendChild(card);
  }
  function openCenter(){if(!isAdmin())return;ensureUi();$("sagsCoord43Center").hidden=false}
  function closeCenter(){const m=$("sagsCoord43Center");if(m)m.hidden=true}

  function fieldCandidates(group,page=null){
    const allowed=new Set(FORMS[group]?.pages||[]);
    return globalFields().filter(f=>{if(!allowed.has(Number(f.page)))return false;if(page!==null&&Number(f.page)!==Number(page))return false;if(!S(f.key))return false;const type=U(f.type);if(["SIGNATURE","CHECK"].includes(type))return false;return [f.vx,f.vy,f.vw,f.vh].every(v=>Number.isFinite(Number(v)))})
  }
  function getSourcePage(page){return $("page"+page)}
  function getBackgroundSrc(page){const srcNode=getSourcePage(page),srcImg=srcNode?.querySelector("img");return srcImg?.getAttribute("src")||`./page${page}.png`}
  function cloneRenderedSvg(page){const dst=$("s43svg");if(!dst)return;dst.innerHTML="";const src=getSourcePage(page)?.querySelector("svg");if(!src)return;try{dst.innerHTML=src.innerHTML;dst.querySelectorAll(".hit,.selected-region").forEach(n=>n.remove())}catch(_){}}
  function renderTabs(){const box=$("s43tabs");if(!box)return;box.innerHTML="";for(const p of FORMS[activeGroup]?.pages||[]){const b=document.createElement("button");b.type="button";b.textContent="TRANG "+p;b.classList.toggle("active",Number(p)===Number(activePage));b.onclick=()=>buildPage(p);box.appendChild(b)}}
  function rectFromField(f){
    const rect=document.createElement("div");rect.className="s43rect";rect.dataset.page=String(f.page);rect.dataset.key=S(f.key);rect._field=f;rect.style.left=(Number(f.vx)*100)+"%";rect.style.top=(Number(f.vy)*100)+"%";rect.style.width=(Math.max(Number(f.vw),0.006)*100)+"%";rect.style.height=(Math.max(Number(f.vh),0.006)*100)+"%";
    const lab=document.createElement("span");lab.className="s43label";lab.textContent=S(f.label||f.key);rect.appendChild(lab);
    for(const mode of ["e","s","se"]){const h=document.createElement("i");h.className="s43handle "+mode;h.dataset.resize=mode;h.title=mode==="e"?"Đổi độ rộng":mode==="s"?"Đổi độ cao":"Đổi rộng + cao";rect.appendChild(h)}
    return rect;
  }
  function buildPage(page){
    activePage=Number(page)||0;const bg=$("s43bg");if(bg)bg.src=getBackgroundSrc(activePage);cloneRenderedSvg(activePage);const layer=$("s43layer");layer.innerHTML="";
    for(const f of fieldCandidates(activeGroup,activePage)){rememberBase(f);layer.appendChild(rectFromField(f))}
    $("s43previewTitle").textContent=`${FORMS[activeGroup]?.label||activeGroup} · TRANG ${activePage}`;renderTabs();selectRect(null);$("s43status").textContent=layer.children.length?`Có ${layer.children.length} vùng hiển thị. Kéo khung để đổi vị trí; kéo tay nắm phải/dưới/góc để đổi kích thước.`:"Không tìm thấy vùng hiển thị của trang này.";
  }
  function selectRect(rect){$("s43layer")?.querySelectorAll(".s43chosen").forEach(x=>x.classList.remove("s43chosen"));selected=rect||null;if(rect)rect.classList.add("s43chosen");updateSelectedInfo()}
  function updateSelectedInfo(){
    const info=$("s43selected"),wi=$("s43wInfo"),hi=$("s43hInfo");if(!selected?._field){if(info)info.textContent="Chạm một khung màu cam để chỉnh.";if(wi)wi.textContent="RỘNG";if(hi)hi.textContent="CAO";return}
    const f=selected._field,rr=selected.getBoundingClientRect();if(info)info.textContent=`${S(f.label||f.key)} · ${S(f.key)} · Trang ${f.page}`;if(wi)wi.textContent=`RỘNG ${Math.round(rr.width)} px`;if(hi)hi.textContent=`CAO ${Math.round(rr.height)} px`;
  }
  function draftMap(f){draft.pages||={};const p=String(f.page);draft.pages[p]||={fields:{}};draft.pages[p].fields||={};return draft.pages[p].fields}
  function commitRect(rect){
    if(!rect?._field)return;const f=rect._field,layer=$("s43layer"),lr=layer.getBoundingClientRect(),rr=rect.getBoundingClientRect();if(!lr.width||!lr.height)return;
    const vx=Math.max(0,Math.min(1,(rr.left-lr.left)/lr.width)),vy=Math.max(0,Math.min(1,(rr.top-lr.top)/lr.height)),vw=Math.max(0.004,Math.min(1-vx,rr.width/lr.width)),vh=Math.max(0.004,Math.min(1-vy,rr.height/lr.height));
    const c={vx:+vx.toFixed(7),vy:+vy.toFixed(7),vw:+vw.toFixed(7),vh:+vh.toFixed(7),align:"left",leftValue:true,manualInset:0};draftMap(f)[S(f.key)]=c;f.vx=c.vx;f.vy=c.vy;f.vw=c.vw;f.vh=c.vh;f.align="left";f.leftValue=true;f.manualInset=0;redraw();updateSelectedInfo();
  }
  function startPointer(e,rect){
    if(!editing)return;e.preventDefault();e.stopImmediatePropagation();selectRect(rect);const layer=$("s43layer"),lr=layer.getBoundingClientRect(),rr=rect.getBoundingClientRect(),handle=e.target.closest?.(".s43handle");drag={rect,mode:handle?.dataset?.resize||"move",startX:e.clientX,startY:e.clientY,left:rr.left-lr.left,top:rr.top-lr.top,width:rr.width,height:rr.height,layerW:lr.width,layerH:lr.height};try{rect.setPointerCapture?.(e.pointerId)}catch(_){}
  }
  function movePointer(e){
    if(!drag)return;e.preventDefault();e.stopImmediatePropagation();const d=drag,dx=e.clientX-d.startX,dy=e.clientY-d.startY;let left=d.left,top=d.top,width=d.width,height=d.height;const minW=12,minH=10;
    if(d.mode==="move"){left=Math.max(0,Math.min(d.layerW-width,d.left+dx));top=Math.max(0,Math.min(d.layerH-height,d.top+dy))}else{if(d.mode.includes("e"))width=Math.max(minW,Math.min(d.layerW-left,d.width+dx));if(d.mode.includes("s"))height=Math.max(minH,Math.min(d.layerH-top,d.height+dy))}
    d.rect.style.left=(left/d.layerW*100)+"%";d.rect.style.top=(top/d.layerH*100)+"%";d.rect.style.width=(width/d.layerW*100)+"%";d.rect.style.height=(height/d.layerH*100)+"%";updateSelectedInfo();
  }
  function endPointer(){if(!drag)return;commitRect(drag.rect);drag=null}
  document.addEventListener("pointerdown",e=>{const rect=e.target.closest?.(".s43rect");if(rect&&$("s43layer")?.contains(rect))startPointer(e,rect)},true);document.addEventListener("pointermove",movePointer,true);document.addEventListener("pointerup",endPointer,true);document.addEventListener("pointercancel",endPointer,true);
  function resizeSelected(dwPx,dhPx){
    if(!selected?._field){$("s43status").textContent="Chọn một khung trước.";return}const layer=$("s43layer"),lr=layer.getBoundingClientRect(),rr=selected.getBoundingClientRect();const width=Math.max(12,Math.min(lr.right-rr.left,rr.width+dwPx)),height=Math.max(10,Math.min(lr.bottom-rr.top,rr.height+dhPx));selected.style.width=(width/lr.width*100)+"%";selected.style.height=(height/lr.height*100)+"%";commitRect(selected)
  }
  function openEditor(group){
    if(!isAdmin()||!FORMS[group])return;closeCenter();activeGroup=group;activePage=FORMS[group].pages[0];editing=true;selected=null;drag=null;draft=clone(config);draft.schema=2;draft.pages||={};applyConfig(draft);$("sagsCoord43Preview").hidden=false;$("sagsCoord43Panel").hidden=false;$("s43title").textContent="CĂN TỌA ĐỘ · "+FORMS[group].label;buildPage(activePage)
  }
  function resetSelected(){
    if(!selected?._field){$("s43status").textContent="Chọn một khung trước.";return}const f=selected._field,b=rememberBase(f);delete draftMap(f)[S(f.key)];f.vx=b.vx;f.vy=b.vy;f.vw=b.vw;f.vh=b.vh;f.align=b.align;f.leftValue=b.leftValue;f.manualInset=b.manualInset;selected.style.left=(b.vx*100)+"%";selected.style.top=(b.vy*100)+"%";selected.style.width=(b.vw*100)+"%";selected.style.height=(b.vh*100)+"%";redraw();updateSelectedInfo();$("s43status").textContent="Đã đưa vùng đang chọn về vị trí và kích thước gốc."
  }
  function cancelEdit(){editing=false;selected=null;drag=null;if($("s43layer"))$("s43layer").innerHTML="";if($("sagsCoord43Preview"))$("sagsCoord43Preview").hidden=true;if($("sagsCoord43Panel"))$("sagsCoord43Panel").hidden=true;applyConfig(config)}
  function exportConfig(){
    const out={schema:2,build:"FSAGS-BBBT-DISPLAY-COORDINATES-V1",updatedAt:new Date().toISOString(),updatedBy:session().username||"AD",note:"Generated from AD > CĂN CHỈNH BIỂU MẪU. Replace this file in GitHub root.",pages:clone(draft?.pages||{})};for(const p of Object.keys(out.pages))if(!Object.keys(out.pages[p]?.fields||{}).length)delete out.pages[p];return out;
  }
  async function saveExport(){
    if(!editing)return;try{const cfg=exportConfig(),text=JSON.stringify(cfg,null,2)+"\n",blob=new Blob([text],{type:"application/json;charset=utf-8"}),name="fsags-display-coordinates.json";let shared=false;try{if(typeof File!=="undefined"&&navigator.share){const file=new File([blob],name,{type:"application/json"});if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});shared=true}}}catch(_){}if(!shared){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}config=clone(cfg);fetchAt=Date.now();$("s43status").textContent="ĐÃ XUẤT fsags-display-coordinates.json · thay file này trên GitHub để áp dụng.";setTimeout(cancelEdit,900)}catch(e){$("s43status").textContent="Chưa xuất được file: "+S(e?.message||e)}
  }
  function scan(){ensureUi();ensureAdminCard();if(!editing)applyConfig(config)}
  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan()})}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["style","class","hidden"]});["sags:login","sags:rolechange","sags:profilechange","sags:ui-ready"].forEach(n=>root.addEventListener?.(n,schedule));root.addEventListener("focus",()=>refreshConfig(false));document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshConfig(false)});
  root.sagsOpenCoordinateCenter=()=>{if(isAdmin())openCenter()};root.sagsCoordinateInfo=()=>({build:BUILD,admin:isAdmin(),editing,group:activeGroup,page:activePage,totalFields:globalFields().length,activeFields:activeGroup?fieldCandidates(activeGroup,activePage).length:0,configUpdatedAt:S(config.updatedAt)});
  ensureUi();refreshConfig(true).finally(()=>{scan();let n=0;const t=setInterval(()=>{n++;if(applyConfig(config)||n>=12)clearInterval(t)},500)});
})(typeof window==="undefined"?globalThis:window);
