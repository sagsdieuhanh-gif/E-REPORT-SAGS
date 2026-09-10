/* E-REPORT/SAGS V4.2.39 · V2.2.19-AD-FORM-LIBRARY
   AD can open form templates directly from Form Alignment Center. */
(function(root){
  'use strict';
  if(root.__SAGS_V2219_FORM_LIBRARY)return;
  root.__SAGS_V2219_FORM_LIBRARY=true;

  const $=id=>document.getElementById(id);
  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const EDITABLE='input:not([type="hidden"]):not([type="file"]):not([type="button"]):not([type="submit"]),textarea,select,[contenteditable="true"]';
  const FORM_WORDS=/(FINAL|KẾT\s*SỔ|KET\s*SO|FSAGS|F-SAGS|RNS|CLEANING|CLEAN\b|BIỂU\s*MẪU|BIEU\s*MAU|PHIẾU|PHIEU)/i;
  const ACTION_BLACKLIST=/(GỬI|GUI\b|XÁC\s*NHẬN|XAC\s*NHAN|CHỐT|CHOT\b|LƯU|LUU\b|SAVE|UPDATE|CHECK|XÓA|XOA\b)/i;
  const EXCLUDE='#sagsAlignPanel,#sagsAlignLibrary,#sagsAlignPreview,#sagsAlignLaunch,#roleLoginModal,#v181AdminCenter,#srModal,#qiModal';

  function session(){
    try{const s=root.__sagsGetSession?.()||{},p=s.profile||{};return {role:U(s.role||p.role||p.systemRole||root.currentRole)}}catch(_){return {role:U(root.currentRole)}}
  }
  const isAdmin=()=>session().role==='AD';
  function norm(v){return U(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/\s+/g,' ').trim()}
  function safeText(v){return S(v).replace(/\s+/g,' ').trim()}
  function rawFields(el){return [...el.querySelectorAll(EDITABLE)].filter(f=>!f.closest(EXCLUDE))}
  function bgName(el){
    const imgs=[...el.querySelectorAll('img')];
    for(const img of imgs){const src=S(img.currentSrc||img.src);if(src)return src.split('/').pop().split('?')[0]}
    const inline=S(el.style?.backgroundImage);const m=inline.match(/url\(["']?([^"')]+)["']?\)/);if(m)return m[1].split('/').pop().split('?')[0];
    try{const bg=getComputedStyle(el).backgroundImage||'';const m2=bg.match(/url\(["']?([^"')]+)["']?\)/);if(m2)return m2[1].split('/').pop().split('?')[0]}catch(_){}
    return '';
  }
  function pretty(name){
    const n=norm(name);
    if(n.includes('9GFINAL'))return 'FINAL · 9G';
    if(n.includes('VJFINAL'))return 'FINAL · VJ';
    if(n.includes('VUFINAL'))return 'FINAL · VU';
    if(n.includes('FSAGS13'))return 'FSAGS 13';
    if(n.includes('RNS-KE')||n.includes('RNS KE'))return 'RNS · KE';
    if(n.includes('RNS-LJ')||n.includes('RNS LJ'))return 'RNS · LJ';
    if(n.includes('RNS-TW')||n.includes('RNS TW'))return 'RNS · TW';
    return safeText(name).replace(/\.(png|jpg|jpeg|webp)$/i,'')||'Biểu mẫu';
  }

  function classifyItem(item){
    const t=norm([
      item?.label,item?.rawLabel,item?.bg,
      item?.el?.id,item?.el?.className,
      item?.el?.getAttribute?.('data-template-id'),
      item?.el?.getAttribute?.('data-form-id')
    ].filter(Boolean).join(' '));
    if(/\bFINAL\b/.test(t)||t.includes('VJFINAL')||t.includes('VUFINAL')||t.includes('9GFINAL'))return 'final';
    if(t.includes('KET SO')||t.includes('KETSO')||t.includes('CLOSEOUT'))return 'ketso';
    if(t.includes('FSAGS')||t.includes('F-SAGS')||t.includes('F SAGS'))return 'fsags';
    if(/\bRNS\b/.test(t)||t.includes('RNS-'))return 'rns';
    if(t.includes('CLEANING')||t.includes('CLEAN ' )||t.endsWith(' CLEAN'))return 'cleaning';
    return 'other';
  }
  const TYPE_LABELS={
    all:'TẤT CẢ',
    final:'FINAL',
    ketso:'KẾT SỔ',
    fsags:'FSAGS',
    rns:'RNS',
    cleaning:'CLEANING',
    other:'KHÁC'
  };

  function stageLabel(el){
    const bg=bgName(el),explicit=S(el.dataset?.templateId||el.dataset?.formId||el.getAttribute('data-template')||el.getAttribute('data-form'));
    const head=safeText(el.querySelector('h1,h2,h3,.title,.form-title')?.textContent);
    const id=S(el.id);return pretty(explicit||bg||head||id||'Biểu mẫu');
  }
  function stageScore(el){
    if(!el||el===document.body||el===document.documentElement||el.closest(EXCLUDE))return -999;
    const f=rawFields(el);if(f.length<2)return -999;
    let score=0;
    const sig=[el.id,el.className,el.dataset?.templateId,el.dataset?.formId,bgName(el),el.textContent?.slice(0,200)].filter(Boolean).join(' ');
    if(FORM_WORDS.test(sig))score+=6;
    if(bgName(el))score+=7;
    if(el.matches('[data-template-id],[data-form-id],.form-page,.template-page,.form-canvas,.sheet-page,.document-page'))score+=7;
    let abs=0;for(const x of f){try{if(['absolute','fixed'].includes(getComputedStyle(x).position))abs++}catch(_){}}
    if(abs>=2)score+=5;
    score+=Math.min(12,f.length)*.2;
    return score;
  }
  function discoverEmbedded(){
    const cand=new Map();
    const seeds=[...document.querySelectorAll('[data-template-id],[data-form-id],.form-page,.template-page,.form-canvas,.sheet-page,.document-page,'+EDITABLE)];
    for(const seed of seeds){
      let p=seed.matches?.(EDITABLE)?seed.parentElement:seed,depth=0;
      while(p&&p!==document.body&&depth++<7){if(!cand.has(p))cand.set(p,stageScore(p));p=p.parentElement}
    }
    const out=[];const seen=new Set();
    for(const [el,score] of [...cand].sort((a,b)=>b[1]-a[1])){
      if(score<6)continue;
      const label=stageLabel(el),bg=bgName(el),key=norm(label+'|'+bg+'|'+rawFields(el).length);
      if(seen.has(key))continue;seen.add(key);
      out.push({kind:'embedded',label,bg,el,fieldCount:rawFields(el).length,score});
      if(out.length>=30)break;
    }
    return out;
  }
  function controlLabel(el){
    return safeText(el.getAttribute('aria-label')||el.title||el.textContent||el.value||el.id);
  }
  function discoverLaunchers(){
    const list=[],seen=new Set();
    for(const el of document.querySelectorAll('button,a,[role="button"],summary')){
      if(el.closest(EXCLUDE))continue;
      const label=controlLabel(el);if(!label||label.length>100)continue;
      const sig=label+' '+S(el.id)+' '+S(el.className)+' '+S(el.getAttribute('data-action'));
      if(!FORM_WORDS.test(sig)||ACTION_BLACKLIST.test(label))continue;
      const key=norm(label);if(seen.has(key))continue;seen.add(key);
      list.push({kind:'launcher',label:pretty(label),rawLabel:label,el,disabled:!!el.disabled});
      if(list.length>=40)break;
    }
    return list;
  }
  function libraryItems(){
    const embedded=discoverEmbedded(),launchers=discoverLaunchers();
    const items=[...embedded,...launchers];
    items.sort((a,b)=>a.label.localeCompare(b.label,'vi'));
    return items;
  }
  function ensureStyle(){
    if($('sagsAlignLibraryStyle'))return;
    const st=document.createElement('style');st.id='sagsAlignLibraryStyle';
    st.textContent=`
#sagsAlignLibrary[hidden],#sagsAlignPreview[hidden],#sagsAlignLibraryBtn[hidden]{display:none!important}
#sagsAlignLibrary{position:fixed;inset:0;z-index:100650;background:#17364aaa;display:flex;align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));box-sizing:border-box;font:14px/1.4 Arial;color:#17364a}
.sagsLibPanel{width:min(720px,100%);max-height:92dvh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 12px 40px #0005}
.sagsLibHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.sagsLibHead h2{font-size:18px;margin:0}.sagsLibHead button{width:44px;height:44px;border-radius:10px}
.sagsLibIntro{margin:8px 0 10px;color:#4e6475}.sagsLibTools{display:grid;grid-template-columns:180px 1fr auto;gap:8px;margin-bottom:8px}.sagsLibTools input,.sagsLibTools select{min-height:44px;padding:9px;border:1px solid #a9bdcc;border-radius:10px;font-size:15px;background:#fff;color:#17364a}.sagsLibTools button{min-height:44px;border:1px solid #a9bdcc;border-radius:10px;background:#f4f8fb;font-weight:800}.sagsLibQuick{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.sagsLibChip{min-height:36px;padding:7px 10px;border:1px solid #b8cad8;border-radius:999px;background:#fff;color:#17364a;font-weight:800}.sagsLibChip.active{background:#0b6398;color:#fff;border-color:#0b6398}.sagsLibCount{margin:0 0 9px;font-weight:800;color:#536b7e}
#sagsAlignLibraryList{display:grid;grid-template-columns:1fr 1fr;gap:9px}.sagsLibItem{display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;min-height:62px;padding:10px 12px;border:1px solid #c3d3df;border-radius:12px;background:#fff;color:#17364a}.sagsLibItem strong{display:block}.sagsLibItem small{display:block;color:#62788a;margin-top:2px}.sagsLibItem em{font-style:normal;font-weight:900;color:#0b6398}.sagsLibEmpty{grid-column:1/-1;padding:18px;text-align:center;background:#f5f8fb;border-radius:12px}
#sagsAlignLibraryBtn{position:fixed;right:14px;bottom:calc(132px + env(safe-area-inset-bottom));z-index:100480;min-height:46px;padding:10px 14px;border:0;border-radius:999px;background:#fff;color:#0b6398;font:800 14px Arial;box-shadow:0 5px 18px #0003}

#sagsAlignEditNow[hidden]{display:none!important}
#sagsAlignEditNow{position:fixed;right:14px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:2147482995;display:block;min-width:168px;min-height:54px;padding:11px 16px;border:0;border-radius:999px;background:#0b6398;color:#fff;font:900 16px Arial;box-shadow:0 6px 22px #0005}
#sagsAlignEditNow small{display:block;font-size:11px;font-weight:600;margin-top:2px;opacity:.9}

#sagsAlignPreview{position:fixed;inset:0;z-index:100640;background:#e8eef3;overflow:auto;padding:max(56px,env(safe-area-inset-top)) 10px max(80px,env(safe-area-inset-bottom));box-sizing:border-box}
.sagsPreviewBar{position:fixed;left:0;right:0;top:0;z-index:100645;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#17364a;color:#fff;padding:max(8px,env(safe-area-inset-top)) 10px 8px}.sagsPreviewBar button{min-height:42px;border:0;border-radius:9px;background:#fff;color:#17364a;font-weight:800;padding:8px 12px}.sagsPreviewTitle{font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#sagsAlignPreviewBody{min-width:300px;min-height:500px;background:#fff;border-radius:8px;padding:6px;box-shadow:0 4px 18px #0002;overflow:auto}.sagsAlignPreviewClone{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;left:auto!important;top:auto!important;margin:0 auto!important;transform:none!important}
@media(max-width:640px){#sagsAlignLibraryList{grid-template-columns:1fr}.sagsLibTools{grid-template-columns:1fr}.sagsLibPanel{padding:10px}.sagsLibQuick{gap:5px}.sagsLibChip{flex:1 1 auto}}
`;
    document.head.appendChild(st);
  }
  function ensureUi(){
    ensureStyle();
    if(!$('sagsAlignLibraryBtn')){
      const b=document.createElement('button');b.id='sagsAlignLibraryBtn';b.type='button';b.hidden=!isAdmin();b.textContent='🗂 MỞ BIỂU MẪU';b.onclick=openLibrary;document.body.appendChild(b);
    }
    if(!$('sagsAlignEditNow')){
      const b=document.createElement('button');
      b.id='sagsAlignEditNow';b.type='button';b.hidden=true;
      b.innerHTML='🛠 CHỈNH NGAY<small>căn vị trí ô nhập</small>';
      b.onclick=()=>startEditingOpenedForm();
      document.body.appendChild(b);
    }
    if(!$('sagsAlignLibrary')){
      const m=document.createElement('section');m.id='sagsAlignLibrary';m.hidden=true;
      m.innerHTML=`<div class="sagsLibPanel"><div class="sagsLibHead"><h2>BIỂU MẪU ĐỂ CĂN CHỈNH</h2><button id="sagsLibClose" type="button">✕</button></div><p class="sagsLibIntro">Chọn nhanh LOẠI BIỂU MẪU hoặc gõ tên/mã. Không cần mò thủ công trong danh sách dài.</p><div class="sagsLibTools"><select id="sagsLibType" aria-label="Loại biểu mẫu"><option value="all">TẤT CẢ LOẠI</option><option value="final">FINAL</option><option value="ketso">KẾT SỔ</option><option value="fsags">FSAGS</option><option value="rns">RNS</option><option value="cleaning">CLEANING</option><option value="other">KHÁC</option></select><input id="sagsLibSearch" type="search" placeholder="Tìm tên / mã biểu mẫu…"><button id="sagsLibRefresh" type="button">QUÉT LẠI</button></div><div id="sagsLibQuick" class="sagsLibQuick"><button class="sagsLibChip active" data-type="all">TẤT CẢ</button><button class="sagsLibChip" data-type="final">FINAL</button><button class="sagsLibChip" data-type="ketso">KẾT SỔ</button><button class="sagsLibChip" data-type="fsags">FSAGS</button><button class="sagsLibChip" data-type="rns">RNS</button><button class="sagsLibChip" data-type="cleaning">CLEANING</button></div><p id="sagsLibCount" class="sagsLibCount"></p><div id="sagsAlignLibraryList"></div></div>`;
      document.body.appendChild(m);
      $('sagsLibClose').onclick=closeLibrary;
      $('sagsLibRefresh').onclick=renderList;
      $('sagsLibSearch').oninput=renderList;
      $('sagsLibType').onchange=()=>{syncTypeChips();renderList()};
      $('sagsLibQuick').querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{
        $('sagsLibType').value=b.dataset.type||'all';
        syncTypeChips();renderList();
      });
      m.addEventListener('click',e=>{if(e.target===m)closeLibrary()});
    }
    if(!$('sagsAlignPreview')){
      const p=document.createElement('section');p.id='sagsAlignPreview';p.hidden=true;
      p.innerHTML='<div class="sagsPreviewBar"><button id="sagsPreviewBack" type="button">← DANH SÁCH</button><div id="sagsPreviewTitle" class="sagsPreviewTitle"></div><button id="sagsPreviewAlign" type="button">🛠 CHỈNH NGAY</button></div><div id="sagsAlignPreviewBody"></div>';
      document.body.appendChild(p);
      $('sagsPreviewBack').onclick=()=>{closePreview();openLibrary()};
      $('sagsPreviewAlign').onclick=()=>startEditingOpenedForm();
    }
  }
  let openedFormMode="",openedPreviewStage=null;

  function showEditNow(mode,stage){
    openedFormMode=mode||"launcher";
    openedPreviewStage=stage||null;
    const b=$('sagsAlignEditNow');
    if(!b)return;
    b.hidden=!isAdmin();
    b.style.display=isAdmin()?'block':'none';
  }
  function hideEditNow(){
    openedFormMode="";openedPreviewStage=null;
    const b=$('sagsAlignEditNow');if(b){b.hidden=true;b.style.display='none'}
  }
  function startEditingOpenedForm(){
    if(!isAdmin())return;
    try{
      if(openedPreviewStage&&openedPreviewStage.isConnected&&typeof root.sagsFormAlignUseStage==='function'){
        const ok=root.sagsFormAlignUseStage(openedPreviewStage);
        if(ok)return;
      }
      root.sagsFormAlignOpen?.();
      setTimeout(()=>{
        const info=root.sagsFormAlignInfo?.();
        if(!info?.editing){
          alert('Chưa nhận diện được vùng ô nhập của biểu mẫu. Hãy chạm lại CHỈNH NGAY sau khi biểu mẫu tải xong hoàn toàn.');
        }
      },250);
    }catch(e){alert('Chưa mở được chế độ căn chỉnh: '+S(e?.message||e))}
  }

  function closeLibrary(){const m=$('sagsAlignLibrary');if(m)m.hidden=true}
  function openLibrary(){if(!isAdmin())return;ensureUi();$('sagsAlignLibrary').hidden=false;renderList()}
  function closePreview(){const p=$('sagsAlignPreview');if(p)p.hidden=true;const b=$('sagsAlignPreviewBody');if(b)b.innerHTML='';hideEditNow()}

  function syncTypeChips(){
    const type=S($('sagsLibType')?.value||'all');
    $('sagsLibQuick')?.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
  }

  function renderList(){
    ensureUi();const list=$('sagsAlignLibraryList');if(!list)return;
    const q=norm($('sagsLibSearch')?.value||''),type=S($('sagsLibType')?.value||'all');list.innerHTML='';
    syncTypeChips();
    const all=libraryItems();
    const items=all.filter(x=>{
      const typeOk=type==='all'||classifyItem(x)===type;
      const qOk=!q||norm(x.label+' '+(x.rawLabel||'')+' '+(x.bg||'')).includes(q);
      return typeOk&&qOk;
    });
    const count=$('sagsLibCount');if(count)count.textContent=`${items.length} biểu mẫu${type!=='all'?' · '+(TYPE_LABELS[type]||type):''}${q?' · tìm: '+S($('sagsLibSearch').value):''}`;
    if(!items.length){list.innerHTML='<div class="sagsLibEmpty"><b>Không thấy biểu mẫu theo bộ lọc này.</b><br>Thử chọn TẤT CẢ, đổi từ khóa hoặc bấm QUÉT LẠI.</div>';return}
    for(const item of items){
      const b=document.createElement('button');b.type='button';b.className='sagsLibItem';
      const meta=item.kind==='embedded'?`${item.fieldCount} ô nhập${item.bg?' · '+item.bg:''}`:(item.disabled?'Nút hiện đang khóa':'Mở bằng chức năng có sẵn');
      b.innerHTML=`<span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(meta)}</small></span><em>MỞ →</em>`;
      b.onclick=()=>item.kind==='embedded'?openEmbedded(item):openLauncher(item);list.appendChild(b);
    }
  }
  function escapeHtml(v){return S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function cleanClone(rootEl){
    rootEl.querySelectorAll('script').forEach(x=>x.remove());
    rootEl.querySelectorAll('*').forEach(el=>{for(const a of [...el.attributes])if(/^on/i.test(a.name))el.removeAttribute(a.name)});
  }
  function openEmbedded(item){
    closeLibrary();ensureUi();const preview=$('sagsAlignPreview'),body=$('sagsAlignPreviewBody');body.innerHTML='';
    const clone=item.el.cloneNode(true);cleanClone(clone);clone.removeAttribute('hidden');clone.setAttribute('aria-hidden','false');clone.classList.add('sagsAlignPreviewClone');
    clone.style.setProperty('display','block','important');clone.style.setProperty('visibility','visible','important');clone.style.setProperty('opacity','1','important');
    body.appendChild(clone);$('sagsPreviewTitle').textContent=item.label;preview.hidden=false;
    showEditNow('preview',clone);
    setTimeout(()=>{try{root.sagsFormAlignUseStage?.(clone)}catch(_){}},180);
  }
  function openLauncher(item){
    if(item.disabled){alert('Biểu mẫu này đang bị khóa theo trạng thái nghiệp vụ. Hệ thống sẽ thử mở nhưng có thể cần chọn chuyến/workspace trước.');}
    closeLibrary();showEditNow('launcher',null);
    try{item.el.click()}catch(e){hideEditNow();alert('Không mở được biểu mẫu: '+S(e?.message||e));return}
    let tries=0;const timer=setInterval(()=>{tries++;try{const info=root.sagsFormAlignInfo?.();if(info?.fieldCount>0){clearInterval(timer);root.sagsFormAlignOpen?.();}}catch(_){}if(tries>=12)clearInterval(timer)},250);
  }
  function enhanceAdminCard(){
    const card=$('sagsAlignAdminCard');if(!card||!isAdmin())return;
    const small=card.querySelector('small');if(small)small.textContent='Chọn và mở biểu mẫu ngay tại đây → căn → lưu đồng bộ';
    const em=card.querySelector('em');if(em)em.textContent='CHỌN MẪU';
    card.onclick=openLibrary;
  }
  function syncLaunchButton(){
    ensureUi();const lib=$('sagsAlignLibraryBtn');if(lib){lib.hidden=!isAdmin();lib.style.display=isAdmin()?'block':'none'}
    enhanceAdminCard();
    const old=$('sagsAlignLaunch');if(old&&isAdmin()){
      old.title='Căn biểu mẫu đang mở';
    }
    const edit=$('sagsAlignEditNow');
    if(edit&&openedFormMode&&isAdmin()){edit.hidden=false;edit.style.display='block'}
  }
  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;syncLaunchButton()})}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style']});
  ['sags:login','sags:rolechange','sags:profilechange','sags:ui-ready'].forEach(n=>root.addEventListener?.(n,schedule));
  root.sagsFormLibraryOpen=openLibrary;
  root.sagsFormLibraryList=()=>libraryItems().map(x=>({kind:x.kind,type:classifyItem(x),label:x.label,fieldCount:x.fieldCount||0,disabled:!!x.disabled}));
  ensureUi();syncLaunchButton();
})(typeof window==='undefined'?globalThis:window);
