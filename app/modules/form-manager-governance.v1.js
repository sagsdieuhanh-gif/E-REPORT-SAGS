/* SAGS Form Manager Governance V1
   Branch-only prototype: form intake governance + integration contract generator.
   No production deployment is performed by this module.
*/
(function(root){
'use strict';
if(root.__SAGS_FORM_GOV_V1)return;
root.__SAGS_FORM_GOV_V1='V1.0.0-20261001-FORM-SELF-SERVICE';

const S=v=>String(v??'').trim();
const U=v=>S(v).toUpperCase();
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[Đđ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48);

function role(){
  try{return U(root.currentRole||root.__sagsGetSession?.()?.role||'')}catch(_){return U(root.currentRole)}
}
function isAD(){return role()==='AD'}
function form(){try{return root.sagsV440GetCurrentForm?.()||null}catch(_){return null}}
function integrationOf(f){return f?.integration&&typeof f.integration==='object'?f.integration:{}}
function fieldStats(f){
  const out={total:0,text:0,textarea:0,number:0,time:0,date:0,checkbox:0,signature:0,other:0,ai:0,lowConfidence:0};
  for(const x of f?.fields||[]){
    out.total++;const t=S(x.type||'text').toLowerCase();
    if(Object.prototype.hasOwnProperty.call(out,t))out[t]++;else out.other++;
    if(x.aiGenerated){out.ai++;if(Number(x.aiConfidence||0)<75)out.lowConfidence++}
  }
  return out;
}
function defaultContract(f){
  const i=integrationOf(f),base=slug(f?.id||f?.code||f?.name||'form');
  return {
    schema:1,
    formId:S(f?.id||base),
    code:S(f?.code||f?.id||base).toUpperCase(),
    name:S(f?.name||f?.code||f?.id||'Biểu mẫu mới'),
    ownerDepartment:S(i.ownerDepartment||'PDH'),
    allowedRoles:Array.isArray(i.allowedRoles)?i.allowedRoles:['AD','DH'],
    entryMode:S(i.entryMode||'MY_FLIGHT'),
    menuLabel:S(i.menuLabel||f?.code||f?.name||'FORM'),
    featureKey:S(i.featureKey||('FORM_'+base.toUpperCase())),
    workflowClass:S(i.workflowClass||'FLIGHT_BOUND'),
    storageNamespace:S(i.storageNamespace||('forms/'+base)),
    exportPrefix:S(i.exportPrefix||f?.code||f?.id||'FORM').replace(/[^A-Za-z0-9._-]+/g,'_'),
    requiresSignature:i.requiresSignature!==undefined?!!i.requiresSignature:(f?.fields||[]).some(x=>S(x.type).toLowerCase()==='signature'),
    requiresApproval:!!i.requiresApproval,
    visible:true,
    status:S(i.status||'DRAFT'),
    version:Number(i.version||1)
  };
}
function readRoles(){
  return [...document.querySelectorAll('#fmgRoles input[type=checkbox]:checked')].map(x=>x.value);
}
function readContract(){
  const f=form();if(!f)return null;
  return {
    schema:1,
    formId:S(f.id),
    code:S(document.getElementById('fmgCode')?.value||f.code||f.id).toUpperCase(),
    name:S(document.getElementById('fmgName')?.value||f.name||f.code||f.id),
    ownerDepartment:S(document.getElementById('fmgDept')?.value||'PDH'),
    allowedRoles:readRoles(),
    entryMode:S(document.getElementById('fmgEntry')?.value||'MY_FLIGHT'),
    menuLabel:S(document.getElementById('fmgLabel')?.value||f.code||f.name),
    featureKey:S(document.getElementById('fmgFeature')?.value||'').toUpperCase().replace(/[^A-Z0-9_]+/g,'_'),
    workflowClass:S(document.getElementById('fmgWorkflow')?.value||'FLIGHT_BOUND'),
    storageNamespace:S(document.getElementById('fmgStorage')?.value||'').replace(/^\/+|\/+$/g,''),
    exportPrefix:S(document.getElementById('fmgExport')?.value||'FORM').replace(/[^A-Za-z0-9._-]+/g,'_'),
    requiresSignature:!!document.getElementById('fmgSignature')?.checked,
    requiresApproval:!!document.getElementById('fmgApproval')?.checked,
    visible:true,
    status:'DRAFT',
    version:Math.max(1,Number(integrationOf(f).version||1))
  };
}
function contractProblems(f,c){
  const p=[],stats=fieldStats(f);
  if(!f?.pages?.length)p.push('Chưa có trang nền.');
  if(!stats.total)p.push('Chưa có field.');
  if(stats.lowConfidence)p.push(stats.lowConfidence+' field AI dưới 75% cần rà soát.');
  if(!c.allowedRoles.length)p.push('Chưa chọn role được phép dùng.');
  if(!c.featureKey)p.push('Feature Key đang trống.');
  if(!c.storageNamespace)p.push('Storage Namespace đang trống.');
  if(c.requiresSignature&&!stats.signature)p.push('Contract yêu cầu chữ ký nhưng form chưa có field signature.');
  return p;
}
function buildCommands(f,c){
  const stats=fieldStats(f),problems=contractProblems(f,c);
  const registryPath='forms/forms.registry.json';
  const featureLine=`${c.featureKey}: { label: "${c.menuLabel}", roles: ${JSON.stringify(c.allowedRoles)} }`;
  const flow=c.entryMode==='MY_FLIGHT'
    ?'Đăng ký form vào danh sách nghiệp vụ của Flight Workspace/My Flight; chỉ hiển thị khi role có featureKey và chuyến đang active.'
    :c.entryMode==='MENU'
      ?'Đăng ký entry trong menu chức năng theo allowedRoles/featureKey; không tự mở theo chuyến.'
      :'Giữ form ở Generic Form Picker; không thêm entry mới vào navigation chính.';
  return {
    summary:`${c.code} · ${c.name} · ${f.pages?.length||0} trang · ${stats.total} field`,
    checklist:[
      '1. Form Manager: upload PDF/ảnh, chạy AI NHẬN DẠNG từng trang.',
      '2. AI Review: bỏ field sai, sửa TYPE/LABEL/BIND; Apply chỉ các field đã duyệt.',
      '3. TEST HIỂN THỊ + PDF PREVIEW: kiểm tra vị trí, font, checkbox, chữ ký.',
      '4. KIỂM TRA + CHUẨN HÓA: không còn key trùng / vùng vượt trang.',
      '5. Lưu Integration Contract.',
      `6. Cập nhật ${registryPath} bằng JSON form đã xuất; không sửa JS nghiệp vụ của form khác.`,
      `7. ${flow}`,
      '8. Smoke test: mở form → nhập → save → back → mở lại → PDF → reload.',
      '9. Chỉ merge nhánh sau khi AD duyệt giao diện + schema + workflow.'
    ],
    config:{
      registryFormId:c.formId,
      featureKey:c.featureKey,
      featureLine,
      entryMode:c.entryMode,
      workflowClass:c.workflowClass,
      roles:c.allowedRoles,
      storageNamespace:c.storageNamespace,
      exportPrefix:c.exportPrefix
    },
    problems
  };
}
function markdownPackage(f,c){
  const x=buildCommands(f,c),j=JSON.stringify(c,null,2);
  return `# SAGS Form Integration Package — ${c.code}

## Form
- ID: \`${c.formId}\`
- Tên: ${c.name}
- Phòng quản lý: ${c.ownerDepartment}
- Entry: ${c.entryMode}
- Workflow: ${c.workflowClass}
- Role: ${c.allowedRoles.join(', ')}
- Feature key: \`${c.featureKey}\`
- Storage namespace: \`${c.storageNamespace}\`
- Export prefix: \`${c.exportPrefix}\`

## Contract JSON

\`\`\`json
${j}
\`\`\`

## Lệnh tích hợp / checklist

${x.checklist.map(s=>'- '+s).join('\n')}

## Kiểm tra hiện tại

${x.problems.length?x.problems.map(s=>'- ⚠ '+s).join('\n'):'- ✅ Không phát hiện blocker cơ bản.'}

## Nguyên tắc

- AI chỉ đề xuất field; AD duyệt schema cuối.
- Không xóa/đổi business logic của module khác.
- Không thay Firebase path hiện hữu của form khác.
- Form mới dùng namespace riêng cho dữ liệu riêng: \`${c.storageNamespace}\`.
- Merge vào main chỉ sau khi review branch và smoke test.
`;
}
async function copyText(t){
  try{await navigator.clipboard.writeText(t);return true}catch(_){}
  const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();return true;
}
function download(name,text,type='text/plain'){
  const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
}
function renderStatus(){
  const f=form(),host=document.getElementById('fmgStatus');if(!host||!f)return;
  const c=readContract()||defaultContract(f),x=buildCommands(f,c),s=fieldStats(f);
  host.innerHTML=`<div><b>${esc(x.summary)}</b></div>
  <div class="fmgStats">Text ${s.text} · Textarea ${s.textarea} · Number ${s.number} · Time ${s.time} · Date ${s.date} · Checkbox ${s.checkbox} · Signature ${s.signature} · AI ${s.ai}</div>
  ${x.problems.length?`<div class="fmgWarn">${x.problems.map(v=>'⚠ '+esc(v)).join('<br>')}</div>`:'<div class="fmgOk">✓ Contract cơ bản hợp lệ.</div>'}`;
}
function ensureUi(){
  if(document.getElementById('fmgModal'))return;
  const st=document.createElement('style');st.id='fmgStyle';st.textContent=`
  #fmgModal{position:fixed;inset:0;z-index:2147483000;background:#17212bd9;display:none;align-items:center;justify-content:center;padding:12px;font-family:Inter,Arial,sans-serif}
  #fmgModal.show{display:flex}.fmgCard{width:min(96vw,860px);max-height:94vh;overflow:auto;background:#f7f9fa;border-radius:16px;padding:16px;color:#17212b;box-shadow:0 24px 70px #0005}
  .fmgHead{display:flex;align-items:center;gap:8px;position:sticky;top:-16px;background:#f7f9fa;padding:12px 0;z-index:2}.fmgHead h2{margin:0;font-size:19px}.fmgGrow{flex:1}
  .fmgGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fmgField{background:#fff;border:1px solid #d5dee3;border-radius:10px;padding:9px}.fmgField label{display:block;font-size:10px;font-weight:900;color:#5e707d;margin-bottom:5px}.fmgField input,.fmgField select{width:100%;min-height:42px;border:1px solid #bdcad1;border-radius:8px;padding:7px;box-sizing:border-box;background:#fff}
  .fmgRoles{display:flex;gap:7px;flex-wrap:wrap}.fmgRoles label{display:flex;align-items:center;gap:4px;background:#eef4f5;border-radius:8px;padding:8px;font-weight:800}
  .fmgRoles input{width:auto;min-height:auto}.fmgChecks{display:flex;gap:15px;flex-wrap:wrap;background:#fff;border:1px solid #d5dee3;border-radius:10px;padding:10px;margin-top:9px}
  .fmgActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.fmgBtn{border:1px solid #bac8cf;border-radius:8px;padding:10px 12px;font-weight:900;background:#fff;color:#34434e}.fmgBtn.primary{background:#0b7285;color:#fff;border-color:#0b7285}.fmgBtn.good{background:#2f7d63;color:#fff;border-color:#2f7d63}.fmgBtn.ai{background:#5367a7;color:#fff;border-color:#5367a7}
  #fmgStatus{margin-top:12px;background:#fff;border:1px solid #d5dee3;border-radius:10px;padding:11px;line-height:1.45}.fmgStats{margin-top:5px;color:#667784;font-size:12px}.fmgWarn{margin-top:7px;color:#9a5b12;font-weight:750}.fmgOk{margin-top:7px;color:#2f7d63;font-weight:800}
  @media(max-width:650px){.fmgGrid{grid-template-columns:1fr}.fmgCard{padding:12px}.fmgHead{top:-12px}}
  `;document.head.appendChild(st);
  const m=document.createElement('div');m.id='fmgModal';m.innerHTML=`<div class="fmgCard">
    <div class="fmgHead"><h2>🧭 FORM GOVERNANCE · TỰ QUẢN LÝ</h2><span class="fmgGrow"></span><button class="fmgBtn" id="fmgClose">ĐÓNG</button></div>
    <div class="fmgGrid">
      <div class="fmgField"><label>MÃ FORM</label><input id="fmgCode"></div>
      <div class="fmgField"><label>TÊN FORM</label><input id="fmgName"></div>
      <div class="fmgField"><label>PHÒNG QUẢN LÝ</label><select id="fmgDept"><option>PDH</option><option>PPVHK</option><option>ALL</option></select></div>
      <div class="fmgField"><label>ENTRY POINT</label><select id="fmgEntry"><option value="MY_FLIGHT">MY FLIGHT / THEO CHUYẾN</option><option value="MENU">MENU CHỨC NĂNG</option><option value="GENERIC_PICKER">GENERIC FORM PICKER</option></select></div>
      <div class="fmgField"><label>WORKFLOW CLASS</label><select id="fmgWorkflow"><option value="FLIGHT_BOUND">FLIGHT_BOUND</option><option value="DAILY">DAILY</option><option value="STANDALONE">STANDALONE</option><option value="REFERENCE">REFERENCE</option></select></div>
      <div class="fmgField"><label>NHÃN NÚT / MENU</label><input id="fmgLabel"></div>
      <div class="fmgField"><label>FEATURE KEY</label><input id="fmgFeature"></div>
      <div class="fmgField"><label>STORAGE NAMESPACE</label><input id="fmgStorage"></div>
      <div class="fmgField"><label>EXPORT PREFIX</label><input id="fmgExport"></div>
    </div>
    <div class="fmgField" style="margin-top:9px"><label>ROLE ĐƯỢC PHÉP</label><div id="fmgRoles" class="fmgRoles"></div></div>
    <div class="fmgChecks"><label><input id="fmgSignature" type="checkbox"> Có chữ ký</label><label><input id="fmgApproval" type="checkbox"> Cần duyệt</label></div>
    <div class="fmgActions">
      <button class="fmgBtn ai" id="fmgAi">🤖 MỞ AI REVIEW</button>
      <button class="fmgBtn" id="fmgTest">👁 TEST FORM</button>
      <button class="fmgBtn good" id="fmgSave">✓ LƯU CONTRACT</button>
      <button class="fmgBtn" id="fmgCopy">SAO CHÉP CÂU LỆNH</button>
      <button class="fmgBtn" id="fmgExportPkg">XUẤT GÓI HƯỚNG DẪN</button>
    </div>
    <div id="fmgStatus"></div>
  </div>`;document.body.appendChild(m);
  document.getElementById('fmgClose').onclick=close;
  document.getElementById('fmgAi').onclick=()=>{close();root.sagsV440OpenAiReview?.()};
  document.getElementById('fmgTest').onclick=()=>{close();document.getElementById('v450Test')?.click()};
  document.getElementById('fmgSave').onclick=()=>{const c=readContract();if(!c)return;root.sagsV440PatchCurrentFormMeta?.(c);renderStatus()};
  document.getElementById('fmgCopy').onclick=async()=>{const f=form(),c=readContract();if(!f||!c)return;await copyText(markdownPackage(f,c));alert('Đã sao chép gói câu lệnh/tích hợp.')};
  document.getElementById('fmgExportPkg').onclick=()=>{const f=form(),c=readContract();if(!f||!c)return;const base=(c.code||c.formId||'FORM').replace(/[^A-Za-z0-9_-]+/g,'_');download(base+'_integration.md',markdownPackage(f,c),'text/markdown');download(base+'_integration.json',JSON.stringify(c,null,2),'application/json')};
  m.addEventListener('input',renderStatus);m.addEventListener('change',renderStatus);m.addEventListener('click',e=>{if(e.target===m)close()});
}
function populate(){
  const f=form();if(!f)return false;ensureUi();const c=defaultContract(f);
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??''};
  set('fmgCode',c.code);set('fmgName',c.name);set('fmgDept',c.ownerDepartment);set('fmgEntry',c.entryMode);set('fmgWorkflow',c.workflowClass);set('fmgLabel',c.menuLabel);set('fmgFeature',c.featureKey);set('fmgStorage',c.storageNamespace);set('fmgExport',c.exportPrefix);
  document.getElementById('fmgSignature').checked=!!c.requiresSignature;document.getElementById('fmgApproval').checked=!!c.requiresApproval;
  const roles=['AD','DH','CBTT','KH','PVHK','VIEWER'],host=document.getElementById('fmgRoles');
  host.innerHTML=roles.map(r=>`<label><input type="checkbox" value="${r}" ${c.allowedRoles.includes(r)?'checked':''}> ${r}</label>`).join('');
  renderStatus();return true;
}
function open(){
  if(!isAD())return alert('Chỉ AD được quản lý Integration Contract.');
  if(!form())return alert('Hãy mở Form Manager và chọn một biểu mẫu trước.');
  populate();document.getElementById('fmgModal').classList.add('show');
}
function close(){document.getElementById('fmgModal')?.classList.remove('show')}
function injectButton(){
  const head=document.querySelector('#v440Fm .v440FmHead');if(!head||document.getElementById('fmgOpen'))return false;
  const b=document.createElement('button');b.id='fmgOpen';b.type='button';b.className='v440Btn';b.textContent='🧭 TÍCH HỢP';b.onclick=open;
  const ai=document.getElementById('v460AiRecognize');if(ai)ai.insertAdjacentElement('afterend',b);else head.appendChild(b);
  return true;
}
let tries=0;const timer=setInterval(()=>{tries++;injectButton();if(tries>240)clearInterval(timer)},500);
new MutationObserver(()=>injectButton()).observe(document.documentElement,{childList:true,subtree:true});

root.sagsFormGovernanceOpen=open;
root.sagsFormGovernanceBuild=function(){const f=form();if(!f)return null;const c=defaultContract(f);return {contract:c,commands:buildCommands(f,c),markdown:markdownPackage(f,c)}};
})(typeof window!=='undefined'?window:globalThis);
