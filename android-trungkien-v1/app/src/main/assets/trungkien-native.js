(function(){
  if(window.__TRUNGKIEN_NATIVE_V1__) return;
  window.__TRUNGKIEN_NATIVE_V1__ = true;
  window.TrungKien = Object.freeze({shell:"TrungKiên V1", version:"V1", native:true});

  function safeCall(name){
    try{
      var a=[].slice.call(arguments,1);
      if(window.AndroidUpdater && typeof AndroidUpdater[name]==='function') return AndroidUpdater[name].apply(AndroidUpdater,a);
    }catch(e){}
  }

  // The APK has its own atomic bundle updater. Disable the web Service Worker
  // only inside the Android shell to avoid two independent update engines.
  try{
    if(navigator.serviceWorker){
      navigator.serviceWorker.getRegistrations().then(function(rs){
        rs.forEach(function(r){ try{r.unregister();}catch(e){} });
      }).catch(function(){});
      try{
        navigator.serviceWorker.register=function(){
          return Promise.reject(new Error("Managed by TrungKiên V1 native updater"));
        };
      }catch(e){}
    }
  }catch(e){}

  function ensureUpdateUi(){
    if(document.getElementById('tkNativeUpdateOverlay')) return;
    var s=document.createElement('style');
    s.id='tkNativeUpdateStyle';
    s.textContent=[
      '#tkNativeUpdateOverlay{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.62);font-family:Arial,sans-serif}',
      '#tkNativeUpdateOverlay.show{display:flex}',
      '#tkNativeUpdateCard{width:min(92vw,430px);background:#fff;color:#17324d;border-radius:20px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.45)}',
      '#tkNativeUpdateTitle{font-size:20px;font-weight:900;color:#0d4f91;margin-bottom:8px}',
      '#tkNativeUpdateText{font-size:13px;line-height:1.5;color:#4c6074;white-space:pre-line}',
      '#tkNativeUpdateProgress{height:8px;margin:14px 0 7px;background:#e7edf3;border-radius:8px;overflow:hidden;display:none}',
      '#tkNativeUpdateBar{height:100%;width:0;background:#168b4d;border-radius:8px;transition:width .2s ease}',
      '#tkNativeUpdateStatus{min-height:17px;font-size:11px;font-weight:800;color:#71869a;margin-bottom:10px}',
      '#tkNativeUpdateActions{display:grid;grid-template-columns:1fr 1fr;gap:9px}',
      '#tkNativeUpdateActions button{border:0;border-radius:11px;padding:13px 10px;font-weight:900;font-size:13px}',
      '#tkNativeUpdateLater{background:#eef2f6;color:#506174}',
      '#tkNativeUpdateNow{background:#e7f7ed;color:#176b3b}'
    ].join('');
    document.head.appendChild(s);
    var o=document.createElement('div');
    o.id='tkNativeUpdateOverlay';
    o.innerHTML='<div id="tkNativeUpdateCard">'+
      '<div id="tkNativeUpdateTitle">CÓ BẢN CẬP NHẬT MỚI</div>'+
      '<div id="tkNativeUpdateText"></div>'+
      '<div id="tkNativeUpdateProgress"><div id="tkNativeUpdateBar"></div></div>'+
      '<div id="tkNativeUpdateStatus"></div>'+
      '<div id="tkNativeUpdateActions">'+
        '<button id="tkNativeUpdateLater" type="button">ĐỂ SAU</button>'+
        '<button id="tkNativeUpdateNow" type="button">CẬP NHẬT</button>'+
      '</div></div>';
    document.body.appendChild(o);
    document.getElementById('tkNativeUpdateLater').onclick=function(){
      o.classList.remove('show');
    };
    document.getElementById('tkNativeUpdateNow').onclick=function(){
      var b=this;
      b.disabled=true;
      document.getElementById('tkNativeUpdateLater').disabled=true;
      document.getElementById('tkNativeUpdateProgress').style.display='block';
      document.getElementById('tkNativeUpdateStatus').textContent='Đang chuẩn bị cập nhật…';
      safeCall('installUpdate');
    };
  }

  window.__tkShowUpdate=function(version,notes){
    ensureUpdateUi();
    document.getElementById('tkNativeUpdateTitle').textContent='CÓ '+String(version||'BẢN MỚI')+' MỚI';
    document.getElementById('tkNativeUpdateText').textContent=String(notes||'Có bản E‑REPORT mới. Ứng dụng chỉ chuyển phiên bản sau khi bạn bấm CẬP NHẬT.');
    document.getElementById('tkNativeUpdateStatus').textContent='Không tự tải lại khi bạn đang thao tác.';
    document.getElementById('tkNativeUpdateBar').style.width='0%';
    document.getElementById('tkNativeUpdateProgress').style.display='none';
    document.getElementById('tkNativeUpdateNow').disabled=false;
    document.getElementById('tkNativeUpdateLater').disabled=false;
    document.getElementById('tkNativeUpdateOverlay').classList.add('show');
  };

  window.__tkUpdateProgress=function(percent,message){
    ensureUpdateUi();
    document.getElementById('tkNativeUpdateProgress').style.display='block';
    document.getElementById('tkNativeUpdateBar').style.width=Math.max(0,Math.min(100,Number(percent)||0))+'%';
    document.getElementById('tkNativeUpdateStatus').textContent=String(message||'Đang cập nhật…');
  };

  window.__tkUpdateError=function(message){
    ensureUpdateUi();
    document.getElementById('tkNativeUpdateStatus').textContent='Cập nhật chưa hoàn tất: '+String(message||'Lỗi không xác định');
    document.getElementById('tkNativeUpdateNow').disabled=false;
    document.getElementById('tkNativeUpdateLater').disabled=false;
  };

  window.__tkUpdateDone=function(){
    ensureUpdateUi();
    document.getElementById('tkNativeUpdateBar').style.width='100%';
    document.getElementById('tkNativeUpdateStatus').textContent='Đã tải xong. Đang chuyển sang phiên bản mới…';
  };

  // Native save/share bridge for PDF generated as Blob/File.
  function blobToDataUrl(blob){
    return new Promise(function(resolve,reject){
      var r=new FileReader();
      r.onload=function(){resolve(String(r.result||''));};
      r.onerror=function(){reject(r.error||new Error('FileReader error'));};
      r.readAsDataURL(blob);
    });
  }

  try{
    var anchorClick=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){
      var self=this;
      try{
        if(self.download && typeof self.href==='string' && self.href.indexOf('blob:')===0 && window.AndroidFiles){
          fetch(self.href).then(function(r){return r.blob();}).then(blobToDataUrl).then(function(dataUrl){
            AndroidFiles.saveDataUrl(String(self.download||'E-REPORT.pdf'),dataUrl);
          }).catch(function(){anchorClick.call(self);});
          return;
        }
      }catch(e){}
      return anchorClick.call(self);
    };
  }catch(e){}

  try{
    var nativeShare=async function(data){
      if(data && data.files && data.files.length && window.AndroidFiles){
        var f=data.files[0];
        var url=await blobToDataUrl(f);
        AndroidFiles.shareDataUrl(String(f.name||'E-REPORT.pdf'),url,String(f.type||'application/octet-stream'));
        return;
      }
      throw new DOMException('Native share only supports files','NotSupportedError');
    };
    try{Object.defineProperty(navigator,'share',{configurable:true,value:nativeShare});}catch(e){navigator.share=nativeShare;}
    var canShare=function(data){return !!(data&&data.files&&data.files.length);};
    try{Object.defineProperty(navigator,'canShare',{configurable:true,value:canShare});}catch(e){navigator.canShare=canShare;}
  }catch(e){}

  window.__tkHandleBack=function(){
    try{
      var update=document.getElementById('tkNativeUpdateOverlay');
      if(update&&update.classList.contains('show')){
        update.classList.remove('show'); return true;
      }
      var selectors=[
        '#v228QuickModal.show',
        '#flightWorkspaceCockpit.show',
        '.modal.show',
        '.dialog.show',
        '[role="dialog"]:not([hidden])'
      ];
      for(var i=0;i<selectors.length;i++){
        var el=document.querySelector(selectors[i]);
        if(!el) continue;
        var btn=el.querySelector('[data-close],.close,.btn-close,button[aria-label*="đóng" i],button[aria-label*="close" i]');
        if(btn){btn.click();return true;}
      }
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
    }catch(e){}
    return false;
  };

  function ready(){
    ensureUpdateUi();
    safeCall('ready', (window.APP_BUILD_VERSION||window.__SAGS_V228_QUICKTIME||window.__SAGS_V227_SIGNATURE_STORAGE||''));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
  else setTimeout(ready,0);
})();