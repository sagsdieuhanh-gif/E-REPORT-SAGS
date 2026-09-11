/* E-REPORT/SAGS V4.2.44 · V2.2.18-AD-FSAGS-BBBT-COORD-TEMP-TEST
   ONLY AD -> AD Control Center -> CĂN CHỈNH BIỂU MẪU.
   Multi-form workflow:
   - drag vx/vy
   - resize vw/vh
   - LƯU TẠM to localStorage (this AD device only)
   - TEST HIỂN THỊ on real page*.png background
   - continue other FSAGS/BBBT
   - XUẤT FILE CẬP NHẬT once -> fsags-display-coordinates.json
   No Firebase. */
(function(root){
  "use strict";
  const BUILD="V2.2.18-AD-FSAGS-BBBT-COORD-TEMP-TEST";
  if(root.__SAGS_AD_FSAGS_BBBT_COORD===BUILD)return;
  root.__SAGS_AD_FSAGS_BBBT_COORD=BUILD;

  const CONFIG_URL="./fsags-display-coordinates.json";
  const TEMP_KEY="sags.fsags-bbbt-coordinate-draft.v1";
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
  let temp=null,draft=null,editing=false,testMode=false,activeGroup="",activePage=0,selected=null,drag=null;
  let baseByField=new WeakMap(),fetchAt=0,fetchJob=null,drawRaf=0;

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
  function pageCfg(page,source){
    return source?.pages?.[String(page)]||{fields:{}};
  }
  function applyConfig(source){
    source=source||config;
    const fs=globalFields();
    if(!fs.length)return false;
    for(const f of fs){
      rememberBase(f);
      resetFieldToBase(f);
      const c=pageCfg(f.page,source)?.fields?.[S(f.key)];
      if(!c)continue;
      if(Number.isFinite(Number(c.vx)))f.vx=Number(c.vx);
      if(Number.isFinite(Number(c.vy)))f.vy=Number(c.vy);
      if(Number.isFinite(Number(c.vw)))f.vw=Number(c.vw);
      if(Number.isFinite(Number(c.vh)))f.vh=Number(c.vh);
      f.align="left";f.leftValue=true;f.manualInset=0;
    }
    redraw();
    return true;
  }

  function loadTemp(){
    try{
      const x=JSON.parse(localStorage.getItem(TEMP_KEY)||"null");
      if(x&&x.pages&&typeof x.pages==="object"){
        temp=x;
        return temp;
      }
    }catch(_){}
    temp=null;
    return null;
  }
  function saveTempObject(obj){
    const x=clone(obj);
    x.schema=2;
    x.build="FSAGS-BBBT-DISPLAY-COORDINATES-V1";
    x.tempSavedAt=new Date().toISOString();
    x.tempSavedBy=session().username||"AD";
    localStorage.setItem(TEMP_KEY,JSON.stringify(x));
    temp=x;
    updateTempSummary();
    return x;
  }
  function clearTemp(){
    try{localStorage.removeItem(TEMP_KEY)}catch(_){}
    temp=null;
    updateTempSummary();
  }
  function workingBase(){
    return clone(temp||config);
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
      if(!editing)applyConfig(temp||config);
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
.s44help{margin:8px 0 10px;color:#516879}.s44temp{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;margin-bottom:10px;background:#eef5fa;border-radius:10px}
.s44temp b{color:#0b5cab}.s44tempActions{display:flex;gap:6px;flex-wrap:wrap}.s44tempActions button{min-height:38px;border:1px solid #aebfca;border-radius:9px;background:#fff;color:#17364a;font-weight:900;padding:7px 10px}.s44tempActions #s44exportAll{background:#0b6398;color:#fff}
.s44list{display:grid;grid-template-columns:1fr 1fr;gap:9px}.s44choice{min-height:64px;border:1px solid #b9cbd8;border-radius:12px;background:#fff;text-align:left;padding:10px 12px;color:#17364a;font-weight:900;font-size:15px}.s44choice small{display:block;font-weight:500;color:#5c7283;margin-top:3px}

#sagsCoord44Preview{position:fixed;inset:0;z-index:2147482700;background:#dfe6ec;overflow:auto;padding:max(60px,env(safe-area-inset-top)) 8px calc(250px + env(safe-area-inset-bottom));box-sizing:border-box}
.s44previewTop{position:fixed;left:0;right:0;top:0;z-index:2147483150;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#17364a;color:#fff;padding:max(8px,env(safe-area-inset-top)) 10px 8px;box-sizing:border-box}
.s44previewTop b{font:900 14px Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s44previewTop button{min-height:40px;border:0;border-radius:9px;background:#fff;color:#17364a;font-weight:900;padding:7px 10px}
#s44tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:0 auto 8px;max-width:920px}#s44tabs button{min-height:40px;border:1px solid #aabdc9;border-radius:999px;background:#fff;color:#17364a;padding:7px 14px;font-weight:900}#s44tabs button.active{background:#0b6398;color:#fff;border-color:#0b6398}
#s44sheet{position:relative;width:min(100%,1241px);aspect-ratio:1241/1755;margin:0 auto;background:#fff;overflow:hidden;box-shadow:0 5px 20px #0004}
#s44bg,#s44values,#s44test,#s44layer{position:absolute;inset:0;width:100%;height:100%;display:block}#s44bg{z-index:1;object-fit:fill}#s44values{z-index:2;pointer-events:none}#s44test{z-index:3;pointer-events:none}#s44layer{z-index:4;pointer-events:none}
.s44rect{position:absolute;pointer-events:auto;border:2px dashed #e08a00;background:rgba(255,193,7,.08);box-sizing:border-box;cursor:move;touch-action:none;user-select:none;min-width:8px;min-height:8px}.s44rect::before{content:"";position:absolute;left:-2px;top:-2px;bottom:-2px;width:3px;background:#d82432}.s44rect.s44chosen{border:3px solid #c72130;background:rgba(199,33,48,.08)}
.s44label{display:none;position:absolute;left:3px;top:3px;max-width:calc(100% - 6px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#17364a;color:#fff;padding:1px 3px;border-radius:3px;font:700 9px Arial;pointer-events:none}.s44rect.s44chosen .s44label{display:block}
.s44handle{position:absolute;z-index:5;background:#0b6398;border:2px solid #fff;box-shadow:0 1px 4px #0005;pointer-events:auto;touch-action:none}.s44handle.e{right:-7px;top:50%;width:14px;height:28px;transform:translateY(-50%);border-radius:7px;cursor:ew-resize}.s44handle.s{left:50%;bottom:-7px;width:28px;height:14px;transform:translateX(-50%);border-radius:7px;cursor:ns-resize}.s44handle.se{right:-8px;bottom:-8px;width:18px;height:18px;border-radius:50%;cursor:nwse-resize}
#sagsCoord44Preview.s44testing #s44layer{display:none!important}#sagsCoord44Preview.s44testing #s44test{display:block!important}#sagsCoord44Preview:not(.s44testing) #s44test{display:none!important}

#sagsCoord44Panel{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483200;width:min(740px,calc(100vw - 16px));max-height:46dvh;overflow:auto;background:#fff;color:#17364a;border:1px solid #adc2d1;border-radius:16px;padding:11px;box-shadow:0 16px 48px #0006;font:14px/1.35 Arial}
.s44panelHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.s44panelHead b{font-size:16px}.s44panelHead small{display:block;color:#5a7081}
#s44selected{margin:8px 0;padding:8px 10px;background:#eef5fa;border-radius:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s44sizeTools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:7px 0}.s44sizeBox{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center}.s44sizeBox span{text-align:center;font-weight:900}.s44sizeBox button{min-height:40px;border:1px solid #adc1cf;border-radius:9px;background:#f7fafc;font-weight:900}
.s44actions{display:grid;grid-template-columns:1fr 1fr 1fr 1.25fr;gap:7px}.s44actions button{min-height:44px;border:1px solid #adc1cf;border-radius:10px;background:#f7fafc;color:#17364a;font-weight:900}.s44actions #s44tempSave{background:#0b6398;color:#fff}.s44actions #s44testBtn{background:#e9f5ec;color:#176438}
#s44status{min-height:18px;margin:7px 0 0;font-weight:700}
@media(max-width:640px){.s44list{grid-template-columns:1fr}.s44actions{grid-template-columns:1fr 1fr}.s44sizeTools{grid-template-columns:1fr}.s44temp{align-items:flex-start;flex-direction:column}#sagsCoord44Panel{max-height:52dvh}}
`;
    document.head.appendChild(st);
  }

  function ensureUi(){
    ensureStyle();

    if(!$("sagsCoord44Center")){
      const m=document.createElement("section");m.id="sagsCoord44Center";m.hidden=true;
      m.innerHTML=`<div class="s44centerBox">
        <div class="s44head"><h3>CĂN CHỈNH BIỂU MẪU</h3><button id="s44centerClose" type="button">✕</button></div>
        <p class="s44help">Chỉ dành cho AD. Chỉnh nhiều mẫu bằng LƯU TẠM; cuối cùng xuất một file cập nhật GitHub.</p>
        <div class="s44temp"><div><b id="s44tempInfo">BẢN TẠM: CHƯA CÓ</b><div id="s44tempTime"></div></div>
          <div class="s44tempActions"><button id="s44clearTemp" type="button">XÓA BẢN TẠM</button><button id="s44exportAll" type="button">XUẤT FILE CẬP NHẬT</button></div>
        </div>
        <div id="s44list" class="s44list"></div>
      </div>`;
      document.body.appendChild(m);
      $("s44centerClose").onclick=closeCenter;
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
      p.innerHTML=`<div class="s44panelHead"><div><b id="s44title">CĂN TỌA ĐỘ</b><small>Kéo khung = vị trí · tay nắm = rộng/cao</small></div></div>
      <div id="s44selected">Chạm một khung màu cam để chỉnh.</div>
      <div class="s44sizeTools"><div class="s44sizeBox"><button id="s44wMinus" type="button">−</button><span id="s44wInfo">RỘNG</span><button id="s44wPlus" type="button">+</button></div><div class="s44sizeBox"><button id="s44hMinus" type="button">−</button><span id="s44hInfo">CAO</span><button id="s44hPlus" type="button">+</button></div></div>
      <div class="s44actions"><button id="s44cancel" type="button">HỦY</button><button id="s44reset" type="button">VỀ GỐC Ô</button><button id="s44testBtn" type="button">TEST HIỂN THỊ</button><button id="s44tempSave" type="button">LƯU TẠM</button></div>
      <p id="s44status" role="status"></p>`;
      document.body.appendChild(p);
      $("s44cancel").onclick=cancelEditor;$("s44reset").onclick=resetSelected;$("s44testBtn").onclick=toggleTest;$("s44tempSave").onclick=saveTempAndBack;
      $("s44wMinus").onclick=()=>resizeSelected(-3,0);$("s44wPlus").onclick=()=>resizeSelected(3,0);$("s44hMinus").onclick=()=>resizeSelected(0,-3);$("s44hPlus").onclick=()=>resizeSelected(0,3);
    }
  }

  function ensureAdminCard(){
    const center=$("v181AdminCenter");let card=$("sagsCoord44AdminCard");
    if(!isAdmin()){card?.remove();return}
    if(!center||card)return;
    const grids=center.querySelectorAll(".v181AdminGrid"),grid=grids[grids.length-1];if(!grid)return;
    card=document.createElement("button");card.id="sagsCoord44AdminCard";card.type="button";card.className="v181AdminCard";
    card.innerHTML='<span class="v181AdminIcon">↔</span><span class="v181AdminCardText"><b>CĂN CHỈNH BIỂU MẪU</b><small>FSAGS / BBBT · vị trí + rộng/cao + test</small></span><em>MỞ</em>';
    card.onclick=openCenter;grid.appendChild(card);
  }

  function updateTempSummary(){
    ensureUi();
    const s=tempStats(),info=$("s44tempInfo"),time=$("s44tempTime"),btn=$("s44exportAll");
    if(info)info.textContent=s.fields?`BẢN TẠM: ${s.fields} vùng · ${s.pages} trang`:"BẢN TẠM: CHƯA CÓ";
    if(time)time.textContent=temp?.tempSavedAt?`Lưu gần nhất: ${new Date(temp.tempSavedAt).toLocaleString("vi-VN")}`:"";
    if(btn)btn.disabled=!s.fields;
  }
  function openCenter(){if(!isAdmin())return;ensureUi();loadTemp();updateTempSummary();$("sagsCoord44Center").hidden=false}
  function closeCenter(){const m=$("sagsCoord44Center");if(m)m.hidden=true}
  function clearTempConfirm(){
    if(!tempStats().fields)return;
    if(!confirm("Xóa toàn bộ bản tọa độ đang lưu tạm trên máy AD này?"))return;
    clearTemp();applyConfig(config);
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
    $("s44bg").src=getBackgroundSrc(activePage);cloneRenderedSvg(activePage);$("s44test").innerHTML="";
    const layer=$("s44layer");layer.innerHTML="";
    for(const f of fieldCandidates(activeGroup,activePage)){rememberBase(f);layer.appendChild(rectFromField(f))}
    $("s44previewTitle").textContent=`${FORMS[activeGroup]?.label||activeGroup} · TRANG ${activePage}`;renderTabs();selectRect(null);
    $("s44status").textContent=layer.children.length?`Có ${layer.children.length} vùng hiển thị.`:"Không tìm thấy vùng hiển thị của trang này.";
  }

  function selectRect(rect){$("s44layer")?.querySelectorAll(".s44chosen").forEach(x=>x.classList.remove("s44chosen"));selected=rect||null;if(rect)rect.classList.add("s44chosen");updateSelectedInfo()}
  function updateSelectedInfo(){
    const info=$("s44selected"),wi=$("s44wInfo"),hi=$("s44hInfo");
    if(!selected?._field){if(info)info.textContent="Chạm một khung màu cam để chỉnh.";if(wi)wi.textContent="RỘNG";if(hi)hi.textContent="CAO";return}
    const f=selected._field,rr=selected.getBoundingClientRect();
    info.textContent=`${S(f.label||f.key)} · ${S(f.key)} · Trang ${f.page}`;wi.textContent=`RỘNG ${Math.round(rr.width)} px`;hi.textContent=`CAO ${Math.round(rr.height)} px`;
  }
  function draftMap(f){draft.pages||={};const p=String(f.page);draft.pages[p]||={fields:{}};draft.pages[p].fields||={};return draft.pages[p].fields}
  function commitRect(rect){
    if(!rect?._field)return;
    const f=rect._field,lr=$("s44layer").getBoundingClientRect(),rr=rect.getBoundingClientRect();if(!lr.width||!lr.height)return;
    const vx=Math.max(0,Math.min(1,(rr.left-lr.left)/lr.width)),vy=Math.max(0,Math.min(1,(rr.top-lr.top)/lr.height));
    const vw=Math.max(.004,Math.min(1-vx,rr.width/lr.width)),vh=Math.max(.004,Math.min(1-vy,rr.height/lr.height));
    const c={vx:+vx.toFixed(7),vy:+vy.toFixed(7),vw:+vw.toFixed(7),vh:+vh.toFixed(7),align:"left",leftValue:true,manualInset:0};
    draftMap(f)[S(f.key)]=c;f.vx=c.vx;f.vy=c.vy;f.vw=c.vw;f.vh=c.vh;f.align="left";f.leftValue=true;f.manualInset=0;redraw();updateSelectedInfo();
  }

  function startPointer(e,rect){
    if(!editing||testMode)return;e.preventDefault();e.stopImmediatePropagation();selectRect(rect);
    const lr=$("s44layer").getBoundingClientRect(),rr=rect.getBoundingClientRect(),handle=e.target.closest?.(".s44handle");
    drag={rect,mode:handle?.dataset?.resize||"move",startX:e.clientX,startY:e.clientY,left:rr.left-lr.left,top:rr.top-lr.top,width:rr.width,height:rr.height,layerW:lr.width,layerH:lr.height};
  }
  function movePointer(e){
    if(!drag)return;e.preventDefault();e.stopImmediatePropagation();
    const d=drag,dx=e.clientX-d.startX,dy=e.clientY-d.startY;let left=d.left,top=d.top,width=d.width,height=d.height;
    if(d.mode==="move"){left=Math.max(0,Math.min(d.layerW-width,d.left+dx));top=Math.max(0,Math.min(d.layerH-height,d.top+dy))}
    else{if(d.mode.includes("e"))width=Math.max(12,Math.min(d.layerW-left,d.width+dx));if(d.mode.includes("s"))height=Math.max(10,Math.min(d.layerH-top,d.height+dy))}
    d.rect.style.left=(left/d.layerW*100)+"%";d.rect.style.top=(top/d.layerH*100)+"%";d.rect.style.width=(width/d.layerW*100)+"%";d.rect.style.height=(height/d.layerH*100)+"%";updateSelectedInfo();
  }
  function endPointer(){if(!drag)return;commitRect(drag.rect);drag=null}
  document.addEventListener("pointerdown",e=>{const rect=e.target.closest?.(".s44rect");if(rect&&$("s44layer")?.contains(rect))startPointer(e,rect)},true);
  document.addEventListener("pointermove",movePointer,true);document.addEventListener("pointerup",endPointer,true);document.addEventListener("pointercancel",endPointer,true);

  function resizeSelected(dw,dh){
    if(testMode){$("s44status").textContent="Đang TEST. Bấm QUAY LẠI CHỈNH trước.";return}
    if(!selected?._field){$("s44status").textContent="Chọn một khung trước.";return}
    const lr=$("s44layer").getBoundingClientRect(),rr=selected.getBoundingClientRect();
    selected.style.width=(Math.max(12,Math.min(lr.right-rr.left,rr.width+dw))/lr.width*100)+"%";
    selected.style.height=(Math.max(10,Math.min(lr.bottom-rr.top,rr.height+dh))/lr.height*100)+"%";commitRect(selected);
  }
  function resetSelected(){
    if(!selected?._field){$("s44status").textContent="Chọn một khung trước.";return}
    const f=selected._field,b=rememberBase(f);delete draftMap(f)[S(f.key)];
    f.vx=b.vx;f.vy=b.vy;f.vw=b.vw;f.vh=b.vh;f.align=b.align;f.leftValue=b.leftValue;f.manualInset=b.manualInset;
    selected.style.left=(b.vx*100)+"%";selected.style.top=(b.vy*100)+"%";selected.style.width=(b.vw*100)+"%";selected.style.height=(b.vh*100)+"%";redraw();updateSelectedInfo();
    $("s44status").textContent="Đã về vị trí/kích thước gốc.";
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
      const t=document.createElementNS(NS,"text");t.setAttribute("x",x+1);t.setAttribute("y",y+h/2);t.setAttribute("dominant-baseline","middle");t.setAttribute("text-anchor","start");t.setAttribute("font-family","Times New Roman");t.setAttribute("font-weight","700");t.setAttribute("font-size",Math.max(10,Number(f.font)||16));t.setAttribute("fill","#003B8E");t.setAttribute("clip-path",`url(#${clip.id})`);t.textContent=testValue(f);svg.appendChild(t);
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
    if(!isAdmin()||!FORMS[group])return;closeCenter();activeGroup=group;activePage=FORMS[group].pages[0];editing=true;testMode=false;selected=null;drag=null;
    draft=workingBase();draft.schema=2;draft.pages||={};applyConfig(draft);
    $("sagsCoord44Preview").hidden=false;$("sagsCoord44Panel").hidden=false;$("sagsCoord44Preview").classList.remove("s44testing");$("s44testBtn").textContent="TEST HIỂN THỊ";$("s44title").textContent="CĂN TỌA ĐỘ · "+FORMS[group].label;buildPage(activePage);
  }
  function closeEditorKeepDraft(){editing=false;testMode=false;selected=null;drag=null;$("s44layer").innerHTML="";$("s44test").innerHTML="";$("sagsCoord44Preview").classList.remove("s44testing");$("sagsCoord44Preview").hidden=true;$("sagsCoord44Panel").hidden=true;applyConfig(temp||config)}
  function cancelEditor(){closeEditorKeepDraft()}
  function saveTempAndBack(){
    if(!editing)return;
    saveTempObject(draft);applyConfig(temp);
    $("s44status").textContent="ĐÃ LƯU TẠM trên máy AD này.";
    setTimeout(()=>{closeEditorKeepDraft();openCenter()},350);
  }

  function finalExportObject(){
    const src=clone(temp||draft||config);
    return {schema:2,build:"FSAGS-BBBT-DISPLAY-COORDINATES-V1",updatedAt:new Date().toISOString(),updatedBy:session().username||"AD",note:"Generated from AD > CĂN CHỈNH BIỂU MẪU. Replace this file in GitHub root.",pages:src.pages||{}};
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
      config=clone(cfg);applyConfig(config);
      alert("Đã xuất fsags-display-coordinates.json. Sau khi thay file trên GitHub và xác nhận hoạt động, có thể XÓA BẢN TẠM.");
    }catch(e){alert("Chưa xuất được file: "+S(e?.message||e))}
  }

  function scan(){ensureUi();ensureAdminCard();if(!editing)applyConfig(temp||config)}
  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan()})}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["style","class","hidden"]});
  ["sags:login","sags:rolechange","sags:profilechange","sags:ui-ready"].forEach(n=>root.addEventListener?.(n,schedule));
  root.addEventListener("focus",()=>refreshConfig(false));document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshConfig(false)});

  root.sagsOpenCoordinateCenter=()=>{if(isAdmin())openCenter()};
  root.sagsCoordinateInfo=()=>({build:BUILD,admin:isAdmin(),editing,testMode,group:activeGroup,page:activePage,tempStats:tempStats(),activeFields:activeGroup?fieldCandidates(activeGroup,activePage).length:0,configUpdatedAt:S(config.updatedAt)});

  ensureUi();loadTemp();updateTempSummary();
  refreshConfig(true).finally(()=>{scan();let n=0;const t=setInterval(()=>{n++;if(applyConfig(temp||config)||n>=12)clearInterval(t)},500)});
})(typeof window==="undefined"?globalThis:window);
