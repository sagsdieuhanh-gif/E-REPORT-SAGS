/* E-REPORT/SAGS · In-app Document Scanner · V1.14 · LIVE 4-CORNER DETECTION */
(() => {
  'use strict';

  const BUILD = 'V1.14-20260818-01';
  if (window.SAGSDocumentScanner && window.SAGSDocumentScanner.build === BUILD) return;

  const MAX_PAGES = 20;
  const MAX_CAPTURE_DIM = 2600;
  const MAX_SCAN_DIM = 2200;
  const PREVIEW_DIM = 1200;
  const THUMB_DIM = 180;
  const DEFAULT_FILTER = 'clear';

  const state = {
    root: null,
    stream: null,
    track: null,
    devices: [],
    deviceIndex: 0,
    torch: false,
    mode: 'idle',
    pages: [],
    selected: 0,
    captureCanvas: null,
    corners: null,
    activeCorner: -1,
    opening: false,
    busy: false,
    qualityText: '',
    liveTimer: 0,
    liveBusy: false,
    liveCorners: null,
    liveConfidence: 0,
    liveStableCount: 0,
    liveLastCorners: null,
    liveSourceSize: null,
  };

  const CSS = `
  #sagsDocScanner{position:fixed;inset:0;z-index:30050;background:#07111c;color:#fff;font-family:Arial,sans-serif;display:none;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
  #sagsDocScanner.sds-open{display:flex;flex-direction:column}
  #sagsDocScanner *{box-sizing:border-box}
  .sds-top{flex:0 0 auto;display:grid;grid-template-columns:76px 1fr 76px;align-items:center;gap:6px;padding:max(8px,env(safe-area-inset-top)) 10px 8px;background:rgba(4,16,28,.96);border-bottom:1px solid rgba(255,255,255,.12)}
  .sds-title{text-align:center;font-weight:900;font-size:16px;line-height:1.1}.sds-sub{display:block;font-weight:500;font-size:11px;opacity:.75;margin-top:3px}
  .sds-btn{border:0;border-radius:10px;min-height:42px;padding:8px 10px;font-weight:800;font-size:13px;background:#e8eef5;color:#10233a;touch-action:manipulation}
  .sds-btn.primary{background:#1287ff;color:#fff}.sds-btn.good{background:#16a36a;color:#fff}.sds-btn.warn{background:#ffb020;color:#1b1b1b}.sds-btn.danger{background:#c93535;color:#fff}.sds-btn.ghost{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.18)}
  .sds-btn:disabled{opacity:.42}.sds-stage{position:relative;flex:1;min-height:0;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center}
  .sds-view{position:absolute;inset:0;display:none;align-items:center;justify-content:center}.sds-view.active{display:flex}
  #sdsVideo{width:100%;height:100%;object-fit:contain;background:#000}
  #sdsLiveOverlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
  .sds-live-status{position:absolute;z-index:3;left:50%;bottom:12px;transform:translateX(-50%);max-width:92%;padding:7px 11px;border-radius:18px;background:rgba(0,0,0,.62);font-size:12px;font-weight:800;text-align:center;pointer-events:none;white-space:nowrap}
  .sds-live-status.ok{background:rgba(10,121,71,.82)}.sds-live-status.search{background:rgba(0,0,0,.62)}
  .sds-guide{position:absolute;inset:7% 5%;border:2px solid rgba(94,219,255,.75);border-radius:10px;box-shadow:0 0 0 999px rgba(0,0,0,.10);pointer-events:none}
  .sds-guide:before,.sds-guide:after{content:"";position:absolute;inset:20% 0;border-top:1px dashed rgba(255,255,255,.2);border-bottom:1px dashed rgba(255,255,255,.2)}
  .sds-camera-tip{position:absolute;top:12px;left:50%;transform:translateX(-50%);max-width:90%;padding:7px 10px;border-radius:18px;background:rgba(0,0,0,.58);font-size:12px;text-align:center;pointer-events:none}
  .sds-bottom{flex:0 0 auto;background:#07111c;padding:9px 10px max(10px,env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.12)}
  .sds-camera-actions{display:grid;grid-template-columns:1fr 84px 1fr;align-items:center;gap:10px}.sds-side-actions{display:flex;gap:7px;justify-content:center;flex-wrap:wrap}
  .sds-shutter{width:72px;height:72px;border-radius:50%;border:5px solid #fff;background:#1689ff;box-shadow:0 0 0 3px rgba(22,137,255,.35);justify-self:center;touch-action:manipulation}
  .sds-count{text-align:center;font-size:12px;opacity:.8;margin-top:6px}
  #sdsCropCanvas,#sdsReviewCanvas{display:block;max-width:100%;max-height:100%;width:auto;height:auto;background:#111;touch-action:none}
  .sds-crop-wrap,.sds-review-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px}
  .sds-crop-help{position:absolute;top:10px;left:10px;right:10px;text-align:center;font-size:12px;background:rgba(0,0,0,.58);padding:7px;border-radius:10px;pointer-events:none}
  .sds-row{display:flex;gap:7px;overflow-x:auto;padding-bottom:2px}.sds-row .sds-btn{flex:0 0 auto}
  .sds-crop-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.sds-crop-actions .sds-btn{padding:7px 4px;font-size:12px}
  .sds-review-bottom{display:grid;gap:8px}.sds-thumbs{display:flex;gap:7px;overflow-x:auto;min-height:82px;padding:2px}.sds-thumb{position:relative;flex:0 0 66px;height:78px;border-radius:8px;border:2px solid transparent;background:#1b2837;overflow:hidden;padding:0}.sds-thumb.active{border-color:#44a5ff}.sds-thumb canvas{width:100%;height:100%;object-fit:contain;display:block}.sds-thumb span{position:absolute;left:3px;top:3px;background:rgba(0,0,0,.7);border-radius:9px;padding:2px 5px;font-size:10px;color:#fff}
  .sds-tools{display:flex;gap:6px;overflow-x:auto}.sds-tools .sds-btn{min-height:37px;padding:6px 9px;font-size:12px;flex:0 0 auto}.sds-tools .sds-btn.active{outline:2px solid #65b7ff;background:#155b8f;color:#fff}
  .sds-final{display:grid;grid-template-columns:1fr 1.25fr;gap:8px}.sds-final .sds-btn{min-height:46px}
  .sds-busy{position:absolute;inset:0;z-index:10;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.68);text-align:center;padding:24px}.sds-busy.show{display:flex}.sds-busy-box{background:#13263a;border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:18px;max-width:300px;font-weight:800}.sds-spinner{width:34px;height:34px;border:4px solid rgba(255,255,255,.28);border-top-color:#fff;border-radius:50%;animation:sdsSpin .8s linear infinite;margin:0 auto 10px}@keyframes sdsSpin{to{transform:rotate(360deg)}}
  .sds-msg{font-size:12px;line-height:1.35;opacity:.85;text-align:center;min-height:17px;margin-top:5px}.sds-toast{position:absolute;z-index:20;left:50%;bottom:110px;transform:translateX(-50%);background:rgba(10,24,38,.94);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:9px 12px;font-size:12px;max-width:88%;text-align:center;display:none}.sds-toast.show{display:block}
  .sds-help{position:fixed;inset:0;z-index:30080;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);padding:14px;touch-action:manipulation}.sds-help.show{display:flex}.sds-help-box{width:min(94vw,520px);max-height:86vh;overflow:auto;background:#fff;color:#13263a;border-radius:14px;padding:16px;box-shadow:0 16px 44px rgba(0,0,0,.4)}.sds-help-box h3{margin:0 0 10px;color:#0b5cab}.sds-help-box ol{padding-left:22px;margin:8px 0}.sds-help-box li{margin:7px 0;line-height:1.38}.sds-help-note{padding:9px 10px;border-radius:9px;background:#eef7ff;font-size:12px;line-height:1.4;margin:10px 0}
  @media(max-width:430px){.sds-top{grid-template-columns:64px 1fr 64px}.sds-btn{font-size:12px;padding:7px 7px}.sds-camera-actions{grid-template-columns:1fr 76px 1fr}.sds-shutter{width:66px;height:66px}.sds-crop-actions{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media(orientation:landscape) and (max-height:560px){.sds-top{padding-top:max(5px,env(safe-area-inset-top));padding-bottom:5px}.sds-bottom{padding-top:5px}.sds-shutter{width:56px;height:56px}.sds-camera-actions{grid-template-columns:1fr 66px 1fr}.sds-thumbs{min-height:62px}.sds-thumb{height:58px;width:52px;flex-basis:52px}}
  `;

  function escapeHtml(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function makeCanvas(w,h){
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(w)); c.height=Math.max(1,Math.round(h));
    return c;
  }

  function canvasToBlob(canvas,type='image/jpeg',quality=.88){
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không tạo được ảnh scan.')),type,quality));
  }

  function installStyle(){
    if(document.getElementById('sagsDocScannerStyle')) return;
    const s=document.createElement('style');s.id='sagsDocScannerStyle';s.textContent=CSS;document.head.appendChild(s);
  }

  function buildUI(){
    if(state.root) return state.root;
    installStyle();
    const root=document.createElement('div');
    root.id='sagsDocScanner';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.innerHTML=`
      <div class="sds-top">
        <button class="sds-btn ghost" id="sdsClose">ĐÓNG</button>
        <div class="sds-title"><span id="sdsTitle">QUÉT TÀI LIỆU</span><span class="sds-sub" id="sdsSubtitle">Camera tài liệu · ${BUILD}</span></div>
        <button class="sds-btn ghost" id="sdsHelp">HDSD</button>
      </div>
      <div class="sds-stage">
        <div class="sds-view active" id="sdsCameraView">
          <video id="sdsVideo" autoplay muted playsinline></video>
          <canvas id="sdsLiveOverlay" aria-hidden="true"></canvas>
          <div class="sds-guide"></div>
          <div class="sds-camera-tip" id="sdsCameraTip">Đặt trọn tờ giấy trong khung · hệ thống sẽ tự khoanh 4 góc</div>
          <div class="sds-live-status search" id="sdsLiveStatus">ĐANG TÌM 4 GÓC TỜ GIẤY…</div>
        </div>
        <div class="sds-view" id="sdsCropView"><div class="sds-crop-wrap"><canvas id="sdsCropCanvas"></canvas><div class="sds-crop-help">Kéo 4 chấm xanh vào đúng 4 góc tờ giấy</div></div></div>
        <div class="sds-view" id="sdsReviewView"><div class="sds-review-wrap"><canvas id="sdsReviewCanvas"></canvas></div></div>
        <div class="sds-busy" id="sdsBusy"><div class="sds-busy-box"><div class="sds-spinner"></div><div id="sdsBusyText">Đang xử lý…</div></div></div>
        <div class="sds-toast" id="sdsToast"></div>
        <div class="sds-help" id="sdsHelpPanel" role="dialog" aria-modal="true" aria-label="Hướng dẫn CAMSCANER">
          <div class="sds-help-box">
            <h3>HDSD · CAMSCANER</h3>
            <ol>
              <li>Bấm <b>📄 CAMSCANER</b> trên thanh chức năng của đơn vị hoặc mở từ vùng Đính kèm.</li>
              <li>Đặt trọn tờ giấy trong khung. Khi camera đang mở, hệ thống <b>tự nhận diện 4 góc trực tiếp trên hình live</b> và vẽ viền xanh quanh tờ giấy.</li>
              <li>Khi hiện <b>ĐÃ NHẬN 4 GÓC · CÓ THỂ CHỤP</b>, bấm nút tròn. Sau khi chụp vẫn có thể kéo 4 chấm để chỉnh chính xác hoặc dùng <b>TỰ NHẬN MÉP</b>.</li>
              <li>Bấm <b>LƯU TRANG</b>. Hệ thống cắt phối cảnh để làm thẳng tài liệu.</li>
              <li>Ở màn kiểm tra, có thể <b>XOAY</b>, đổi thứ tự bằng <b>← TRANG / TRANG →</b>, <b>XÓA</b> và chọn <b>GỐC / RÕ / XÁM / ĐEN TRẮNG</b>.</li>
              <li>Bấm <b>ĐÍNH KÈM</b> để đưa toàn bộ trang đã quét vào vùng ảnh của biểu mẫu hiện tại.</li>
            </ol>
            <div class="sds-help-note"><b>Lưu ý:</b> cho phép Camera khi trình duyệt hỏi quyền; nên giữ điện thoại song song với mặt giấy và đủ sáng để nhận mép chính xác hơn.</div>
            <button class="sds-btn primary" id="sdsHelpClose" style="width:100%">ĐÃ HIỂU</button>
          </div>
        </div>
      </div>
      <div class="sds-bottom" id="sdsCameraBottom">
        <div class="sds-camera-actions">
          <div class="sds-side-actions"><button class="sds-btn ghost" id="sdsTorch">ĐÈN</button><button class="sds-btn ghost" id="sdsSwitch">ĐỔI CAM</button></div>
          <button class="sds-shutter" id="sdsShutter" aria-label="Chụp"></button>
          <div class="sds-side-actions"><button class="sds-btn good" id="sdsDone">XONG <span id="sdsDoneCount">0</span></button></div>
        </div>
        <div class="sds-count" id="sdsPageCount">0/${MAX_PAGES} trang</div>
        <div class="sds-msg" id="sdsCameraMsg"></div>
      </div>
      <div class="sds-bottom" id="sdsCropBottom" style="display:none">
        <div class="sds-crop-actions">
          <button class="sds-btn ghost" id="sdsRetake">CHỤP LẠI</button>
          <button class="sds-btn ghost" id="sdsAutoEdge">TỰ NHẬN MÉP</button>
          <button class="sds-btn ghost" id="sdsRotateCapture">XOAY 90°</button>
          <button class="sds-btn good" id="sdsSavePage">LƯU TRANG</button>
        </div>
        <div class="sds-msg" id="sdsCropMsg"></div>
      </div>
      <div class="sds-bottom sds-review-bottom" id="sdsReviewBottom" style="display:none">
        <div class="sds-thumbs" id="sdsThumbs"></div>
        <div class="sds-tools" id="sdsFilterTools">
          <button class="sds-btn" data-filter="original">GỐC</button>
          <button class="sds-btn" data-filter="clear">RÕ</button>
          <button class="sds-btn" data-filter="gray">XÁM</button>
          <button class="sds-btn" data-filter="bw">ĐEN TRẮNG</button>
          <button class="sds-btn ghost" id="sdsRotatePage">XOAY</button>
          <button class="sds-btn ghost" id="sdsMoveLeft">← TRANG</button>
          <button class="sds-btn ghost" id="sdsMoveRight">TRANG →</button>
          <button class="sds-btn danger" id="sdsDeletePage">XÓA</button>
        </div>
        <div class="sds-final"><button class="sds-btn ghost" id="sdsAddPage">+ QUÉT THÊM</button><button class="sds-btn good" id="sdsAttach">ĐÍNH KÈM <span id="sdsAttachCount">0</span> TRANG</button></div>
        <div class="sds-msg" id="sdsReviewMsg">Có thể xoay, đổi bộ lọc hoặc sắp xếp từng trang trước khi đính kèm.</div>
      </div>`;
    document.body.appendChild(root);
    state.root=root;
    bindUI();
    return root;
  }

  function $(id){ return document.getElementById(id); }

  function setBusy(on,text){
    state.busy=!!on;
    const el=$('sdsBusy'); if(!el)return;
    $('sdsBusyText').textContent=text||'Đang xử lý…';
    el.classList.toggle('show',!!on);
  }

  let toastTimer=0;
  function toast(text,ms=2300){
    const el=$('sdsToast'); if(!el)return;
    clearTimeout(toastTimer); el.textContent=text; el.classList.add('show');
    toastTimer=setTimeout(()=>el.classList.remove('show'),ms);
  }

  function setMode(mode){
    state.mode=mode;
    const map={camera:'sdsCameraView',crop:'sdsCropView',review:'sdsReviewView'};
    Object.values(map).forEach(id=>$(id)?.classList.remove('active'));
    $(map[mode])?.classList.add('active');
    $('sdsCameraBottom').style.display=mode==='camera'?'block':'none';
    $('sdsCropBottom').style.display=mode==='crop'?'block':'none';
    $('sdsReviewBottom').style.display=mode==='review'?'grid':'none';
    $('sdsTitle').textContent=mode==='crop'?'CẮT TÀI LIỆU':mode==='review'?'KIỂM TRA TÀI LIỆU':'QUÉT TÀI LIỆU';
    $('sdsSubtitle').textContent=mode==='review'?`${state.pages.length} trang đã quét`:mode==='crop'?'Chỉnh 4 góc trước khi lưu':`Camera tài liệu · ${BUILD}`;
    if(mode==='camera'&&state.stream)startLiveDetection();else stopLiveDetection();
    updateCounts();
  }

  function updateCounts(){
    const n=state.pages.length;
    if($('sdsDoneCount')) $('sdsDoneCount').textContent=String(n);
    if($('sdsAttachCount')) $('sdsAttachCount').textContent=String(n);
    if($('sdsPageCount')) $('sdsPageCount').textContent=`${n}/${MAX_PAGES} trang`;
    if($('sdsDone')) $('sdsDone').disabled=n===0;
    if($('sdsAttach')) $('sdsAttach').disabled=n===0;
  }

  async function open(){
    if(state.opening || state.root?.classList.contains('sds-open')) return;
    state.opening=true;
    try{
      buildUI();
      state.root.classList.add('sds-open');
      state.root.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow='hidden';
      document.body.style.overflow='hidden';
      setMode('camera');
      await startCamera();
    }catch(e){
      console.error('[Scanner]',e);
      toast('Không mở được camera: '+(e?.message||e),4500);
      if($('sdsCameraMsg')) $('sdsCameraMsg').textContent='Hãy cấp quyền Camera cho E‑Report/SAGS rồi thử lại.';
    }finally{state.opening=false;}
  }

  async function close(force=false){
    if(state.busy && !force) return;
    if(!force && state.pages.length){
      const ok=confirm(`Đóng máy quét? ${state.pages.length} trang chưa đính kèm sẽ bị hủy.`);
      if(!ok)return;
    }
    stopCamera();
    state.pages.length=0;state.captureCanvas=null;state.corners=null;state.selected=0;
    state.root?.classList.remove('sds-open');state.root?.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow='';document.body.style.overflow='';
    setMode('camera');
  }

  async function startCamera(deviceId=null){
    stopCamera();
    if(!navigator.mediaDevices?.getUserMedia) throw new Error('Thiết bị/trình duyệt không hỗ trợ camera web.');
    const video=$('sdsVideo');
    const videoConstraints=deviceId?{deviceId:{exact:deviceId},width:{ideal:2560},height:{ideal:1920}}:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1920}};
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:videoConstraints});
    state.stream=stream; state.track=stream.getVideoTracks()[0]||null; state.torch=false;
    video.srcObject=stream; await video.play();
    try{
      state.devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
      const current=state.track?.getSettings?.().deviceId;
      const idx=state.devices.findIndex(d=>d.deviceId===current);if(idx>=0)state.deviceIndex=idx;
    }catch(_){ state.devices=[]; }
    updateCameraButtons();
    resetLiveDetection();
    startLiveDetection();
    if($('sdsCameraMsg')) $('sdsCameraMsg').textContent='Camera đang tự nhận diện 4 góc. Khi viền xanh bám đúng mép giấy thì có thể chụp.';
  }

  function stopCamera(){
    stopLiveDetection();
    resetLiveDetection();
    try{state.stream?.getTracks?.().forEach(t=>t.stop());}catch(_){ }
    state.stream=null;state.track=null;state.torch=false;
    const v=$('sdsVideo');if(v)v.srcObject=null;
    updateCameraButtons();
  }

  function updateCameraButtons(){
    const torch=$('sdsTorch'),sw=$('sdsSwitch');
    const caps=state.track?.getCapabilities?.()||{};
    if(torch){torch.disabled=!caps.torch;torch.textContent=state.torch?'TẮT ĐÈN':'ĐÈN';}
    if(sw)sw.disabled=(state.devices?.length||0)<2;
  }

  async function toggleTorch(){
    if(!state.track)return;
    const caps=state.track.getCapabilities?.()||{};if(!caps.torch)return;
    try{state.torch=!state.torch;await state.track.applyConstraints({advanced:[{torch:state.torch}]});updateCameraButtons();}
    catch(e){state.torch=false;updateCameraButtons();toast('Thiết bị không bật được đèn camera.');}
  }

  async function switchCamera(){
    if(!state.devices?.length || state.devices.length<2)return;
    state.deviceIndex=(state.deviceIndex+1)%state.devices.length;
    setBusy(true,'Đang đổi camera…');
    try{await startCamera(state.devices[state.deviceIndex].deviceId);}catch(e){toast('Không đổi được camera.');}
    finally{setBusy(false);}
  }

  async function capture(){
    if(state.busy || state.pages.length>=MAX_PAGES)return;
    const v=$('sdsVideo');
    if(!v || !v.videoWidth || !v.videoHeight){toast('Camera chưa sẵn sàng.');return;}
    setBusy(true,'Đang chụp và tìm mép giấy…');
    await sleep(30);
    try{
      const scale=Math.min(1,MAX_CAPTURE_DIM/Math.max(v.videoWidth,v.videoHeight));
      const c=makeCanvas(v.videoWidth*scale,v.videoHeight*scale);
      const ctx=c.getContext('2d',{alpha:false,willReadFrequently:true});
      ctx.drawImage(v,0,0,c.width,c.height);
      state.captureCanvas=c;
      let detected;
      if(state.liveCorners && state.liveSourceSize && state.liveConfidence>=.42){
        const sx=c.width/state.liveSourceSize.w, sy=c.height/state.liveSourceSize.h;
        detected={
          corners:state.liveCorners.map(p=>({x:clamp(p.x*sx,0,c.width-1),y:clamp(p.y*sy,0,c.height-1)})),
          confidence:state.liveConfidence
        };
      }else{
        detected=detectDocumentCorners(c);
      }
      state.corners=detected.corners;
      state.qualityText=qualityMessage(c,detected.confidence);
      $('sdsCropMsg').textContent=state.qualityText;
      try{v.pause();}catch(_){ }
      setMode('crop');
      drawCropEditor();
    }catch(e){console.error('[Scanner capture]',e);toast('Không xử lý được ảnh vừa chụp.');}
    finally{setBusy(false);}
  }


  function clearLiveOverlay(){
    const c=$('sdsLiveOverlay');if(!c)return;
    const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
  }

  function resetLiveDetection(){
    state.liveCorners=null;state.liveConfidence=0;state.liveStableCount=0;state.liveLastCorners=null;state.liveSourceSize=null;state.liveBusy=false;
    clearLiveOverlay();
    const st=$('sdsLiveStatus');if(st){st.textContent='ĐANG TÌM 4 GÓC TỜ GIẤY…';st.classList.remove('ok');st.classList.add('search');}
  }

  function stopLiveDetection(){
    if(state.liveTimer){clearTimeout(state.liveTimer);state.liveTimer=0;}
    state.liveBusy=false;
  }

  function startLiveDetection(){
    stopLiveDetection();
    const tick=async()=>{
      if(!state.root?.classList.contains('sds-open') || state.mode!=='camera' || !state.stream){state.liveTimer=setTimeout(tick,360);return;}
      if(document.hidden){state.liveTimer=setTimeout(tick,500);return;}
      const v=$('sdsVideo');
      if(!v || v.readyState<2 || !v.videoWidth || !v.videoHeight || state.liveBusy){state.liveTimer=setTimeout(tick,180);return;}
      state.liveBusy=true;
      try{detectLiveFrame(v);}catch(e){console.warn('[Scanner live edge]',e);}
      finally{state.liveBusy=false;state.liveTimer=setTimeout(tick,240);}
    };
    state.liveTimer=setTimeout(tick,80);
  }

  function smoothLiveCorners(next){
    if(!state.liveCorners || state.liveCorners.length!==4)return next.map(p=>({x:p.x,y:p.y}));
    const a=.38;
    return next.map((p,i)=>({x:state.liveCorners[i].x*(1-a)+p.x*a,y:state.liveCorners[i].y*(1-a)+p.y*a}));
  }

  function normalizedCornerMotion(a,b,w,h){
    if(!a||!b)return 1;
    let sum=0;for(let i=0;i<4;i++)sum+=Math.hypot((a[i].x-b[i].x)/w,(a[i].y-b[i].y)/h);
    return sum/4;
  }

  function detectLiveFrame(video){
    const max=520,scale=Math.min(1,max/Math.max(video.videoWidth,video.videoHeight));
    const c=makeCanvas(video.videoWidth*scale,video.videoHeight*scale),ctx=c.getContext('2d',{alpha:false,willReadFrequently:true});
    ctx.drawImage(video,0,0,c.width,c.height);
    const r=detectDocumentCorners(c);
    const confident=r.confidence>=.42;
    if(confident){
      const mapped=r.corners.map(p=>({x:p.x/scale,y:p.y/scale}));
      const motion=normalizedCornerMotion(state.liveLastCorners,mapped,video.videoWidth,video.videoHeight);
      state.liveStableCount=motion<.018?Math.min(8,state.liveStableCount+1):Math.max(0,state.liveStableCount-1);
      state.liveCorners=smoothLiveCorners(mapped);
      state.liveLastCorners=mapped;
      state.liveConfidence=r.confidence;
      state.liveSourceSize={w:video.videoWidth,h:video.videoHeight};
    }else{
      state.liveConfidence=r.confidence;
      state.liveStableCount=Math.max(0,state.liveStableCount-1);
      if(state.liveStableCount===0){state.liveCorners=null;state.liveLastCorners=null;state.liveSourceSize=null;}
    }
    drawLiveOverlay(video);
  }

  function drawLiveOverlay(video){
    const overlay=$('sdsLiveOverlay'),view=$('sdsCameraView');if(!overlay||!view)return;
    const rect=view.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.max(1,Math.round(rect.width*dpr)),ch=Math.max(1,Math.round(rect.height*dpr));
    if(overlay.width!==cw||overlay.height!==ch){overlay.width=cw;overlay.height=ch;}
    const ctx=overlay.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
    const st=$('sdsLiveStatus');
    if(!state.liveCorners || !state.liveSourceSize){
      if(st){st.textContent='ĐANG TÌM 4 GÓC TỜ GIẤY…';st.classList.remove('ok');st.classList.add('search');}
      return;
    }
    const vw=state.liveSourceSize.w,vh=state.liveSourceSize.h,fit=Math.min(rect.width/vw,rect.height/vh),dx=(rect.width-vw*fit)/2,dy=(rect.height-vh*fit)/2;
    const pts=state.liveCorners.map(p=>({x:dx+p.x*fit,y:dy+p.y*fit}));
    const stable=state.liveStableCount>=2 && state.liveConfidence>=.50;
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=stable?4:3;ctx.strokeStyle=stable?'#32f28a':'#45d7ff';ctx.fillStyle=stable?'rgba(42,225,125,.10)':'rgba(32,190,255,.08)';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=4;
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;for(const p of pts){ctx.beginPath();ctx.arc(p.x,p.y,stable?7:6,0,Math.PI*2);ctx.fillStyle=stable?'#32f28a':'#45d7ff';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();}
    ctx.restore();
    if(st){st.textContent=stable?'✓ ĐÃ NHẬN 4 GÓC · CÓ THỂ CHỤP':'GIỮ MÁY ỔN ĐỊNH · ĐANG BÁM MÉP GIẤY';st.classList.toggle('ok',stable);st.classList.toggle('search',!stable);}
  }

  function qualityMessage(canvas,confidence){
    try{
      const max=220,scale=Math.min(1,max/Math.max(canvas.width,canvas.height)),c=makeCanvas(canvas.width*scale,canvas.height*scale),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(canvas,0,0,c.width,c.height);
      const d=x.getImageData(0,0,c.width,c.height).data;let white=0,dark=0,grad=0,count=0;
      let prev=0;
      for(let i=0;i<d.length;i+=16){const y=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(y>246)white++;if(y<38)dark++;if(count)grad+=Math.abs(y-prev);prev=y;count++;}
      const w=white/Math.max(1,count),dk=dark/Math.max(1,count),g=grad/Math.max(1,count-1);
      if(g<5.0)return '⚠ Ảnh có thể hơi mờ. Nếu chữ khó đọc, hãy CHỤP LẠI.';
      if(w>.48)return '⚠ Ảnh khá chói/sáng. Tránh phản chiếu đèn lên giấy.';
      if(dk>.52)return '⚠ Ảnh khá tối. Có thể bật ĐÈN và chụp lại.';
      return confidence>.66?'Đã tự nhận mép giấy. Kiểm tra 4 góc rồi LƯU TRANG.':'Mép giấy chưa chắc chắn. Kéo 4 chấm xanh vào đúng góc giấy.';
    }catch(_){return 'Kiểm tra 4 góc rồi LƯU TRANG.';}
  }

  function otsuThreshold(gray){
    const hist=new Uint32Array(256);for(let i=0;i<gray.length;i++)hist[gray[i]]++;
    const total=gray.length;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
    let sumB=0,wB=0,maxVar=-1,thr=160;
    for(let t=0;t<256;t++){
      wB+=hist[t];if(!wB)continue;const wF=total-wB;if(!wF)break;sumB+=t*hist[t];
      const mB=sumB/wB,mF=(sum-sumB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>maxVar){maxVar=v;thr=t;}
    }
    return thr;
  }

  function quadArea(p){
    let a=0;for(let i=0;i<4;i++){const q=p[(i+1)%4];a+=p[i].x*q.y-q.x*p[i].y;}return Math.abs(a)/2;
  }

  function defaultCorners(w,h){
    const mx=w*.055,my=h*.055;return [{x:mx,y:my},{x:w-mx,y:my},{x:w-mx,y:h-my},{x:mx,y:h-my}];
  }

  function detectDocumentCorners(canvas){
    const max=360,sc=Math.min(1,max/Math.max(canvas.width,canvas.height)),w=Math.max(80,Math.round(canvas.width*sc)),h=Math.max(80,Math.round(canvas.height*sc));
    const c=makeCanvas(w,h),ctx=c.getContext('2d',{willReadFrequently:true,alpha:false});ctx.drawImage(canvas,0,0,w,h);
    const rgba=ctx.getImageData(0,0,w,h).data,gray=new Uint8Array(w*h);
    for(let i=0,j=0;i<rgba.length;i+=4,j++)gray[j]=Math.round(.299*rgba[i]+.587*rgba[i+1]+.114*rgba[i+2]);
    const otsu=otsuThreshold(gray),thr=clamp(otsu+6,112,218),bin=new Uint8Array(w*h);
    for(let i=0;i<gray.length;i++)bin[i]=gray[i]>=thr?1:0;
    const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best=null;
    const cx=w/2,cy=h/2;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const start=y*w+x;if(!bin[start]||seen[start])continue;
      let qh=0,qt=0;queue[qt++]=start;seen[start]=1;let n=0,sumX=0,sumY=0,touch=0;
      let tl=null,tr=null,br=null,bl=null;
      while(qh<qt){const idx=queue[qh++],yy=(idx/w)|0,xx=idx-yy*w;n++;sumX+=xx;sumY+=yy;
        if(xx<=2||yy<=2||xx>=w-3||yy>=h-3)touch++;
        const sp=xx+yy,sm=xx-yy;
        if(!tl||sp<tl.v)tl={v:sp,x:xx,y:yy};if(!br||sp>br.v)br={v:sp,x:xx,y:yy};if(!tr||sm>tr.v)tr={v:sm,x:xx,y:yy};if(!bl||sm<bl.v)bl={v:sm,x:xx,y:yy};
        const nbs=[idx-1,idx+1,idx-w,idx+w];for(let k=0;k<4;k++){const z=nbs[k];if(z>0&&z<bin.length&&bin[z]&&!seen[z]){seen[z]=1;queue[qt++]=z;}}
      }
      if(n<w*h*.025)continue;
      const mx=sumX/n,my=sumY/n,centerDist=Math.hypot((mx-cx)/w,(my-cy)/h),touchRatio=touch/Math.max(1,n),areaRatio=n/(w*h);
      let score=n*(1.25-clamp(centerDist,0,.7));if(touchRatio>.04)score*=.45;if(areaRatio>.92)score*=.25;
      if(!best||score>best.score)best={score,n,tl,tr,br,bl,areaRatio,touchRatio};
    }
    if(!best)return {corners:defaultCorners(canvas.width,canvas.height),confidence:.15};
    const small=[best.tl,best.tr,best.br,best.bl].map(z=>({x:z.x/sc,y:z.y/sc}));
    const area=quadArea(small)/(canvas.width*canvas.height);
    const lens=[dist(small[0],small[1]),dist(small[1],small[2]),dist(small[2],small[3]),dist(small[3],small[0])];
    const valid=area>.12&&area<.98&&Math.min(...lens)>Math.min(canvas.width,canvas.height)*.18;
    if(!valid)return {corners:defaultCorners(canvas.width,canvas.height),confidence:.2};
    const conf=clamp(.42 + area*.45 - best.touchRatio*1.8, .25, .92);
    return {corners:small.map(p=>({x:clamp(p.x,0,canvas.width-1),y:clamp(p.y,0,canvas.height-1)})),confidence:conf};
  }

  function autoEdge(){
    if(!state.captureCanvas)return;
    setBusy(true,'Đang nhận lại mép giấy…');
    setTimeout(()=>{
      try{const r=detectDocumentCorners(state.captureCanvas);state.corners=r.corners;$('sdsCropMsg').textContent=r.confidence>.6?'Đã nhận lại mép giấy. Kiểm tra 4 góc.':'Chưa nhận chắc chắn; hãy kéo 4 chấm vào đúng góc.';drawCropEditor();}
      finally{setBusy(false);}
    },30);
  }

  function drawCropEditor(){
    const src=state.captureCanvas,c=$('sdsCropCanvas');if(!src||!c)return;
    const max=1400,scale=Math.min(1,max/Math.max(src.width,src.height));c.width=Math.max(1,Math.round(src.width*scale));c.height=Math.max(1,Math.round(src.height*scale));
    const ctx=c.getContext('2d',{alpha:false});ctx.drawImage(src,0,0,c.width,c.height);
    const pts=state.corners.map(p=>({x:p.x*scale,y:p.y*scale}));
    ctx.save();ctx.lineWidth=Math.max(3,c.width/350);ctx.strokeStyle='#42d7ff';ctx.fillStyle='rgba(20,167,235,.14)';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fill();ctx.stroke();
    const r=Math.max(11,c.width/55);for(const p of pts){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle='#21c7ff';ctx.fill();ctx.lineWidth=Math.max(3,r*.22);ctx.strokeStyle='#fff';ctx.stroke();}
    ctx.restore();
  }

  function cropPointer(e){
    const c=$('sdsCropCanvas');if(!c||!state.captureCanvas||!state.corners)return null;
    const rect=c.getBoundingClientRect();if(!rect.width||!rect.height)return null;
    return {x:(e.clientX-rect.left)*c.width/rect.width,y:(e.clientY-rect.top)*c.height/rect.height,displayScale:c.width/state.captureCanvas.width};
  }

  function onCropDown(e){
    if(state.mode!=='crop'||state.busy)return;const q=cropPointer(e);if(!q)return;
    const pts=state.corners.map(p=>({x:p.x*q.displayScale,y:p.y*q.displayScale}));let best=-1,bd=Infinity;pts.forEach((p,i)=>{const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<bd){bd=d;best=i;}});
    const cssRadius=52*window.devicePixelRatio; if(bd>Math.max(42,q.displayScale*cssRadius))return;
    state.activeCorner=best;try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){ }e.preventDefault();
  }
  function onCropMove(e){
    if(state.activeCorner<0||state.mode!=='crop')return;const q=cropPointer(e);if(!q)return;
    state.corners[state.activeCorner]={x:clamp(q.x/q.displayScale,0,state.captureCanvas.width-1),y:clamp(q.y/q.displayScale,0,state.captureCanvas.height-1)};drawCropEditor();e.preventDefault();
  }
  function onCropUp(e){state.activeCorner=-1;try{e.currentTarget.releasePointerCapture(e.pointerId);}catch(_){ }}

  function rotateCapture(){
    const src=state.captureCanvas;if(!src)return;
    const dst=makeCanvas(src.height,src.width),ctx=dst.getContext('2d',{alpha:false});ctx.translate(dst.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(src,0,0);
    const oldH=src.height;state.corners=state.corners.map(p=>({x:oldH-p.y,y:p.x}));state.captureCanvas=dst;drawCropEditor();
  }

  function solveLinear(A,b){
    const n=b.length;for(let i=0;i<n;i++){
      let max=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[max][i]))max=r;
      if(Math.abs(A[max][i])<1e-10)throw new Error('Không tính được phối cảnh.');
      [A[i],A[max]]=[A[max],A[i]];[b[i],b[max]]=[b[max],b[i]];
      const d=A[i][i];for(let j=i;j<n;j++)A[i][j]/=d;b[i]/=d;
      for(let r=0;r<n;r++){if(r===i)continue;const f=A[r][i];if(!f)continue;for(let j=i;j<n;j++)A[r][j]-=f*A[i][j];b[r]-=f*b[i];}
    }return b;
  }

  function homography(from,to){
    const A=[],b=[];for(let i=0;i<4;i++){
      const x=from[i].x,y=from[i].y,u=to[i].x,v=to[i].y;
      A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);
      A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);
    }return solveLinear(A,b);
  }

  function perspectiveCrop(src,pts){
    const top=dist(pts[0],pts[1]),bottom=dist(pts[3],pts[2]),left=dist(pts[0],pts[3]),right=dist(pts[1],pts[2]);
    let w=Math.max(top,bottom),h=Math.max(left,right);const cap=Math.min(1,MAX_SCAN_DIM/Math.max(w,h));w=Math.max(360,Math.round(w*cap));h=Math.max(480,Math.round(h*cap));
    if(w>h*1.8 || h>w*3.2){const ratio=w/h;if(ratio>1.8)h=Math.round(w/1.414);else if(1/ratio>3.2)w=Math.round(h/1.414);}
    const dst=makeCanvas(w,h),sctx=src.getContext('2d',{willReadFrequently:true}),dctx=dst.getContext('2d',{alpha:false});
    const s=sctx.getImageData(0,0,src.width,src.height),out=dctx.createImageData(w,h),sd=s.data,od=out.data;
    const from=[{x:0,y:0},{x:w-1,y:0},{x:w-1,y:h-1},{x:0,y:h-1}],H=homography(from,pts);
    let p=0;for(let y=0;y<h;y++){
      for(let x=0;x<w;x++,p+=4){const den=H[6]*x+H[7]*y+1;let sx=(H[0]*x+H[1]*y+H[2])/den,sy=(H[3]*x+H[4]*y+H[5])/den;sx=clamp(sx,0,src.width-1);sy=clamp(sy,0,src.height-1);
        const x0=sx|0,y0=sy|0,x1=Math.min(x0+1,src.width-1),y1=Math.min(y0+1,src.height-1),fx=sx-x0,fy=sy-y0;
        const i00=(y0*src.width+x0)*4,i10=(y0*src.width+x1)*4,i01=(y1*src.width+x0)*4,i11=(y1*src.width+x1)*4;
        for(let c=0;c<3;c++){const a=sd[i00+c]*(1-fx)+sd[i10+c]*fx,bv=sd[i01+c]*(1-fx)+sd[i11+c]*fx;od[p+c]=a*(1-fy)+bv*fy;}od[p+3]=255;
      }
    }dctx.putImageData(out,0,0);return dst;
  }

  async function savePage(){
    if(state.busy||!state.captureCanvas||!state.corners)return;
    if(state.pages.length>=MAX_PAGES){toast(`Tối đa ${MAX_PAGES} trang.`);return;}
    setBusy(true,'Đang cắt và chỉnh phối cảnh…');await sleep(35);
    try{
      const cropped=perspectiveCrop(state.captureCanvas,state.corners);
      state.pages.push({base:cropped,filter:DEFAULT_FILTER,rotation:0});state.captureCanvas=null;state.corners=null;updateCounts();
      if(state.pages.length>=MAX_PAGES){setMode('review');state.selected=state.pages.length-1;renderReview();}
      else{setMode('camera');try{await $('sdsVideo').play();}catch(_){ }toast(`Đã lưu trang ${state.pages.length}. Chụp trang tiếp theo.`);}
    }catch(e){console.error('[Scanner perspective]',e);toast('Không cắt được trang này. Hãy chỉnh lại 4 góc.');}
    finally{setBusy(false);}
  }

  function retake(){state.captureCanvas=null;state.corners=null;setMode('camera');try{$('sdsVideo').play();}catch(_){ }}

  function rotateBaseCanvas(src,rotation){
    const r=((rotation%360)+360)%360;if(!r)return src;
    const swap=r===90||r===270,dst=makeCanvas(swap?src.height:src.width,swap?src.width:src.height),ctx=dst.getContext('2d',{alpha:false});ctx.translate(dst.width/2,dst.height/2);ctx.rotate(r*Math.PI/180);ctx.drawImage(src,-src.width/2,-src.height/2);return dst;
  }

  function filteredCanvas(page,maxDim=Infinity){
    let src=rotateBaseCanvas(page.base,page.rotation||0);let scale=Math.min(1,maxDim/Math.max(src.width,src.height)),dst=makeCanvas(src.width*scale,src.height*scale),ctx=dst.getContext('2d',{alpha:false,willReadFrequently:true});ctx.drawImage(src,0,0,dst.width,dst.height);
    const mode=page.filter||'original';if(mode==='original')return dst;
    const im=ctx.getImageData(0,0,dst.width,dst.height),d=im.data;
    let bwThr=165;
    if(mode==='bw'){
      const sample=new Uint8Array(Math.ceil(d.length/16));let k=0;for(let i=0;i<d.length;i+=16)sample[k++]=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);bwThr=clamp(otsuThreshold(sample)-5,120,205);
    }
    for(let i=0;i<d.length;i+=4){let r=d[i],g=d[i+1],b=d[i+2];
      if(mode==='clear'){
        const lift=v=>clamp((v-128)*1.19+136,0,255);r=lift(r);g=lift(g);b=lift(b);
      }else{
        let y=.299*r+.587*g+.114*b;y=clamp((y-128)*1.16+136,0,255);if(mode==='bw')y=y>=bwThr?255:0;r=g=b=y;
      }
      d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
    }ctx.putImageData(im,0,0);return dst;
  }

  function renderReview(){
    if(!state.pages.length){setMode('camera');return;}
    state.selected=clamp(state.selected,0,state.pages.length-1);setMode('review');
    const page=state.pages[state.selected],preview=filteredCanvas(page,PREVIEW_DIM),c=$('sdsReviewCanvas');c.width=preview.width;c.height=preview.height;c.getContext('2d',{alpha:false}).drawImage(preview,0,0);
    document.querySelectorAll('#sdsFilterTools [data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===page.filter));
    const box=$('sdsThumbs');box.innerHTML='';state.pages.forEach((p,i)=>{const btn=document.createElement('button');btn.className='sds-thumb'+(i===state.selected?' active':'');btn.type='button';const tc=document.createElement('canvas'),th=filteredCanvas(p,THUMB_DIM);tc.width=th.width;tc.height=th.height;tc.getContext('2d',{alpha:false}).drawImage(th,0,0);const n=document.createElement('span');n.textContent=String(i+1);btn.append(tc,n);btn.addEventListener('click',()=>{state.selected=i;renderReview();});box.appendChild(btn);});
    updateCounts();
  }

  function setFilter(mode){if(!state.pages.length)return;state.pages[state.selected].filter=mode;renderReview();}
  function rotatePage(){if(!state.pages.length)return;state.pages[state.selected].rotation=((state.pages[state.selected].rotation||0)+90)%360;renderReview();}
  function movePage(dir){const i=state.selected,j=i+dir;if(j<0||j>=state.pages.length)return;[state.pages[i],state.pages[j]]=[state.pages[j],state.pages[i]];state.selected=j;renderReview();}
  function deletePage(){if(!state.pages.length)return;state.pages.splice(state.selected,1);state.selected=Math.min(state.selected,state.pages.length-1);if(!state.pages.length){setMode('camera');$('sdsVideo').play().catch(()=>{});}else renderReview();updateCounts();}
  function addPage(){if(state.pages.length>=MAX_PAGES){toast(`Đã đủ ${MAX_PAGES} trang.`);return;}setMode('camera');$('sdsVideo').play().catch(()=>{});}

  async function exportFiles(){
    if(state.busy||!state.pages.length)return;
    setBusy(true,`Đang chuẩn bị ${state.pages.length} trang…`);await sleep(35);
    try{
      const stamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14),files=[];
      for(let i=0;i<state.pages.length;i++){
        $('sdsBusyText').textContent=`Đang tạo trang ${i+1}/${state.pages.length}…`;await sleep(10);
        let c=filteredCanvas(state.pages[i],MAX_SCAN_DIM),blob=await canvasToBlob(c,'image/jpeg',.88);
        if(blob.size>2_400_000){blob=await canvasToBlob(c,'image/jpeg',.76);}
        if(blob.size>3_400_000 && Math.max(c.width,c.height)>1800){const sc=1800/Math.max(c.width,c.height),small=makeCanvas(c.width*sc,c.height*sc);small.getContext('2d',{alpha:false}).drawImage(c,0,0,small.width,small.height);c=small;blob=await canvasToBlob(c,'image/jpeg',.76);}
        files.push(new File([blob],`SCAN_${stamp}_${String(i+1).padStart(2,'0')}.jpg`,{type:'image/jpeg',lastModified:Date.now()}));
      }
      $('sdsBusyText').textContent='Đang đưa tài liệu vào biểu mẫu…';
      if(typeof ingestAttachmentFiles==='function'){
        await ingestAttachmentFiles(files);
      }else{
        const input=document.getElementById('attachmentInput');if(!input)throw new Error('Không tìm thấy vùng đính kèm của E‑Report/SAGS.');
        const dt=new DataTransfer();files.forEach(f=>dt.items.add(f));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
      }
      const n=files.length;stopCamera();state.pages.length=0;state.captureCanvas=null;state.corners=null;state.selected=0;state.root.classList.remove('sds-open');state.root.setAttribute('aria-hidden','true');document.documentElement.style.overflow='';document.body.style.overflow='';
      setMode('camera');
      setTimeout(()=>{try{alert(`Đã quét và đính kèm ${n} trang.`);}catch(_){ }},80);
    }catch(e){console.error('[Scanner export]',e);toast('Không đính kèm được tài liệu: '+(e?.message||e),5000);}
    finally{setBusy(false);}
  }

  function bindUI(){
    $('sdsClose').addEventListener('click',()=>close(false));$('sdsTorch').addEventListener('click',toggleTorch);$('sdsSwitch').addEventListener('click',switchCamera);$('sdsShutter').addEventListener('click',capture);$('sdsDone').addEventListener('click',()=>renderReview());
    $('sdsHelp').addEventListener('click',()=>$('sdsHelpPanel').classList.add('show'));$('sdsHelpClose').addEventListener('click',()=>$('sdsHelpPanel').classList.remove('show'));$('sdsHelpPanel').addEventListener('click',e=>{if(e.target===$('sdsHelpPanel'))$('sdsHelpPanel').classList.remove('show');});
    $('sdsRetake').addEventListener('click',retake);$('sdsAutoEdge').addEventListener('click',autoEdge);$('sdsRotateCapture').addEventListener('click',rotateCapture);$('sdsSavePage').addEventListener('click',savePage);
    const cc=$('sdsCropCanvas');cc.addEventListener('pointerdown',onCropDown);cc.addEventListener('pointermove',onCropMove);cc.addEventListener('pointerup',onCropUp);cc.addEventListener('pointercancel',onCropUp);
    $('sdsFilterTools').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b)setFilter(b.dataset.filter);});$('sdsRotatePage').addEventListener('click',rotatePage);$('sdsMoveLeft').addEventListener('click',()=>movePage(-1));$('sdsMoveRight').addEventListener('click',()=>movePage(1));$('sdsDeletePage').addEventListener('click',deletePage);$('sdsAddPage').addEventListener('click',addPage);$('sdsAttach').addEventListener('click',exportFiles);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.root?.classList.contains('sds-open')&&state.mode==='camera'){stopLiveDetection();try{$('sdsVideo').pause();}catch(_){ }}else if(!document.hidden&&state.mode==='camera'&&state.stream){$('sdsVideo').play().then(()=>startLiveDetection()).catch(()=>{});}});
    window.addEventListener('resize',()=>{if(state.mode==='camera')drawLiveOverlay($('sdsVideo'));},{passive:true});
  }

  function installSourceButton(){
    const modal=document.getElementById('attachmentSourceModal'),box=modal?.querySelector('.attachmentSourceBox');if(!box||document.getElementById('sagsScannerSourceBtn'))return false;
    const btn=document.createElement('button');btn.id='sagsScannerSourceBtn';btn.type='button';btn.textContent='📄 QUÉT TÀI LIỆU (NHIỀU TRANG)';btn.style.cssText='background:#0b5cab;color:#fff;font-weight:900';
    btn.addEventListener('click',()=>{try{if(typeof closeAttachmentSourceModal==='function')closeAttachmentSourceModal();else modal.style.display='none';}catch(_){modal.style.display='none';}open();});
    const cancel=box.querySelector('.cancel');box.insertBefore(btn,cancel||null);return true;
  }

  function boot(){
    buildUI();installSourceButton();
    const observer=new MutationObserver(()=>{installSourceButton();});observer.observe(document.documentElement,{childList:true,subtree:true});
    window.dispatchEvent(new CustomEvent('sags:document-scanner-ready',{detail:{build:BUILD}}));
  }

  window.SAGSDocumentScanner={build:BUILD,open,close:()=>close(false),get pageCount(){return state.pages.length;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
