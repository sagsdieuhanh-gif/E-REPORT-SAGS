(function(root){"use strict";
if(root.__SAGS_MOBILE_FORM_DOCK_V1)return;root.__SAGS_MOBILE_FORM_DOCK_V1=true;
const $=id=>document.getElementById(id);
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/Đ/g,"D").toUpperCase().replace(/\s+/g," ").trim();
let raf=0,observer=null,observed=null;
function tag(){
 raf=0;
 const dock=$("sagsMobileFormDock"),actions=$("v324FormActions"),sign=$("v163SignBtn");
 if(!dock||!actions)return false;
 for(const b of actions.querySelectorAll("button")){
   b.classList.remove("sagsDockQuick","sagsDockExport","sagsDockComplete");
   const t=norm(b.textContent);
   if(t.includes("NHAP NHANH"))b.classList.add("sagsDockQuick");
   else if(t.includes("XUAT"))b.classList.add("sagsDockExport");
   else if(t.includes("HOAN TAT"))b.classList.add("sagsDockComplete");
 }
 if(sign)sign.classList.add("sagsDockSign");
 if(observed!==dock){
   try{observer?.disconnect()}catch(_){}
   observed=dock;observer=new MutationObserver(schedule);observer.observe(dock,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class","style"]});
 }
 return true;
}
function schedule(){if(raf)return;raf=(root.requestAnimationFrame||setTimeout)(tag)}
function install(){tag();setTimeout(tag,80);setTimeout(tag,350)}
"loading"===document.readyState?document.addEventListener("DOMContentLoaded",install,{once:true}):install();
document.addEventListener("click",schedule,true);
root.addEventListener("pageshow",()=>setTimeout(tag,60),{passive:true});
root.sagsSyncMobileFormDock=tag;
})(window);
