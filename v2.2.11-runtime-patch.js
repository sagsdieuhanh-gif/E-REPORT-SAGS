/* E-REPORT/SAGS V2.2.11 · UNIFIED AI LIMIT + AIRCRAFT CLEANING SCHEDULE
 * BUILD: V2.2.11-AI-LIMIT-CLEANING-MULTI-IMAGE
 *
 * - One multi-image picker for A/C LIMITS and aircraft-cleaning schedules.
 * - AI classifies each image, auto-saves confident rows, and sends uncertain rows
 *   to an AD review queue. It never invents unreadable values.
 * - Cleaning provider alerts are shown to DH at STA-10 and again at CHOCK ON.
 * - The alert queue is local/event based; there is no heartbeat.
 */
(function(root){
  'use strict';

  const BUILD='V2.2.11-AI-LIMIT-CLEANING-MULTI-IMAGE';
  if(root.__SAGS_V2211_AI_LIMIT_CLEANING===BUILD)return;
  root.__SAGS_V2211_AI_LIMIT_CLEANING=BUILD;

  const AI_MODEL_FALLBACK='gemini-3.6-flash';
  const APP_CHECK_SITE_KEY_FALLBACK='6LeJjYotAAAAAELyLTYPzugn_Zn37U5qOz9tHjqV';
  const CLEAN_PUBLIC='aircraft_cleaning/catalog_public';
  const CLEAN_SIGNAL='aircraft_cleaning/catalog_signal';
  const CLEAN_REVIEW='ai_import_review_queue';
  const CLEAN_CACHE='sags_aircraft_cleaning_cache_v2211';
  const CLEAN_ACK='sags_aircraft_cleaning_ack_v2211';
  const LIMIT_PUBLIC='ac_limits/catalog_public';
  const LIMIT_SIGNAL='ac_limits/catalog_signal';
  const MAX_IMAGE_BYTES=10*1024*1024;
  const MAX_BATCH_IMAGES=12;

  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>{try{return JSON.parse(JSON.stringify(v??null))}catch(_){return null}};
  const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const normReg=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const displayReg=v=>U(v).replace(/^([A-Z]{2})A(?=\d)/,'$1-A');
  const uid=p=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`.toUpperCase();
  const $=id=>document.getElementById(id);

  let aiSdkPromise=null;
  let importing=false;
  let cleanCatalog={version:0,items:[]};
  let cleanSignalRef=null;
  let cleanQueue=[];
  let cleanCurrent=null;
  let cleanTimer=0;

  function profile(){try{return root.__sagsGetSession?.()?.profile||root.currentUserProfile||{}}catch(_){return root.currentUserProfile||{}}}
  function role(){const r=U(root.currentRole||profile().role||profile().roleCode).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/[^A-Z0-9]/g,'');return r==='DIEUHANH'?'DH':r}
  function isAdmin(){return ['AD','ADMIN','ROLE-ADMIN'].includes(role())}
  function actor(){try{return root.currentActor?.()||{role:role(),username:S(profile().username||profile().userName)}}catch(_){return {role:role(),username:S(profile().username||profile().userName)}}}
  function db(path=''){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function collectionName(){try{if(typeof HANDOVER_COLLECTION!=='undefined'&&HANDOVER_COLLECTION)return HANDOVER_COLLECTION}catch(_){}return ''}
  function firestore(){try{return typeof root.initHandoverFirebase==='function'?root.initHandoverFirebase():null}catch(_){return null}}

  function normalizeISO(v){
    const x=S(v);if(!x)return '';
    let m=/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)$/.exec(x);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    m=/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})$/.exec(x);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    m=/^([0-3]?\d)[-\s](JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-\s](\d{4})$/i.exec(x);if(m){const mon=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(U(m[2]))+1;return `${m[3]}-${String(mon).padStart(2,'0')}-${m[1].padStart(2,'0')}`}
    return '';
  }
  function clockMinutes(v){const d=S(v).replace(/[^0-9]/g,'');if(d.length<3||d.length>4)return null;const s=d.padStart(4,'0'),h=Number(s.slice(0,2)),m=Number(s.slice(2));return h<=23&&m<=59?h*60+m:null}
  function normalizeClock(v){const n=clockMinutes(v);return n===null?'':`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
  function clockMs(date,clock){const n=clockMinutes(clock),p=S(date).split('-').map(Number);if(n===null||p.length!==3||!p[0]||!p[1]||!p[2])return null;return new Date(p[0],p[1]-1,p[2],Math.floor(n/60),n%60,0,0).getTime()}

  function ensureCss(){
    if($('v2211Style'))return;
    const st=document.createElement('style');st.id='v2211Style';st.textContent=`
#v2211ImportModal,#v2211CleaningAlert{position:fixed;inset:0;z-index:19450;display:none;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));box-sizing:border-box;background:rgba(3,15,28,.72);backdrop-filter:blur(3px)}
.v2211-card{width:min(94vw,650px);max-height:92dvh;overflow:auto;background:#fff;border-radius:20px;padding:18px;box-sizing:border-box;box-shadow:0 24px 80px rgba(0,0,0,.42);font:14px/1.45 Arial;color:#19334d}.v2211-card h3{margin:0 0 8px;color:#064f9e;font:900 21px Arial}.v2211-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.v2211-btn{border:0;border-radius:11px;min-height:43px;padding:10px 14px;background:#075ea8;color:#fff;font-weight:900}.v2211-btn.secondary{background:#e8eef4;color:#29455e}.v2211-btn.good{background:#087443}.v2211-file{position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;opacity:.01}.v2211-status{margin:10px 0;padding:10px;border-radius:10px;background:#edf7ff;font-weight:800;white-space:pre-wrap}.v2211-status.err{background:#fff0ef;color:#a42318}.v2211-files{display:grid;gap:6px}.v2211-file-row{border:1px solid #d5e0e8;border-radius:9px;padding:8px;background:#f9fbfd;font-weight:800}.v2211-common-upload{width:100%;margin:8px 0 2px!important;background:#6a35b7!important;color:#fff!important;border:0!important;border-radius:11px!important;min-height:46px!important;font-weight:900!important}.v2211-clean-box{border:4px solid #087443}.v2211-clean-title{color:#087443;font:900 22px Arial;margin-bottom:8px}.v2211-clean-flight{font:900 16px Arial;color:#17324d;margin:6px 0}.v2211-clean-provider{border-radius:12px;background:#e9f8ef;padding:15px;text-align:center;color:#075f39;font:900 21px/1.35 Arial;margin:12px 0}.v2211-clean-meta{text-align:center;color:#5c7083;font-weight:800}.v2211-clean-ack{width:100%;border:0;border-radius:11px;padding:13px;background:#087443;color:#fff;font:900 16px Arial;margin-top:12px}
@media(max-width:620px){.v2211-card{padding:14px}.v2211-actions>*{flex:1}.v2211-clean-provider{font-size:19px}}
`;document.head.appendChild(st);
  }

  function ensureUi(){
    ensureCss();
    if(!$('v2211ImportModal')){
      const m=document.createElement('div');m.id='v2211ImportModal';m.innerHTML=`<div class="v2211-card"><h3>🤖 AI · LIMIT & LỊCH VỆ SINH</h3><div>Chọn chung một lần nhiều ảnh. AI tự phân loại và gán các dòng đọc chắc chắn; dòng chưa rõ chuyển AD xác nhận.</div><input id="v2211Images" class="v2211-file" type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple><div id="v2211Files" class="v2211-files"></div><div id="v2211Status" class="v2211-status">Chưa chọn ảnh.</div><div class="v2211-actions"><button id="v2211Pick" class="v2211-btn" type="button">CHỌN NHIỀU ẢNH</button><button id="v2211Run" class="v2211-btn good" type="button" disabled>AI ĐỌC & GÁN CẢNH BÁO</button><button id="v2211Close" class="v2211-btn secondary" type="button">ĐÓNG</button></div></div>`;document.body.appendChild(m);
      $('v2211Pick').onclick=()=>$('v2211Images')?.click();
      $('v2211Close').onclick=()=>{if(!importing)m.style.display='none'};
      $('v2211Run').onclick=runImport;
      $('v2211Images').onchange=renderSelectedFiles;
    }
    if(!$('v2211CleaningAlert')){
      const a=document.createElement('div');a.id='v2211CleaningAlert';a.innerHTML=`<div class="v2211-card v2211-clean-box"><div class="v2211-clean-title">🧹 VỆ SINH TÀU BAY</div><div id="v2211CleanFlight" class="v2211-clean-flight"></div><div id="v2211CleanProvider" class="v2211-clean-provider"></div><div id="v2211CleanMeta" class="v2211-clean-meta"></div><button class="v2211-clean-ack" type="button">ĐÃ BIẾT</button></div>`;document.body.appendChild(a);a.querySelector('button').onclick=ackCleaningAlert;
    }
    injectCommonButton();
  }

  function injectCommonButton(){
    const panel=$('aclSimplePanel');if(!panel)return;
    let b=$('v2211CommonUpload');if(!b){b=document.createElement('button');b.id='v2211CommonUpload';b.type='button';b.className='v2211-common-upload';b.textContent='📷 UP ẢNH LIMIT + LỊCH VỆ SINH';const top=panel.querySelector('.acls-top');top?.insertAdjacentElement('afterend',b);b.onclick=openImport}
    const old=$('aclLimitModeSwitch');if(old)old.style.display='none';const oldAi=$('aclAIMode');if(oldAi)oldAi.style.display='none';
  }
  function openImport(){if(!isAdmin())return popup('warning','KHÔNG CÓ QUYỀN','Chỉ AD được upload ảnh LIMIT và lịch vệ sinh.');ensureUi();$('v2211ImportModal').style.display='flex'}
  function renderSelectedFiles(){const files=[...($('v2211Images')?.files||[])],h=$('v2211Files');if(h)h.innerHTML=files.map((f,i)=>`<div class="v2211-file-row">${i+1}. ${esc(f.name)} · ${(f.size/1024).toFixed(0)} KB</div>`).join('');$('v2211Run').disabled=!files.length;setStatus(files.length?`Đã chọn ${files.length} ảnh. Bấm AI ĐỌC & GÁN CẢNH BÁO.`:'Chưa chọn ảnh.')}
  function setStatus(t,err=false){const e=$('v2211Status');if(e){e.textContent=t;e.classList.toggle('err',!!err)}}
  function popup(type,title,message){if(typeof root.sagsActionPopup==='function')return root.sagsActionPopup({type,title,message});alert(`${title}\n\n${message}`)}

  async function filePart(file){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(S(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error||new Error('Không đọc được ảnh.'));r.readAsDataURL(file)});return {inlineData:{data,mimeType:file.type||'image/jpeg'}}}
  async function aiSdk(){
    if(aiSdkPromise)return aiSdkPromise;
    aiSdkPromise=(async()=>{
      const [appMod,appCheckMod,aiMod]=await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js'),
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-ai.js')
      ]);
      const opts=root.firebase?.app?.().options;if(!opts?.apiKey||!opts?.projectId||!opts?.appId)throw new Error('Không lấy được Firebase config của E-REPORT.');
      let cfg={};try{cfg=await root.sagsAiLoadConfig?.(true)||{}}catch(_){}
      let app;try{app=appMod.getApp('sags-v2211-import-ai')}catch(_){app=appMod.initializeApp(opts,'sags-v2211-import-ai')}
      const siteKey=S(cfg.appCheckSiteKey||APP_CHECK_SITE_KEY_FALLBACK);if(!siteKey)throw new Error('Chưa cấu hình App Check cho AI.');
      let check=root.__SAGS_V2211_APP_CHECK_INSTANCE||null;
      if(!check)try{check=appCheckMod.initializeAppCheck(app,{provider:new appCheckMod.ReCaptchaEnterpriseProvider(siteKey),isTokenAutoRefreshEnabled:true});root.__SAGS_V2211_APP_CHECK_INSTANCE=check}catch(_){
        check=app?._container?.getProvider?.('app-check')?.getImmediate?.({optional:true})||null;
      }
      if(!check)throw new Error('Không khởi tạo được App Check cho AI.');
      const token=await appCheckMod.getToken(check,false);if(!token?.token)throw new Error('Không lấy được App Check token.');
      const ai=aiMod.getAI(app,{backend:new aiMod.GoogleAIBackend()});
      const modelName=S(cfg.fastModel||cfg.model||AI_MODEL_FALLBACK);
      return {model:aiMod.getGenerativeModel(ai,{model:modelName,generationConfig:{responseMimeType:'application/json',temperature:0.05}}),modelName};
    })();return aiSdkPromise;
  }
  function importPrompt(files){return `Bạn là AI nhập dữ liệu khai thác hàng không cho E-REPORT/SAGS CXR. Có ${files.length} ảnh, theo đúng thứ tự tên file bên dưới. Đọc từng ảnh và tự phân loại thành A/C LIMITS hoặc LỊCH VỆ SINH TÀU BAY. Không suy đoán ký tự không nhìn thấy.

PHÂN LOẠI:
- LIMIT: bảng/thông báo hạn chế tàu bay như APU INOP, GPU/ACU/ASU, HOLD/CARGO/SEAT INOP hoặc hạn chế khác.
- CLEANING: lịch vệ sinh cabin có cột Date, Flt No, Route, A/C Reg, Type.
- CLEANING có lời gửi "Dear VietSky Team" hoặc nội dung giao VietSky thì provider=VIETSKY.
- CLEANING có lời gửi "PVTT & ĐH SAGS", "PVTT SAGS" hoặc giao SAGS thì provider=SAGS.

QUY TẮC:
1) Giữ đúng Flight No, Route, A/C Reg và ngày đọc được. Một ô "VJ7621/VJ5512" phải tách arrivalFlight=VJ7621, departureFlight=VJ5512; nếu chỉ có một chuyến thì đặt vào trường phù hợp theo Route qua CXR và để trường kia rỗng.
2) Ngày phải là YYYY-MM-DD. Chỉ dùng năm nếu năm xuất hiện trong chính ảnh/email; không đoán năm bị thiếu.
3) LIMIT: category chỉ một trong APU INOP, HOLD INOP/ISSUES, SEAT INOP, OTHERS. Giữ nguyên restriction có nghĩa khai thác; action=CLEAR nếu dòng nói đã clear.
4) Nếu không chắc, confidence thấp và needsReview=true. Không tự bịa dữ liệu.
5) sourceImageIndex là số thứ tự ảnh bắt đầu từ 1.

Chỉ trả JSON hợp lệ, không markdown:
{"documents":[{"sourceImageIndex":1,"documentType":"LIMIT|CLEANING|UNKNOWN","documentDate":"YYYY-MM-DD hoặc rỗng","provider":"SAGS|VIETSKY|UNKNOWN","confidence":0.0,"items":[{"kind":"LIMIT","flightNo":"","acReg":"","category":"OTHERS","restriction":"","effectiveFrom":"","effectiveTo":"","action":"UPSERT","confidence":0.0,"needsReview":false},{"kind":"CLEANING","date":"","arrivalFlight":"","departureFlight":"","sta":"HH:MM hoặc rỗng","std":"HH:MM hoặc rỗng","route":"","acReg":"","acType":"","provider":"SAGS|VIETSKY|UNKNOWN","confidence":0.0,"needsReview":false}]}]}

TÊN ẢNH:
${files.map((f,i)=>String(i+1)+'. '+f.name).join('\n')}`;}
  function extractJson(text){const s=S(text).replace(/^```(?:json)?/i,'').replace(/```$/,'').trim(),a=s.indexOf('{'),b=s.lastIndexOf('}');if(a<0||b<a)throw new Error('AI không trả JSON hợp lệ.');return JSON.parse(s.slice(a,b+1))}

  function normalizeAi(obj,files){
    const limits=[],cleaning=[],review=[];
    for(const doc of (Array.isArray(obj?.documents)?obj.documents:[])){
      const imageIndex=Math.max(1,Number(doc?.sourceImageIndex||1)),sourceFile=S(files[imageIndex-1]?.name||''),docDate=normalizeISO(doc?.documentDate),docProvider=U(doc?.provider);
      for(const raw of (Array.isArray(doc?.items)?doc.items:[])){
        const kind=U(raw?.kind||doc?.documentType),confidence=Math.max(0,Math.min(1,Number(raw?.confidence??doc?.confidence??0))),needsReview=!!raw?.needsReview||confidence<.85;
        if(kind.includes('LIMIT')){
          const restriction=S(raw?.restriction),action=U(raw?.action)==='CLEAR'?'CLEAR':'UPSERT',row={kind:'LIMIT',sourceFile,imageIndex,flightNo:normFlight(raw?.flightNo),acReg:normReg(raw?.acReg),displayReg:displayReg(raw?.acReg),category:limitCategory(raw?.category),restriction,effectiveFrom:normalizeISO(raw?.effectiveFrom)||docDate||todayISO(),effectiveTo:normalizeISO(raw?.effectiveTo)||normalizeISO(raw?.effectiveFrom)||docDate||todayISO(),action,confidence,needsReview};
          if(action==='CLEAR'||needsReview||(!row.acReg&&!row.flightNo)||!restriction)review.push(row);else limits.push(row);
        }else if(kind.includes('CLEAN')){
          const provider=['SAGS','VIETSKY'].includes(U(raw?.provider))?U(raw.provider):(['SAGS','VIETSKY'].includes(docProvider)?docProvider:'UNKNOWN');
          const row={kind:'CLEANING',sourceFile,imageIndex,date:normalizeISO(raw?.date)||docDate,arrivalFlight:normFlight(raw?.arrivalFlight),departureFlight:normFlight(raw?.departureFlight),sta:normalizeClock(raw?.sta),std:normalizeClock(raw?.std),route:U(raw?.route),acReg:normReg(raw?.acReg),displayReg:displayReg(raw?.acReg),acType:U(raw?.acType),provider,confidence,needsReview};
          if(needsReview||!row.date||provider==='UNKNOWN'||(!row.arrivalFlight&&!row.departureFlight&&!row.acReg))review.push(row);else cleaning.push(row);
        }
      }
    }
    return {limits,cleaning,review};
  }
  function limitCategory(v){const x=U(v);if(x.includes('APU'))return 'APU INOP';if(x.includes('HOLD')||x.includes('CARGO'))return 'HOLD INOP/ISSUES';if(x.includes('SEAT'))return 'SEAT INOP';return 'OTHERS'}

  async function saveLimits(rows){
    if(!rows.length)return 0;const snap=await db(LIMIT_PUBLIC).once('value'),old=snap.val()||{},now=Date.now(),arr=Array.isArray(old.items)?old.items.slice():Object.values(old.items||{});
    for(const r of rows){const same=x=>U(x.source)==='AI_MULTI_IMAGE'&&S(x.effectiveFrom)===r.effectiveFrom&&normFlight(x.flightNo)===r.flightNo&&normReg(x.acReg)===r.acReg&&U(x.category)===r.category;const found=arr.find(same),item={...(found||{}),id:S(found?.id||uid('ACL')),source:'AI_MULTI_IMAGE',active:true,airline:(r.flightNo.match(/^([A-Z0-9]{2,3}?)(?=\d)/)||['',''])[1],flightNo:r.flightNo,acReg:r.acReg,displayReg:r.displayReg,matchMode:r.flightNo&&r.acReg?'BOTH':r.flightNo?'FLIGHT':'REG',category:r.category,restriction:r.restriction,effectiveFrom:r.effectiveFrom,effectiveTo:r.effectiveTo,batchDate:r.effectiveFrom,batchVersion:'V2.2.11',recipientRoles:['DH','CBTT','VHTTB','PVHK','PVHLNG'],sourceFile:r.sourceFile,aiConfidence:r.confidence,createdAtMs:Number(found?.createdAtMs||now),createdBy:found?.createdBy||actor(),updatedAtMs:now,updatedBy:actor()};if(found)arr[arr.indexOf(found)]=item;else arr.push(item)}
    const catalog={...old,kind:'sags_ac_limits_catalog_v1',version:now,items:arr,updatedAtMs:now,updatedBy:actor()};await db(LIMIT_PUBLIC).set(catalog);await db(LIMIT_SIGNAL).set({version:now,action:'AI_MULTI_IMAGE_UPSERT',updatedAtMs:now,updatedBy:actor()});
    try{const fs=firestore(),col=collectionName();if(fs&&col)await fs.collection(col).doc('AC_LIMITS_CATALOG_V1').set(catalog,{merge:false})}catch(e){console.info('V2.2.11 LIMIT Firestore mirror skipped',e?.message||e)}
    try{await root.ACLSimple?.refresh?.()}catch(_){}return rows.length;
  }
  function cleanKey(x){return [S(x.date),normFlight(x.arrivalFlight),normFlight(x.departureFlight),normReg(x.acReg)].join('|')}
  async function saveCleaning(rows){
    if(!rows.length)return 0;let old={};try{old=(await db(CLEAN_PUBLIC).once('value')).val()||{}}catch(_){}const now=Date.now(),arr=Array.isArray(old.items)?old.items.slice():Object.values(old.items||{});
    for(const r of rows){const found=arr.find(x=>cleanKey(x)===cleanKey(r)),item={...(found||{}),id:S(found?.id||uid('CLEAN')),source:'AI_MULTI_IMAGE',active:true,date:r.date,arrivalFlight:r.arrivalFlight,departureFlight:r.departureFlight,flights:[r.arrivalFlight,r.departureFlight].filter(Boolean),sta:r.sta,std:r.std,route:r.route,acReg:r.acReg,displayReg:r.displayReg,acType:r.acType,provider:r.provider,sourceFile:r.sourceFile,aiConfidence:r.confidence,createdAtMs:Number(found?.createdAtMs||now),createdBy:found?.createdBy||actor(),updatedAtMs:now,updatedBy:actor()};if(found)arr[arr.indexOf(found)]=item;else arr.push(item)}
    const catalog={schema:1,kind:'sags_aircraft_cleaning_catalog_v1',version:now,items:arr,updatedAtMs:now,updatedBy:actor()};await db(CLEAN_PUBLIC).set(catalog);await db(CLEAN_SIGNAL).set({version:now,action:'AI_MULTI_IMAGE_UPSERT',updatedAtMs:now,updatedBy:actor()});
    try{const fs=firestore(),col=collectionName();if(fs&&col)await fs.collection(col).doc('AIRCRAFT_CLEANING_CATALOG_V1').set(catalog,{merge:false})}catch(e){console.info('V2.2.11 CLEANING Firestore mirror skipped',e?.message||e)}
    applyCleanCatalog(catalog);return rows.length;
  }
  async function saveReview(rows,files){if(!rows.length)return 0;const id=uid('REVIEW'),payload={schema:1,id,status:'PENDING_AD_REVIEW',source:'AI_MULTI_IMAGE',rows,files:files.map(f=>({name:f.name,size:f.size,type:f.type})),createdAtMs:Date.now(),createdBy:actor(),build:BUILD};await db(`${CLEAN_REVIEW}/${safe(id)}`).set(payload);return rows.length}

  async function runImport(){
    if(importing)return;if(!isAdmin())return popup('warning','KHÔNG CÓ QUYỀN','Chỉ AD được dùng chức năng này.');
    const files=[...($('v2211Images')?.files||[])];if(!files.length)return popup('warning','CHƯA CHỌN ẢNH','Hãy chọn một hoặc nhiều ảnh.');if(files.length>MAX_BATCH_IMAGES)return popup('warning','QUÁ NHIỀU ẢNH',`Mỗi lượt tối đa ${MAX_BATCH_IMAGES} ảnh.`);
    const bad=files.find(f=>f.size>MAX_IMAGE_BYTES);if(bad)return popup('warning','ẢNH VƯỢT GIỚI HẠN',`${bad.name} vượt 10 MB.`);
    importing=true;const run=$('v2211Run'),close=$('v2211Close');run.disabled=true;close.disabled=true;setStatus(`AI đang đọc và phân loại ${files.length} ảnh…`);
    try{
      const {model,modelName}=await aiSdk(),parts=[];for(let i=0;i<files.length;i++){setStatus(`Đang chuẩn bị ảnh ${i+1}/${files.length}: ${files[i].name}`);parts.push({text:`IMAGE ${i+1}: ${files[i].name}`},await filePart(files[i]))}
      setStatus(`AI ${modelName} đang đọc ${files.length} ảnh…`);const result=await model.generateContent([{text:importPrompt(files)},...parts]),obj=extractJson(result?.response?.text?.()||''),out=normalizeAi(obj,files);
      setStatus('AI đã đọc xong. Đang gán cảnh báo vào hệ thống…');const nLimit=await saveLimits(out.limits),nClean=await saveCleaning(out.cleaning),nReview=await saveReview(out.review,files);
      const msg=`Đã xử lý ${files.length} ảnh.\nA/C LIMITS: ${nLimit} dòng.\nLịch vệ sinh: ${nClean} dòng.\nCần AD xác nhận: ${nReview} dòng.`;setStatus('✓ '+msg);popup(nReview?'warning':'success',nReview?'ĐÃ GÁN · CÓ DÒNG CẦN KIỂM TRA':'ĐÃ GÁN CẢNH BÁO',msg);$('v2211Images').value='';renderSelectedFiles();setStatus('✓ '+msg);
    }catch(e){aiSdkPromise=null;const msg='AI đọc/gán ảnh thất bại: '+S(e?.message||e);setStatus(msg,true);popup('error','AI IMPORT THẤT BẠI',msg)}finally{importing=false;run.disabled=false;close.disabled=false}
  }

  function applyCleanCatalog(v){v=v||{};cleanCatalog={version:Number(v.version||0),items:(Array.isArray(v.items)?v.items:Object.values(v.items||{})).filter(Boolean)};try{localStorage.setItem(CLEAN_CACHE,JSON.stringify(cleanCatalog))}catch(_){};cleanQueue=cleanQueue.filter(a=>cleanCatalog.items.some(x=>S(x.id)===S(a.item.id)&&x.active!==false));evaluateCleaningSoon()}
  function loadCleanCache(){try{const x=JSON.parse(localStorage.getItem(CLEAN_CACHE)||'null');if(x?.items)applyCleanCatalog(x)}catch(_){}}
  async function loadCleaning(){try{const v=(await db(CLEAN_PUBLIC).once('value')).val();if(v)applyCleanCatalog(v)}catch(e){console.info('V2.2.11 cleaning load',e?.message||e)}}
  function startCleanSignal(){try{if(cleanSignalRef)return;cleanSignalRef=db(CLEAN_SIGNAL);cleanSignalRef.on('value',snap=>{const v=Number(snap?.val?.()?.version||0);if(v&&v!==cleanCatalog.version)loadCleaning()})}catch(_){} }

  function pick(st,...keys){for(const k of keys){const v=S(st?.[k]);if(v&&U(v)!=='N/A')return v}return ''}
  function contextFor(sessionId,st,meta){
    st=st&&typeof st==='object'?st:{};let identity={};try{identity=root.fs09IdentityFromState?.(st,meta)||root.opsRampIdentity?.(st,meta)||{}}catch(_){}
    let flights=Array.isArray(identity.flights)?identity.flights.map(normFlight).filter(Boolean):[];if(!flights.length)flights=[pick(st,'fltBefore','f421_fltBefore','f551_fltBefore','f09_fltBefore'),pick(st,'fltAfter','f421_fltAfter','f551_fltAfter','f09_fltAfter')].map(normFlight).filter(Boolean);
    const reg=normReg(identity.acRegToken||identity.regn||pick(st,'regn','f421_regn','f551_regn','f09_regn','acReg'));
    const date=normalizeISO(identity.dateToken||pick(st,'date','f421_date','f551_date','f09_date'))||todayISO();
    return {sessionId:S(sessionId)||`CLEAN_${date}_${flights.join('_')}_${reg}`,flightLabel:flights.join('/')||S(meta?.name||'CHUYẾN'),flights,reg,date,sta:pick(st,'sta','f421_sta','f551_sta','f09_sta'),chockOn:pick(st,'h5Start','f421_h5Start','f551_h5Start','f09_h5Start','h5','f421_h5','f551_h5','f09_h5'),pushback:pick(st,'h24Start','f421_h24Start','f551_h24Start','f09_h24Start','pushback','f421_pushback','f551_pushback','f09_pushback')};
  }
  function contexts(){const out=[],seen=new Set(),add=(sid,st,meta)=>{const c=contextFor(sid,st,meta);if(!c.sessionId||seen.has(c.sessionId))return;seen.add(c.sessionId);out.push(c)};try{add(S(root.activeFlightSessionId),root.state||{},root.currentFlightSessionMeta?.()||null)}catch(_){}try{for(const meta of (root.readFlightSessionList?.()||[])){const sid=S(meta?.id);if(!sid||seen.has(sid))continue;const env=root.readFlightSessionEnvelope?.(sid)||{};add(sid,env.state||{},meta)}}catch(_){}return out}
  function cleanMatch(x,c){if(x.active===false||S(x.date)!==c.date)return false;const fs=[x.arrivalFlight,x.departureFlight,...(x.flights||[])].map(normFlight).filter(Boolean),fm=fs.some(f=>c.flights.includes(f)),rm=normReg(x.acReg)&&normReg(x.acReg)===c.reg;return fm||rm}
  function ackStore(){try{return JSON.parse(localStorage.getItem(CLEAN_ACK)||'{}')||{}}catch(_){return {}}}
  function alertKey(item,c,trigger){return `${S(item.id)}|${Number(item.updatedAtMs||0)}|${c.sessionId}|${c.date}|${trigger}`}
  function evaluateCleaningSoon(){clearTimeout(cleanTimer);cleanTimer=setTimeout(evaluateCleaning,120)}
  function evaluateCleaning(){
    if(role()!=='DH'||!cleanCatalog.version)return;const now=Date.now(),acks=ackStore();
    for(const c of contexts()){
      if(c.pushback)continue;const matches=cleanCatalog.items.filter(x=>cleanMatch(x,c));if(!matches.length)continue;
      const exactFlight=matches.filter(x=>[x.arrivalFlight,x.departureFlight,...(x.flights||[])].map(normFlight).some(f=>c.flights.includes(f))),pool=exactFlight.length?exactFlight:matches,latest=pool.slice().sort((a,b)=>Number(b.updatedAtMs||0)-Number(a.updatedAtMs||0))[0];if(!latest)continue;
      const triggers=[];const due=clockMs(c.date,c.sta);if(due&&now>=due-10*60000)triggers.push('STA_T10');if(c.chockOn)triggers.push('CHOCK_ON');
      for(const trigger of triggers){const key=alertKey(latest,c,trigger);if(acks[key]||cleanCurrent?.key===key||cleanQueue.some(a=>a.key===key))continue;cleanQueue.push({key,item:latest,ctx:c,trigger})}
    }tryShowCleaning();
  }
  function anotherPopupVisible(){for(const id of ['opsAlertModal','aclAlertModal','sagsActionPopup','globalActionPopup','v1178ActionPopup']){const e=$(id);if(e&&getComputedStyle(e).display!=='none')return true}return false}
  function tryShowCleaning(){if(cleanCurrent||!cleanQueue.length)return;if(anotherPopupVisible()){setTimeout(tryShowCleaning,900);return}cleanCurrent=cleanQueue.shift();showCleaning(cleanCurrent)}
  function showCleaning(a){ensureUi();const provider=U(a.item.provider)==='VIETSKY'?'VIETSKY':'SAGS',f=$('v2211CleanFlight'),p=$('v2211CleanProvider'),m=$('v2211CleanMeta');if(f)f.textContent=`${a.ctx.flightLabel}${a.ctx.reg?' · A/C '+displayReg(a.ctx.reg):''}`;if(p)p.textContent=`${provider} DỌN VỆ SINH TÀU BAY`;if(m)m.textContent=a.trigger==='CHOCK_ON'?`NHẮC LẠI KHI CHOCK ON ${a.ctx.chockOn||''}`:`CẢNH BÁO STA −10 PHÚT · STA ${a.ctx.sta||'—'}`;$('v2211CleaningAlert').style.display='flex';try{navigator.vibrate?.([350,160,350])}catch(_){}try{root.writeUserActivity?.(`VỆ SINH · ${a.trigger==='CHOCK_ON'?'CHOCK ON':'STA T-10'}`,`${a.ctx.flightLabel} · ${provider}`,{provider,flightLabel:a.ctx.flightLabel,reg:a.ctx.reg,trigger:a.trigger})}catch(_){} }
  function ackCleaningAlert(){if(!cleanCurrent)return;const acks=ackStore();acks[cleanCurrent.key]=Date.now();try{localStorage.setItem(CLEAN_ACK,JSON.stringify(acks))}catch(_){}$('v2211CleaningAlert').style.display='none';cleanCurrent=null;setTimeout(tryShowCleaning,180)}

  function install(){ensureUi();loadCleanCache();loadCleaning();startCleanSignal();setInterval(()=>{injectCommonButton();if(!cleanSignalRef)startCleanSignal();if(!cleanCatalog.version)loadCleaning();evaluateCleaning()},5000);document.addEventListener('input',e=>{if(/(^|_)h5(start)?$/i.test(S(e.target?.id)))setTimeout(evaluateCleaning,250)},true);document.addEventListener('visibilitychange',()=>{if(!document.hidden)evaluateCleaningSoon()});window.addEventListener('pageshow',evaluateCleaningSoon,{passive:true});setTimeout(injectCommonButton,500);setTimeout(injectCommonButton,1800)}
  root.sagsV2211OpenUnifiedImport=openImport;
  root.sagsV2211EvaluateCleaning=evaluateCleaning;
  root.sagsV2211AckCleaning=ackCleaningAlert;
  root.SAGS_V2211={build:BUILD,openImport,evaluateCleaning,loadCleaning};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else setTimeout(install,0);
})(typeof window!=='undefined'?window:globalThis);
