/* E-REPORT/SAGS V4.2.50 · V2.2.18-SIGNATURE-LEFT-ALIGN-SYNC
   ONLY AD -> AD Control Center -> CĂN CHỈNH BIỂU MẪU.
   Multi-form workflow:
   - drag vx/vy
   - resize vw/vh
   - align left / center / right
   - CTRL/CMD multi-select and edit together
   - LƯU TẠM to localStorage (this AD device only)
   - TEST HIỂN THỊ on real page*.png background
   - continue other FSAGS/BBBT
   - XUẤT FILE CẬP NHẬT once -> fsags-display-coordinates.json
   No Firebase. */
(function(root){
  "use strict";
  const BUILD="V2.2.18-SIGNATURE-LEFT-ALIGN-SYNC";
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
  let temp=null,draft=null,editing=false,testMode=false,activeGroup="",activePage=0,selected=null,selectedRects=[],drag=null;
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
      installLegacyLayoutGuard();
      enforceConfiguredRender(coordSource());
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
    f.__sagsCoordOverride=false;
  }
  function pageCfg(page,source){
    return source?.pages?.[String(page)]||{fields:{}};
  }
  function applyConfig(source,opts){
    source=source||config;
    const fs=globalFields();
    if(!fs.length)return false;
    for(const f of fs){
      rememberBase(f);
      resetFieldToBase(f);
      const c=pageCfg(f.page,source)?.fields?.[S(f.key)];
      f.__sagsCoordOverride=!!c;
      if(!c)continue;

      if(Number.isFinite(Number(c.vx)))f.vx=Number(c.vx);
      if(Number.isFinite(Number(c.vy)))f.vy=Number(c.vy);
      if(Number.isFinite(Number(c.vw)))f.vw=Number(c.vw);
      if(Number.isFinite(Number(c.vh)))f.vh=Number(c.vh);

      const al=["left","center","right"].includes(S(c.align).toLowerCase())
        ? S(c.align).toLowerCase() : "left";

      // AD field geometry/alignment is the final model authority.
      f.align=al;
      f.leftValue=(al==="left");
      f.manualInset=0;
    }

    // IMPORTANT: no automatic draw here.
    // Background UI such as MY FLIGHT must not cause a full FSAGS redraw.
    if(opts?.redraw===true)redraw();
    else if(opts?.enforce===true)requestAnimationFrame(()=>enforceConfiguredRender(source));
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


  function coordSource(){
    return editing ? (draft||temp||config) : (temp||config);
  }
  function cssEsc(v){
    try{return CSS.escape(String(v))}
    catch(_){return String(v).replace(/["\\]/g,"\\$&")}
  }

  function isSignatureNameField(f){
    const k=U(f?.key),l=U(f?.label);
    if(!k)return false;

    // Known signer-name families used by FSAGS 42.1 / 55.1 and compatible
    // naming variants on other FSAGS forms. Do NOT touch signature image fields.
    if(/(?:REPRESENTATIVE|COORD|COORDINATOR|ENGINEER|LOADINGSTAFF|LOADING_STAFF|AGENT|SIGNER|SIGNATURE|STAFF).*NAME/.test(k))return true;
    if(/NAME.*(?:REPRESENTATIVE|COORD|COORDINATOR|ENGINEER|LOADINGSTAFF|LOADING_STAFF|AGENT|SIGNER|SIGNATURE|STAFF)/.test(k))return true;
    if(/(?:REPRESENTATIVE|COORDINATOR|CO-ORDINATOR|ENGINEER|LOADING STAFF|SAGS-CXR AGENT|AGENT).*(?:NAME|HỌ TÊN|HỌ VÀ TÊN)/.test(l))return true;

    // Exact currently-used keys observed in the active coordinate file.
    return [
      "F421_REPRESENTATIVENAME",
      "F421_COORDARRNAME",
      "F421_COORDDEPNAME",
      "F551_LOADINGSTAFFNAME",
      "F551_ENGINEERNAME"
    ].includes(k);
  }

  function setFieldTextNodeLeft(el,x){
    if(!el||el.tagName?.toLowerCase()!=="text")return;
    el.setAttribute("x",String(x));
    el.setAttribute("text-anchor","start");
    el.classList.remove("center","right");
    el.classList.add("left");
    el.removeAttribute("transform");
    el.style.removeProperty("transform");
    el.style.removeProperty("translate");
  }

  function dedupeSameFieldText(nodes){
    const textNodes=(nodes||[]).filter(el=>el.tagName?.toLowerCase()==="text");
    if(textNodes.length<2)return 0;

    const generated=textNodes.filter(el=>el.classList.contains("v373-line-render"));
    const native=textNodes.filter(el=>!el.classList.contains("v373-line-render"));
    let hidden=0;

    // 42.1 / 55.1 can have one native SVG text plus one legacy
    // v373 single-line renderer for the SAME value. V4.2.49 moved both to
    // the AD coordinates, which made the name look doubled/offset.
    // Suppress only exact single-line duplicates. Multiline rows are untouched.
    if(generated.length===1 && native.length){
      const g=generated[0],gt=S(g.textContent);
      if(gt){
        const sameNative=native.find(n=>S(n.textContent)===gt);
        if(sameNative){
          g.style.display="none";
          g.setAttribute("data-sags-dedup-hidden","1");
          sameNative.style.removeProperty("display");
          sameNative.removeAttribute("data-sags-dedup-hidden");
          hidden++;
        }
      }
    }

    // Undo a previous suppression if the renderer changed and there is no
    // longer an exact duplicate.
    if(!hidden){
      textNodes.forEach(el=>{
        if(el.getAttribute("data-sags-dedup-hidden")==="1"){
          el.style.removeProperty("display");
          el.removeAttribute("data-sags-dedup-hidden");
        }
      });
    }
    return hidden;
  }

  function normalizeSignatureNameRender(){
    try{
      const all=globalFields();
      if(!all.length)return false;
      for(const f of all){
        if(!isSignatureNameField(f))continue;
        if(U(f.type)==="SIGNATURE")continue; // image/signature pad stays untouched

        f.align="left";
        f.leftValue=true;
        f.manualInset=0;

        const svg=$("svg"+Number(f.page));
        if(!svg)continue;
        const x=Math.max(0,Number(f.vx)||0)*1241;
        const selector='[data-field-key="'+cssEsc(S(f.key))+'"]';
        const nodes=[...svg.querySelectorAll(selector)].filter(el=>
          !el.classList.contains("hit") &&
          !el.classList.contains("selected-region") &&
          !el.classList.contains("v368-layout-hit")
        );
        dedupeSameFieldText(nodes);
        nodes.forEach(el=>{
          if(el.getAttribute("data-sags-dedup-hidden")==="1")return;
          setFieldTextNodeLeft(el,x);
        });
      }
      return true;
    }catch(e){
      console.warn("V4.2.50 signature-name normalize",e);
      return false;
    }
  }

  /* AD FIELD AUTHORITY
     Any field present in fsags-display-coordinates.json / AD temporary draft
     MUST display according to AD configuration for every source of data:
     manual entry, N/A, quick entry, autofill, flight data, TEST and PDF.

     Final rules:
       left   -> x = vx
       center -> x = vx + vw/2
       right  -> x = vx + vw
       y/width/height -> vy/vw/vh from AD field
       no legacy translate/displayDy/writeOnLine offset may win afterwards.
     Touch/input x/y/w/h is not changed. */
  function enforceConfiguredRender(source=coordSource()){
    try{
      const pages=source?.pages||{};
      const all=globalFields();
      if(!all.length)return false;
      const NS="http://www.w3.org/2000/svg";

      for(const [pKey,pCfg] of Object.entries(pages)){
        const page=Number(pKey);
        const svg=document.getElementById("svg"+page);
        if(!svg)continue;

        for(const [key,c] of Object.entries(pCfg?.fields||{})){
          const f=all.find(x=>Number(x?.page)===page&&S(x?.key)===S(key));
          if(!f||!c)continue;

          const vx=Number.isFinite(Number(c.vx))?Number(c.vx):Number(f.vx);
          const vy=Number.isFinite(Number(c.vy))?Number(c.vy):Number(f.vy);
          const vw=Number.isFinite(Number(c.vw))?Number(c.vw):Number(f.vw);
          const vh=Number.isFinite(Number(c.vh))?Number(c.vh):Number(f.vh);
          let al=["left","center","right"].includes(S(c.align).toLowerCase())
            ? S(c.align).toLowerCase() : "left";
          if(isSignatureNameField(f))al="left";

          f.vx=vx; f.vy=vy; f.vw=vw; f.vh=vh;
          f.align=al; f.leftValue=(al==="left"); f.manualInset=0;
          f.__sagsCoordOverride=true;

          const x=Math.max(0,vx)*1241;
          const y=Math.max(0,vy)*1755;
          const w=Math.max(.001,vw)*1241;
          const h=Math.max(.001,vh)*1755;
          const textX=al==="center"?(x+w/2):(al==="right"?(x+w):x);
          const anchor=al==="center"?"middle":(al==="right"?"end":"start");

          const keyEsc=(root.CSS&&typeof root.CSS.escape==="function")
            ? root.CSS.escape(String(key))
            : String(key).replace(/["\\]/g,"\\$&");
          const selector='[data-field-key="'+keyEsc+'"]';
          const nodes=[...svg.querySelectorAll(selector)].filter(el=>
            !el.classList.contains("hit") &&
            !el.classList.contains("selected-region") &&
            !el.classList.contains("v368-layout-hit")
          );

          // Remove the exact one-line duplicate case before positioning.
          // This is the visible double-name issue on some 42.1 / 55.1 signer fields.
          dedupeSameFieldText(nodes);

          const visibleNodes=nodes.filter(el=>el.getAttribute("data-sags-dedup-hidden")!=="1");
          const generated=visibleNodes.filter(el=>el.classList.contains("v373-line-render"));
          const generatedCount=generated.length;

          for(const el of visibleNodes){
            const tag=el.tagName.toLowerCase();

            if(tag==="foreignobject"){
              el.setAttribute("x",String(x));
              el.setAttribute("y",String(y));
              el.setAttribute("width",String(w));
              el.setAttribute("height",String(h));
              el.removeAttribute("transform");
              el.style.removeProperty("transform");
              el.style.removeProperty("translate");
              const d=el.querySelector("div");
              if(d){
                d.style.width="100%";
                d.style.height="100%";
                d.style.boxSizing="border-box";
                d.style.textAlign=al;
                d.style.padding="0";
                d.style.margin="0";
                d.style.textIndent="0";
                d.style.transform="none";
              }
              continue;
            }

            if(tag!=="text")continue;

            // Generated multiline rows remain separate, but all lines are laid out
            // inside the AD field rectangle. No legacy line dx/dy can move them.
            if(el.classList.contains("v373-line-render") && generatedCount>1){
              const rawIndex=Number(el.getAttribute("data-v373-line-index"));
              const idx=Number.isFinite(rawIndex)?rawIndex:generated.indexOf(el);
              const fs=Math.max(8,Number(el.getAttribute("font-size"))||Number(f.font)||16);
              const lineH=Math.max(fs*1.12,10);
              const lineY=Math.min(y+h-fs*.15,y+fs+(idx*lineH));
              el.setAttribute("x",String(textX));
              el.setAttribute("y",String(lineY));
              el.setAttribute("text-anchor",anchor);
              el.setAttribute("dominant-baseline","alphabetic");
            }else{
              el.setAttribute("x",String(textX));
              el.setAttribute("y",String(y+h/2));
              el.setAttribute("text-anchor",anchor);
              el.setAttribute("dominant-baseline","middle");
            }

            el.classList.remove("left","center","right");
            el.classList.add(al);
            el.removeAttribute("transform");
            el.style.removeProperty("transform");
            el.style.removeProperty("translate");
          }
        }
      }
      normalizeSignatureNameRender();
      return true;
    }catch(e){
      console.warn("V4.2.50 AD field/signature authority",e);
      return false;
    }
  }


  let drawWrapped=false;
  function installDrawAuthority(){
    if(drawWrapped)return true;
    let old=null;
    try{old=root.draw||draw}catch(_){old=root.draw}
    if(typeof old!=="function")return false;
    if(old.__sagsAdAuthorityWrapped){drawWrapped=true;return true}

    const wrapped=function(){
      // Apply AD model geometry BEFORE native rendering.
      applyConfig(coordSource(),{redraw:false,enforce:false});
      const r=old.apply(this,arguments);

      // Native draw() itself calls legacy layout. AD wins once, at the very end.
      enforceConfiguredRender(coordSource());
      normalizeSignatureNameRender();
      return r;
    };
    wrapped.__sagsAdAuthorityWrapped=true;
    wrapped.__sagsOriginal=old;
    root.draw=wrapped;
    try{draw=wrapped}catch(_){}
    drawWrapped=true;
    return true;
  }

  let legacyWrapped=false;
  function installLegacyLayoutGuard(){
    if(legacyWrapped)return true;
    const old=root.v368ApplySavedLayout;
    if(typeof old!=="function")return false;
    if(old.__sagsCoordAlignWrapped){legacyWrapped=true;return true}

    const wrapped=function(){
      const r=old.apply(this,arguments);
      // Native layout may adjust unrelated fields; configured AD fields win last.
      enforceConfiguredRender(coordSource());
      normalizeSignatureNameRender();
      return r;
    };
    wrapped.__sagsCoordAlignWrapped=true;
    wrapped.__sagsOriginal=old;
    root.v368ApplySavedLayout=wrapped;
    legacyWrapped=true;
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
.s44help{margin:8px 0 10px;color:#516879}.s44temp{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;margin-bottom:10px;background:#eef5fa;border-radius:10px}
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
.s44alignTools{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:7px 0}.s44alignTools button{min-height:42px;border:1px solid #adc1cf;border-radius:10px;background:#f7fafc;color:#17364a;font-weight:900}.s44alignTools button.active{background:#0b6398;color:#fff;border-color:#0b6398}
.s44actions{display:grid;grid-template-columns:1fr 1fr 1fr 1.25fr;gap:7px}.s44actions button{min-height:44px;border:1px solid #adc1cf;border-radius:10px;background:#f7fafc;color:#17364a;font-weight:900}.s44actions #s44tempSave{background:#0b6398;color:#fff}.s44actions #s44testBtn{background:#e9f5ec;color:#176438}
#s44status{min-height:18px;margin:7px 0 0;font-weight:700}
@media(max-width:640px){.s44list{grid-template-columns:1fr}.s44actions{grid-template-columns:1fr 1fr}.s44sizeTools{grid-template-columns:1fr}.s44alignTools{grid-template-columns:1fr 1fr 1fr}.s44temp{align-items:flex-start;flex-direction:column}#sagsCoord44Panel{max-height:56dvh}}
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
      p.innerHTML=`<div class="s44panelHead"><div><b id="s44title">CĂN TỌA ĐỘ</b><small>Kéo khung = vị trí · CTRL + bấm = chọn nhiều · tay nắm = rộng/cao</small></div></div>
      <div id="s44selected">Chạm một khung màu cam để chỉnh.</div>
      <div class="s44alignTools"><button id="s44alignLeft" type="button">⇤ CĂN TRÁI</button><button id="s44alignCenter" type="button">↔ CĂN GIỮA</button><button id="s44alignRight" type="button">⇥ CĂN PHẢI</button></div>
      <div class="s44sizeTools"><div class="s44sizeBox"><button id="s44wMinus" type="button">−</button><span id="s44wInfo">RỘNG</span><button id="s44wPlus" type="button">+</button></div><div class="s44sizeBox"><button id="s44hMinus" type="button">−</button><span id="s44hInfo">CAO</span><button id="s44hPlus" type="button">+</button></div></div>
      <div class="s44actions"><button id="s44cancel" type="button">HỦY</button><button id="s44reset" type="button">VỀ GỐC VÙNG</button><button id="s44testBtn" type="button">TEST HIỂN THỊ</button><button id="s44tempSave" type="button">LƯU TẠM</button></div>
      <p id="s44status" role="status"></p>`;
      document.body.appendChild(p);
      $("s44cancel").onclick=cancelEditor;$("s44reset").onclick=resetSelected;$("s44testBtn").onclick=toggleTest;$("s44tempSave").onclick=saveTempAndBack;
      $("s44wMinus").onclick=()=>resizeSelected(-3,0);$("s44wPlus").onclick=()=>resizeSelected(3,0);$("s44hMinus").onclick=()=>resizeSelected(0,-3);$("s44hPlus").onclick=()=>resizeSelected(0,3);
      $("s44alignLeft").onclick=()=>applyAlignSelected("left");$("s44alignCenter").onclick=()=>applyAlignSelected("center");$("s44alignRight").onclick=()=>applyAlignSelected("right");
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
    card.innerHTML='<span class="v181AdminIcon">↔</span><span class="v181AdminCardText"><b>CĂN CHỈNH BIỂU MẪU</b><small>FSAGS / BBBT · vị trí · rộng/cao · trái/giữa/phải · TEST</small></span><em>MỞ</em>';
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
    card.textContent="↔ CĂN CHỈNH BIỂU MẪU";
    card.title="FSAGS / BBBT · CTRL chọn nhiều · vị trí + rộng/cao · căn trái/giữa/phải · TEST";
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
  function openCenter(){if(!isAdmin())return;ensureUi();loadTemp();updateTempSummary();$("sagsCoord44Center").hidden=false}
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
    $("s44bg").src=getBackgroundSrc(activePage);cloneRenderedSvg(activePage);$("s44test").innerHTML="";
    const layer=$("s44layer");layer.innerHTML="";
    for(const f of fieldCandidates(activeGroup,activePage)){rememberBase(f);layer.appendChild(rectFromField(f))}
    $("s44previewTitle").textContent=`${FORMS[activeGroup]?.label||activeGroup} · TRANG ${activePage}`;renderTabs();clearSelection();
    $("s44status").textContent=layer.children.length?`Có ${layer.children.length} vùng hiển thị.`:"Không tìm thấy vùng hiển thị của trang này.";
  }

  function selectedList(){return selectedRects.filter(r=>r&&r.isConnected&&r._field)}
  function alignOfField(f){
    const c=draft?.pages?.[String(f.page)]?.fields?.[S(f.key)];
    const a=S(c?.align||f?.align||"left").toLowerCase();
    return ["left","center","right"].includes(a)?a:"left";
  }
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
  function updateAlignButtons(){
    const rs=selectedList(),btns={
      left:$("s44alignLeft"),center:$("s44alignCenter"),right:$("s44alignRight")
    };
    Object.values(btns).forEach(b=>b?.classList.remove("active"));
    if(!rs.length)return;
    const aligns=[...new Set(rs.map(r=>alignOfField(r._field)))];
    if(aligns.length===1)btns[aligns[0]]?.classList.add("active");
  }
  function updateSelectedInfo(){
    const info=$("s44selected"),wi=$("s44wInfo"),hi=$("s44hInfo"),rs=selectedList();
    if(!rs.length){
      if(info)info.textContent="Chạm một khung màu cam để chỉnh. Giữ CTRL để chọn nhiều.";
      if(wi)wi.textContent="RỘNG";
      if(hi)hi.textContent="CAO";
      updateAlignButtons();
      return;
    }
    if(rs.length===1){
      const r=rs[0],f=r._field,rr=r.getBoundingClientRect();
      info.textContent=`${S(f.label||f.key)} · ${S(f.key)} · Trang ${f.page}`;
      wi.textContent=`RỘNG ${Math.round(rr.width)} px`;
      hi.textContent=`CAO ${Math.round(rr.height)} px`;
    }else{
      const aligns=[...new Set(rs.map(r=>alignOfField(r._field)))];
      info.textContent=`ĐÃ CHỌN ${rs.length} VÙNG · ${aligns.length===1?("CĂN "+(aligns[0]==="left"?"TRÁI":aligns[0]==="center"?"GIỮA":"PHẢI")):"KIỂU CĂN KHÁC NHAU"}`;
      wi.textContent=`RỘNG · ${rs.length} VÙNG`;
      hi.textContent=`CAO · ${rs.length} VÙNG`;
    }
    updateAlignButtons();
  }
  function draftMap(f){draft.pages||={};const p=String(f.page);draft.pages[p]||={fields:{}};draft.pages[p].fields||={};return draft.pages[p].fields}
  function configFromRect(rect,alignOverride=null){
    if(!rect?._field)return null;
    const f=rect._field,lr=$("s44layer").getBoundingClientRect(),rr=rect.getBoundingClientRect();
    if(!lr.width||!lr.height)return null;
    const vx=Math.max(0,Math.min(1,(rr.left-lr.left)/lr.width)),vy=Math.max(0,Math.min(1,(rr.top-lr.top)/lr.height));
    const vw=Math.max(.004,Math.min(1-vx,rr.width/lr.width)),vh=Math.max(.004,Math.min(1-vy,rr.height/lr.height));
    const old=draftMap(f)[S(f.key)]||{};
    const al=["left","center","right"].includes(S(alignOverride).toLowerCase())
      ? S(alignOverride).toLowerCase()
      : (["left","center","right"].includes(S(old.align).toLowerCase())?S(old.align).toLowerCase():alignOfField(f));
    return {vx:+vx.toFixed(7),vy:+vy.toFixed(7),vw:+vw.toFixed(7),vh:+vh.toFixed(7),align:al,leftValue:(al==="left"),manualInset:0};
  }
  function commitRect(rect,alignOverride=null,doRedraw=true){
    const c=configFromRect(rect,alignOverride);
    if(!c)return false;
    const f=rect._field;
    draftMap(f)[S(f.key)]=c;
    f.vx=c.vx;f.vy=c.vy;f.vw=c.vw;f.vh=c.vh;f.align=c.align;f.leftValue=c.leftValue;f.manualInset=0;
    if(doRedraw)redraw();
    return true;
  }
  function commitRects(rects,alignOverride=null){
    let changed=false;
    for(const r of rects||[])changed=commitRect(r,alignOverride,false)||changed;
    if(changed)redraw();
    updateSelectedInfo();
    return changed;
  }
  function applyAlignSelected(al){
    if(testMode){$("s44status").textContent="Đang TEST. Bấm QUAY LẠI CHỈNH trước.";return}
    const rs=selectedList();
    if(!rs.length){$("s44status").textContent="Chọn ít nhất một vùng trước.";return}
    commitRects(rs,al);
    $("s44status").textContent=`Đã áp dụng CĂN ${al==="left"?"TRÁI":al==="center"?"GIỮA":"PHẢI"} cho ${rs.length} vùng.`;
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
      f.vx=b.vx;f.vy=b.vy;f.vw=b.vw;f.vh=b.vh;f.align=b.align;f.leftValue=b.leftValue;f.manualInset=b.manualInset;
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
      const al=alignOfField(f),tx=al==="center"?(x+w/2):(al==="right"?(x+w):x),ta=al==="center"?"middle":(al==="right"?"end":"start");
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
    draft=workingBase();draft.schema=2;draft.pages||={};applyConfig(draft,{redraw:false,enforce:true});
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
      config=clone(cfg);applyConfig(config,{redraw:false,enforce:true});
      alert("Đã xuất fsags-display-coordinates.json. Sau khi thay file trên GitHub và xác nhận hoạt động, có thể XÓA BẢN TẠM.");
    }catch(e){alert("Chưa xuất được file: "+S(e?.message||e))}
  }


  function installPdfAuthority(){
    try{
      const old=root.sendReport;
      if(typeof old!=="function"||old.__sagsAdPdfWrapped)return typeof old==="function";
      const wrapped=async function(){
        // One model sync only. Native sendReport() performs its own single draw.
        applyConfig(temp||config,{redraw:false,enforce:false});
        return await old.apply(this,arguments);
      };
      wrapped.__sagsAdPdfWrapped=true;
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
    performanceMode:"EVENT_DRIVEN_NO_GLOBAL_DOM_OBSERVER",
    signatureDisplay:{
      rule:"LEFT_EDGE_SINGLE_LAYER",
      known421:["f421_representativeName","f421_coordArrName","f421_coordDepName"],
      known551:["f551_loadingStaffName","f551_engineerName"]
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
    const a=installLegacyLayoutGuard();
    const b=installDrawAuthority();
    const p=installPdfAuthority();
    const q=installQuickIncidentRemoval();
    const u=installRoleUiHook();
    ensureAdminCard();
    installAdminClickWakeup();
    const c=applyConfig(temp||config,{redraw:false,enforce:false});
    if((a&&b&&p&&q&&c)||tries>=20)clearInterval(bootTimer);
  },250);

  refreshConfig(true).then(()=>{
    applyConfig(temp||config,{redraw:false,enforce:false});
    installLegacyLayoutGuard();
    installDrawAuthority();
    installPdfAuthority();
    installQuickIncidentRemoval();
    installRoleUiHook();
    installAdminClickWakeup();
    ensureAdminCard();
    scheduleAdminEntry();
  });
})(typeof window==="undefined"?globalThis:window);
