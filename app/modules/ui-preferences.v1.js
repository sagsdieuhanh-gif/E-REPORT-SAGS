/* E-REPORT SAGS V6.1.34 · User interaction preferences
   Clearer FSAGS09 navigation + compact operational quick-entry surfaces.
   Preferences stay local to the signed-in account/device; no form keys or business rules change. */
(function(root){
  'use strict';
  const BUILD='V6.4.82-20261003-QUICK-PREFS-COLLAPSE-PERSIST-01';
  if(root.__SAGS_UI_PREFS_BUILD__===BUILD)return;
  root.__SAGS_UI_PREFS_BUILD__=BUILD;

  const THEME_ROOT='sagsUiThemeV1';
  const QUICK_ROOT='sagsQteHiddenV1';
  const S=v=>String(v??'').trim();
  const $=id=>document.getElementById(id);
  let qteObserver=null,fs09Observer=null,lastIdentity='',lastAppliedTheme='';

  function safeToken(v){
    return S(v).normalize?.('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_.-]+/g,'_').slice(0,80)||'device';
  }
  function identity(){
    try{
      const sess=root.__sagsGetSession?.()||{};
      const p=sess.profile||root.currentUserProfile||{};
      return safeToken(p.username||p.userName||p.email||sess.username||root.currentRole||'device');
    }catch(_){return 'device'}
  }
  function themeKey(){return THEME_ROOT+':'+identity()}
  function quickGroup(){
    let g='';
    try{g=S(activeFormGroup)}catch(_){}
    if(!g){
      const title=S($('quickTimeTitle')?.textContent);
      if(/55\.1/.test(title))g='fsags551';
      else if(/TVJ|VZ/i.test(title))g='tvjgof035';
      else g='fsags';
    }
    return safeToken(g||'fsags');
  }
  function quickKey(){return QUICK_ROOT+':'+identity()+':'+quickGroup()}

  function readTheme(){
    try{
      const own=S(localStorage.getItem(themeKey()));
      if(own==='dark'||own==='light')return own;
      const device=S(localStorage.getItem(THEME_ROOT+':device'));
      if(device==='dark'||device==='light')return device;
    }catch(_){}
    return 'light';
  }
  function applyTheme(theme,persist){
    theme=theme==='dark'?'dark':'light';
    document.documentElement.setAttribute('data-ui-theme',theme);
    lastAppliedTheme=theme;
    if(persist){
      try{
        localStorage.setItem(themeKey(),theme);
        localStorage.setItem(THEME_ROOT+':device',theme);
      }catch(_){}
    }
    for(const b of document.querySelectorAll('[data-sags-theme-choice]')){
      const on=b.dataset.sagsThemeChoice===theme;
      b.classList.toggle('active',on);
      b.setAttribute('aria-pressed',on?'true':'false');
    }
    const label=$('sagsUiThemeState');
    if(label)label.textContent=theme==='dark'?'Tối':'Sáng';
    const toggle=$('sagsUiPrefsBtn');
    if(toggle){
      const dark=theme==='dark';
      toggle.textContent=dark?'☀ Sáng':'☾ Tối';
      toggle.title=dark?'Chuyển sang giao diện Sáng':'Chuyển sang giao diện Tối';
      toggle.setAttribute('aria-label',toggle.title);
      toggle.setAttribute('aria-pressed',dark?'true':'false');
      toggle.dataset.uiMode=theme;
    }
  }
  root.sagsSetUiTheme=function(theme){applyTheme(theme,true)};
  root.sagsGetUiTheme=()=>readTheme();










  function quickDeviceKey(){return QUICK_ROOT+':device:'+quickGroup()}
  function readHiddenAt(key){
    try{
      const stored=localStorage.getItem(key);
      if(stored===null)return null;
      const raw=JSON.parse(stored);
      return new Set(Array.isArray(raw)?raw.map(S).filter(Boolean):[]);
    }catch(_){return null}
  }
  function readHidden(){
    const own=readHiddenAt(quickKey());
    if(own)return own;
    const device=readHiddenAt(quickDeviceKey());
    return device||new Set();
  }
  function writeHidden(set){
    const payload=JSON.stringify([...set].sort());
    try{
      localStorage.setItem(quickKey(),payload);
      localStorage.setItem(quickDeviceKey(),payload);
      return localStorage.getItem(quickKey())===payload;
    }catch(_){return false}
  }
  function quickItems(){
    const out=[];
    // Native quick-entry fields use data-key. TVJ-GOF-035 uses data-vzk for
    // text/number/time/textarea fields and checkbox toggle buttons. Treat both
    // as the same customizable quick-entry surface so the common ⚙ button works.
    const selector=[
      '#quickTimeBody .quickTimeInput[data-key]',
      '#quickTimeBody .quickTimeInput[data-vzk]',
      '#quickTimeBody .vz632Toggle[data-vzk]'
    ].join(',');
    for(const input of document.querySelectorAll(selector)){
      const key=S(input.dataset.key||input.dataset.vzk);if(!key||out.some(x=>x.key===key))continue;
      const row=input.closest('.quickTimeRow,.qte551TimeRow');
      let label=S(row?.querySelector('.quickTimeLabel')?.textContent);
      if(!label&&row?.classList.contains('qte551TimeRow'))label=S(row.querySelector(':scope > span')?.textContent);
      const kind=S(input.dataset.kind);
      if(kind)label=(label||key)+' · '+kind;
      if(!label)label=key;
      out.push({key,label,input,row,kind});
    }
    return out;
  }
  function is551Quick(){
    let g='';
    try{g=S(activeFormGroup)}catch(_){}
    return g==='fsags551'||/55\.1/.test(S($('quickTimeTitle')?.textContent));
  }
  function streamline551Checks(){
    const active=is551Quick();
    for(const row of document.querySelectorAll('#quickTimeBody .qte551CheckRow')){
      if(active){
        row.dataset.sagsAutoHidden551='1';
        row.hidden=true;
        row.style.display='none';
        row.setAttribute('aria-hidden','true');
      }else if(row.dataset.sagsAutoHidden551==='1'){
        row.hidden=false;
        row.style.display='';
        row.removeAttribute('aria-hidden');
        delete row.dataset.sagsAutoHidden551;
      }
    }
    for(const title of document.querySelectorAll('#quickTimeBody .qte551SectionTitle')){
      const checklist=/CHECKLIST/i.test(S(title.textContent));
      if(active&&checklist){
        title.dataset.sagsAutoHidden551='1';
        title.hidden=true;
        title.style.display='none';
      }else if(title.dataset.sagsAutoHidden551==='1'){
        title.hidden=false;
        title.style.display='';
        delete title.dataset.sagsAutoHidden551;
      }
    }
  }

  function setFs09Context(bar,main){
    if(!bar)return;
    const s=bar.querySelector('span'),b=bar.querySelector('b');
    if(s&&s.textContent!=='ĐANG NHẬP')s.textContent='ĐANG NHẬP';
    if(b&&b.textContent!==main)b.textContent=main;
  }
  function ensureFs09Context(){
    const body=$('fs09qBody');if(!body)return null;
    let bar=$('sagsFs09Context');
    if(!bar){
      bar=document.createElement('div');
      bar.id='sagsFs09Context';bar.className='sagsFs09Context';
      bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');
      bar.innerHTML='<span>ĐANG NHẬP</span><b></b>';
      body.prepend(bar);
    }else if(body.firstElementChild!==bar)body.prepend(bar);
    return bar;
  }
  function syncFs09Context(){
    const body=$('fs09qBody');if(!body)return;
    const labels=[['fs09qTab0','1 · KẾT SỔ'],['fs09qTab1','2 · GIỜ BAY'],['fs09qTab2','3 · THEO DÕI']];
    for(const [id,label] of labels){const el=$(id);if(el&&el.textContent!==label)el.textContent=label;}
    const top=S(document.querySelector('#fs09QuickModal .fs09qTab.active')?.textContent).replace(/^\d+\s*[·.-]?\s*/,'');
    const active=document.activeElement;
    let main=top||'KẾT SỔ';
    if(/KẾT SỔ/i.test(main)){
      const sub=S(document.querySelector('#fs09QuickModal .fs09qCloseoutSubTab.active')?.textContent);
      const row=S(document.querySelector('#fs09QuickModal .fs09qCloseoutMainBtn.active,#fs09QuickModal .fs09qOptionalRowBtn.active')?.textContent);
      main='KẾT SỔ'+(sub?' › '+sub:'')+(row?' › '+row:'');
    }else if(/GIỜ/i.test(main)){
      const section=S(active?.closest?.('.fs09qTimeSection')?.querySelector?.('.fs09qTimeSectionHead')?.textContent);
      main='GIỜ BAY › '+(section||'CHUYẾN ĐẾN + CHUYẾN ĐI');
    }else{
      const task=S(active?.closest?.('.fs09qRow')?.querySelector?.('.fs09qLabel')?.textContent);
      main='THEO DÕI › '+(task||'CÁC MỐC KHAI THÁC');
    }
    setFs09Context(ensureFs09Context(),main);
  }

  function q551ContextForKey(key){
    key=S(key);
    let m=null;
    if(/^f551_(?:ata|atd|lirNotoc)/i.test(key))
      return {main:'TRANG 1 · MỐC CHUYẾN BAY',sub:'ATA / ATD / LIR-NOTOC'};
    if(/^f551_in/i.test(key))
      return {main:'TRANG 1 · MỤC 1 · INBOUND FLIGHT',sub:'PLANNED / ACTUAL · START / FINISH'};
    if(/^f551_(?:outCargoMailSide|outCargoULD|outBagULD)/i.test(key))
      return {main:'TRANG 2 · MỤC 2 · OUTBOUND FLIGHT',sub:'PLANNED / ACTUAL · START / FINISH'};
    if(/^f551_(?:confirmPlanner|confirmBagSection|cargoDoorsClosed)/i.test(key))
      return {main:'TRANG 2 · MỤC 2 · XÁC NHẬN LOAD',sub:'PLANNED / ACTUAL'};
    m=/^f551_off(?:Notified|Completed|ReloadTime)([1-5])$/i.exec(key);
    if(m)return {main:'TRANG 2 · OFFLOADED BAG · BAG '+m[1],sub:'NOTIFIED / COMPLETED / RELOADED'};
    return null;
  }
  function q551DefaultContext(){
    const page=S(document.querySelector('#quickTimeBody .quickTimePageTitle')?.textContent);
    return /TRANG\s*2/i.test(page)
      ? {main:'TRANG 2 · OUTBOUND FLIGHT',sub:'Công việc outbound / Offloaded bag'}
      : {main:'TRANG 1 · INBOUND FLIGHT',sub:'Mốc chuyến bay / công việc inbound'};
  }
  function update551Context(key){
    const bar=$('sags551QuickContext');if(!bar)return;
    const meta=q551ContextForKey(key)||q551DefaultContext();
    const main=bar.querySelector('b'),sub=bar.querySelector('span');
    if(main&&main.textContent!==meta.main)main.textContent=meta.main;
    if(sub&&sub.textContent!==meta.sub)sub.textContent=meta.sub;
  }
  function ensure551Context(){
    const body=$('quickTimeBody');if(!body)return;
    if(!is551Quick()){
      $('sags551QuickContext')?.remove();
      return;
    }
    let bar=$('sags551QuickContext');
    if(!bar){
      bar=document.createElement('div');
      bar.id='sags551QuickContext';
      bar.className='sags551QuickContext';
      bar.setAttribute('role','status');
      bar.setAttribute('aria-live','polite');
      bar.innerHTML='<b></b><span></span>';
      const pageTitle=body.querySelector('.quickTimePageTitle');
      if(pageTitle)pageTitle.insertAdjacentElement('afterend',bar);else body.prepend(bar);
    }
    const active=document.activeElement;
    update551Context(active?.matches?.('#quickTimeBody .quickTimeInput[data-key]')?active.dataset.key:'');
  }
  function rename551Sections(){
    if(!is551Quick())return;
    for(const title of document.querySelectorAll('#quickTimeBody .qte551SectionTitle')){
      const raw=S(title.textContent).toUpperCase();
      if(/CHECKLIST/.test(raw))continue;
      let next='';
      if(/MỐC THỰC TẾ/.test(raw))next='TRANG 1 · MỐC CHUYẾN BAY';
      else if(/^INBOUND/.test(raw))next='TRANG 1 · MỤC 1 · INBOUND FLIGHT';
      else if(/^OUTBOUND.*CÁC HÀNG/.test(raw))next='TRANG 2 · MỤC 2 · OUTBOUND FLIGHT';
      else if(/^OUTBOUND.*PLANNED/.test(raw))next='TRANG 2 · MỤC 2 · XÁC NHẬN LOAD';
      else if(/OFFLOADED BAG/.test(raw))next='TRANG 2 · OFFLOADED BAG';
      if(next&&S(title.textContent)!==next)title.textContent=next;
    }
  }
  function compact551ActualGrid(){
    const body=$('quickTimeBody');if(!body||body.querySelector('.sags551ActualGrid'))return;
    const title=[...body.querySelectorAll('.qte551SectionTitle')].find(x=>/MỐC CHUYẾN BAY/i.test(S(x.textContent)));
    if(!title)return;
    const rows=[];let node=title.nextElementSibling;
    while(node&&!node.classList.contains('qte551SectionTitle')){
      const next=node.nextElementSibling;
      if(node.classList.contains('qte551TimeRow'))rows.push(node);
      node=next;
    }
    if(rows.length<2)return;
    const grid=document.createElement('div');grid.className='sags551ActualGrid';
    title.insertAdjacentElement('afterend',grid);
    rows.forEach(row=>grid.appendChild(row));
  }
  function compact551Bags(){
    const body=$('quickTimeBody');if(!body||body.querySelector('.sags551BagList'))return;
    const title=[...body.querySelectorAll('.qte551SectionTitle')].find(x=>/OFFLOADED BAG/i.test(S(x.textContent)));
    if(!title)return;
    const scope=[];let node=title.nextElementSibling;
    while(node&&!node.classList.contains('qte551SectionTitle')){scope.push(node);node=node.nextElementSibling}
    const list=document.createElement('div');list.className='sags551BagList';
    let built=0;
    for(let n=1;n<=5;n++){
      const pair=scope.find(x=>x.classList?.contains('quickTimeRow')&&new RegExp('BAG\\s*'+n+'\\s*·\\s*NOTIFIED','i').test(S(x.textContent)));
      const single=scope.find(x=>x.classList?.contains('qte551TimeRow')&&new RegExp('BAG\\s*'+n+'\\s*·\\s*RELOADED','i').test(S(x.textContent)));
      if(!pair||!single)continue;
      const pCells=[...pair.querySelectorAll('.quickTimeTimeCell')];
      const reload=single.querySelector('.quickTimeSingleCell');
      const cells=[pCells[0],pCells[1],reload].filter(Boolean);
      if(cells.length!==3)continue;
      const row=document.createElement('div');row.className='qte551TimeRow sags551BagRow';
      const label=document.createElement('span');label.className='sags551BagLabel';label.textContent='BAG '+n;
      const cellBox=document.createElement('div');cellBox.className='sags551BagCells';
      ['NOTIFIED','COMPLETED','RELOADED'].forEach((lab,i)=>{cells[i].dataset.sags551Label=lab;cellBox.appendChild(cells[i])});
      row.append(label,cellBox);list.appendChild(row);
      pair.remove();single.remove();built++;
    }
    if(built)title.insertAdjacentElement('afterend',list);
  }
  function enhance551Quick(){
    // V6.1.41: native renderer owns 55.1 DOM; no re-parenting, compaction or auto-hide.
    if(!is551Quick())return;
    $('sags551QuickContext')?.remove();
  }
  function applyQuickVisibility(){
    const hidden=readHidden();
    const rows=new Set();
    for(const item of quickItems()){
      rows.add(item.row);
      const cell=item.input.closest('.quickTimeTimeCell,.quickTimeSingleCell');
      if(cell)cell.style.display=hidden.has(item.key)?'none':'';
    }
    for(const row of rows){
      if(!row)continue;
      // Use the normalized quickItems list instead of data-key only. This also
      // covers TVJ fields (data-vzk) and TVJ checkbox toggle buttons.
      const rowItems=quickItems().filter(x=>x.row===row);
      const allHidden=rowItems.length>0&&rowItems.every(x=>hidden.has(x.key));
      row.style.display=allHidden?'none':'';
    }
    const items=quickItems(),shown=items.filter(x=>!hidden.has(x.key)).length;
    const b=$('sagsQteCustomizeBtn');
    if(b){
      b.textContent='⚙';
      b.title=items.length?('Tùy chỉnh cột nhập nhanh · '+shown+'/'+items.length):'Tùy chỉnh nhập nhanh';
      b.setAttribute('aria-label',b.title);
    }
  }
  root.sagsApplyQuickTimePrefs=applyQuickVisibility;

  function ensureQuickCustomizeModal(){
    if($('sagsQteCustomizeModal'))return;
    const shell=document.createElement('div');
    shell.id='sagsQteCustomizeModal';
    shell.className='sagsQteCustomizeModal';
    shell.setAttribute('role','dialog');
    shell.setAttribute('aria-modal','true');
    shell.innerHTML=`
      <div class="sagsQteCustomizeCard">
        <div class="sagsUiPrefsHead">
          <div><b>TÙY CHỈNH NHẬP NHANH</b><small>Bấm HIỆN DANH SÁCH khi cần chọn lại các ô</small></div>
          <button type="button" class="sagsQteCustomizeClose" aria-label="Đóng">×</button>
        </div>
        <button type="button" id="sagsQteListToggle" class="sagsQteListToggle" aria-controls="sagsQteCustomizeOptions" aria-expanded="false">HIỆN DANH SÁCH</button>
        <div id="sagsQteCustomizeOptions" class="sagsQteCustomizeOptions" hidden>
          <div id="sagsQteCustomizeList" class="sagsQteCustomizeList"></div>
          <div class="sagsQteCustomizeFoot">
            <button type="button" id="sagsQteResetPage">Mặc định trang này</button>
            <button type="button" id="sagsQteSavePrefs" class="primary">Lưu lựa chọn</button>
          </div>
          <div class="sagsUiPrefsHint">Chỉ các ô đã chọn sẽ hiện trong Nhập nhanh. Lựa chọn được ghi nhớ trên máy này.</div>
        </div>
      </div>`;
    document.body.appendChild(shell);
    shell.addEventListener('click',e=>{if(e.target===shell)closeQuickCustomize()});
    shell.querySelector('.sagsQteCustomizeClose')?.addEventListener('click',closeQuickCustomize);
    $('sagsQteListToggle')?.addEventListener('click',()=>setQuickCustomizeExpanded($('sagsQteCustomizeOptions')?.hidden===true));
    $('sagsQteSavePrefs')?.addEventListener('click',saveQuickCustomize);
    $('sagsQteResetPage')?.addEventListener('click',resetQuickCustomize);
  }
  function setQuickCustomizeExpanded(open){
    const options=$('sagsQteCustomizeOptions'),toggle=$('sagsQteListToggle');if(!options||!toggle)return;
    options.hidden=!open;
    toggle.textContent=open?'ẨN DANH SÁCH':'HIỆN DANH SÁCH';
    toggle.setAttribute('aria-expanded',open?'true':'false');
  }
  function quickChoiceMeta(item){
    const label=S(item?.label),parts=label.split('·').map(S).filter(Boolean);
    if(parts.length>=3&&/^(INBOUND|OUTBOUND)$/i.test(parts[0])){
      return {group:parts.slice(0,2).join(' · '),choice:parts.slice(2).join(' · ')||label};
    }
    let rowLabel=S(item?.row?.querySelector?.('.quickTimeLabel')?.textContent);
    if(!rowLabel&&item?.row?.classList?.contains('qte551TimeRow'))rowLabel=S(item.row.querySelector(':scope > span')?.textContent);
    if(rowLabel){
      let choice=label;
      if(choice.toUpperCase().startsWith(rowLabel.toUpperCase()))choice=S(choice.slice(rowLabel.length).replace(/^[·\s-]+/,''));
      if(!choice)choice=S(item.kind)||'Hiển thị';
      return {group:rowLabel,choice};
    }
    if(parts.length>1)return {group:parts.slice(0,-1).join(' · '),choice:parts[parts.length-1]};
    return {group:label||item.key,choice:'Hiển thị'};
  }
  function updateQuickGroupSummary(group){
    if(!group)return;
    const boxes=[...group.querySelectorAll('input[data-key]')];
    const selected=boxes.filter(x=>x.checked).length;
    const summary=group.querySelector('[data-sags-qte-summary]');
    if(summary)summary.textContent=selected+'/'+boxes.length+' đã chọn';
  }
  function renderQuickCustomizeList(items,hidden){
    const list=$('sagsQteCustomizeList');if(!list)return;
    list.innerHTML='';
    const groups=new Map();
    for(const item of items){
      const meta=quickChoiceMeta(item),name=S(meta.group)||item.key;
      if(!groups.has(name))groups.set(name,[]);
      groups.get(name).push({item,meta});
    }
    for(const [name,entries] of groups){
      const group=document.createElement('section');group.className='sagsQteChoiceGroup';
      const head=document.createElement('div');head.className='sagsQteChoiceGroupHead';
      const strong=document.createElement('b');strong.textContent=name;
      const summary=document.createElement('small');summary.dataset.sagsQteSummary='1';
      head.append(strong,summary);
      const body=document.createElement('div');body.className='sagsQteChoiceBody';
      for(const entry of entries){
        const lab=document.createElement('label');lab.className='sagsQteChoice';
        const check=document.createElement('input');check.type='checkbox';check.checked=!hidden.has(entry.item.key);check.dataset.key=entry.item.key;
        const span=document.createElement('span');span.textContent=entry.meta.choice;
        check.addEventListener('change',()=>updateQuickGroupSummary(group));
        lab.append(check,span);body.appendChild(lab);
      }
      group.append(head,body);list.appendChild(group);updateQuickGroupSummary(group);
    }
  }
  function openQuickCustomize(){
    ensureQuickCustomizeModal();
    const items=quickItems();
    if(!items.length){root.alert?.('Trang này chưa có ô nhập nhanh để tùy chỉnh.');return}
    renderQuickCustomizeList(items,readHidden());
    setQuickCustomizeExpanded(false);
    $('sagsQteCustomizeModal')?.classList.add('open');
  }
  function closeQuickCustomize(){$('sagsQteCustomizeModal')?.classList.remove('open')}
  function saveQuickCustomize(){
    const hidden=readHidden();
    const boxes=[...document.querySelectorAll('#sagsQteCustomizeList input[data-key]')];
    if(boxes.length&&!boxes.some(x=>x.checked)){
      root.alert?.('Hãy giữ lại ít nhất 1 ô nhập nhanh trên trang này.');
      return;
    }
    for(const box of boxes){
      const key=S(box.dataset.key);
      if(box.checked)hidden.delete(key);else hidden.add(key);
    }
    if(!writeHidden(hidden)){
      root.alert?.('Không lưu được tùy chọn trên thiết bị này. Hãy thử lại sau khi mở lại ứng dụng.');
      return;
    }
    closeQuickCustomize();applyQuickVisibility();
    try{root.showToast?.('Đã lưu tùy chọn Nhập nhanh.')}catch(_){}
  }
  function resetQuickCustomize(){
    const hidden=readHidden();
    for(const item of quickItems())hidden.delete(item.key);
    if(!writeHidden(hidden)){
      root.alert?.('Không lưu được tùy chọn mặc định trên thiết bị này.');
      return;
    }
    closeQuickCustomize();applyQuickVisibility();
  }
  root.sagsOpenQuickTimeCustomize=openQuickCustomize;

  function ensureQuickButton(){
    const head=document.querySelector('#quickTimeModal .quickTimeHead');
    if(!head||$('sagsQteCustomizeBtn'))return;
    const bar=document.createElement('div');
    bar.className='sagsQteCustomizeBar';
    const b=document.createElement('button');
    b.id='sagsQteCustomizeBtn';b.type='button';b.textContent='⚙ Tùy chỉnh';
    b.addEventListener('click',openQuickCustomize);
    bar.appendChild(b);
    const top=head.querySelector('.quickTimeHeadTop');
    const close=top?.querySelector('.quickTimeCloseIcon');
    if(top&&close)top.insertBefore(bar,close);else head.appendChild(bar);
  }

  const FLOW_SELECTOR=[
    '#quickTimeBody .quickTimeInput[data-key]',
    '#quickTimeBody .quickTimeInput[data-vzk]',
    '#fs09qBody .fs09qInput[data-key]',
    '#fs09qBody .fs09qDataInput[data-key]',
    '#fs09qBody .fs09qTextArea[data-key]'
  ].join(',');
  function usableField(el){
    if(!el||el.disabled||el.hidden||el.getAttribute('aria-hidden')==='true'||el.tabIndex<0)return false;
    try{return el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden'}catch(_){return true}
  }
  function flowFields(){
    return [...document.querySelectorAll(FLOW_SELECTOR)].filter(usableField);
  }
  function focusFlowSibling(target,delta){
    const list=flowFields(),i=list.indexOf(target);
    if(i<0)return false;
    const next=list[i+delta];
    if(!next)return false;
    try{next.focus({preventScroll:true})}catch(_){next.focus()}
    try{if(next.tagName==='INPUT'&&next.type!=='date'&&next.type!=='time')next.select()}catch(_){}
    try{next.scrollIntoView({block:'nearest',inline:'nearest'})}catch(_){}
    return true;
  }
  function suppressAuxTimeButtons(){
    const direct=[
      '#quickTimeBody .quickTimeNow',
      '#quickTimeBody .quickTimeTimeCell button',
      '#quickTimeBody .quickTimeSingleCell button'
    ];
    for(const b of document.querySelectorAll(direct.join(','))){
      if(b.classList.contains('vz632Toggle'))continue;
      b.tabIndex=-1;
      if(!b.getAttribute('aria-label'))b.setAttribute('aria-label','Lấy giờ hiện tại');
    }
    for(const b of document.querySelectorAll('#fs09qBody button')){
      const meta=S([b.className,b.id,b.title,b.getAttribute('aria-label'),b.getAttribute('onclick'),b.textContent].join(' ')).toLowerCase();
      if(/\bnow\b|giờ hiện tại|gio hien tai|lấy giờ|lay gio|current time/.test(meta))b.tabIndex=-1;
    }
  }
  function optimizeEntryFlow(){
    enhance551Quick();
    syncFs09Context();
    suppressAuxTimeButtons();
    for(const el of document.querySelectorAll(FLOW_SELECTOR)){
      if(el.tagName!=='TEXTAREA')el.enterKeyHint='next';
      el.autocomplete='off';
      if(el.tagName==='INPUT')el.spellcheck=false;
    }
  }
  function handleEntryKeydown(e){
    if(e.isComposing)return;
    const el=e.target;
    if(el?.id==='sqValue'&&e.key==='Tab'){
      const b=$(e.shiftKey?'sqPrev':'sqNext');
      if(b&&!b.disabled){e.preventDefault();b.click()}
      return;
    }
    if(!el?.matches?.(FLOW_SELECTOR))return;
    if(e.key==='Tab'){
      suppressAuxTimeButtons();
      if(focusFlowSibling(el,e.shiftKey?-1:1))e.preventDefault();
      return;
    }
  }
  function bindQuickObserver(){
    const body=$('quickTimeBody');if(!body||qteObserver)return;
    qteObserver=new MutationObserver(()=>setTimeout(()=>{applyQuickVisibility();optimizeEntryFlow()},0));
    qteObserver.observe(body,{childList:true,subtree:true});
  }
  function bindFs09Observer(){
    const body=$('fs09qBody');if(!body||fs09Observer)return;
    fs09Observer=new MutationObserver(()=>setTimeout(syncFs09Context,0));
    fs09Observer.observe(body,{childList:true,subtree:true});
  }

  function syncIdentityAndTheme(){
    const id=identity();
    if(id!==lastIdentity){
      lastIdentity=id;
      applyTheme('dark',false);
      setTimeout(applyQuickVisibility,0);
    }else{
      const t='dark';
      if(t!==lastAppliedTheme)applyTheme(t,false);
    }
  }
  function install(){
    ensureQuickButton();ensureQuickCustomizeModal();bindQuickObserver();bindFs09Observer();
    syncIdentityAndTheme();applyQuickVisibility();optimizeEntryFlow();
    document.addEventListener('keydown',handleEntryKeydown,true);
    document.addEventListener('focusin',e=>{
      const el=e.target;
      if(is551Quick()&&el?.matches?.('#quickTimeBody .quickTimeInput[data-key]'))update551Context(el.dataset.key);
      if(el?.matches?.('#fs09qBody [data-key]'))syncFs09Context();
    },true);
    setInterval(()=>{ensureQuickButton();bindQuickObserver();bindFs09Observer();syncIdentityAndTheme();optimizeEntryFlow()},1200);
    window.addEventListener('pageshow',()=>{syncIdentityAndTheme();setTimeout(()=>{applyQuickVisibility();optimizeEntryFlow()},0)},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncIdentityAndTheme();setTimeout(()=>{applyQuickVisibility();optimizeEntryFlow()},0)}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);
