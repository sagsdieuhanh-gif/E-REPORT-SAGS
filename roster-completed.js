/* E-REPORT SAGS · DAILY ROSTER COMPLETED TASKS · V1.86 */
(function(root){
  "use strict";

  const BUILD="V1.86-20260820-01";
  const SESSION_PATH="roster_sessions";
  let activeTab="pending";
  let renderGuard=false;

  const S=v=>String(v??"").trim();
  const now=()=>Date.now();
  const validClock=v=>{
    const s=S(v).replace(/\s+/g,"");
    if(/^([01]\d|2[0-3]):[0-5]\d$/.test(s))return s;
    if(/^\d{4}$/.test(s)){
      const h=Number(s.slice(0,2)),m=Number(s.slice(2));
      if(h<24&&m<60)return s.slice(0,2)+":"+s.slice(2);
    }
    return "";
  };
  const isRoster=meta=>!!S(meta?.rosterAssignmentId);
  const safeId=v=>S(v).replace(/[.#$\[\]\/]/g,"_");

  function envelopeOf(meta){
    try{return root.readFlightSessionEnvelope?.(meta.id)||{};}catch(e){return {};}
  }
  function pushbackOf(env){
    const st=(env&&env.state&&typeof env.state==="object")?env.state:{};
    return validClock(st.h24Start||st.f421_h24Start||"");
  }
  function archivedAt(meta,env){
    return Number(env?.rosterCompletedArchivedAtMs||meta?.rosterCompletedArchivedAtMs||0)||0;
  }
  function completedAt(meta,env){
    return Number(env?.rosterCompletedAtMs||meta?.rosterCompletedAtMs||0)||0;
  }
  function classify(meta){
    const env=envelopeOf(meta),pushback=pushbackOf(env),roster=isRoster(meta);
    if(!roster)return {kind:"pending",env,pushback:"",archived:false};
    if(!pushback)return {kind:"pending",env,pushback:"",archived:false};
    const archived=archivedAt(meta,env)>0;
    return {kind:archived?"archived":"completed",env,pushback,archived,completedAt:completedAt(meta,env)};
  }

  function listSorted(){
    try{return (root.readFlightSessionList?.()||[]).slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));}
    catch(e){return [];}
  }

  function ensureStyle(){
    if(document.getElementById("rosterCompletedStyle"))return;
    const st=document.createElement("style");
    st.id="rosterCompletedStyle";
    st.textContent=`
#rosterTaskTabs{display:none;grid-template-columns:1fr 1.45fr;gap:7px;margin:8px 0 10px}
.rosterTaskTab{min-height:44px;border:0;border-radius:10px;background:#e8edf2;color:#29445d;font:900 13px Arial;padding:7px 8px;touch-action:manipulation}
.rosterTaskTab.active{background:#0b5cab;color:#fff;box-shadow:0 3px 10px rgba(11,92,171,.2)}
.rosterTaskCount{display:inline-flex;min-width:23px;height:23px;align-items:center;justify-content:center;margin-left:5px;padding:0 6px;border-radius:99px;background:rgba(255,255,255,.9);color:#0b5cab;font:900 12px Arial}
.rosterTaskTab:not(.active) .rosterTaskCount{background:#fff;color:#34495e}
#rosterCompletedTools{display:none;margin:-2px 0 10px;gap:7px;align-items:center;justify-content:space-between;flex-wrap:wrap}
#rosterCompletedClear{min-height:38px;border:0;border-radius:9px;background:#f2e7e6;color:#9b261f;font:900 12px Arial;padding:8px 11px;touch-action:manipulation}
#rosterCompletedGuideBtn{min-height:38px;border:0;border-radius:9px;background:#eaf2fb;color:#174f86;font:900 12px Arial;padding:8px 11px;touch-action:manipulation}
#rosterTaskEmpty{display:none;padding:18px 12px;text-align:center;border:1px dashed #c9d2dc;border-radius:10px;background:#fafcfe;color:#607080;font:800 12px/1.45 Arial}
#rosterCompletedGuide{display:none;margin:0 0 10px;padding:10px 11px;border-radius:10px;background:#f5f8fb;color:#405466;font:12px/1.45 Arial}
#rosterCompletedGuide b{color:#0b5cab}
.rosterCompletedBadge{display:inline-flex;margin-left:5px;padding:2px 6px;border-radius:99px;background:#e7f6ec;color:#14713d;font:900 10px Arial;vertical-align:middle}
@media(max-width:430px){#rosterTaskTabs{grid-template-columns:1fr 1.55fr}.rosterTaskTab{font-size:12px;padding:6px 5px}.rosterTaskCount{min-width:21px;height:21px;margin-left:3px}}
`;
    document.head.appendChild(st);
  }

  function ensureUi(){
    ensureStyle();
    const current=document.getElementById("flightSessionCurrent");
    const listEl=document.getElementById("flightSessionList");
    if(!current||!listEl)return null;
    let tabs=document.getElementById("rosterTaskTabs");
    if(!tabs){
      tabs=document.createElement("div");tabs.id="rosterTaskTabs";
      tabs.innerHTML=`
        <button type="button" class="rosterTaskTab active" id="rosterTaskPendingBtn">CHUYẾN <span class="rosterTaskCount" id="rosterTaskPendingCount">0</span></button>
        <button type="button" class="rosterTaskTab" id="rosterTaskCompletedBtn">✅ ĐÃ HOÀN THÀNH <span class="rosterTaskCount" id="rosterTaskCompletedCount">0</span></button>`;
      current.insertAdjacentElement("afterend",tabs);
      document.getElementById("rosterTaskPendingBtn").onclick=()=>{activeTab="pending";enhanceList();};
      document.getElementById("rosterTaskCompletedBtn").onclick=()=>{activeTab="completed";enhanceList();};

      const tools=document.createElement("div");tools.id="rosterCompletedTools";
      tools.innerHTML=`<button id="rosterCompletedClear" type="button">🗑 XÓA DANH SÁCH HOÀN THÀNH</button><button id="rosterCompletedGuideBtn" type="button">HDSD</button>`;
      tabs.insertAdjacentElement("afterend",tools);
      document.getElementById("rosterCompletedClear").onclick=clearCompletedList;
      document.getElementById("rosterCompletedGuideBtn").onclick=()=>{
        const g=document.getElementById("rosterCompletedGuide");if(g)g.style.display=g.style.display==="block"?"none":"block";
      };
      const guide=document.createElement("div");guide.id="rosterCompletedGuide";
      guide.innerHTML=`<b>HDSD:</b> Chuyến DAILY ROSTER còn thiếu PUSHBACK nằm ở <b>CHUYẾN</b>. Khi lưu PUSHBACK hợp lệ, chuyến tự chuyển sang <b>✅ ĐÃ HOÀN THÀNH</b>. Cuối ca có thể bấm <b>XÓA DANH SÁCH HOÀN THÀNH</b>; thao tác này chỉ dọn danh sách công việc, không xóa hồ sơ/biểu mẫu. Nếu PUSHBACK bị xóa, chuyến tự quay lại CHUYẾN.`;
      tools.insertAdjacentElement("afterend",guide);
      const empty=document.createElement("div");empty.id="rosterTaskEmpty";listEl.insertAdjacentElement("afterend",empty);
    }
    return tabs;
  }

  function enhanceList(){
    if(renderGuard)return;
    renderGuard=true;
    try{
      const tabs=ensureUi();if(!tabs)return;
      const listEl=document.getElementById("flightSessionList");
      const rows=Array.from(listEl?.children||[]).filter(x=>x.classList?.contains("flightSessionRow"));
      const list=listSorted();
      let rosterCount=0,pendingCount=0,completedCount=0,visible=0;

      list.forEach((meta,i)=>{
        const c=classify(meta);if(isRoster(meta))rosterCount++;
        if(c.kind==="completed")completedCount++;
        else if(c.kind!=="archived")pendingCount++;
        const row=rows[i];if(!row)return;
        let show=false;
        if(c.kind==="archived")show=false;
        else if(activeTab==="completed")show=c.kind==="completed";
        else show=c.kind!=="completed";
        row.style.display=show?"":"none";
        if(show)visible++;
        if(c.kind==="completed"){
          const sub=row.querySelector(".flightSessionSelect span");
          if(sub&&!sub.querySelector(".rosterCompletedBadge")){
            const badge=document.createElement("span");badge.className="rosterCompletedBadge";badge.textContent="✓ PUSHBACK "+c.pushback;sub.appendChild(badge);
          }
        }
      });

      tabs.style.display=rosterCount?"grid":"none";
      const tools=document.getElementById("rosterCompletedTools");
      const guide=document.getElementById("rosterCompletedGuide");
      const empty=document.getElementById("rosterTaskEmpty");
      const pBtn=document.getElementById("rosterTaskPendingBtn"),cBtn=document.getElementById("rosterTaskCompletedBtn");
      const pCount=document.getElementById("rosterTaskPendingCount"),cCount=document.getElementById("rosterTaskCompletedCount");
      if(pCount)pCount.textContent=String(pendingCount);
      if(cCount)cCount.textContent=String(completedCount);
      pBtn?.classList.toggle("active",activeTab==="pending");cBtn?.classList.toggle("active",activeTab==="completed");
      if(tools)tools.style.display=rosterCount&&activeTab==="completed"?"flex":"none";
      const clear=document.getElementById("rosterCompletedClear");if(clear){clear.disabled=completedCount===0;clear.style.opacity=completedCount?"1":".45";}
      if(guide&&activeTab!=="completed")guide.style.display="none";
      if(empty){
        empty.style.display=rosterCount&&visible===0?"block":"none";
        empty.textContent=activeTab==="completed"?"Chưa có chuyến DAILY ROSTER nào đã hoàn thành.":"Không còn chuyến cần làm trong danh sách hiện tại.";
      }
    }finally{renderGuard=false;}
  }

  function syncShared(meta,env){
    const assignment=S(meta?.rosterAssignmentId);if(!assignment||typeof root.sagsV470Ref!=="function")return;
    const patch={
      completedAtMs:Number(env?.rosterCompletedAtMs||0)||null,
      completedPushback:pushbackOf(env)||null,
      completedListClearedAtMs:Number(env?.rosterCompletedArchivedAtMs||0)||null,
      "envelope/rosterCompletedAtMs":Number(env?.rosterCompletedAtMs||0)||null,
      "envelope/rosterCompletedArchivedAtMs":Number(env?.rosterCompletedArchivedAtMs||0)||null
    };
    try{root.sagsV470Ref(`${SESSION_PATH}/${safeId(assignment)}`).update(patch).catch?.(()=>{});}catch(e){}
  }

  function activeMeta(){
    try{return root.currentFlightSessionMeta?.()||null;}catch(e){return null;}
  }
  function captureActiveMarkers(){
    const meta=activeMeta();if(!meta)return {completedAt:0,archivedAt:0};
    const env=envelopeOf(meta);
    return {
      completedAt:Number(env?.rosterCompletedAtMs||meta?.rosterCompletedAtMs||0)||0,
      archivedAt:Number(env?.rosterCompletedArchivedAtMs||meta?.rosterCompletedArchivedAtMs||0)||0
    };
  }
  function reconcileActiveCompletion(before={}){
    try{
      const current=activeMeta();if(!current)return;
      const id=S(current.id||"");if(!id)return;
      const list=root.readFlightSessionList?.()||[],idx=list.findIndex(x=>x.id===id);if(idx<0)return;
      const meta=list[idx];if(!isRoster(meta))return;
      const env=envelopeOf(meta),push=pushbackOf(env);
      const prevCompleted=Number(before.completedAt||meta.rosterCompletedAtMs||env.rosterCompletedAtMs||0)||0;
      const prevArchived=Number(before.archivedAt||meta.rosterCompletedArchivedAtMs||env.rosterCompletedArchivedAtMs||0)||0;
      let changed=false;
      if(push){
        const desiredCompleted=prevCompleted||now();
        if(Number(env.rosterCompletedAtMs||0)!==desiredCompleted){env.rosterCompletedAtMs=desiredCompleted;changed=true;}
        if(Number(meta.rosterCompletedAtMs||0)!==desiredCompleted){meta.rosterCompletedAtMs=desiredCompleted;changed=true;}
        // Nếu cuối ca đã dọn danh sách, giữ nguyên trạng thái đã dọn cho tới khi PUSHBACK bị xóa.
        if(prevArchived){
          if(Number(env.rosterCompletedArchivedAtMs||0)!==prevArchived){env.rosterCompletedArchivedAtMs=prevArchived;changed=true;}
          if(Number(meta.rosterCompletedArchivedAtMs||0)!==prevArchived){meta.rosterCompletedArchivedAtMs=prevArchived;changed=true;}
        }
      }else{
        if(env.rosterCompletedAtMs||meta.rosterCompletedAtMs||env.rosterCompletedArchivedAtMs||meta.rosterCompletedArchivedAtMs){
          delete env.rosterCompletedAtMs;delete meta.rosterCompletedAtMs;delete env.rosterCompletedArchivedAtMs;delete meta.rosterCompletedArchivedAtMs;changed=true;
        }
      }
      if(changed){
        localStorage.setItem(root.flightSessionStorageKey(id),JSON.stringify(env));
        list[idx]=meta;root.writeFlightSessionList?.(list);syncShared(meta,env);
      }
    }catch(e){console.info("Roster completed reconcile",e?.message||e);}
  }

  async function clearCompletedList(){
    const list=root.readFlightSessionList?.()||[];const targets=[];
    for(const meta of list){const c=classify(meta);if(c.kind==="completed")targets.push({meta,c});}
    if(!targets.length)return;
    const d=new Date();const label=`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    const ok=confirm(`Xóa ${targets.length} chuyến đã hoàn thành khỏi danh sách công việc ngày ${label}?\n\nHồ sơ chuyến và biểu mẫu vẫn được giữ lại.`);
    if(!ok)return;
    const at=now();
    for(const x of targets){
      const meta=x.meta,env=x.c.env||envelopeOf(meta);
      meta.rosterCompletedArchivedAtMs=at;env.rosterCompletedArchivedAtMs=at;
      try{localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env));}catch(e){}
      syncShared(meta,env);
    }
    root.writeFlightSessionList?.(list);
    enhanceList();
  }
  root.dailyRosterClearCompletedList=clearCompletedList;

  function installHooks(){
    if(root.__rosterCompletedHooksV186)return;root.__rosterCompletedHooksV186=true;
    try{
      const baseRender=root.renderFlightSessionList;
      if(typeof baseRender==="function")root.renderFlightSessionList=function(){const out=baseRender.apply(this,arguments);setTimeout(enhanceList,0);return out;};
    }catch(e){}
    try{
      const baseOpen=root.openFlightSessions;
      if(typeof baseOpen==="function")root.openFlightSessions=function(){activeTab="pending";const out=baseOpen.apply(this,arguments);setTimeout(enhanceList,0);return out;};
    }catch(e){}
    try{
      const basePersist=root.persist;
      if(typeof basePersist==="function")root.persist=function(){const before=captureActiveMarkers();const out=basePersist.apply(this,arguments);reconcileActiveCompletion(before);setTimeout(()=>{try{root.renderFlightSessionList?.();}catch(e){}},0);return out;};
    }catch(e){}
    setTimeout(()=>{ensureUi();reconcileActiveCompletion();try{root.renderFlightSessionList?.();}catch(e){}},350);
  }

  installHooks();
  root.__ROSTER_COMPLETED_BUILD=BUILD;
})(window);
