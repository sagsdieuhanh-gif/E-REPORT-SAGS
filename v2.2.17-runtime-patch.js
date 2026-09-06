/* E-REPORT/SAGS V2.2.17 · TODAY DEFAULT + ARRIVAL-ONLY CLEANING
 * BUILD: V2.2.17-TODAY-DEFAULT-ARRIVAL-CLEANING
 */
(function(root){
  'use strict';
  const BUILD='V2.2.17-TODAY-DEFAULT-ARRIVAL-CLEANING';
  if(root.__SAGS_V2217_TODAY_DEFAULT===BUILD)return;
  root.__SAGS_V2217_TODAY_DEFAULT=BUILD;
  const $=id=>document.getElementById(id),S=v=>String(v??'').trim();
  const flight=v=>S(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const db=path=>typeof root.sagsV470Ref==='function'?root.sagsV470Ref(path):null;
  let cleanTimer=0;
  function css(){if($('v2217Style'))return;const style=document.createElement('style');style.id='v2217Style';style.textContent='#v2215LimitDateLabel:after{content:" (MẶC ĐỊNH HÔM NAY)";color:#087443}#v2213FilterDate{cursor:pointer}';document.head.appendChild(style)}
  function isOpen(el){return !!el&&getComputedStyle(el).display!=='none'}
  function useToday(input){if(input&&!S(input.value))input.value=today()}
  function defaults(){css();const limitModal=$('aclSimpleModal'),cleanModal=$('v2213Modal');if(isOpen(limitModal))useToday($('aclSDateFilter'));if(isOpen(cleanModal))useToday($('v2213FilterDate'));for(const input of [isOpen(limitModal)?$('aclSDateFilter'):null,isOpen(cleanModal)?$('v2213FilterDate'):null])if(input&&input.dataset.v2217Date!==input.value){input.dataset.v2217Date=input.value;input.dispatchEvent(new Event('input',{bubbles:true}))}}
  async function collapseArrivalDuplicates(){const ref=db('aircraft_cleaning/catalog_public');if(!ref)return;const snap=await ref.once('value'),raw=snap.val()||{},rows=Array.isArray(raw.items)?raw.items:Object.values(raw.items||{}),keep=new Map(),out=[];let changed=false;for(const row of rows.filter(Boolean)){const arr=flight(row.arrivalFlight);if(!arr){out.push(row);continue}const key=`${S(row.date)}|${arr}`,previous=keep.get(key);if(!previous){keep.set(key,row);out.push(row);continue}const newer=Number(row.updatedAtMs||0)>=Number(previous.updatedAtMs||0)?row:previous,older=newer===row?previous:row;Object.assign(newer,{departureFlight:S(newer.departureFlight||older.departureFlight),std:S(newer.std||older.std),route:S(newer.route||older.route),acReg:S(newer.acReg||older.acReg),displayReg:S(newer.displayReg||older.displayReg),acType:S(newer.acType||older.acType)});const index=out.indexOf(previous);if(index>=0)out[index]=newer;keep.set(key,newer);changed=true}if(changed){const now=Date.now();await ref.set({...raw,items:out,version:now,updatedAtMs:now});const signal=db('aircraft_cleaning/catalog_signal');if(signal)await signal.set({version:now,action:'ARRIVAL_KEY_DEDUP',updatedAtMs:now})}}
  function scheduleCleanup(){clearTimeout(cleanTimer);cleanTimer=setTimeout(()=>collapseArrivalDuplicates().catch(()=>{}),850);setTimeout(()=>collapseArrivalDuplicates().catch(()=>{}),2200)}
  function install(){defaults();const save=$('v2213Save');if(save&&!save.dataset.v2217Bound){save.dataset.v2217Bound='1';save.addEventListener('click',scheduleCleanup)}}
  const observer=new MutationObserver(install);
  function start(){install();if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});setTimeout(defaults,100);setTimeout(defaults,450);setTimeout(()=>collapseArrivalDuplicates().catch(()=>{}),1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();root.addEventListener('pageshow',()=>setTimeout(defaults,80),{passive:true});
})(typeof window!=='undefined'?window:globalThis);
