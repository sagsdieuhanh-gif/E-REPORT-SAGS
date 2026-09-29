/* V4.7.6: passive, local-only, automatic network diagnostics.
 * Runs in <head> BEFORE Firebase scripts. Does not fetch, write Firebase or read form data.
 * Browser HTTP transferSize / SW-confirmed fetched response bytes / WS payload sizes
 * are distinct observations, not the phone's precise 4G accounting.
 */
(function (root) {
  'use strict';
  if (root.SAGSNetworkDiagnostics) return;
  const KEY = 'sags_network_diagnostics_v476';
  const now = () => Date.now();
  const utf8 = new TextEncoder();
  const blank = () => ({http: 0, sw: 0, wsRx: 0, wsTx: 0});
  const positive = n => Number.isFinite(+n) ? Math.max(0, +n) : 0;
  const safeTotals = v => ({http: positive(v?.http), sw: positive(v?.sw), wsRx: positive(v?.wsRx), wsTx: positive(v?.wsTx)});
  const fmt = v => {const n=positive(v);return n<1024?`${Math.round(n)} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;};
  const safeText = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ownHost = root.location?.host || '';
  const hostOf = u => {try {return new URL(u, root.location?.href).host || '(unknown)';} catch (_) {return '(unknown)';}};
  const hostGroup = u => {const h=hostOf(u);if(h===ownHost)return 'GitHub Pages / app';if(/firebaseio\.com|firebasedatabase\.app|firestore\.googleapis\.com/i.test(h))return 'Firebase';if(/googleapis\.com|gstatic\.com/i.test(h))return 'Google / SDK';return h;};
  const bytesOf = value => {try {if(typeof value==='string')return utf8.encode(value).byteLength;if(value instanceof Blob)return value.size;if(value instanceof ArrayBuffer)return value.byteLength;if(ArrayBuffer.isView(value))return value.byteLength;return 0;}catch(_){return 0;}};
  let old=null;try {old=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch(_){}
  let data = old?.schema === 1 ? old : {schema:1, since:now(), pageLoads:0, totals:blank(), hosts:{}, requests:0, opaque:0, cached:0, swResponses:0, wsMessages:0, wsObserved:false, action:null};
  data.totals=safeTotals(data.totals);
  data.hosts=data.hosts&&typeof data.hosts==='object'?data.hosts:{};
  data.pageLoads=positive(data.pageLoads)+1;
  let saveHandle=0, modal=null, isOpen=false;
  function save(){if(saveHandle)return;saveHandle=setTimeout(()=>{saveHandle=0;try{sessionStorage.setItem(KEY,JSON.stringify(data));}catch(_){}},450);}
  function hostAdd(group,metric,n){const k=String(group).slice(0,90);const h=data.hosts[k]||{http:0,sw:0,wsRx:0,wsTx:0};h[metric]=positive(h[metric])+n;data.hosts[k]=h;}
  function add(metric,n,group){n=positive(n);if(!n)return;data.totals[metric]+=n;if(group)hostAdd(group,metric,n);save();}
  const seen = new Set();
  function observeEntry(e){
    if(!e || (e.entryType!=='resource' && e.entryType!=='navigation'))return;
    const key=[e.entryType,e.name,e.startTime,e.duration,e.initiatorType].join('|');if(seen.has(key))return;seen.add(key);
    data.requests++;
    const host=hostOf(e.name),size=positive(e.transferSize);
    // When SW controls a same-origin request, some browsers report cached body as transferSize.
    // SW explicitly reports ONLY its network fetches, so ignore controlled same-origin timing.
    const controlled=host===ownHost&&(positive(e.workerStart)>0 || !!navigator.serviceWorker?.controller);
    if(size>0&&!controlled)add('http',size,hostGroup(e.name));
    else if(!size&&positive(e.decodedBodySize)>0){if(host===ownHost)data.cached++;else data.opaque++;}
    save();
  }
  try {
    const p=root.performance;
    if(p?.getEntriesByType){p.getEntriesByType('navigation').forEach(observeEntry);p.getEntriesByType('resource').forEach(observeEntry);}
    if('PerformanceObserver' in root){const po=new PerformanceObserver(list=>list.getEntries().forEach(observeEntry));po.observe({entryTypes:['navigation','resource']});}
  }catch(_){data.performanceUnsupported=true;}
  try {navigator.serviceWorker?.addEventListener('message',e=>{
    const m=e.data;if(m?.type!=='SAGS_NET_RX'||!positive(m.bytes))return;
    // Reported by our SW only after fetch(); never count its Cache API hits.
    data.swResponses++;add('sw',m.bytes,hostGroup(m.url||root.location.href));
  });}catch(_){data.swUnsupported=true;}
  // Observe WebSocket *application payload* without examining/storing message contents.
  // These byte counts exclude frames, TLS, compression and retransmissions.
  try {
    const Original=root.WebSocket;
    if(typeof Original==='function'){
      class ObservedWebSocket extends Original {
        constructor(...args){super(...args);const group=hostGroup(args[0]);data.wsObserved=true;try{this.addEventListener('message',e=>{data.wsMessages++;add('wsRx',bytesOf(e.data),group);});}catch(_){}}
        send(message){const out=super.send(message);try{add('wsTx',bytesOf(message),hostGroup(this.url));}catch(_){}return out;}
      }
      root.WebSocket=ObservedWebSocket;
      data.wsInstrumented=root.WebSocket===ObservedWebSocket;
    }
  } catch (_) {data.wsInstrumented=false;}
  // The button is a viewer only. Counting begins before login and continues without opening AD.
  const snap=()=>({...safeTotals(data.totals)});
  function mark(action){data.action={name:action,at:now(),baseline:snap()};save();}
  try{document.addEventListener('click',e=>{
    const b=e.target?.closest?.('button,[role="button"]');if(!b)return;
    const t=String(b.textContent||'').toUpperCase();
    if(/MY\s*FLIGHT|CHUYẾN CỦA TÔI/.test(t))mark('MY FLIGHT');
    else if(/TRANG CHỦ|HOME/.test(t)&&t.length<100)mark('TRANG CHỦ');
  },{capture:true,passive:true});}catch(_){}
  function elapsed(t){const sec=Math.max(0,Math.floor((now()-positive(t))/1000));return sec<60?`${sec} giây`:sec<3600?`${Math.floor(sec/60)} phút ${sec%60} giây`:`${Math.floor(sec/3600)} giờ ${Math.floor(sec%3600/60)} phút`;}
  function html(){
    const t=data.totals,observed=t.http+t.sw,action=data.action;
    const actionTotals=action?{http:Math.max(0,t.http-positive(action.baseline?.http)),sw:Math.max(0,t.sw-positive(action.baseline?.sw)),wsRx:Math.max(0,t.wsRx-positive(action.baseline?.wsRx)),wsTx:Math.max(0,t.wsTx-positive(action.baseline?.wsTx))}:null;
    const hosts=Object.entries(data.hosts).sort((a,b)=>((b[1].http||0)+(b[1].sw||0)+(b[1].wsRx||0))-((a[1].http||0)+(a[1].sw||0)+(a[1].wsRx||0))).slice(0,10);
    return `<div class="nd-muted">Tự chạy từ <b>${safeText(new Date(data.since).toLocaleString('vi-VN'))}</b> · ${elapsed(data.since)} · ${Math.round(data.pageLoads)} lần tải trang (gồm F5).</div>
      <div class="nd-grid"><div class="nd-kpi"><small>HTTP ĐÃ QUAN SÁT · RX</small><b>${fmt(observed)}</b><small>Không phải tổng 4G của điện thoại</small></div><div class="nd-kpi"><small>TRÌNH DUYỆT BÁO · HTTP</small><b>${fmt(t.http)}</b><small>ResourceTiming transferSize</small></div><div class="nd-kpi"><small>SW TẢI TỪ MẠNG</small><b>${fmt(t.sw)}</b><small>Response bytes, không tính cache</small></div></div>
      <section class="nd-section"><b>FIREBASE / WEBSOCKET · PAYLOAD (KHÔNG PHẢI 4G)</b><div class="nd-pair"><span>Nhận RX · ${data.wsInstrumented?'theo dõi được':'không hỗ trợ'}</span><strong>${fmt(t.wsRx)}</strong><span>Gửi TX · ${data.wsInstrumented?'theo dõi được':'không hỗ trợ'}</span><strong>${fmt(t.wsTx)}</strong></div><p>WS là độ dài thông điệp ứng dụng, <b>không cộng vào HTTP</b>; không phản ánh nén/headers/TLS. Firestore/RTDB qua kết nối khác có thể không đo được.</p></section>
      <section class="nd-section"><b>LẦN THAO TÁC GẦN NHẤT</b>${action?`<p>${safeText(action.name)} · cách đây ${elapsed(action.at)} · HTTP quan sát thêm <b>${fmt(actionTotals.http+actionTotals.sw)}</b> · WS RX ${fmt(actionTotals.wsRx)} / TX ${fmt(actionTotals.wsTx)}</p>`:'<p>Chưa ghi nhận lần bấm TRANG CHỦ / MY FLIGHT trong tab này.</p>'}</section>
      <section class="nd-section"><b>NGUỒN TẢI · PHÂN NHÓM THEO HOST</b><div class="nd-pair">${hosts.map(([h,v])=>`<span>${safeText(h)}</span><strong>HTTP ${fmt(positive(v.http)+positive(v.sw))} · WS RX ${fmt(v.wsRx)}</strong>`).join('')||'<span>Chưa có số liệu</span><strong>—</strong>'}</div></section>
      <section class="nd-section nd-muted">${data.requests} HTTP entry · ${data.swResponses} lần SW xác nhận fetch · ${data.wsMessages} tin WS · ${data.opaque} entry ngoài domain không hiển thị kích thước · ${data.cached} cache/0 B. Số 0 ở nguồn bị chặn đo <b>không có nghĩa là không tốn mạng</b>.</section>
      <p class="nd-warning">Trình duyệt không cung cấp tổng byte 4G thực tế của hệ điều hành. Để đối chiếu chuẩn, xem thống kê dữ liệu di động của điện thoại hoặc Network của trình duyệt. Bản này không còn lấy kích thước snapshot JSON nhân số lần đọc làm MB mạng.</p>
      <button class="nd-export" id="ndExport" type="button">XUẤT CHẨN ĐOÁN JSON (không chứa nội dung chuyến)</button>`;
  }
  function render(){const el=modal?.querySelector('#ndBody');if(!el)return;el.innerHTML=html();el.querySelector('#ndExport').onclick=()=>{
    const report={schema:data.schema,since:new Date(data.since).toISOString(),pageLoads:data.pageLoads,totals:data.totals,hosts:data.hosts,requests:data.requests,swResponses:data.swResponses,wsMessages:data.wsMessages,opaque:data.opaque,cached:data.cached,wsInstrumented:data.wsInstrumented,action:data.action};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='e-report-network-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };}
  function open(){const center=document.getElementById('v181AdminCenter');if(!center?.classList.contains('show'))return;
    if(!modal){const css=document.createElement('style');css.textContent=`#sagsNetDiagModal{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;background:#07182ddc;padding:12px;font:600 13px/1.45 system-ui}#sagsNetDiagModal.show{display:flex}.nd-card{width:min(760px,98vw);max-height:94dvh;overflow:auto;background:#fff;color:#173b60;border-radius:16px;padding:16px}.nd-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.nd-head h3{margin:0;font-size:19px}.nd-head button{border:0;border-radius:10px;padding:9px 12px;background:#e8f0f8}.nd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.nd-kpi{background:#f1f6fd;border:1px solid #d6e4f2;border-radius:12px;padding:11px}.nd-kpi small,.nd-kpi b{display:block}.nd-kpi b{font-size:21px;margin:4px 0}.nd-section{border:1px solid #d8e2eb;border-radius:12px;padding:10px;margin:10px 0}.nd-section p{margin:7px 0 0}.nd-pair{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:8px;overflow-wrap:anywhere}.nd-pair strong{text-align:right}.nd-muted{color:#526981;font-size:12px}.nd-warning{font-size:12px;color:#834900;background:#fff5df;padding:10px;border-radius:10px}.nd-export{background:#135c96;color:white;border:0;border-radius:10px;padding:11px;font-weight:800;width:100%}@media(max-width:560px){.nd-grid{grid-template-columns:1fr}.nd-card{padding:11px}.nd-kpi b{font-size:18px}}`;
      document.head.appendChild(css);modal=document.createElement('div');modal.id='sagsNetDiagModal';modal.innerHTML='<div class="nd-card" role="dialog" aria-modal="true"><div class="nd-head"><h3>⇅ BỘ ĐO DỮ LIỆU · TỰ ĐỘNG</h3><button id="ndClose" type="button">ĐÓNG</button></div><div id="ndBody"></div></div>';document.body.appendChild(modal);modal.querySelector('#ndClose').onclick=()=>{isOpen=false;modal.classList.remove('show');};modal.addEventListener('click',e=>{if(e.target===modal){isOpen=false;modal.classList.remove('show');}});
    }isOpen=true;modal.classList.add('show');render();}
  setInterval(()=>{if(isOpen)render();},1500);
  root.SAGSNetworkDiagnostics={open,mark,get snapshot(){return {since:data.since,pageLoads:data.pageLoads,totals:snap(),hosts:JSON.parse(JSON.stringify(data.hosts)),requests:data.requests,swResponses:data.swResponses,wsMessages:data.wsMessages};}};
  save();
})(window);
