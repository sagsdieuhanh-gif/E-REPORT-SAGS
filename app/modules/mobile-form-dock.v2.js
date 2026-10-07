(function(root){"use strict";
const BUILD="V2.1-20261007-DATA-SAFETY-FORM-CONTRAST-03";
if(root.__SAGS_MOBILE_FORM_DOCK_V26===BUILD)return;
root.__SAGS_MOBILE_FORM_DOCK_V26=BUILD;
const mq=root.matchMedia("(max-width:899px)");
const originals=new Map();
let raf=0,observer=null,resizeObserver=null;

function remember(el,prop){
  if(!el)return;
  let rec=originals.get(el);
  if(!rec){rec={};originals.set(el,rec)}
  if(!(prop in rec))rec[prop]={value:el.style.getPropertyValue(prop),priority:el.style.getPropertyPriority(prop)};
}
function force(el,prop,value){
  if(!el)return;
  remember(el,prop);
  if(el.style.getPropertyValue(prop)!==value||el.style.getPropertyPriority(prop)!=="important"){
    el.style.setProperty(prop,value,"important");
  }
}
function restoreAll(){
  for(const [el,rec] of originals){
    if(!el?.isConnected)continue;
    for(const [prop,saved] of Object.entries(rec)){
      if(saved.value)el.style.setProperty(prop,saved.value,saved.priority||"");
      else el.style.removeProperty(prop);
    }
  }
  originals.clear();
}
function currentSessionId(){
  try{
    if(typeof activeFlightSessionId!=="undefined"&&String(activeFlightSessionId||"").trim())return String(activeFlightSessionId).trim();
  }catch(_){}
  try{
    if(String(root.activeFlightSessionId||"").trim())return String(root.activeFlightSessionId).trim();
  }catch(_){}
  try{
    const meta=typeof root.currentFlightSessionMeta==="function"?root.currentFlightSessionMeta():null;
    if(meta?.id)return String(meta.id).trim();
  }catch(_){}
  return"";
}
function formContextActive(){
  const body=document.body;
  if(!body)return false;
  if(!body.classList.contains("v157-authenticated"))return false;
  if(!body.classList.contains("v163-operational"))return false;
  if(body.classList.contains("v157-home")||
     body.classList.contains("v166-overlay-open")||
     body.classList.contains("sags-overlay-open")||
     body.classList.contains("v157-drawer-open"))return false;
  if(!currentSessionId())return false;
  return true;
}
function hideDock(dock){
  try{document.body?.classList.remove("sags-form-view-active")}catch(_){}
  if(dock)force(dock,"display","none");
  try{document.documentElement.style.setProperty("--sags-form-dock-height","0px")}catch(_){}
}
function buttonLayout(btn,col,row){
  if(!btn)return;
  const props={
    "grid-column":col,
    "grid-row":row,
    "position":"static",
    "inset":"auto",
    "order":"0",
    "min-width":"0",
    "width":"100%",
    "max-width":"none",
    "min-height":"44px",
    "height":"44px",
    "max-height":"44px",
    "margin":"0",
    "padding":"7px 6px",
    "box-sizing":"border-box",
    "align-self":"stretch",
    "justify-self":"stretch"
  };
  for(const [k,v] of Object.entries(props))force(btn,k,v);
}
function measure(dock){
  if(!dock)return;
  const h=Math.ceil(dock.getBoundingClientRect().height||0);
  if(h>0)document.documentElement.style.setProperty("--sags-form-dock-height",h+"px");
}
function apply(){
  raf=0;
  const dock=document.getElementById("sagsMobileFormDock");
  const actions=document.getElementById("v324FormActions");
  const operation=document.getElementById("v163OperationNav");
  const active=formContextActive();
  try{document.body?.classList.toggle("sags-form-view-active",active)}catch(_){}
  if(!active){hideDock(dock);return}
  if(!mq.matches){restoreAll();return}
  if(!dock||!actions||!operation)return;

  const dockProps={
    "display":"grid",
    "position":"fixed",
    "left":"8px",
    "right":"8px",
    "bottom":"0",
    "width":"auto",
    "grid-template-columns":"minmax(0,1fr) minmax(0,1fr)",
    "grid-template-rows":"44px 44px",
    "grid-auto-flow":"row",
    "gap":"6px",
    "box-sizing":"border-box",
    "max-height":"none",
    "height":"auto",
    "overflow":"visible",
    "z-index":"24880"
  };
  for(const [k,v] of Object.entries(dockProps))force(dock,k,v);

  force(actions,"display",actions.classList.contains("show")?"contents":"none");
  force(operation,"display","contents");

  buttonLayout(document.getElementById("v1134QuickTimeBtn"),"1 / 2","1 / 2");
  buttonLayout(document.getElementById("v324PdfBtn"),"2 / 3","1 / 2");
  buttonLayout(document.getElementById("v324HandoverBtn"),"1 / 2","2 / 3");
  buttonLayout(document.getElementById("v163SignBtn"),"2 / 3","2 / 3");

  for(const b of operation.querySelectorAll(":scope > button:not(#v163SignBtn)")){
    force(b,"display","none");
  }

  measure(dock);
  if(!resizeObserver&&"ResizeObserver"in root){
    resizeObserver=new ResizeObserver(()=>measure(dock));
    resizeObserver.observe(dock);
  }
}
function schedule(){
  if(raf)return;
  raf=(root.requestAnimationFrame||function(cb){return setTimeout(cb,16)})(apply);
}
function start(){
  apply();
  setTimeout(apply,80);
  setTimeout(apply,350);
  setTimeout(apply,1200);
  observer=new MutationObserver(list=>{
    for(const m of list){
      const t=m.target?.nodeType===1?m.target:m.target?.parentElement;
      if(t===document.body||
         t?.closest?.("#sagsMobileFormDock,#v324FormActions,#v163OperationNav")||
         [...(m.addedNodes||[])].some(n=>n?.nodeType===1&&(n.id==="sagsMobileFormDock"||n.id==="v324FormActions"||n.id==="v163OperationNav"||n.querySelector?.("#sagsMobileFormDock,#v324FormActions,#v163OperationNav")))){
        schedule();break;
      }
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style","hidden"]});
  if(mq.addEventListener)mq.addEventListener("change",schedule);else mq.addListener?.(schedule);
  root.addEventListener("resize",schedule,{passive:true});
  root.addEventListener("pageshow",schedule,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()},{passive:true});
  document.addEventListener("click",schedule,true);
}
root.sagsV26SyncMobileFormDock=apply;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})(window);
