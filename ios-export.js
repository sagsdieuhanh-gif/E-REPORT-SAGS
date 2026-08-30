/* E-REPORT/SAGS V1.1.94 · iOS direct signature-to-PDF fix
   Scope: iPhone/iPad Safari/WebKit only.
   Root cause fixed here: V1.1.92/93 decoded an already-visible data-URL signature through
   Blob URL -> offscreen transparent canvas -> PNG -> Image. Safari can occasionally return
   blank pixels from that intermediate canvas although the same signature is visible in the UI.
   V1.1.94 draws the original signature Image directly onto the final compact PDF page canvas
   and verifies pixels on that FINAL page. A compact-canvas fallback is used only if direct draw
   does not change the page. Never reject a visible signature based on an intermediate canvas. */
(function(root){
  'use strict';
  if(root.__SAGS_V1194_IOS_SIGNATURE_DIRECT_FIX)return;
  root.__SAGS_V1194_IOS_SIGNATURE_DIRECT_FIX=true;

  function isIOS(){
    try{
      const ua=String(navigator.userAgent||'');
      const platform=String(navigator.platform||'');
      return /iPad|iPhone|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1);
    }catch(_){return false;}
  }
  if(!isIOS())return;

  const NS='http://www.w3.org/2000/svg';
  const LONG_SIDE=1100;
  const signatureImageCache=new Map();
  let exporting=false;

  function nextPaint(ms=16){return new Promise(r=>requestAnimationFrame(()=>setTimeout(r,ms)));}
  function compactDims(w,h){
    w=Math.max(1,Number(w)||1);h=Math.max(1,Number(h)||1);
    const long=Math.max(w,h);if(long<=LONG_SIDE)return {w:Math.round(w),h:Math.round(h),scale:1};
    const scale=LONG_SIDE/long;return {w:Math.max(1,Math.round(w*scale)),h:Math.max(1,Math.round(h*scale)),scale};
  }
  function isQuotaError(e){
    const s=String(e?.name||'')+' '+String(e?.message||e||'');
    return /QuotaExceeded|NS_ERROR_DOM_QUOTA_REACHED|storage quota|quota/i.test(s);
  }

  const basePersist=(typeof persist==='function')?persist:root.persist;
  if(typeof basePersist==='function'){
    const safePersist=function(){
      try{return basePersist.apply(this,arguments);}catch(e){
        if(isQuotaError(e)){
          console.warn('V1.1.94 iOS signature storage quota ignored for export',e);
          root.__SAGS_IOS_SIGNATURE_STORAGE_WARNING=String(e?.message||e||'QuotaExceededError');return false;
        }
        throw e;
      }
    };
    root.persist=safePersist;try{persist=safePersist;}catch(_){ }
  }

  function stripLiveSignatureImages(){
    try{
      for(const f of (typeof fields!=='undefined'?fields:[])){
        if(f?.type!=='signature'||!state?.[f.key])continue;
        const svg=document.getElementById('svg'+Number(f.page));if(!svg)continue;
        for(const el of svg.querySelectorAll('image')){
          const href=String(el.getAttribute('href')||el.getAttributeNS('http://www.w3.org/1999/xlink','href')||'');
          if(href.startsWith('data:image/'))el.remove();
        }
      }
    }catch(e){console.warn('V1.1.94 strip live signature images',e);}
  }

  const baseDraw=(typeof draw==='function')?draw:root.draw;
  if(typeof baseDraw==='function'){
    const patchedDraw=function(){const r=baseDraw.apply(this,arguments);if(exporting)stripLiveSignatureImages();return r;};
    root.draw=patchedDraw;try{draw=patchedDraw;}catch(_){ }
  }

  async function loadSignatureDirect(src,label){
    src=String(src||'').trim();
    if(!src)throw new Error(label+' chưa có dữ liệu chữ ký.');
    let cached=signatureImageCache.get(src);if(cached)return cached;
    const img=new Image();
    img.decoding='sync';
    // Connecting the Image to DOM is intentional: iOS Safari is more reliable at materializing
    // data-URL pixels for a DOM-connected image than for a Blob-backed offscreen image.
    img.alt='';img.setAttribute('aria-hidden','true');
    img.style.cssText='position:fixed;left:-10000px;top:-10000px;width:auto;height:auto;max-width:none;max-height:none;opacity:.001;pointer-events:none;z-index:-1';
    try{document.body?.appendChild(img);}catch(_){ }
    await new Promise((resolve,reject)=>{
      let done=false;
      const ok=()=>{if(done)return;done=true;resolve();};
      const bad=()=>{if(done)return;done=true;reject(new Error('Không đọc được '+label+' trên iOS.'));};
      img.onload=ok;img.onerror=bad;img.src=src;
      try{img.decode?.().then(ok).catch(()=>{});}catch(_){ }
    });
    // Give WebKit two paint boundaries before the image is used by canvas.
    await nextPaint(8);await nextPaint(8);
    const iw=Number(img.naturalWidth||img.width||0),ih=Number(img.naturalHeight||img.height||0);
    if(!(iw>0&&ih>0))throw new Error(label+' không có kích thước ảnh hợp lệ trên iOS.');
    cached={image:img,width:iw,height:ih,src};signatureImageCache.set(src,cached);return cached;
  }

  function releaseSignatureImages(){
    for(const v of signatureImageCache.values()){
      try{v.image.onload=null;v.image.onerror=null;v.image.remove();v.image.src='';}catch(_){ }
    }
    signatureImageCache.clear();
  }
  function snapshotRect(ctx,x,y,w,h){
    const cw=ctx.canvas.width,ch=ctx.canvas.height;
    const ix=Math.max(0,Math.floor(x)),iy=Math.max(0,Math.floor(y));
    const iw=Math.min(cw-ix,Math.max(1,Math.ceil(w))),ih=Math.min(ch-iy,Math.max(1,Math.ceil(h)));
    if(iw<=0||ih<=0)return null;
    try{return {ix,iy,iw,ih,data:ctx.getImageData(ix,iy,iw,ih).data};}catch(_){return null;}
  }
  function pixelsChanged(before,after){
    if(!before||!after||before.length!==after.length)return true;
    let changed=0;
    for(let i=0;i<before.length;i+=4){
      if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]||before[i+3]!==after[i+3]){
        if(++changed>=3)return true;
      }
    }
    return false;
  }
  function targetRectForField(f,sx,sy,imgW,imgH){
    const a=abs(f);
    const padX=Math.min(14,Math.max(6,a.vw*.035)),padY=Math.min(10,Math.max(5,a.vh*.075));
    const safeX=(a.vx+padX)*sx,safeY=(a.vy+padY)*sy;
    const safeW=Math.max(1,(a.vw-padX*2)*sx),safeH=Math.max(1,(a.vh-padY*2)*sy);
    const r=Math.min(safeW/imgW,safeH/imgH),dw=Math.max(1,imgW*r),dh=Math.max(1,imgH*r);
    return {dx:safeX+(safeW-dw)/2,dy:safeY+(safeH-dh)/2,dw,dh};
  }
  async function drawDirectAndVerify(ctx,sig,rect){
    const {dx,dy,dw,dh}=rect;
    const before=snapshotRect(ctx,dx-2,dy-2,dw+4,dh+4);
    const draw=()=>{
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(sig.image,dx,dy,dw,dh);ctx.restore();
    };
    draw();await nextPaint(6);
    let after=snapshotRect(ctx,dx-2,dy-2,dw+4,dh+4);
    if(!before||!after||pixelsChanged(before.data,after.data))return true;
    // Safari fallback #1: redraw after a longer compositor boundary.
    await nextPaint(24);draw();await nextPaint(8);
    after=snapshotRect(ctx,dx-2,dy-2,dw+4,dh+4);
    if(!after||pixelsChanged(before.data,after.data))return true;
    // Safari fallback #2: rasterize the DOM-connected Image to a small opaque-independent canvas,
    // then immediately draw that canvas to the FINAL page. No early "blank signature" rejection.
    let tmp=null;
    try{
      const maxW=Math.min(900,Math.max(64,Math.round(sig.width))),maxH=Math.min(240,Math.max(32,Math.round(sig.height)));
      const rr=Math.min(1,maxW/sig.width,maxH/sig.height);const tw=Math.max(1,Math.round(sig.width*rr)),th=Math.max(1,Math.round(sig.height*rr));
      tmp=document.createElement('canvas');tmp.width=tw;tmp.height=th;
      const tx=tmp.getContext('2d',{alpha:true,willReadFrequently:true});if(!tx)return false;
      tx.clearRect(0,0,tw,th);tx.drawImage(sig.image,0,0,tw,th);
      // One readback flushes the temporary canvas, but its content is not used as a rejection gate.
      try{tx.getImageData(0,0,Math.min(tw,8),Math.min(th,8));}catch(_){ }
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.drawImage(tmp,dx,dy,dw,dh);ctx.restore();await nextPaint(8);
      after=snapshotRect(ctx,dx-2,dy-2,dw+4,dh+4);
      return !after||pixelsChanged(before.data,after.data);
    }finally{try{if(tmp){tmp.width=1;tmp.height=1;}}catch(_){ }}
  }
  async function drawSignaturesVerified(ctx,pageNo,sx,sy){
    const all=(typeof fields!=='undefined'?fields:[]).filter(
      f=>Number(f?.page)===Number(pageNo)&&f?.type==='signature'&&typeof state!=='undefined'&&String(state[f.key]||'').trim()
    );
    let painted=0;
    for(const f of all){
      const key=String(f.key||'');const src=String(state[f.key]||'').trim();
      const sig=await loadSignatureDirect(src,'chữ ký '+key);
      const rect=targetRectForField(f,sx,sy,sig.width,sig.height);
      const ok=await drawDirectAndVerify(ctx,sig,rect);
      if(!ok)throw new Error('Chữ ký '+key+' đang hiển thị trên biểu mẫu nhưng iOS chưa đưa được vào trang PDF. Vui lòng bấm XUẤT lại; nếu còn lỗi hãy chụp thông báo này.');
      painted++;
    }
    ctx.canvas.__sagsExpectedSignatures=all.length;ctx.canvas.__sagsPaintedSignatures=painted;
    if(painted!==all.length)throw new Error('Thiếu chữ ký khi dựng PDF iOS ('+painted+'/'+all.length+').');
    return painted;
  }

  const baseRender=root.renderReportPage;
  if(typeof baseRender==='function'){
    const renderIOS=async function(pageNo){
      const page=document.getElementById('page'+pageNo),svg=document.getElementById('svg'+pageNo);
      if(!page||!svg||typeof abs!=='function'||typeof sanitizeSvgForExport!=='function'||typeof v479LoadSvgOverlay!=='function')return await baseRender.apply(this,arguments);
      const bg=page.querySelector('img');if(!bg)return await baseRender.apply(this,arguments);
      activeKey=null;if(!root.__SAGS_EXPORT_BATCH_DRAWN&&typeof draw==='function')draw();stripLiveSignatureImages();
      const baseW=Number(typeof BASE_W!=='undefined'?BASE_W:1241),baseH=Number(typeof BASE_H!=='undefined'?BASE_H:1755),dims=compactDims(baseW,baseH);
      const canvas=document.createElement('canvas');canvas.width=dims.w;canvas.height=dims.h;canvas.__sagsOriginalWidth=dims.w;canvas.__sagsOriginalHeight=dims.h;
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Không tạo được vùng xuất PDF trên iOS.');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const sx=canvas.width/baseW,sy=canvas.height/baseH;
      await new Promise((resolve,reject)=>{if(bg.complete&&bg.naturalWidth){resolve();return;}const oldLoad=bg.onload,oldErr=bg.onerror;bg.onload=e=>{try{oldLoad?.call(bg,e);}catch(_){}resolve();};bg.onerror=e=>{try{oldErr?.call(bg,e);}catch(_){}reject(new Error('Không tải được nền Trang '+pageNo));};});
      ctx.drawImage(bg,0,0,canvas.width,canvas.height);
      const clone=svg.cloneNode(true);clone.querySelectorAll('.hit,.selected-region,image').forEach(el=>el.remove());sanitizeSvgForExport(clone);
      clone.querySelectorAll('text.value').forEach(t=>{t.setAttribute('font-family','Times New Roman');t.setAttribute('font-weight','700');t.setAttribute('dominant-baseline','middle');if(t.classList.contains('manual-value')||t.classList.contains('time-value'))t.setAttribute('fill',String(typeof ENTRY_COLOR!=='undefined'?ENTRY_COLOR:'#0057b8'));if(t.classList.contains('center'))t.setAttribute('text-anchor','middle');if(t.classList.contains('left'))t.setAttribute('text-anchor','start');});
      clone.querySelectorAll('text.tick').forEach(t=>{t.setAttribute('font-family','Arial');t.setAttribute('font-weight','900');t.setAttribute('fill','#111');t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');});
      clone.setAttribute('xmlns',NS);clone.setAttribute('width',String(baseW));clone.setAttribute('height',String(baseH));
      const style=document.createElementNS(NS,'style'),entryColor=String(typeof ENTRY_COLOR!=='undefined'?ENTRY_COLOR:'#0057b8');style.textContent=`.value{font-family:'Times New Roman',serif;font-weight:700;dominant-baseline:middle}.manual-value,.time-value{fill:${entryColor}}.left{text-anchor:start}.center{text-anchor:middle}.tick{font-family:Arial,sans-serif;font-weight:900;fill:#111;text-anchor:middle;dominant-baseline:middle}`;clone.insertBefore(style,clone.firstChild);
      const xml=new XMLSerializer().serializeToString(clone),overlay=await v479LoadSvgOverlay(xml,'dữ liệu Trang '+pageNo);ctx.drawImage(overlay,0,0,canvas.width,canvas.height);try{overlay.onload=null;overlay.onerror=null;overlay.src='';}catch(_){ }
      await drawSignaturesVerified(ctx,pageNo,sx,sy);
      if(Number(pageNo)===4&&typeof state!=='undefined'&&state.bbbtCxrNo!==undefined&&state.bbbtCxrNo!==null&&state.bbbtCxrNo!==''){
        ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.font=`900 ${Math.max(12,28*sy)}px Times New Roman`;ctx.fillStyle='#b54032';ctx.textAlign='right';ctx.textBaseline='top';const no=typeof formatBBBTCxrNo==='function'?formatBBBTCxrNo(state.bbbtCxrNo):state.bbbtCxrNo;ctx.fillText('CXR No: '+no,(baseW-42)*sx,30*sy);ctx.restore();
      }
      await nextPaint(6);return canvas;
    };
    root.renderReportPage=renderIOS;try{renderReportPage=renderIOS;}catch(_){ }
  }

  function buildPdfFromJpegs(jpegPages,fileName,landscape){
    const objects=[],pageCount=jpegPages.length,catalogId=1,pagesId=2,pageIds=[],imageIds=[],contentIds=[];let nextId=3;
    for(let i=0;i<pageCount;i++){pageIds.push(nextId++);imageIds.push(nextId++);contentIds.push(nextId++);}
    objects[catalogId]=asciiBytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);objects[pagesId]=asciiBytes(`<< /Type /Pages /Count ${pageCount} /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] >>`);
    const PW=landscape?841.89:595.28,PH=landscape?595.28:841.89;
    for(let i=0;i<pageCount;i++){const img=jpegPages[i],pId=pageIds[i],iId=imageIds[i],cId=contentIds[i];objects[pId]=asciiBytes(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im${i+1} ${iId} 0 R >> >> /Contents ${cId} 0 R >>`);objects[iId]=concatBytes([asciiBytes(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`),img.bytes,asciiBytes('\nendstream')]);const content=asciiBytes(`q\n${PW} 0 0 ${PH} 0 0 cm\n/Im${i+1} Do\nQ\n`);objects[cId]=concatBytes([asciiBytes(`<< /Length ${content.length} >>\nstream\n`),content,asciiBytes('endstream')]);}
    const parts=[asciiBytes('%PDF-1.4\n')],offsets=new Array(objects.length).fill(0);let pos=parts[0].length;for(let id=1;id<objects.length;id++){offsets[id]=pos;const h=asciiBytes(`${id} 0 obj\n`),t=asciiBytes('\nendobj\n');parts.push(h,objects[id],t);pos+=h.length+objects[id].length+t.length;}const xrefPos=pos;let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let id=1;id<objects.length;id++)xref+=String(offsets[id]).padStart(10,'0')+' 00000 n \n';xref+=`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;parts.push(asciiBytes(xref));return v479PdfPayload(concatBytes(parts),fileName);
  }
  async function lowMemoryPdf(canvases,fileName,landscape){
    const jpg=[];for(const canvas of canvases){const w=Number(canvas?.__sagsOriginalWidth||canvas?.width||1),h=Number(canvas?.__sagsOriginalHeight||canvas?.height||1);const bytes=await canvasToJpegBytes(canvas,landscape?0.86:0.82);jpg.push({bytes,width:w,height:h});try{canvas.width=1;canvas.height=1;}catch(_){ }await nextPaint(4);}return buildPdfFromJpegs(jpg,fileName,landscape);
  }

  const baseLoading208=root.renderLoading208Page;
  if(typeof baseLoading208==='function'){
    const render208IOS=async function(){
      const page=document.getElementById('page13'),bg=page?.querySelector('img'),svg=document.getElementById('svg13');if(!page||!bg||!svg||typeof abs!=='function'||typeof sanitizeSvgForExport!=='function'||typeof v479LoadSvgOverlay!=='function')return await baseLoading208.apply(this,arguments);
      activeKey=null;if(!root.__SAGS_EXPORT_BATCH_DRAWN&&typeof draw==='function')draw();stripLiveSignatureImages();
      const fw=Number(typeof F208_W!=='undefined'?F208_W:1491),fh=Number(typeof F208_H!=='undefined'?F208_H:1055),bw=Number(typeof BASE_W!=='undefined'?BASE_W:1241),bh=Number(typeof BASE_H!=='undefined'?BASE_H:1755),dims=compactDims(fw,fh);
      const canvas=document.createElement('canvas');canvas.width=dims.w;canvas.height=dims.h;canvas.__sagsOriginalWidth=dims.w;canvas.__sagsOriginalHeight=dims.h;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Không tạo được vùng xuất F/SAG-CXR/208 trên iOS.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const sx=canvas.width/bw,sy=canvas.height/bh;
      await new Promise((resolve,reject)=>{if(bg.complete&&bg.naturalWidth){resolve();return;}const oldLoad=bg.onload,oldErr=bg.onerror;bg.onload=e=>{try{oldLoad?.call(bg,e);}catch(_){}resolve();};bg.onerror=e=>{try{oldErr?.call(bg,e);}catch(_){}reject(new Error('Không tải được nền F/SAG-CXR/208'));};});ctx.drawImage(bg,0,0,canvas.width,canvas.height);
      const clone=svg.cloneNode(true);clone.querySelectorAll('.hit,.selected-region,image').forEach(el=>el.remove());sanitizeSvgForExport(clone);clone.querySelectorAll('text.value').forEach(t=>{t.setAttribute('font-family','Times New Roman');t.setAttribute('font-weight','700');t.setAttribute('dominant-baseline','middle');if(t.classList.contains('manual-value')||t.classList.contains('time-value'))t.setAttribute('fill',String(typeof ENTRY_COLOR!=='undefined'?ENTRY_COLOR:'#0057b8'));if(t.classList.contains('center'))t.setAttribute('text-anchor','middle');if(t.classList.contains('left'))t.setAttribute('text-anchor','start');});clone.querySelectorAll('text.tick').forEach(t=>{t.setAttribute('font-family','Arial');t.setAttribute('font-weight','900');t.setAttribute('fill','#111');t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');});clone.setAttribute('xmlns',NS);clone.setAttribute('width',String(bw));clone.setAttribute('height',String(bh));clone.setAttribute('preserveAspectRatio','none');const xml=new XMLSerializer().serializeToString(clone),overlay=await v479LoadSvgOverlay(xml,'dữ liệu F/SAG-CXR/208');ctx.drawImage(overlay,0,0,canvas.width,canvas.height);try{overlay.onload=null;overlay.onerror=null;overlay.src='';}catch(_){ }await drawSignaturesVerified(ctx,13,sx,sy);await nextPaint(6);return canvas;
    };
    root.renderLoading208Page=render208IOS;try{renderLoading208Page=render208IOS;}catch(_){ }
  }

  if(typeof root.canvasesToPdfFile==='function'){const p=async function(canvases,fileName){return await lowMemoryPdf(canvases,fileName,false);};root.canvasesToPdfFile=p;try{canvasesToPdfFile=p;}catch(_){ }}
  if(typeof root.canvasesToLandscapePdfFile==='function'){const p=async function(canvases,fileName){return await lowMemoryPdf(canvases,fileName,true);};root.canvasesToLandscapePdfFile=p;try{canvasesToLandscapePdfFile=p;}catch(_){ }}

  const baseSend=root.sendReport;
  if(typeof baseSend==='function'){
    const sendIOS=async function(){exporting=true;root.__SAGS_IOS_SIGNATURE_EXPORTING=true;try{try{document.activeElement?.blur?.();}catch(_){ }stripLiveSignatureImages();await nextPaint(28);return await baseSend.apply(this,arguments);}finally{releaseSignatureImages();exporting=false;root.__SAGS_IOS_SIGNATURE_EXPORTING=false;try{if(typeof draw==='function')draw();}catch(_){ }await nextPaint(6);}};
    root.sendReport=sendIOS;try{sendReport=sendIOS;}catch(_){ }
  }
  console.info('E-REPORT/SAGS V1.1.94 iOS direct signature PDF fix active');
})(typeof window!=='undefined'?window:globalThis);
