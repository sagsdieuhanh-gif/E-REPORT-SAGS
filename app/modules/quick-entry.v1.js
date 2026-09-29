/* NEW UI V1 · Fast numeric entry for existing FSAGS 42.1/42.3 fields.
   No new form keys, no coordinate changes, no new Firebase reads/writes. */
(function (root) {
  'use strict';
  const EQUIPMENT = [
    ['operatorBefore','Operator · Trước'],['operatorAfter','Operator · Sau'],
    ['porterBefore','Porter · Trước'],['porterAfter','Porter · Sau'],
    ['passengerStepBefore','Passenger step · Trước'],['passengerStepAfter','Passenger step · Sau'],
    ['conveyorBefore','Conveyor belt · Trước'],['conveyorAfter','Conveyor belt · Sau'],
    ['tractorBefore','Tractor · Trước'],['tractorAfter','Tractor · Sau']
  ];
  const BAG_PARTS = ['ADL','CHD','INF','TotalBags'];
  let session=null, ui=null;
  const numberText = x => String(x??'').trim();
  function field(key) { return fields.find(f=>f.key===key && (f.type==='number'||f.type==='text')); }
  function groupFor(key) {
    if (EQUIPMENT.some(([k])=>k===key)) {
      return {heading:'Thiết bị · FSAGS 42.3',steps:EQUIPMENT.map(([k,label])=>({key:k,label,kind:'equipment'}))};
    }
    // Both passenger lines share the native form fields; each step is identified.
    const pax=/^(f421_)?(arr|dep)Pax(TTL|C|Y|I)$/.exec(key);
    if(pax){
      const prefix=pax[1]||'';
      const label={arr:'ARR PAX',dep:'DEP PAX'};
      const steps=[];
      for(const row of ['arr','dep'])for(const part of ['TTL','C','Y','I']){
        steps.push({key:`${prefix}${row}Pax${part}`,label:`${label[row]} · ${part}`,kind:'pax'});
      }
      return {heading:`Hành khách · FSAGS ${prefix?'42.1':'42.3'}`,steps};
    }
    const m=/^(f421_)?b([123])(ADL|CHD|INF|TotalBags)$/.exec(key);
    if(!m)return null;
    const prefix=m[1]||'';
    const steps=[];
    for(let n=1;n<=3;n++) {
      const title=`Lần ${n}`;
      for(const part of BAG_PARTS) {
        const k=`${prefix}b${n}${part}`;
        if(part==='TotalBags') {
          steps.push({key:k,label:`${title} · Total Bags · Số kiện`,kind:'bag',part:'pcs'});
          steps.push({key:k,label:`${title} · Total Bags · Số kg`,kind:'bag',part:'kg'});
        } else steps.push({key:k,label:`${title} · ${part}`,kind:'number'});
      }
    }
    return {heading:`Hành khách và hành lý · FSAGS ${prefix?'42.1':'42.3'}`,steps};
  }
  function parseBag(value) {
    const old=numberText(value);
    if(!old)return {pcs:'',kg:'',original:old,valid:true,dirty:false};
    const match=/^(\d+)\s*(?:pcs|kiện)?\s*\/\s*(\d+)\s*(?:kgs?|kg)?$/i.exec(old);
    return match ? {pcs:match[1],kg:match[2],original:old,valid:true,dirty:false}
      : {pcs:'',kg:'',original:old,valid:false,dirty:false};
  }
  function ensureUi(){
    if(ui)return ui;
    const style=document.createElement('style');
    style.id='sagsQuickEntryStyle';
    style.textContent=`
      #sagsQuickEntry{position:fixed;inset:0;z-index:2147482600;display:none;align-items:flex-end;justify-content:center;background:rgba(8,31,46,.64);padding:12px;box-sizing:border-box;font:500 15px/1.5 system-ui,Arial,sans-serif;color:#173c50}
      #sagsQuickEntry.open{display:flex}
      #sagsQuickEntry .sq-card{width:min(100%,520px);max-height:calc(100dvh - 24px);overflow:auto;box-sizing:border-box;background:#fff;border-radius:20px;padding:20px;box-shadow:0 15px 40px #001f3050}
      #sagsQuickEntry .sq-overline{font-size:12px;font-weight:750;color:#547485;letter-spacing:.03em}
      #sagsQuickEntry .sq-title{font-size:23px;line-height:1.25;font-weight:850;margin:7px 0}
      #sagsQuickEntry .sq-count{font-size:13px;color:#527185;font-weight:700;margin-bottom:14px}
      #sagsQuickEntry .sq-input{box-sizing:border-box;width:100%;min-height:58px;border:2px solid #12738d;border-radius:12px;padding:9px 14px;font:750 25px/1.2 system-ui,Arial;text-align:center;color:#173c50;background:#f6fbff;outline-offset:3px}
      #sagsQuickEntry .sq-hint{font-size:12px;color:#587384;min-height:22px;margin:9px 0 2px}
      #sagsQuickEntry .sq-error{color:#ae2a24;font-weight:750;font-size:13px;min-height:19px}
      #sagsQuickEntry .sq-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0}
      #sagsQuickEntry button{min-height:46px;border-radius:11px;border:1px solid #b8d4e1;background:#e9f6fb;color:#16465c;font:800 15px system-ui,Arial;cursor:pointer}
      #sagsQuickEntry button.sq-next{background:#17637e;color:white;border-color:#17637e}
      #sagsQuickEntry button:disabled{opacity:.4;cursor:default}
      #sagsQuickEntry .sq-close{background:transparent;border:0;min-height:32px;width:100%;font-size:13px;color:#536d7b}
      @media (min-width:700px){#sagsQuickEntry{align-items:center}}
      @media (max-width:380px){#sagsQuickEntry .sq-card{padding:14px}#sagsQuickEntry .sq-title{font-size:20px}}
    `;
    document.head.appendChild(style);
    const shell=document.createElement('div');shell.id='sagsQuickEntry';shell.setAttribute('role','dialog');
    shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label','Nhập nhanh FSAGS');
    shell.innerHTML='<div class="sq-card"><div class="sq-overline" id="sqHeading"></div><div class="sq-title" id="sqTitle" aria-live="polite"></div><div class="sq-count" id="sqCount"></div><input id="sqValue" class="sq-input" type="text" inputmode="numeric" enterkeyhint="next" autocomplete="off" spellcheck="false" aria-labelledby="sqTitle"><div class="sq-hint" id="sqHint"></div><button id="sqRestoreDraft" type="button" hidden style="width:100%;min-height:36px;margin:6px 0;border:1px solid #60a5fa;background:#eff6ff;color:#1d4ed8">↩ Khôi phục số nhập dở trên máy</button><button id="sqDiscardDraft" type="button" hidden style="width:100%;min-height:32px;margin:4px 0;border:1px solid #d1d5db;background:#fff;color:#475569">Bỏ số nhập dở</button><div class="sq-error" id="sqError" role="alert"></div><div class="sq-actions"><button id="sqPrev" type="button">‹ Trước</button><button id="sqNext" class="sq-next" type="button">Tiếp ›</button></div><button id="sqClose" class="sq-close" type="button">Đóng nhập nhanh</button></div>';
    document.body.appendChild(shell);
    const q=id=>shell.querySelector('#'+id);
    ui={shell,heading:q('sqHeading'),title:q('sqTitle'),count:q('sqCount'),value:q('sqValue'),hint:q('sqHint'),error:q('sqError'),restore:q('sqRestoreDraft'),discard:q('sqDiscardDraft'),prev:q('sqPrev'),next:q('sqNext'),close:q('sqClose')};
    ui.prev.addEventListener('click',()=>move(-1));ui.next.addEventListener('click',()=>move(1));
    ui.close.addEventListener('click',close);
    ui.value.addEventListener('input',()=>{if(!session)return;ui.error.textContent='';const st=session.steps[session.index];if(st.kind==='bag'){const draft=bagDraft(st.key);draft[st.part]=ui.value.value;draft.dirty=true;}try{root.sagsV61Draft?.record(st.key,ui.value.value,st.kind==='bag'?st.part:'quick');}catch(_){}});
    ui.discard.addEventListener('click',()=>{
      if(!session)return;const st=session.steps[session.index];
      try{root.sagsV61Draft?.forget(st.key,st.kind==='bag'?st.part:'quick')}catch(_){}
      ui.restore.hidden=true;ui.discard.hidden=true;
    });
    ui.restore.addEventListener('click',()=>{
      if(!session)return;const st=session.steps[session.index];
      const raw=root.sagsV61Draft?.read(st.key,st.kind==='bag'?st.part:'quick');
      if(!raw)return;
      ui.value.value=raw.value;
      ui.restore.hidden=true;ui.discard.hidden=true;
      ui.value.dispatchEvent(new Event('input',{bubbles:true}));
      try{ui.value.focus({preventScroll:true})}catch(_){}
    });
    ui.value.addEventListener('keydown',e=>{
      if(e.isComposing)return;
      if(e.key==='Enter'||e.key==='ArrowRight'){e.preventDefault();move(1)}
      if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}
      if(e.key==='Escape'){e.preventDefault();close()}
    });
    return ui;
  }
  function bagDraft(key){if(!session.bags.has(key))session.bags.set(key,parseBag(state[key]));return session.bags.get(key)}
  function display(){
    if(!session)return;
    ensureUi();const st=session.steps[session.index];
    ui.heading.textContent=session.heading;
    ui.title.textContent=st.label;
    ui.count.textContent=`Trường ${session.index+1}/${session.steps.length}`;
    ui.error.textContent='';
    if(st.kind==='bag'){
      const draft=bagDraft(st.key);
      ui.value.value=draft[st.part];
      ui.hint.textContent=draft.valid?'Total Bags giữ nguyên 1 ô: số kiện/số kg.':'Giá trị cũ "'+draft.original+'" chưa đúng mẫu. Điền đủ hai số để thay thế.';
    }else{
      ui.value.value=numberText(state[st.key]);
      ui.hint.textContent=st.kind==='equipment'?'Có thể giữ N/A hiện có; nhập số nếu cần.':st.kind==='pax'?'Nhập số hành khách đúng dòng ARR / DEP; không tự đổi số ở ô khác.':'TOTAL tự cộng ADL + CHD + INF. Không cần nhập TOTAL.';
    }
    try{const part=st.kind==='bag'?st.part:'quick',raw=root.sagsV61Draft?.read(st.key,part);
      if(raw&&raw.value===ui.value.value)root.sagsV61Draft?.forget(st.key,part);
      ui.restore.hidden=ui.discard.hidden=!(raw&&raw.value!==ui.value.value);
    }catch(_){ui.restore.hidden=true;ui.discard.hidden=true;}
    ui.prev.disabled=session.index===0;
    ui.next.textContent=session.index===session.steps.length-1?'Lưu & Đóng':'Tiếp ›';
    try{activeKey=st.key;draw()}catch(e){console.warn('Quick-entry highlight',e)}
    try{ui.value.focus({preventScroll:true});ui.value.select()}catch(_){ui.value.focus()}
  }
  function saveBag(st,leaving){
    const draft=bagDraft(st.key);
    const raw=numberText(ui.value.value);
    if(raw && !/^\d+$/.test(raw)){ui.error.textContent='Chỉ nhập số nguyên không âm.';return false}
    draft[st.part]=raw;
    if(!leaving || st.part!=='kg')return true;
    if(!draft.dirty)return true;
    const pcs=numberText(draft.pcs),kg=numberText(draft.kg);
    if((pcs&&!kg)||(!pcs&&kg)){
      ui.error.textContent='Total Bags cần đủ số kiện và số kg (ví dụ 120/2350).';return false;
    }
    const combined=pcs&&kg?`${pcs}/${kg}`:'';
    if(combined!==numberText(state[st.key])){
      const hadOld=Object.prototype.hasOwnProperty.call(state,st.key),old=state[st.key];
      if(combined)state[st.key]=combined;else delete state[st.key];
      try{persist();}catch(e){
        if(hadOld)state[st.key]=old;else delete state[st.key];
        ui.error.textContent='Không lưu được trên máy. Giữ nguyên ô đang nhập; không tải lại. '+String(e?.message||e);
        return false;
      }
    }
    draft.original=combined;draft.valid=true;draft.dirty=false;
    try{root.sagsV61Draft?.forget(st.key,'pcs');root.sagsV61Draft?.forget(st.key,'kg')}catch(_){}
    return true;
  }
  function saveCurrent(leaving){
    if(!session)return true;
    const st=session.steps[session.index];
    if(st.kind==='bag')return saveBag(st,leaving);
    const value=numberText(ui.value.value);
    if(value && !/^\d+$/.test(value) && !(st.kind==='equipment'&&value.toUpperCase()==='N/A')){
      ui.error.textContent=st.kind==='equipment'?'Nhập số hoặc N/A.':'Chỉ nhập số nguyên không âm.';return false;
    }
    const canonical=value.toUpperCase()==='N/A'?'N/A':value;
    if(canonical!==numberText(state[st.key])){
      const hadOld=Object.prototype.hasOwnProperty.call(state,st.key),old=state[st.key];
      if(canonical)state[st.key]=canonical;else delete state[st.key];
      if(st.kind==='number')updateBagTotals();
      try{persist();}catch(e){
        if(hadOld)state[st.key]=old;else delete state[st.key];
        if(st.kind==='number')updateBagTotals();
        ui.error.textContent='Không lưu được trên máy. Giữ nguyên ô đang nhập; không tải lại. '+String(e?.message||e);
        return false;
      }
    }
    try{root.sagsV61Draft?.forget(st.key,'quick')}catch(_){}
    return true;
  }
  function move(direction){
    if(!session)return;
    const st=session.steps[session.index];
    // Only commit the combined bag value when leaving its kg step.
    if(!saveCurrent(direction>0 && st.kind==='bag' && st.part==='kg'))return;
    const next=session.index+direction;
    if(next<0){display();return}
    if(next>=session.steps.length){finish();return}
    session.index=next;display();
  }
  function finish(){if(!session)return;session=null;if(ui)ui.shell.classList.remove('open');activeKey=null;try{draw()}catch(_){}}
  function close(){
    if(!session)return;
    const st=session.steps[session.index];
    if(!saveCurrent(st.kind==='bag'&&st.part==='kg'))return;
    const unfinished=[...session.bags.values()].some(d=>d.dirty);
    if(unfinished && !root.confirm('Total Bags còn nhập dở, dữ liệu cũ sẽ được giữ. Đóng nhập nhanh?'))return;
    finish();
  }
  root.sagsQuickTryActivate=function(f){
    if(!f||session||!field(f.key))return false;
    const group=groupFor(f.key);if(!group)return false;
    const steps=group.steps.filter(st=>!!field(st.key));
    const ix=steps.findIndex(st=>st.key===f.key);
    if(ix<0)return false;
    session={heading:group.heading,steps,index:ix,bags:new Map()};
    ensureUi();ui.shell.classList.add('open');display();return true;
  };
  root.sagsQuickEntryStatus=()=>session?{field:session.steps[session.index].label,step:session.index+1,total:session.steps.length}:null;
  window.addEventListener('pagehide',()=>{if(session){try{const st=session.steps[session.index];root.sagsV61Draft?.record(st.key,ui.value.value,st.kind==='bag'?st.part:'quick');saveCurrent(st.kind==='bag'&&st.part==='kg')}catch(_){}}});
})(window);
