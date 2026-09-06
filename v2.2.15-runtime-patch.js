/* E-REPORT/SAGS V2.2.15 · DATE-FIRST LIMIT + CLEANING LISTS
 * BUILD: V2.2.15-DATE-FIRST-LIMIT-CLEANING
 */
(function(root){
  'use strict';
  const BUILD='V2.2.15-DATE-FIRST-LIMIT-CLEANING';
  if(root.__SAGS_V2215_DATE_FIRST===BUILD)return;
  root.__SAGS_V2215_DATE_FIRST=BUILD;
  const $=id=>document.getElementById(id);
  let listObserver=null,modalObserver=null,wasOpen=false;
  function css(){if($('v2215Style'))return;const s=document.createElement('style');s.id='v2215Style';s.textContent=`#v2215LimitDateLabel{font:900 11px Arial;color:#173f60;white-space:nowrap;align-self:center}#v2215LimitPrompt{padding:22px 12px;border:1px dashed #aabac7;border-radius:11px;background:#f8fbfd;text-align:center;color:#587083;font:900 13px Arial}.v2213-filter>b{font:900 11px Arial;color:#173f60;align-self:center;white-space:nowrap}@media(max-width:620px){#v2215LimitDateLabel,.v2213-filter>b{grid-column:1/-1}.v2213-filter>b{width:100%}}`;document.head.appendChild(s)}
  function gate(){const input=$('aclSDateFilter'),list=$('aclSList');if(!input||!list)return false;let p=$('v2215LimitPrompt');if(!p){p=document.createElement('div');p.id='v2215LimitPrompt';p.textContent='📅 Chọn ngày để xem danh sách A/C LIMITS.';list.insertAdjacentElement('beforebegin',p)}const selected=!!String(input.value||'').trim();list.style.display=selected?'block':'none';p.style.display=selected?'none':'block';const n=$('aclSVisibleCount');if(n&&!selected)n.textContent='CHỌN NGÀY';return true}
  function setup(){css();const input=$('aclSDateFilter'),list=$('aclSList'),modal=$('aclSimpleModal');if(!input||!list||!modal)return false;if(!$('v2215LimitDateLabel')){const label=document.createElement('span');label.id='v2215LimitDateLabel';label.textContent='CHỌN NGÀY XEM:';input.insertAdjacentElement('beforebegin',label);input.addEventListener('input',()=>setTimeout(gate,0));input.addEventListener('change',()=>setTimeout(gate,0))}if(!listObserver){listObserver=new MutationObserver(gate);listObserver.observe(list,{childList:true})}if(!modalObserver){modalObserver=new MutationObserver(()=>{const open=modal.style.display==='flex';if(open&&!wasOpen){input.value='';setTimeout(gate,0)}wasOpen=open});modalObserver.observe(modal,{attributes:true,attributeFilter:['style']})}gate();return true}
  function install(){if(setup())return;const mo=new MutationObserver(()=>{if(setup())mo.disconnect()});mo.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();root.addEventListener('pageshow',()=>setTimeout(setup,80),{passive:true});
})(typeof window!=='undefined'?window:globalThis);
