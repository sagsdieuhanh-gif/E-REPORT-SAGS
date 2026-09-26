(function tvjModule(){
"use strict";
(function(root){
  if(root.__SAGS_TVJ_GOF_035_V630)return;
  root.__SAGS_TVJ_GOF_035_V630="V6.3.14-20260925-TVJ-LEGACY-CLEAN-RECEIVE-ID-16";
  const GROUP="tvjgof035",FORM_ID="tvj_gof_035",PAGE=15,W=1241,H=1755,PREFIX="vz_";
  let liveForm=null,booted=false;
  const CHECK_GROUPS=[
    [PREFIX+"notocYes",PREFIX+"notocNo"],
    [PREFIX+"acTypeA320",PREFIX+"acTypeA321",PREFIX+"acTypeB7378"]
  ];
  const INS_KEYS=["fwdDividerNet","fwdAllRestraints","fwdPlacard","aftDividerNet","aftAllRestraints","aftPlacard","loadingWithinLimit","noDamageFound","damageFound"];
  const INS_TIME=new Map(INS_KEYS.map(k=>[PREFIX+k,PREFIX+k+"Time"]));

  function now(){try{return typeof nowHHMM==="function"?nowHHMM():new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",hour12:false})}catch(_){return ""}}
  function stripVZ(v){return String(v||"").trim().replace(/^VZ[\s-]*/i,"").trim()}
  function stripHS(v){return String(v||"").trim().replace(/^HS[\s-]*/i,"").trim()}
  function vzText(v){return /(^|[\s/,+-])VZ\s*\d+/i.test(String(v||""))}
  function currentMeta(){try{return typeof currentFlightSessionMeta==="function"?currentFlightSessionMeta():null}catch(_){return null}}
  function currentEnv(){try{return typeof readFlightSessionEnvelope==="function"?readFlightSessionEnvelope(activeFlightSessionId)||{}:{}}catch(_){return {}}}
  function baseGroup(env,meta){return String(meta?.initialGroup||env?.mainForm||env?.activeFormGroup||"fsags")}
  function looksVZ(env=currentEnv(),meta=currentMeta()){
    const st=env?.state||((typeof state==="object"&&state)||{}),rs=env?.rosterSeed||{};
    const vals=[
      st.fltBefore,st.fltAfter,st.f421_fltBefore,st.f421_fltAfter,st.f551_fltBefore,st.f551_fltAfter,
      st[PREFIX+"flightNumber"],meta?.name,meta?.rosterFlightId,env?.rosterFlightId,
      rs.fltBefore,rs.fltAfter,rs.arrFlight,rs.depFlight,rs.flightRaw,rs.flightName
    ];
    return vals.some(vzText)||baseGroup(env,meta)===GROUP||String(env?.vzForm||"")===FORM_ID;
  }
  function eligible(env=currentEnv(),meta=currentMeta()){
    if(!looksVZ(env,meta))return false;
    const g=baseGroup(env,meta);
    return ["fsags","FSAGS","FSAGS423",GROUP].includes(g);
  }

  async function getRegistry(){
    try{
      const x=root.sagsV450GetFormRegistry?.();
      if(x?.forms?.some(f=>String(f?.id)===FORM_ID))return x;
    }catch(_){}
    const r=await fetch("./forms.registry.json?tvj="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw new Error("forms.registry.json HTTP "+r.status);
    return await r.json();
  }
  function ensureStyle(){
    if(document.getElementById("tvjV630Style"))return;
    const st=document.createElement("style");st.id="tvjV630Style";st.textContent=`
#page15{position:relative;aspect-ratio:1241/1755}
#page15>img{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:fill;user-select:none;-webkit-user-drag:none}
#page15>svg{position:absolute;inset:0;width:100%;height:100%;z-index:2;overflow:visible}
`;document.head.appendChild(st);
  }
  function cleanupLegacyQuickUI(){
    try{document.getElementById("tvjQuickBtn")?.remove()}catch(_){}
    try{document.getElementById("tvjQuickModal")?.remove()}catch(_){}
  }
  function ensurePage(form){
    ensureStyle();
    const pg=form?.pages?.[0];if(!pg?.image)throw new Error("TVJ-GOF-035 chưa có ảnh nền trong registry.");
    let page=document.getElementById("page15");
    if(!page){
      page=document.createElement("div");page.id="page15";page.className="sheet scroll-sheet hide";page.dataset.formGroup=GROUP;
      const img=document.createElement("img");img.alt="TVJ-GO-F-035 · VZ Ramp Checklist";img.draggable=false;img.id="tvjGof035Bg";page.appendChild(img);
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.id="svg15";svg.setAttribute("viewBox","0 0 1241 1755");svg.setAttribute("preserveAspectRatio","none");page.appendChild(svg);
      const p13=document.getElementById("page13");if(p13?.parentNode)p13.insertAdjacentElement("afterend",page);else document.body.appendChild(page);
    }
    const img=page.querySelector("img");if(img&&img.src!==pg.image)img.src=pg.image;
    page.style.aspectRatio=(Number(pg.width)||W)+"/"+(Number(pg.height)||H);
    return page;
  }
  function runtimeType(f){
    const t=String(f?.type||"text").toLowerCase();
    if(t==="checkbox")return "check";if(t==="time")return "timeNow";if(t==="date")return "dateAuto";if(t==="number")return "number";return "text";
  }
  function registerFields(form){
    if(typeof add!=="function"||!Array.isArray(fields))throw new Error("Core field engine chưa sẵn sàng.");
    const existing=new Set(fields.filter(f=>f.page===PAGE).map(f=>String(f.key)));
    for(const rf of (form.fields||[])){
      const key=String(rf.bind||PREFIX+rf.key||"").trim();if(!key||existing.has(key))continue;
      const type=runtimeType(rf),x=Number(rf.x||0)*W,y=Number(rf.y||0)*H,w=Math.max(2,Number(rf.w||.01)*W),h=Math.max(2,Number(rf.h||.01)*H);
      const opts={
        vx:x,vy:y,vw:w,vh:h,
        tickX:Number.isFinite(Number(rf.tickX))?Number(rf.tickX)*W:x+w/2,
        tickY:Number.isFinite(Number(rf.tickY))?Number(rf.tickY)*H:y+h/2,
        font:Number(rf.fontSize||16),
        align:String(rf.align||"center"),
        valign:String(rf.valign||"middle"),
        multiline:String(rf.type||"").toLowerCase()==="textarea"||Number(rf.rowCount||1)>1,
        autoFitLines:Number(rf.rowCount||0),
        inputMode:type==="number"||type==="timeNow"?"numeric":"text",
        filter:type==="number"?"number":type==="timeNow"?"time":null,
        leftValue:String(rf.align||"").toLowerCase()==="left"
      };
      add(PAGE,key,x,y,w,h,type,String(rf.label||rf.key||key),opts);
      const f=fields[fields.length-1];
      f.font=Number(rf.fontSize||f.font||16);f.fmFontSize=f.font;f.fmFontFamily=String(rf.fontFamily||"Times New Roman");
      f.fmFontWeight=String(rf.fontWeight||"700");f.fmFontStyle=String(rf.fontStyle||"normal");f.fmUnderline=!!rf.underline;
      f.fmLineHeight=Number(rf.lineHeight||1.1);f.fmTextColor=String(rf.textColor||"#003b8e");f.fmRowCount=Math.max(1,Number(rf.rowCount||1));
      f.fmRowFit=!!rf.rowFit;f.fmWrapMode=String(rf.wrapMode||"auto");f.__formManagerExactTextV490=true;f.__formManagerCustomV463=true;f.__formManagerFieldKey=String(rf.key||key);
      existing.add(key);
    }
  }
  function ensureMenu(){
    const grid=document.getElementById("formMenuGrid");if(!grid)return;
    let b=document.getElementById("formMenuVZ");
    if(!b){
      b=document.createElement("button");b.id="formMenuVZ";b.type="button";b.innerHTML="<strong>TVJ-GOF-035</strong><span>VZ Ramp Checklist</span>";b.onclick=()=>{try{selectFormGroup(GROUP)}catch(_){showVZ(true)}};
      const b423=document.getElementById("formMenu423");if(b423)b423.insertAdjacentElement("afterend",b);else grid.prepend(b);
    }
    refreshMenu();
  }
  function refreshMenu(){
    const b=document.getElementById("formMenuVZ");if(!b)return;
    let ok=eligible();
    try{if(String(currentRole||"").toUpperCase()==="AD")ok=true}catch(_){}
    try{if(typeof v485Can==="function")ok=ok&&v485Can("FSAGS423")}catch(_){}
    b.style.display=ok?"":"none";
  }
  function syncAccountIdentity(){
    try{
      if(typeof state!=="object"||!state)return false;
      const p=root.__sagsGetSession?.()?.profile||root.currentUserProfile||((typeof currentUserProfile!=="undefined"&&currentUserProfile)||{});
      const name=String(p?.name||p?.fullName||p?.displayName||p?.username||"").trim();
      let raw=String(p?.employeeCode||p?.staffCode||p?.employeeId||p?.staffId||p?.employeeNo||p?.staffNo||"").trim().toUpperCase();
      raw=raw.replace(/^CXR[\s_-]*/,"").replace(/\s+/g,"");
      const staff=raw?"CXR-"+raw:"";
      let changed=false;
      const put=(k,v)=>{if(v&&String(state[k]??"")!==v){state[k]=v;changed=true}};
      // Actual registry binds for the printed NAME / STAFF ID fields.
      put("acuStart_copy",name);
      put("Name_copy",staff);
      // Keep semantic aliases in sync for archive/restore and future registry cleanup.
      put(PREFIX+"staffName",name);
      put(PREFIX+"staffId",staff);
      return changed;
    }catch(_){return false}
  }
  root.sagsTvjSyncAccountIdentity=syncAccountIdentity;
  function cleanupLegacyQuickUI(){
    const b=document.getElementById("tvjQuickBtn");if(!b)return;
    let ok=String(typeof activeFormGroup!=="undefined"?activeFormGroup:"")===GROUP;
    try{if(typeof v485Can==="function")ok=ok&&(v485Can("QUICK_TIME")||v485Can("FSAGS423"))}catch(_){}
    try{if(String(currentRole||"").toUpperCase()==="VIEWER")ok=false}catch(_){}
    b.style.display=ok?"block":"none";
  }
  function seed(){
    if(typeof state!=="object")return;
    const meta=currentMeta(),env=currentEnv(),oldSeed=(env.vzRosterSeed&&typeof env.vzRosterSeed==="object")?env.vzRosterSeed:{};
    const nextSeed={...oldSeed};
    const setSeed=(key,val)=>{
      val=val===undefined||val===null?"":String(val).trim();if(!val)return;
      const full=PREFIX+key,cur=state[full],old=oldSeed[full];
      const blank=cur===undefined||cur===null||String(cur).trim()==="";
      const unchanged=old!==undefined&&String(cur??"")===String(old??"");
      if(blank||unchanged){state[full]=val;nextSeed[full]=val}
    };
    const st=state,rs=env.rosterSeed||{};
    let f1=String(st.fltBefore||rs.fltBefore||rs.arrFlight||"").trim(),f2=String(st.fltAfter||rs.fltAfter||rs.depFlight||"").trim();
    if(!f1&&!f2){const ms=String(meta?.name||"").match(/VZ\s*\d+/ig)||[];f1=ms[0]||"";f2=ms[1]||""}
    setSeed("flightNumber",[stripVZ(f1),stripVZ(f2)].filter(Boolean).join(" / "));
    setSeed("date",st.date||rs.date||meta?.rosterOpDate||env.rosterOpDate||"");
    setSeed("acRegistration",stripHS(st.regn||st.acReg||rs.regn||rs.acReg||rs.ACRegNo||""));
    setSeed("station",rs.station||"CXR");
    let route=String(rs.route||rs.routing||"").trim();
    if(!route){route=[st.route1||rs.route1,st.route2||rs.route2||"CXR",st.route3||rs.route3].map(x=>String(x||"").trim()).filter(Boolean).join("-")}
    setSeed("routing",route);
    setSeed("parkingPosition",st.bayAfter||st.bayBefore||st.parkingPosition||rs.ParkingBay||rs.parkingPosition||"");
    setSeed("sta",st.sta||rs.sta||"");setSeed("eta",st.eta||rs.eta||"");setSeed("std",st.std||rs.std||"");setSeed("etd",st.etd||rs.etd||"");
    const ac=String(st.acType||rs.acType||rs.ACType||"").toUpperCase().replace(/\s+/g," ");
    const acKeys=[PREFIX+"acTypeA320",PREFIX+"acTypeA321",PREFIX+"acTypeB7378"];
    if(ac&&acKeys.every(k=>!state[k])){
      if(ac.includes("A320"))state[acKeys[0]]=true;else if(ac.includes("A321"))state[acKeys[1]]=true;else if(/B737-?8|B738|B38M|737 MAX 8/.test(ac))state[acKeys[2]]=true;
    }
    syncAccountIdentity();
    try{
      if(activeFlightSessionId&&typeof flightSessionStorageKey==="function"){
        const saved={...env,vzForm:FORM_ID,vzRosterSeed:nextSeed,state:JSON.parse(JSON.stringify(state))};
        localStorage.setItem(flightSessionStorageKey(activeFlightSessionId),JSON.stringify(saved));
      }
      if(typeof persist==="function")persist();
    }catch(e){console.warn("TVJ seed persist",e)}
  }
  function showVZ(scrollTop=true){
    if(!liveForm)return;
    const page=ensurePage(liveForm);
    for(let n=1;n<=14;n++){const p=document.getElementById("page"+n);if(p){p.classList.add("hide");p.style.display="none"}}
    page.classList.remove("hide");page.style.display="block";
    try{activeFormGroup=GROUP;localStorage.setItem(sagsOwnedKey(FORM_GROUP_STORAGE_KEY),GROUP);currentPage=PAGE}catch(_){}
    seed();try{updateCurrentFerryFlag?.()}catch(_){}
    try{draw()}catch(e){console.warn("TVJ draw",e)}
    refreshMenu();cleanupLegacyQuickUI();
    if(scrollTop)window.scrollTo({top:0,left:0,behavior:"smooth"});
  }
  function wrapCore(){
    if(root.__SAGS_TVJ_GOF_035_WRAPPED)return;root.__SAGS_TVJ_GOF_035_WRAPPED=true;
    try{
      const base=getActiveFlightMainForm;
      const wrapped=function(){try{if(String(activeFormGroup||"")===GROUP)return GROUP;const env=currentEnv(),meta=currentMeta();if(eligible(env,meta))return GROUP}catch(_){}return base.apply(this,arguments)};
      getActiveFlightMainForm=wrapped;root.getActiveFlightMainForm=wrapped;
    }catch(e){console.warn("TVJ wrap mainForm",e)}
    try{
      const base=flightMainGroupForChooser;
      const wrapped=function(env,meta){if(eligible(env,meta))return GROUP;return base.apply(this,arguments)};
      flightMainGroupForChooser=wrapped;root.flightMainGroupForChooser=wrapped;
    }catch(e){console.warn("TVJ wrap chooser",e)}
    try{
      const base=flightStartPageForGroup;
      const wrapped=function(group){return String(group)===GROUP?PAGE:base.apply(this,arguments)};
      flightStartPageForGroup=wrapped;root.flightStartPageForGroup=wrapped;
    }catch(e){console.warn("TVJ wrap start page",e)}
    try{
      const base=showFormGroup;
      const wrapped=function(group,scrollTop=true){if(String(group)===GROUP){showVZ(scrollTop);return}const out=base.apply(this,arguments);refreshMenu();cleanupLegacyQuickUI();return out};
      showFormGroup=wrapped;root.showFormGroup=wrapped;
    }catch(e){console.warn("TVJ wrap show",e)}
    try{
      const base=draw;
      const wrapped=function(){syncAccountIdentity();const s=document.getElementById("svg15");if(s)s.innerHTML="";return base.apply(this,arguments)};
      draw=wrapped;root.draw=wrapped;
    }catch(e){console.warn("TVJ wrap draw",e)}
    try{
      const base=activate;
      const wrapped=function(f){
        if(f&&String(f.key||"").startsWith(PREFIX)&&f.type==="check"){
          activeKey=f.key;const next=!state[f.key];state[f.key]=next;
          if(next){for(const g of CHECK_GROUPS)if(g.includes(f.key))for(const other of g)if(other!==f.key)state[other]=false;const tk=INS_TIME.get(f.key);if(tk&&!state[tk])state[tk]=now()}
          try{persist();draw()}catch(_){}setTimeout(()=>{try{if(activeKey===f.key){activeKey=null;draw()}}catch(_){}},220);return;
        }
        return base.apply(this,arguments);
      };
      activate=wrapped;root.activate=wrapped;
    }catch(e){console.warn("TVJ wrap activate",e)}
    try{
      const base=updateFormMenuForCurrentFlight;
      const wrapped=function(){const out=base.apply(this,arguments);ensureMenu();refreshMenu();return out};
      updateFormMenuForCurrentFlight=wrapped;root.updateFormMenuForCurrentFlight=wrapped;
    }catch(e){console.warn("TVJ wrap menu",e)}
    try{
      const base=v485GroupFeature;
      const wrapped=function(group){return String(group)===GROUP?"FSAGS423":base.apply(this,arguments)};
      v485GroupFeature=wrapped;root.v485GroupFeature=wrapped;
    }catch(_){}
    try{
      const base=activityFormLabel;
      activityFormLabel=function(group){return String(group)===GROUP?"TVJ-GOF-035":base.apply(this,arguments)};
    }catch(_){}
    // V6.3.8: PDF canonical for TVJ-GOF-035 is provided by v631+.
    // Do not wrap/block openExportChoiceMenu or sendReport here; legacy V6.3.0 alerts
    // would otherwise intercept the current VZ canonical PDF flow.
    try{
      const base=applyRoleUI;
      const wrapped=function(){const out=base.apply(this,arguments);refreshMenu();cleanupLegacyQuickUI();return out};
      applyRoleUI=wrapped;root.applyRoleUI=wrapped;
    }catch(_){}
  }

  async function boot(){
    if(booted)return;cleanupLegacyQuickUI();
    try{
      const registry=await getRegistry(),form=(registry?.forms||[]).find(f=>String(f?.id)===FORM_ID);
      if(!form)throw new Error("Không tìm thấy "+FORM_ID+" trong forms.registry.json");
      liveForm=form;ensurePage(form);registerFields(form);ensureMenu();wrapCore();booted=true;
      try{draw()}catch(_){}
      setTimeout(()=>{try{if(eligible())showVZ(false);else{const p=document.getElementById("page15");if(p){p.classList.add("hide");p.style.display="none"}refreshMenu();cleanupLegacyQuickUI()}}catch(e){console.warn("TVJ initial route",e)}},80);
      root.__SAGS_TVJ_GOF_035_READY={formId:FORM_ID,fields:(form.fields||[]).length,pageImage:!!form.pages?.[0]?.image};
    }catch(e){
      console.warn("TVJ-GOF-035 boot",e);
      setTimeout(()=>{booted=false;boot()},1800);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,120),{once:true});else setTimeout(boot,120);
  root.addEventListener("pageshow",()=>setTimeout(()=>{if(booted){refreshMenu();cleanupLegacyQuickUI();if(eligible()&&String(activeFormGroup||"")!==GROUP)showVZ(false)}else boot()},250),{passive:true});
})(window);
})();
