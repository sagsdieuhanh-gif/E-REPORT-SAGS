/* SAGS Form Manager UX V2
   Simplified 4-step wizard shell for AD. Keeps the existing Form Manager engine,
   registry, validation, PDF and AI logic intact; this module only reorganizes UX.
*/
(function(root){
'use strict';
if(root.__SAGS_FORM_MANAGER_UX_V2)return;
root.__SAGS_FORM_MANAGER_UX_V2='V2.0.0-20261001-FMTEST2';

const $=id=>document.getElementById(id);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
let currentStep=1;
let advanced=false;

function fire(id){
  const e=$(id);
  if(!e)return false;
  e.click();
  return true;
}
function setStatus(t){
  const e=$('v440Status');
  if(e){e.textContent=String(t||'');e.style.color='#067647'}
}
function ensureStyle(){
  if($('fmuxStyle'))return;
  const st=document.createElement('style');
  st.id='fmuxStyle';
  st.textContent=
  '#v440Fm.fmux-shell{--fmux-blue:#075ea8;--fmux-teal:#087a55;--fmux-ink:#172033;--fmux-muted:#667085;--fmux-line:#d8e1e8;--fmux-soft:#f4f8fb}'+
  '#v440Fm.fmux-shell .v440FmHead{min-height:52px!important;padding:7px 10px!important;gap:8px!important;background:#0b4a7b!important;overflow-x:auto!important}'+
  '#v440Fm.fmux-shell .v440FmHead>b{display:block!important;white-space:nowrap;font-size:16px!important}'+
  '#v440Fm.fmux-shell .v440FmHead>#v450Perf,#v440Fm.fmux-shell .v440FmHead>button:not(#v440Close){display:none!important}'+
  '#v440Fm.fmux-shell #v440Close{display:inline-flex!important;align-items:center;justify-content:center;min-height:38px!important}'+
  '.fmuxHeadActions{display:flex;align-items:center;gap:6px;flex:0 0 auto}'+
  '.fmuxHeadBtn{border:1px solid #ffffff55;border-radius:9px;background:#ffffff17;color:#fff;min-height:38px;padding:7px 10px;font-weight:900;white-space:nowrap}'+
  '.fmuxHeadBtn.primary{background:#fff;color:#0b4a7b;border-color:#fff}.fmuxHeadBtn.active{background:#fef3c7;color:#92400e;border-color:#f59e0b}'+
  '#fmuxStepBar{background:#fff;border-bottom:1px solid var(--fmux-line);padding:8px 10px 10px;box-shadow:0 2px 8px #17324d12;z-index:60}'+
  '.fmuxSteps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;max-width:980px;margin:0 auto}'+
  '.fmuxStep{border:1px solid #cdd8e1;border-radius:11px;background:#f8fafc;color:#365064;min-height:48px;padding:7px 8px;font-weight:900;text-align:left;display:flex;align-items:center;gap:8px;cursor:pointer}'+
  '.fmuxStep i{font-style:normal;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#e7eef4;color:#365064;flex:0 0 auto}'+
  '.fmuxStep.active{background:#eaf5fb;border-color:#0b7f91;color:#0a5d6c;box-shadow:0 0 0 2px #c7edf2}.fmuxStep.active i{background:#0b7f91;color:#fff}'+
  '.fmuxGuide{max-width:1180px;margin:8px auto 0;border:1px solid #cfe0ea;border-radius:11px;background:#f8fbfd;padding:9px 11px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}'+
  '.fmuxGuideText{flex:1;min-width:220px;color:#28465b;line-height:1.4}.fmuxGuideText b{color:#173d67}.fmuxGuideActions{display:flex;gap:6px;flex-wrap:wrap}'+
  '.fmuxAction{border:1px solid #bfd0da;border-radius:9px;background:#fff;color:#173d67;min-height:38px;padding:7px 10px;font-weight:900;cursor:pointer}'+
  '.fmuxAction.primary{background:#087a55;color:#fff;border-color:#087a55}.fmuxAction.ai{background:#5367a7;color:#fff;border-color:#5367a7}.fmuxAction.warn{background:#fff7ed;color:#9a3412;border-color:#fdba74}'+
  '#fmuxAdvanced{display:none;max-width:1180px;margin:8px auto 0;padding:9px;border:1px dashed #94a3b8;border-radius:11px;background:#f8fafc}'+
  '#v440Fm.fmux-advanced #fmuxAdvanced{display:block}'+
  '.fmuxAdvancedTitle{font-weight:1000;color:#475467;margin-bottom:7px}.fmuxAdvancedActions{display:flex;gap:6px;flex-wrap:wrap}'+
  '.fmuxPalette{display:none;margin:6px 0 8px;padding:9px;border:1px solid #b9dbe1;border-radius:12px;background:#f5fcfd;box-shadow:0 1px 4px #0b4a7b12}'+
  '#v440Fm.fmux-step-2 .fmuxPalette{display:block}'+
  '.fmuxPaletteTitle{font-weight:1000;color:#0b5b68;margin-bottom:7px}.fmuxPaletteGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}'+
  '.fmuxTypeBtn{border:1px solid #c5d8df;border-radius:10px;background:#fff;color:#244761;min-height:46px;padding:7px;font-weight:900;text-align:left;cursor:pointer}.fmuxTypeBtn strong{display:block;font-size:13px;color:#0b4a7b}.fmuxTypeBtn small{display:block;margin-top:2px;color:#667085;font-weight:700}'+
  '#v440Fm.fmux-simple .fmuxTechnical{display:none!important}'+
  '#v440Fm.fmux-shell .v489MobileTabs{display:none!important}'+
  '#v440Fm.fmux-shell .v440FormItem{padding:11px!important;border-radius:12px!important;border-color:#dbe3e8!important;box-shadow:0 1px 3px #17324d0d}'+
  '#v440Fm.fmux-shell .v440FormItem.active{border-color:#0b7f91!important;background:#ecf8fa!important;box-shadow:0 0 0 2px #c7edf2!important}'+
  '#v440Fm.fmux-shell #v440NewForm{width:100%;min-height:44px;font-size:12px}'+
  '#v440Fm.fmux-shell .v440Pane.left>.v440Row{display:grid;grid-template-columns:1fr auto;gap:6px}'+
  '#fmuxHelp{position:fixed;inset:0;z-index:2147483600;background:#07192dcc;display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}'+
  '#fmuxHelp.show{display:flex}.fmuxHelpCard{width:min(94vw,780px);max-height:90dvh;overflow:auto;background:#fff;border-radius:16px;padding:16px;box-shadow:0 22px 70px #0007;color:#172033}'+
  '.fmuxHelpHead{display:flex;align-items:center;gap:8px}.fmuxHelpHead b{font-size:20px;color:#0b4a7b}.fmuxHelpHead span{flex:1}.fmuxHelpGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.fmuxHelpStep{border:1px solid #d7e1e8;border-radius:12px;padding:11px;background:#f9fbfc;line-height:1.45}.fmuxHelpStep b{display:block;color:#0b6b79;margin-bottom:4px}'+
  '.fmuxNote{margin-top:10px;padding:10px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-weight:800;line-height:1.4}'+
  '@media(max-width:900px){.fmuxSteps{display:flex;overflow-x:auto}.fmuxStep{flex:0 0 190px}.fmuxPaletteGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.fmuxHelpGrid{grid-template-columns:1fr}#fmuxStepBar{padding:6px}.fmuxGuide{margin-top:6px;padding:8px}.fmuxHeadActions{position:sticky;right:0;background:#0b4a7b;padding-left:4px}}'+
  '@media(max-width:520px){.fmuxStep{flex-basis:165px;min-height:44px}.fmuxStep span{font-size:11px}.fmuxHeadBtn{padding:6px 8px;font-size:10px}.fmuxPaletteGrid{grid-template-columns:1fr 1fr}.fmuxTypeBtn{min-height:50px}}';
  document.head.appendChild(st);
}
function ensureHelp(){
  if($('fmuxHelp'))return;
  const m=document.createElement('div');
  m.id='fmuxHelp';
  m.innerHTML='<div class="fmuxHelpCard"><div class="fmuxHelpHead"><b>HƯỚNG DẪN · TRÌNH TẠO BIỂU MẪU</b><span></span><button class="fmuxAction" id="fmuxHelpClose">ĐÓNG</button></div>'+
  '<div class="fmuxHelpGrid">'+
  '<div class="fmuxHelpStep"><b>① THÔNG TIN</b>Chọn biểu mẫu có sẵn hoặc bấm <b>＋ TẠO BIỂU MẪU MỚI</b>. Nhập tên, mã hiển thị và tải PDF/ảnh nền.</div>'+
  '<div class="fmuxHelpStep"><b>② NỘI DUNG</b>Dùng các nút loại trường để thêm ô chữ, số, ngày, giờ, checkbox, danh sách, chữ ký hoặc ghi chú. Kéo field tới đúng vị trí và chỉnh kích thước trực tiếp trên mẫu.</div>'+
  '<div class="fmuxHelpStep"><b>③ XEM TRƯỚC</b>Chạy TEST FORM để nhập thử dữ liệu. Mở PDF PREVIEW để kiểm tra vị trí trước khi phát hành.</div>'+
  '<div class="fmuxHelpStep"><b>④ PHÂN QUYỀN & PHÁT HÀNH</b>Chọn role/đơn vị được dùng, chạy KIỂM TRA, sau đó xuất gói phát hành. Form Manager không tự merge vào main.</div>'+
  '</div><div class="fmuxNote">Chế độ CƠ BẢN ẩn KEY, BIND và tọa độ kỹ thuật. Khi cần cấu hình sâu, bấm ⚙ NÂNG CAO.</div></div>';
  document.body.appendChild(m);
  $('fmuxHelpClose').onclick=()=>m.classList.remove('show');
  m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')});
}
function setMax(on){
  const fm=$('v440Fm'),b=$('v627MaxFormBtn');
  if(!fm||!b)return;
  const active=fm.classList.contains('v627MaxForm');
  if(active!==!!on)b.click();
}
function mobilePane(name){
  const b=q('#v440Fm [data-v489-pane="'+name+'"]');
  if(b)b.click();
}
function guide(step){
  if(step===1)return {
    text:'<b>Bước 1/4 · THÔNG TIN BIỂU MẪU.</b> Chọn form bên trái hoặc tạo form mới. Tên/mã và file PDF/ảnh nằm ở phần THUỘC TÍNH.',
    actions:'<button class="fmuxAction primary" data-fmux-act="new">＋ TẠO BIỂU MẪU MỚI</button><button class="fmuxAction" data-fmux-act="next">TIẾP: NỘI DUNG →</button>'
  };
  if(step===2)return {
    text:'<b>Bước 2/4 · THÊM NỘI DUNG.</b> Chọn đúng loại ô bên dưới, sau đó kéo/resize trực tiếp trên mẫu. Các thay đổi được lưu vào bản nháp của phiên chỉnh.',
    actions:'<button class="fmuxAction ai" data-fmux-act="ai">🤖 AI GỢI Ý FIELD</button><button class="fmuxAction" data-fmux-act="next">TIẾP: XEM TRƯỚC →</button>'
  };
  if(step===3)return {
    text:'<b>Bước 3/4 · XEM TRƯỚC.</b> Nhập thử dữ liệu trên form và kiểm tra PDF. Không ghi dữ liệu test vào chuyến.',
    actions:'<button class="fmuxAction primary" data-fmux-act="test">👁 TEST FORM</button><button class="fmuxAction" data-fmux-act="pdf">📄 PDF PREVIEW</button><button class="fmuxAction" data-fmux-act="next">TIẾP: PHÁT HÀNH →</button>'
  };
  return {
    text:'<b>Bước 4/4 · PHÂN QUYỀN & PHÁT HÀNH.</b> Cấu hình ai được dùng, kiểm tra lỗi cơ bản rồi xuất gói. Việc merge/deploy vẫn tách riêng để tránh phát hành nhầm.',
    actions:'<button class="fmuxAction primary" data-fmux-act="integration">👥 PHÂN QUYỀN</button><button class="fmuxAction" data-fmux-act="validate">✓ KIỂM TRA FORM</button><button class="fmuxAction warn" data-fmux-act="export">📦 XUẤT GÓI PHÁT HÀNH</button>'
  };
}
function bindActions(host){
  qa('[data-fmux-act]',host).forEach(b=>{
    b.onclick=()=>{
      const a=b.dataset.fmuxAct;
      if(a==='new')fire('v440NewForm');
      else if(a==='next')setStep(Math.min(4,currentStep+1));
      else if(a==='ai')fire('v460AiRecognize');
      else if(a==='test')fire('v450Test');
      else if(a==='pdf')fire('v450PdfPreview');
      else if(a==='validate')fire('v487Validate');
      else if(a==='export')fire('v440Export');
      else if(a==='integration'){
        if(typeof root.sagsFormGovernanceOpen==='function')root.sagsFormGovernanceOpen();
        else fire('fmgOpen');
      }
    };
  });
}
function renderGuide(){
  const h=$('fmuxGuide');
  if(!h)return;
  const g=guide(currentStep);
  h.innerHTML='<div class="fmuxGuideText">'+g.text+'</div><div class="fmuxGuideActions">'+g.actions+'</div>';
  bindActions(h);
}
function setStep(n){
  const fm=$('v440Fm');
  if(!fm)return;
  currentStep=Math.max(1,Math.min(4,Number(n)||1));
  for(let i=1;i<=4;i++)fm.classList.toggle('fmux-step-'+i,i===currentStep);
  qa('.fmuxStep').forEach(b=>b.classList.toggle('active',Number(b.dataset.fmuxStep)===currentStep));
  const lab=$('fmuxStepState');if(lab)lab.textContent='BƯỚC '+currentStep+'/4';
  renderGuide();
  if(currentStep===1){setMax(false);mobilePane('left')}
  if(currentStep===2){setMax(true);mobilePane('center')}
  if(currentStep===3){setMax(true);mobilePane('center')}
  if(currentStep===4){setMax(false);mobilePane('right')}
  decorateInspector();
}
function toggleAdvanced(){
  advanced=!advanced;
  const fm=$('v440Fm');
  if(!fm)return;
  fm.classList.toggle('fmux-advanced',advanced);
  fm.classList.toggle('fmux-simple',!advanced);
  const b=$('fmuxAdvancedBtn');
  if(b){b.classList.toggle('active',advanced);b.textContent=advanced?'✓ ĐANG HIỆN NÂNG CAO':'⚙ NÂNG CAO'}
  decorateInspector();
}
function ensureStepBar(fm){
  if($('fmuxStepBar'))return;
  const d=document.createElement('div');
  d.id='fmuxStepBar';
  d.innerHTML='<div class="fmuxSteps">'+
    '<button class="fmuxStep active" data-fmux-step="1"><i>1</i><span>THÔNG TIN</span></button>'+
    '<button class="fmuxStep" data-fmux-step="2"><i>2</i><span>NỘI DUNG</span></button>'+
    '<button class="fmuxStep" data-fmux-step="3"><i>3</i><span>XEM TRƯỚC</span></button>'+
    '<button class="fmuxStep" data-fmux-step="4"><i>4</i><span>PHÂN QUYỀN & PHÁT HÀNH</span></button>'+
    '</div><div id="fmuxGuide" class="fmuxGuide"></div>'+
    '<div id="fmuxAdvanced"><div class="fmuxAdvancedTitle">CÔNG CỤ NÂNG CAO · chỉ mở khi cần</div><div class="fmuxAdvancedActions">'+
      '<button class="fmuxAction ai" data-fmux-advanced="ai">🤖 AI REVIEW</button>'+
      '<button class="fmuxAction" data-fmux-advanced="validate">✓ KIỂM TRA</button>'+
      '<button class="fmuxAction" data-fmux-advanced="normalize">⚙ CHUẨN HÓA</button>'+
      '<button class="fmuxAction" data-fmux-advanced="integration">🧭 TÍCH HỢP</button>'+
      '<button class="fmuxAction" data-fmux-advanced="json">JSON FORM</button>'+
      '<button class="fmuxAction" data-fmux-advanced="registry">JSON TẤT CẢ</button>'+
      '<button class="fmuxAction" data-fmux-advanced="package">📦 GÓI FORM</button>'+
    '</div></div>';
  const mobile=q('.v489MobileTabs',fm);
  if(mobile)mobile.insertAdjacentElement('beforebegin',d);
  else q('#v440FmCard',fm)?.prepend(d);
  qa('.fmuxStep',d).forEach(b=>b.onclick=()=>setStep(Number(b.dataset.fmuxStep)));
  qa('[data-fmux-advanced]',d).forEach(b=>b.onclick=()=>{
    const a=b.dataset.fmuxAdvanced;
    if(a==='ai')fire('v460AiRecognize');
    if(a==='validate')fire('v487Validate');
    if(a==='normalize')fire('v487Normalize');
    if(a==='json')fire('v641ExportFormHead');
    if(a==='registry')fire('v440ExportRegistry');
    if(a==='package')fire('v440Export');
    if(a==='integration'){if(typeof root.sagsFormGovernanceOpen==='function')root.sagsFormGovernanceOpen();else fire('fmgOpen')}
  });
}
function ensureHeader(fm){
  const head=q('.v440FmHead',fm);
  if(!head)return;
  const title=q('b',head);if(title)title.textContent='🧩 TRÌNH TẠO BIỂU MẪU';
  if($('fmuxHeadActions'))return;
  const a=document.createElement('div');
  a.id='fmuxHeadActions';a.className='fmuxHeadActions';
  a.innerHTML='<button class="fmuxHeadBtn primary" id="fmuxStepState">BƯỚC 1/4</button>'+
    '<button class="fmuxHeadBtn" id="fmuxHelpBtn">? HƯỚNG DẪN</button>'+
    '<button class="fmuxHeadBtn" id="fmuxUndoBtn">↶</button>'+
    '<button class="fmuxHeadBtn" id="fmuxRedoBtn">↷</button>'+
    '<button class="fmuxHeadBtn" id="fmuxAdvancedBtn">⚙ NÂNG CAO</button>';
  const grow=q('.grow',head);
  if(grow)grow.insertAdjacentElement('afterend',a);else head.appendChild(a);
  $('fmuxHelpBtn').onclick=()=>{$('fmuxHelp')?.classList.add('show')};
  $('fmuxUndoBtn').onclick=()=>fire('v440Undo');
  $('fmuxRedoBtn').onclick=()=>fire('v440Redo');
  $('fmuxAdvancedBtn').onclick=toggleAdvanced;
}
function ensurePalette(){
  const ed=$('v440Editor');
  if(!ed||$('fmuxPalette'))return;
  const p=document.createElement('div');p.id='fmuxPalette';p.className='fmuxPalette';
  const types=[
    ['text','Aa','Ô nhập chữ','Tên, số hiệu, nội dung ngắn'],
    ['textarea','¶','Ghi chú','Nội dung nhiều dòng'],
    ['number','#','Số','PAX, KG, PCS, trọng lượng'],
    ['date','📅','Ngày','Ngày khai thác'],
    ['time','🕒','Giờ','STA, STD, ETA, ETD...'],
    ['checkbox','☑','Có / Không','Ô kiểm tra'],
    ['select','▾','Danh sách chọn','Nhiều lựa chọn cố định'],
    ['signature','✍','Chữ ký','Vùng ký xác nhận']
  ];
  p.innerHTML='<div class="fmuxPaletteTitle">＋ THÊM NỘI DUNG · chọn loại trường</div><div class="fmuxPaletteGrid">'+types.map(x=>'<button class="fmuxTypeBtn" data-fmux-type="'+x[0]+'"><strong>'+x[1]+' '+x[2]+'</strong><small>'+x[3]+'</small></button>').join('')+'</div>';
  ed.insertAdjacentElement('beforebegin',p);
  qa('[data-fmux-type]',p).forEach(b=>b.onclick=()=>{
    const type=b.dataset.fmuxType;
    if(typeof root.sagsV440AddFieldPreset==='function')root.sagsV440AddFieldPreset(type);
    else fire('v440AddField');
  });
}
function decorateInspector(){
  const fm=$('v440Fm');if(!fm)return;
  ['v440FldKey','v440FldBind'].forEach(id=>$(id)?.closest('.v440Field')?.classList.add('fmuxTechnical'));
  q('#v440Inspector .v489GeoGrid')?.classList.add('fmuxTechnical');
  const nb=$('v440NewForm');if(nb){nb.textContent='＋ TẠO BIỂU MẪU MỚI';nb.title='Tạo biểu mẫu mới theo hướng dẫn từng bước'}
  const rr=$('v440RefreshReg');if(rr)rr.title='Tải lại danh sách biểu mẫu mới nhất';
}
function ensureShell(){
  const fm=$('v440Fm');if(!fm)return false;
  ensureStyle();ensureHelp();
  fm.classList.add('fmux-shell');
  fm.classList.toggle('fmux-simple',!advanced);
  fm.classList.toggle('fmux-advanced',advanced);
  ensureHeader(fm);ensureStepBar(fm);ensurePalette();decorateInspector();
  if(!fm.dataset.fmuxReady){fm.dataset.fmuxReady='1';setStep(1)}
  return true;
}
let tries=0;
const timer=setInterval(()=>{tries++;if(ensureShell()&&tries>20)clearInterval(timer);if(tries>240)clearInterval(timer)},400);
new MutationObserver(()=>ensureShell()).observe(document.documentElement,{childList:true,subtree:true});

root.sagsFormManagerUxStep=setStep;
root.sagsFormManagerUxHelp=()=>{$('fmuxHelp')?.classList.add('show')};
})(typeof window!=='undefined'?window:globalThis);
