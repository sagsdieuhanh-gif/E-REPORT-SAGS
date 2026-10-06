/* E-REPORT SAGS V6.4.110 · Reference home: event-driven deterministic airline identity + aligned console.
   Existing menu buttons and Daily Roster remain the business/permission authority. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const brand = '<b>E-REPORT <em>SAGS</em></b><small>AIRPORT GROUND OPERATIONS</small>';
  const CARRIER_GUIDE = './data/carrier-service-guide.json';
  // Display identity only; roster permissions continue to use the service guide.
  const AIRLINE_NAMES = {HAV:'HAV Aviation',VJ:'Vietjet Air',QH:'Bamboo Airways',DV:'SCAT Airlines',KC:'Air Astana',C6:'Centrum Air',KA:'Aero Nomad Airlines',N4:'Nordwind Airlines',AK:'AirAsia',FD:'Thai AirAsia',KE:'Korean Air',BX:'Air Busan',WE:'Parata Air',RF:'Aero K',TW:'Trinity Airways',OZ:'Asiana Airlines',LJ:'Jin Air','3U':'Sichuan Airlines',UQ:'Urumqi Air',DR:'Ruili Airlines',TR:'Scoot',HY:'Uzbekistan Airways',HU:'Hainan Airlines',VZ:'Thai Vietjet Air','9G':'Sun PhuQuoc Airways',B2:'Belavia',VU:'Vietravel Airlines'};
  let pending = false, overviewKey = '', carrierPromise = null, logoObserver = null;
  let stripPending = false, flightView = null, showAll = false, tableFrame = 0, flightRevision = 0, lastFlightRenderKey = '', workspaceBrandTimer = 0, workspaceBrandRetryToken = 0;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const U = value => String(value ?? '').trim().toUpperCase();
  function normalizeCarrier(raw) {
    return U(raw).replace(/[^A-Z0-9/]/g,'');
  }
  function builtinCarriers() {
    return Object.entries(AIRLINE_NAMES).map(([carrier,name]) => ({carrier, aliases:[carrier], name}));
  }
  async function loadCarriers() {
    if (carrierPromise) return carrierPromise;
    carrierPromise = fetch(CARRIER_GUIDE, {cache:'force-cache'})
      .then(r => { if (!r.ok) throw new Error('carrier-guide-'+r.status); return r.json(); })
      .then(data => {
        const carriers = Array.isArray(data?.carriers) ? data.carriers : [];
        const seen = new Set();
        const mapped = carriers.flatMap(row => {
          const carrier = normalizeCarrier(row?.carrier);
          const aliases = [...new Set((Array.isArray(row?.aliases) ? row.aliases : carrier.split('/')).map(normalizeCarrier).filter(Boolean))];
          return (aliases.length ? aliases : [carrier]).filter(code => code && !seen.has(code) && seen.add(code)).map(code => ({carrier:code, aliases:[code], name:AIRLINE_NAMES[code] || code}));
        });
        return mapped.length ? mapped : builtinCarriers();
      }).catch(() => builtinCarriers());
    return carrierPromise;
  }
  function logoUrl(code) {
    code = normalizeCarrier(code);
    if (code === 'TW') return './assets/airlines/TW.svg';
    return AIRLINE_NAMES[code] ? './assets/airlines/'+code+(code==='KA'?'.svg':'.png') : '';
  }
  window.sagsAirlineIdentity = Object.freeze({
    name(code){const c=normalizeCarrier(code);return AIRLINE_NAMES[c]||c;},
    logoUrl(code){return logoUrl(code);}
  });
  function airlineAlias(flightLabel, carriers) {
    const raw = U(flightLabel).replace(/[\s-]+/g,'');
    const aliases = [];
    const source = Array.isArray(carriers) && carriers.length ? carriers : builtinCarriers();
    for (const row of source) for (const alias of row.aliases || []) aliases.push(alias);
    aliases.sort((a,b) => b.length - a.length);
    return aliases.find(alias => raw.startsWith(alias)) || '';
  }
  function logoHtml(code, cls='') {
    const c = normalizeCarrier(code), src = logoUrl(c);
    if (!c) return '<span class="opsAirlineFallback '+safe(cls)+'">—</span>';
    if (!src) return '<span class="opsAirlineFallback '+safe(cls)+'">'+safe(c)+'</span>';
    return '<span class="opsAirlineMark '+safe(cls)+'"><img class="opsAirlineLogo" src="'+safe(src)+'" alt="'+safe(c)+'" loading="eager" decoding="async"><span class="opsAirlineFallback" hidden>'+safe(c)+'</span></span>';
  }
  function lazyLogoHtml(code) {
    const c = normalizeCarrier(code), src = logoUrl(c);
    if (!src) return '<span class="opsAirlineFallback">'+safe(c||'—')+'</span>';
    return '<span class="opsAirlineMark"><img class="opsAirlineLogo" data-src="'+safe(src)+'" alt="'+safe(c)+'" decoding="async"><span class="opsAirlineFallback">'+safe(c)+'</span></span>';
  }
  function tableLogoHtml(code) {
    const c = normalizeCarrier(code), src = logoUrl(c);
    if (!c) return '<span class="opsTableLogoFallback">—</span>';
    if (!src) return '<span class="opsTableLogoFallback">'+safe(c)+'</span>';
    return '<img class="opsTableLogoBare" src="'+safe(src)+'" alt="'+safe(c)+'" loading="lazy" decoding="async">';
  }
  const METRIC_ICONS = {
    working:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 26l36-15-14 32-5-13-17-4z"/><path d="M22 30 14 40M17 23 8 14"/></svg>',
    complete:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="7" width="34" height="34" rx="9"/><path d="m15 25 6 6 13-15"/></svg>',
    pending:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 34h23a8 8 0 0 0 1-16 13 13 0 0 0-25-2 9 9 0 0 0 1 18z"/><path d="M24 21v11m0 0-5-5m5 5 5-5"/></svg>'
  };
  function metricCardHtml(kind,label,count,unit,cta,routeKey){
    return '<article class="opsMetricCard opsMetric-'+kind+'">'
      +'<small class="opsMetricLabel">'+safe(label)+'</small>'
      +'<div class="opsMetricBody"><span class="opsMetricIcon">'+METRIC_ICONS[kind]+'</span>'
      +'<span class="opsMetricCount"><strong>'+safe(count)+'</strong><span class="opsMetricUnit">'+safe(unit)+'</span></span></div>'
      +'<button type="button" class="opsMetricCta" data-ops-route="'+safe(routeKey)+'">'+safe(cta)+' <span aria-hidden="true">→</span></button>'
      +'<span class="opsMetricGhost" aria-hidden="true">'+METRIC_ICONS[kind]+'</span>'
      +'</article>';
  }
  function carrierInfo(code,carriers){
    const c=normalizeCarrier(code);
    return (carriers||[]).find(row=>row.carrier===c||(row.aliases||[]).includes(c))||{carrier:c,name:AIRLINE_NAMES[c]||c};
  }
  async function decorateWorkspaceFlights(){
    const host=$('fwcList');if(!host)return;
    const carriers=await loadCarriers();if(!host.isConnected)return;
    for(const card of host.querySelectorAll('.fwcFlight,.v1199Card')){
      const title=card.querySelector('.fwcFlightTitle,.v1199Title');if(!title)continue;
      const alias=airlineAlias(title.textContent,carriers);if(!alias)continue;
      const info=carrierInfo(alias,carriers);
      let brand=card.querySelector('.opsFwcBrand');
      if(!brand){brand=document.createElement('div');brand.className='opsFwcBrand';title.insertAdjacentElement('beforebegin',brand);}
      if(brand.dataset.carrier===info.carrier)continue;
      brand.dataset.carrier=info.carrier;
      brand.innerHTML=logoHtml(info.carrier,'opsFwcLogo')+'<span class="opsFwcIdentity"><b>'+safe(info.carrier)+'</b><small>'+safe(info.name||info.carrier)+'</small></span>';
    }
  }
  function setupLogoObserver() {
    if (logoObserver || !('IntersectionObserver' in window)) return;
    logoObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target, src = img.dataset.src;
        if (src) { img.src = src; delete img.dataset.src; }
        logoObserver.unobserve(img);
      }
    }, {rootMargin:'180px'});
  }
  function observeLazyLogos(root=document) {
    setupLogoObserver();
    root.querySelectorAll?.('.opsAirlineLogo[data-src]').forEach(img => {
      if (logoObserver) logoObserver.observe(img);
      else { img.src = img.dataset.src; delete img.dataset.src; }
    });
  }
  function carrierStripHtml(carriers) {
    return '<div class="opsAirlineStripTrack" id="opsAirlineTrack" tabindex="0" aria-label="Danh sách hãng">' + carriers.map(row =>
      '<div class="opsAirlineChip" title="'+safe(row.name)+'">'+lazyLogoHtml(row.carrier)+'<span class="opsAirlineIdentity"><b>'+safe(row.carrier)+'</b><small>'+safe(row.name)+'</small></span></div>'
    ).join('') + '</div><button type="button" class="opsAirlineNext" data-ops-airlines-next aria-label="Xem các hãng tiếp theo" aria-controls="opsAirlineTrack">›</button>';
  }
  async function renderCarrierStrip() {
    const host = $('opsAirlineStrip'); if (!host || host.dataset.ready === '1' || stripPending || !document.body.classList.contains('v6494-home-active')) return;
    stripPending = true;
    const carriers = await loadCarriers(); stripPending = false; if (!host.isConnected) return;
    host.innerHTML = carriers.length ? carrierStripHtml(carriers) : '<div class="opsAirlineStripEmpty">Chưa tải được nhận diện hãng.</div>';
    host.dataset.ready = '1'; observeLazyLogos(host);
    const track = $('opsAirlineTrack');
    const updateArrow = () => { const button=host.querySelector('.opsAirlineNext'); if(button){const end=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;button.textContent=end?'‹':'›';button.setAttribute('aria-label',end?'Về các hãng đầu tiên':'Xem các hãng tiếp theo');} };
    track?.addEventListener('scroll',updateArrow,{passive:true});
    if(track && 'ResizeObserver' in window)new ResizeObserver(updateArrow).observe(track);
    updateArrow();
  }
  function flightTime(flight) { return flight.std || flight.sta || ''; }
  function timeMinute(flight) { const match=String(flightTime(flight)).match(/^(\d{1,2}):?(\d{2})/);return match?Number(match[1])*60+Number(match[2]):Infinity; }
  function renderFlights() {
    const host=$('opsHomeFlights'), queue=$('opsHomeQueue');if(!flightView || !host || !queue)return;
    const {groups,carriers,api}=flightView;
    if(matchMedia('(max-width:767px)').matches)return;
    const scroll=queue.closest('.v6494Scroll');
    // Home shows only the rows that fit below its header; expand on request.
    const queueTop=queue.getBoundingClientRect().top-(scroll?.getBoundingClientRect().top||0)+(scroll?.scrollTop||0);
    const available=(scroll?.clientHeight || innerHeight)-queueTop-100;
    const limit=Math.max(1,Math.min(10,Math.floor(available/48)));
    const rows=showAll?groups:groups.slice(0,limit);
    const all=$('opsFlightsAll');all.hidden=groups.length<=limit;
    all.textContent=showAll?'Thu gọn ↑':'Xem tất cả →';all.setAttribute('aria-expanded',String(showAll));
    $('opsFlightCount').textContent=rows.length+'/'+groups.length+' chuyến';
    const renderKey=flightRevision+'|'+(showAll?1:0)+'|'+limit+'|'+groups.length;
    if(renderKey===lastFlightRenderKey)return;
    lastFlightRenderKey=renderKey;
    host.innerHTML = '<div class="opsFlightTableWrap"><table><thead><tr><th>Giờ</th><th>Hãng</th><th>Chuyến bay</th><th>Chặng bay</th><th>Đăng bạ</th><th>Trạng thái</th><th>Biểu mẫu</th><th aria-label="Thao tác"></th></tr></thead><tbody>' + rows.map(g => {
      const flight=g.primary||{}, forms=api.visibleFormTasks(g), label=api.flightLabel(flight)||'—',alias=airlineAlias(label,carriers);
      const workingFn=flightView.allFlights?(api.itemWorkingAny||api.itemWorking):api.itemWorking;
      const status=g.flightClosed?'Hoàn tất':g.items.some((x,i)=>workingFn(x,g.states[i]))?'Đang làm':'Chờ xử lý';
      return '<tr><td class="opsTime">'+safe(flightTime(flight)||'—')+'</td><td class="opsAirlineCell">'+tableLogoHtml(alias)+'</td><td class="opsFlightNo"><b>'+safe(label)+'</b></td><td>'+safe(flight.route||'—')+'</td><td>'+safe(flight.acReg||'—')+'</td><td><span class="opsStatus opsStatus-'+statusClass(status)+'">'+safe(status)+'</span></td><td class="opsForms">'+forms.map(x=>safe(api.formLabel(x.item))).join(' · ')+'</td><td class="opsOpenCell"><button type="button" data-ops-route="myflight">Mở</button></td></tr>';
    }).join('')+'</tbody></table></div>';
  }
  function statusClass(status) {
    return /HOÀN TẤT/i.test(status) ? 'complete' : /ĐANG LÀM/i.test(status) ? 'working' : 'pending';
  }
  async function overview() {
    const host = $('opsHomeFlights'), metrics = $('opsHomeMetrics');
    if (!host || !metrics) return;
    let session;
    try { session = window.__sagsGetSession?.(); } catch (_) { return; }
    const user = session?.profile;
    if (!document.body.classList.contains('v157-authenticated') || !user?.firebaseUid) {
      if (overviewKey) { overviewKey = ''; flightView=null;showAll=false;lastFlightRenderKey='';flightRevision++; host.textContent = 'Các chuyến được phân qua Daily Roster sẽ xuất hiện tại đây.'; metrics.replaceChildren();$('opsFlightsAll').hidden=true;$('opsFlightCount').textContent=''; }
      return;
    }
    if (!document.body.classList.contains('v157-home')) return;
    const api = window.__SAGS_DAILY_ROSTER_FINAL_V1199;
    if (!api?.readOverview) return;
    const date = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const allFlights = !!api.allFlightScope?.();
    const key = user.firebaseUid + ':' + date + ':' + (allFlights?'ALL':'PERSONAL');
    if (overviewKey === key) return;
    overviewKey = key; host.textContent = 'Đang tải chuyến bay...'; metrics.replaceChildren();
    try {
      const [{groups}, carriers] = await Promise.all([api.readOverview(date,{allFlights}), loadCarriers()]);
      if (overviewKey !== key) return;
      const complete = groups.filter(g => g.flightClosed).length;
      const workingFn=allFlights?(api.itemWorkingAny||api.itemWorking):api.itemWorking;
      const working = groups.filter(g => !g.flightClosed && g.items.some((item,i) => workingFn(item,g.states[i]))).length;
      const pending=Math.max(0,groups.length-complete-working);
      metrics.innerHTML =
        metricCardHtml('working','Chuyến đang làm',working,'chuyến bay','Xem danh sách','myflight')
        +metricCardHtml('complete','Đã hoàn thành hôm nay',complete,'chuyến bay','Xem chi tiết','archive')
        +metricCardHtml('pending','Chờ xử lý',pending,'chuyến bay','Xử lý ngay','myflight');
      if (!groups.length) { flightView=null;$('opsFlightsAll').hidden=true;$('opsFlightCount').textContent='';host.textContent = allFlights?'Chưa có chuyến khai thác hôm nay.':'Chưa có chuyến được phân công hôm nay.'; return; }
      flightView={groups:groups.slice().sort((a,b)=>timeMinute(a.primary||{})-timeMinute(b.primary||{}) || String(api.flightLabel(a.primary)).localeCompare(String(api.flightLabel(b.primary)))),carriers,api,allFlights};
      flightRevision++;lastFlightRenderKey='';
      renderFlights();
    } catch (_) {
      if (overviewKey === key) host.innerHTML = '<p>Không tải được dữ liệu chuyến bay.</p><button type="button" data-ops-retry>Thử lại</button>';
    }
  }
  function route(key) {
    const target = document.querySelector('.v157MenuItem[data-v157-key="' + key + '"]');
    if (target && !target.disabled && !target.hidden && target.style.display !== 'none') target.click();
  }
  function sync() {
    const login = $('roleLoginModal');
    if (login && !login.querySelector('.opsReferenceBrand')) {
      const heading = document.createElement('div');
      heading.className = 'opsReferenceBrand'; heading.innerHTML = brand;
      login.prepend(heading);
      const card = login.querySelector('.roleLoginCard');
      const strap = document.createElement('p'); strap.className = 'opsLoginStrap';
      strap.textContent = 'AN TOÀN · HIỆU QUẢ · CHUYÊN NGHIỆP'; card?.append(strap);
      $('personalLoginUser')?.setAttribute('aria-label', 'Tên đăng nhập');
      $('roleLoginPass')?.setAttribute('aria-label', 'Mật khẩu');
    }
    void decorateWorkspaceFlights();
    const shell = $('v6494AviationHome');
    if (!shell) return;
    const scroll = shell.querySelector('.v6494Scroll'), hero = scroll?.querySelector('.v6494Hero');
    if (!$('opsAirlineStrip') && hero) {
      const strip = document.createElement('section'); strip.id = 'opsAirlineStrip'; strip.setAttribute('aria-label','Các hãng trong Lưu ý phục vụ hãng');
      hero.insertAdjacentElement('afterend', strip);
      void renderCarrierStrip();
    }
    if (!$('opsHomeMetrics')) {
      const metrics = document.createElement('div'); metrics.id = 'opsHomeMetrics';
      const anchor = $('opsAirlineStrip') || hero;
      anchor?.insertAdjacentElement('afterend', metrics);
    }
    if (!$('opsHomeQueue')) {
      const queue = document.createElement('section'); queue.id = 'opsHomeQueue';
      queue.innerHTML = '<div class="opsQueueHead"><div><small>HÔM NAY</small><h2>Danh sách chuyến bay hôm nay</h2></div><div class="opsQueueActions"><small id="opsFlightCount"></small><button type="button" data-ops-retry aria-label="Làm mới chuyến bay">↻</button><button type="button" id="opsFlightsAll" data-ops-all hidden aria-expanded="false" aria-controls="opsHomeFlights">Xem tất cả →</button></div></div><div id="opsHomeFlights">Các chuyến được phân qua Daily Roster sẽ xuất hiện tại đây.</div>';
      scroll.append(queue);
    }
    void renderCarrierStrip(); void overview();
  }
  document.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('opsAirlineLogo')) return;
    img.hidden = true;
    const fallback = img.nextElementSibling; if (fallback) fallback.hidden = false;
  }, true);
  document.addEventListener('load',event=>{
    const img=event.target;
    if(img instanceof HTMLImageElement && img.classList.contains('opsAirlineLogo')){img.hidden=false;if(img.nextElementSibling)img.nextElementSibling.hidden=true;}
  },true);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-ops-route], [data-ops-retry], [data-ops-all], [data-ops-airlines-next]');
    if (!button) return;
    if(button.hasAttribute('data-ops-airlines-next')){const t=$('opsAirlineTrack');if(t)t.scrollTo({left:t.scrollLeft+t.clientWidth>=t.scrollWidth-2?0:Math.min(t.scrollWidth-t.clientWidth,t.scrollLeft+t.clientWidth-40),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});return;}
    if(button.hasAttribute('data-ops-all')){showAll=!showAll;renderFlights();return;}
    if (button.hasAttribute('data-ops-retry')) { overviewKey = ''; void overview(); return; }
    route(button.dataset.opsRoute);
  });
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; sync(); }); }
  function resetOverview(){ overviewKey=''; schedule(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once: true}); else schedule();
  window.addEventListener('pageshow', schedule, {passive:true});
  window.addEventListener('sags:login',schedule);window.addEventListener('sags:logout',resetOverview);
  window.addEventListener('resize',()=>{if(!tableFrame)tableFrame=requestAnimationFrame(()=>{tableFrame=0;renderFlights()})},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()},{passive:true});
  window.addEventListener('sags:personal-roster-updated',resetOverview);
  window.addEventListener('sags:home-shown',schedule);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#roleLoginSubmit,[data-v6494-key],[data-ops-route],[data-ops-retry],#v479MyFlightHome,.fwcHead button'))setTimeout(schedule,0);
  },true);
  const workspaceBrandRetryDelays=[0,80,200,450,900,1500,2600];
  const refreshWorkspaceBrand=()=>{
    const token=++workspaceBrandRetryToken;
    clearTimeout(workspaceBrandTimer);
    const run=async attempt=>{
      if(token!==workspaceBrandRetryToken)return;
      workspaceBrandTimer=0;
      await decorateWorkspaceFlights();
      const host=$('fwcList'),cards=host?[...host.querySelectorAll('.fwcFlight,.v1199Card')]:[];
      const missing=!host || !cards.length || cards.some(card=>{
        const title=card.querySelector('.fwcFlightTitle,.v1199Title');
        return !!title && !card.querySelector('.opsFwcBrand');
      });
      if(missing && attempt<workspaceBrandRetryDelays.length-1){
        workspaceBrandTimer=setTimeout(()=>void run(attempt+1),workspaceBrandRetryDelays[attempt+1]);
      }
    };
    workspaceBrandTimer=setTimeout(()=>void run(0),workspaceBrandRetryDelays[0]);
  };
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('.v157MenuItem[data-v157-key="myflight"],#roleBtnFlights,#roleBtnRosterFlights,#fwcModal button'))refreshWorkspaceBrand();
  },true);
  document.addEventListener('change',e=>{if(e.target?.id==='fwcDate')refreshWorkspaceBrand()},true);
  window.addEventListener('sags:personal-roster-updated',refreshWorkspaceBrand);
  setTimeout(schedule,350); setTimeout(schedule,1400);
})();
