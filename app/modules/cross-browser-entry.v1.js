/* E-REPORT/SAGS V6.1.28 · cross-browser entry compatibility.
 * Goals:
 * - Pure-SVG live fallback for multiline values that browsers may fail to paint in SVG foreignObject.
 * - PDF-like entry preview baseline (text stays above dotted guides).
 * - Save & NEXT for nearby manual fields on the same printed page.
 * - Default ARR delay reason "TÀU VỀ TRỄ" when STA/ETA/actual indicates late arrival; never overwrite operator text.
 * - Dynamic release label as a safety net against stale version badges.
 * No localStorage/IndexedDB deletion is performed here.
 */
(function(root){
  'use strict';
  if(root.__SAGS_V6128_CROSS_BROWSER_ENTRY__)return;
  root.__SAGS_V6128_CROSS_BROWSER_ENTRY__=true;

  const SVG_NS='http://www.w3.org/2000/svg';
  const MODULE_BASE=new URL('.',document.currentScript?.src||location.href);
  const DEFAULT_ARR_REASON='TÀU VỀ TRỄ';
  const report={version:'V6.1.28',fallbackRenders:0,lastFallbackKeys:[],nextMoves:0};

  function S(v){return String(v??'').trim();}
  function isIOSWebKitV6128(){
    try{
      const ua=String(navigator.userAgent||''),platform=String(navigator.platform||'');
      return /iPad|iPhone|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1);
    }catch(_){return false;}
  }
  function parseMinutes(v){
    const s=S(v),m=s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if(!m)return null;
    return Number(m[1])*60+Number(m[2]);
  }
  function positiveClockDiff(late,early){
    if(late===null||early===null)return null;
    let d=late-early;
    if(d < -720)d+=1440;
    if(d > 720)d-=1440;
    return d;
  }
  function fieldList(){try{return Array.isArray(fields)?fields:[]}catch(_){return [];}}
  function stateRef(){try{return state}catch(_){return null}}
  function geom(f){try{return typeof abs==='function'?abs(f):null}catch(_){return null}}
  function escapeAttr(v){return String(v).replace(/"/g,'&quot;');}
  function nodesFor(svg,key){
    return Array.from(svg?.querySelectorAll?.('[data-field-key]')||[]).filter(n=>String(n.getAttribute('data-field-key')||'')===String(key));
  }
  function isVisibleTextNode(n){
    if(!n||String(n.tagName||'').toLowerCase()!=='text'||!S(n.textContent))return false;
    const st=n.style||{};
    return st.display!=='none'&&st.visibility!=='hidden'&&st.opacity!=='0'&&n.getAttribute('opacity')!=='0';
  }
  function measureCtx(){
    try{
      const c=(root.__sagsV6128Measure ||= document.createElement('canvas'));
      return c.getContext('2d');
    }catch(_){return null;}
  }
  function wrapLine(ctx,text,maxW){
    text=String(text??'');
    if(!text)return [''];
    const words=text.split(/\s+/).filter(Boolean),out=[];let line='';
    for(const w of words){
      const test=line?line+' '+w:w;
      if(!line||!ctx||ctx.measureText(test).width<=maxW){line=test;continue;}
      out.push(line);line=w;
      if(ctx&&ctx.measureText(line).width>maxW){
        let part='';
        for(const ch of line){
          const t=part+ch;
          if(part&&ctx.measureText(t).width>maxW){out.push(part);part=ch;}else part=t;
        }
        line=part;
      }
    }
    if(line||!out.length)out.push(line);
    return out;
  }
  function wrapValue(ctx,value,maxW){
    const out=[];
    for(const part of String(value??'').replace(/\r\n?/g,'\n').split('\n')){
      const lines=wrapLine(ctx,part,maxW);
      if(lines.length)out.push(...lines);else out.push('');
    }
    return out;
  }
  function pureSvgFallback(f,value,svg){
    const a=geom(f);if(!a||!svg)return false;
    const old=Array.from(svg.querySelectorAll('.sags-v6128-pure-svg')).filter(n=>n.getAttribute('data-field-key')===String(f.key));
    old.forEach(n=>n.remove());
    const raw=S(value);if(!raw)return false;

    const guide=root.sagsV6113EntryGuide?.(f.page,f.key)||null;
    const x=Number(a.vx||a.x||0),y=Number(a.vy||a.y||0),w=Math.max(12,Number(a.vw||a.w||0)),h=Math.max(10,Number(a.vh||a.h||0));
    let font=Math.max(9,Number(guide?.fontSize||f.font||16));
    const maxRows=Math.max(1,Math.min(8,Number(guide?.rowCount||f.autoFitLines||Math.floor(h/Math.max(12,font*1.08))||1)));
    const ctx=measureCtx();
    const family=String(guide?.fontFamily||'Times New Roman'),weight=String(guide?.fontWeight||'700'),style=String(guide?.fontStyle||'normal');
    const available=Math.max(8,w-8);
    let lines=[];
    for(let fs=font;fs>=9;fs-=0.5){
      font=fs;
      if(ctx)ctx.font=style+' '+weight+' '+font+'px "'+family+'"';
      lines=wrapValue(ctx,raw,available);
      if(lines.length<=maxRows)break;
    }
    if(lines.length>maxRows){
      lines=lines.slice(0,maxRows-1).concat([lines.slice(maxRows-1).join(' ')]);
    }
    const g=document.createElementNS(SVG_NS,'g');
    g.setAttribute('class','sags-v6128-pure-svg');
    g.setAttribute('data-field-key',String(f.key));
    g.setAttribute('pointer-events','none');

    const aa=String(guide?.align||f.align||'left').toLowerCase();
    const lineLike=String(f.key)==='offloadInfo'||!!f.dotted||!!f.aboveDots||!!f.writeOnLine;
    const rowH=h/Math.max(1,maxRows);
    const naturalLH=Math.max(font*1.06,Number(guide?.lineHeight||0)||0);
    const total=Math.min(h,lines.length*naturalLH);
    const valign=String(f.valign||'middle').toLowerCase();
    let firstY;
    if(lineLike){
      firstY=y+rowH-4;
    }else if(valign==='top'){
      firstY=y+font;
    }else if(valign==='bottom'){
      firstY=y+h-total+font;
    }else{
      firstY=y+Math.max(0,(h-total)/2)+font;
    }

    lines.forEach((line,i)=>{
      if(line==='')return;
      const t=document.createElementNS(SVG_NS,'text');
      const tx=aa==='center'?x+w/2:aa==='right'?x+w-4:x+4;
      const ty=lineLike?(y+rowH*(i+1)-4):(firstY+i*naturalLH);
      t.setAttribute('x',String(tx));t.setAttribute('y',String(ty));
      t.setAttribute('font-family',family);t.setAttribute('font-size',String(font));
      t.setAttribute('font-weight',weight);t.setAttribute('font-style',style);
      t.setAttribute('fill','#003B8E');t.setAttribute('text-anchor',aa==='center'?'middle':aa==='right'?'end':'start');
      t.setAttribute('dominant-baseline','alphabetic');t.setAttribute('pointer-events','none');
      t.setAttribute('data-field-key',String(f.key));t.textContent=line;
      if(ctx){
        ctx.font=style+' '+weight+' '+font+'px "'+family+'"';
        const mw=ctx.measureText(line).width;
        if(mw>available){t.setAttribute('textLength',String(available));t.setAttribute('lengthAdjust','spacingAndGlyphs');}
      }
      g.appendChild(t);
    });
    svg.appendChild(g);
    report.fallbackRenders++;
    report.lastFallbackKeys=Array.from(new Set(report.lastFallbackKeys.concat(String(f.key)))).slice(-20);
    return true;
  }

  function reconcileMultilinePaint(){
    const st=stateRef();if(!st)return;
    for(const f of fieldList()){
      if(!f?.multiline)continue;
      const value=st[f.key];if(value===undefined||value===null||S(value)==='')continue;
      const svg=document.getElementById('svg'+Number(f.page));if(!svg)continue;
      const nodes=nodesFor(svg,f.key);
      const existingPure=nodes.some(isVisibleTextNode);
      if(existingPure)continue;
      const foreign=nodes.filter(n=>String(n.tagName||'').toLowerCase()==='foreignobject');
      // For generic multiline fields, replace foreignObject painting with pure SVG.
      // offloadInfo also gets a fallback if an old/mixed renderer produced no node at all.
      if(!foreign.length&&String(f.key)!=='offloadInfo')continue;
      foreign.forEach(n=>{try{n.style.opacity='0';n.style.pointerEvents='none';}catch(_){}});
      pureSvgFallback(f,value,svg);
    }
  }
  function scheduleReconcile(){
    try{requestAnimationFrame(()=>{try{reconcileMultilinePaint();}catch(e){console.warn('V6.1.28 SVG reconcile',e);}})}
    catch(_){setTimeout(()=>{try{reconcileMultilinePaint();}catch(e){}},0)}
  }

  function applyArrivalReason(prefix=''){
    const st=stateRef();if(!st)return false;
    const sta=parseMinutes(st[prefix+'sta']),eta=parseMinutes(st[prefix+'eta']),actual=parseMinutes(st[prefix+'h5Start']);
    const etaDiff=positiveClockDiff(eta,sta),actualDiff=positiveClockDiff(actual,sta);
    const mins=Number(st[prefix+'arrDelayMins']);
    const late=(Number.isFinite(mins)&&mins>0)||(etaDiff!==null&&etaDiff>0)||(actualDiff!==null&&actualDiff>0);
    if(!late)return false;
    const key=prefix+'arrRemarks';
    if(S(st[key]))return false; // Operator-entered text always wins.
    st[key]=DEFAULT_ARR_REASON;
    try{if(typeof persist==='function')persist();}catch(e){console.warn('V6.1.28 delay default persist',e);}
    try{if(typeof draw==='function')draw();}catch(_){}
    return true;
  }
  function applyAllArrivalReasons(){applyArrivalReason('');applyArrivalReason('f421_');}

  function editableManual(f){
    if(!f||!['text','number'].includes(String(f.type||'')))return false;
    if(Number(f.w||0)<=0||Number(f.h||0)<=0)return false;
    return true;
  }
  function nextField(current){
    if(!current)return null;
    const ca=geom(current);if(!ca)return null;
    const candidates=fieldList().filter(f=>f!==current&&Number(f.page)===Number(current.page)&&editableManual(f)).map(f=>({f,a:geom(f)})).filter(x=>x.a);
    const cy=ca.y+ca.h/2,cx=ca.x+ca.w/2;
    let best=null,bestScore=Infinity;
    for(const x of candidates){
      const ay=x.a.y+x.a.h/2,ax=x.a.x+x.a.w/2;
      const overlap=Math.min(ca.y+ca.h,x.a.y+x.a.h)-Math.max(ca.y,x.a.y);
      const sameRow=overlap>Math.min(ca.h,x.a.h)*0.25;
      let dy=ay-cy,dx=ax-cx;
      if(sameRow&&dx>2){
        const score=dx;
        if(score<bestScore){best=x.f;bestScore=score;}
        continue;
      }
      if(dy>2&&dy<=100){
        const score=1000+dy*10+Math.max(0,x.a.x-ca.x);
        if(score<bestScore){best=x.f;bestScore=score;}
      }
    }
    return best;
  }
  function installNextButton(){
    const actions=document.querySelector('#entry .actions');if(!actions)return;
    let btn=document.getElementById('sagsEntryNextBtn');
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.id='sagsEntryNextBtn';btn.className='save';btn.textContent='Tiếp ›';
      btn.style.whiteSpace='nowrap';
      const save=actions.querySelector('button.save');save?.insertAdjacentElement('afterend',btn);
      if(!save)actions.prepend(btn);
      btn.addEventListener('click',()=>{
        let cur=null,next=null;
        try{cur=editing;next=nextField(cur);}catch(_){}
        if(!cur||!next)return;
        try{commitEntry();}catch(e){console.error('V6.1.28 NEXT save',e);return;}
        setTimeout(()=>{
          try{
            if(typeof editing!=='undefined'&&editing)return; // save failed/validation kept editor open
            report.nextMoves++;
            activate(next);
          }catch(e){console.warn('V6.1.28 NEXT open',e);}
        },isIOSWebKitV6128()?650:120);
      });
    }
    updateNextButton();
  }
  function updateNextButton(){
    const btn=document.getElementById('sagsEntryNextBtn');if(!btn)return;
    let next=null;
    try{next=nextField(editing);}catch(_){}
    btn.disabled=!next;
    btn.style.opacity=next?'1':'.45';
    btn.title=next?'Lưu và chuyển sang ô tiếp theo':'Không còn ô nhập tiếp theo trong trang này';
  }

  function installEntryPreviewCss(){
    if(document.getElementById('sagsV6128EntryStyle'))return;
    const st=document.createElement('style');st.id='sagsV6128EntryStyle';
    st.textContent=
      '#entryPaperSheet.sags-ruled #entryText{transform:translateY(-3px)!important;}'+
      '#entryPaperSheet.sags-ruled #entryPaperRules{background-position:0 calc(var(--sags-entry-line,26px) - .5px)!important;}'+
      '#sagsEntryNextBtn:disabled{filter:grayscale(.35);}';
    document.head.appendChild(st);
  }

  async function syncReleaseLabel(){
    try{
      const url=new URL('version.json?v6128='+Date.now(),MODULE_BASE).href;
      const r=await fetch(url,{cache:'no-store'});if(!r.ok)return;
      const v=await r.json(),label=S(v.displayVersion||v.version);if(!label)return;
      const marker=document.getElementById('buildMarker');if(marker)marker.textContent=label;
      const login=document.getElementById('loginReleaseVersion');if(login)login.textContent=label;
      document.documentElement.setAttribute('data-app-version',label);
    }catch(_){}
  }

  function wrapFunctions(){
    try{
      if(typeof draw==='function'&&!draw.__sagsV6128){
        const base=draw;
        const wrapped=function(){const out=base.apply(this,arguments);scheduleReconcile();return out;};
        wrapped.__sagsV6128=true;wrapped.__sagsV6128Base=base;draw=wrapped;
      }
    }catch(e){console.warn('V6.1.28 draw wrap',e);}
    try{
      if(typeof updateArrivalDelayFor==='function'&&!updateArrivalDelayFor.__sagsV6128){
        const base=updateArrivalDelayFor;
        const wrapped=function(prefix=''){const out=base.apply(this,arguments);try{applyArrivalReason(String(prefix||''));}catch(_){}return out;};
        wrapped.__sagsV6128=true;wrapped.__sagsV6128Base=base;updateArrivalDelayFor=wrapped;
      }
    }catch(e){console.warn('V6.1.28 delay wrap',e);}
    try{
      if(typeof commitEntry==='function'&&!commitEntry.__sagsV6128){
        const base=commitEntry;
        const wrapped=function(){
          let key='';try{key=String(editing?.key||'')}catch(_){}
          const out=base.apply(this,arguments);
          if(['sta','eta','h5Start'].includes(key))setTimeout(()=>applyArrivalReason(''),0);
          if(['f421_sta','f421_eta','f421_h5Start'].includes(key))setTimeout(()=>applyArrivalReason('f421_'),0);
          setTimeout(()=>{updateNextButton();scheduleReconcile();},0);
          return out;
        };
        wrapped.__sagsV6128=true;wrapped.__sagsV6128Base=base;commitEntry=wrapped;
      }
    }catch(e){console.warn('V6.1.28 commit wrap',e);}
    try{
      if(typeof activate==='function'&&!activate.__sagsV6128){
        const base=activate;
        const wrapped=function(){const out=base.apply(this,arguments);setTimeout(updateNextButton,0);return out;};
        wrapped.__sagsV6128=true;wrapped.__sagsV6128Base=base;activate=wrapped;
      }
    }catch(e){console.warn('V6.1.28 activate wrap',e);}
  }

  function start(){
    installEntryPreviewCss();installNextButton();wrapFunctions();
    setTimeout(()=>{wrapFunctions();installNextButton();applyAllArrivalReasons();scheduleReconcile();syncReleaseLabel();},250);
    setTimeout(()=>{wrapFunctions();scheduleReconcile();},1200);
  }
  root.sagsBrowserStabilityV6128={report,applyArrivalReason,reconcileMultilinePaint,nextField,syncReleaseLabel};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  root.addEventListener?.('pageshow',()=>{wrapFunctions();installNextButton();scheduleReconcile();syncReleaseLabel();},{passive:true});
})(window);
