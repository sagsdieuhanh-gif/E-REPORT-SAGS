/* E-REPORT SAGS V6.3.17 · GRND_LS CHECKLISTS
 * Adds two checklist tasks to every GRND_LS/CBTT flight assignment:
 * - LOAD CONTROL CHECKLIST · F/SAGS-CXR/54
 * - Airlines CLC/Captain Produce Loadsheet Checklist · F/SAGS-CXR/94
 * The base FINAL task remains unchanged.
 */
(function(root){
'use strict';
if(root.__SAGS_GRND_LS_CHECKLISTS_V6317)return;
root.__SAGS_GRND_LS_CHECKLISTS_V6317=true;
const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase();
const LOAD='LOADCONTROL_CHECKLIST',CLC='CLC_CHECKLIST',FINAL='FINAL';
function sourceKey(x){
  const src=U(x?.sourceColumn),rk=U(x?.roleKey),fg=U(x?.formGroup);
  if(rk==='CBTT'||src.includes('GRND_LS')||[FINAL,LOAD,CLC].includes(fg))return 'GRND_LS';
  return src||rk||fg||'ROSTER';
}
function canonicalForm(x){
  const g=U(x?.formGroup);
  if(g==='FSAGS'||g==='FSAGS423')return 'FSAGS423';
  return g||'FORM';
}
function label(x){
  const g=canonicalForm(x);
  if(g===LOAD)return 'LOAD CONTROL CHECKLIST';
  if(g===CLC)return 'CLC CHECKLIST';
  return '';
}
function cloneTask(base,formGroup){
  const id=S(base?.assignmentId);
  return {
    ...base,
    assignmentId:id+'__'+formGroup,
    formGroup,
    sourceColumn:'Grnd_Ls',
    roleKey:'CBTT',
    assignmentScope:'TURNAROUND',
    assignmentLeg:'',
    workPartOrder:1,
    workPartTotal:1,
    workPartSequenceSource:'Grnd_Ls',
    generatedV6317Checklist:true,
    generatedFromAssignmentId:id,
    checklistTemplateOnly:true,
    checklistCode:formGroup===LOAD?'F/SAGS-CXR/54':'F/SAGS-CXR/94'
  };
}
function expandItems(items){
  const out=[...(items||[])],seen=new Set(out.map(x=>canonicalForm(x)));
  const bases=out.filter(x=>sourceKey(x)==='GRND_LS');
  if(!bases.length)return out;
  const base=bases.find(x=>canonicalForm(x)===FINAL)||bases[0];
  if(!seen.has(LOAD))out.push(cloneTask(base,LOAD));
  if(!seen.has(CLC))out.push(cloneTask(base,CLC));
  return out;
}
function patchQueue(api){
  if(!api||api.__v6317ChecklistPatched)return false;
  if(typeof api.groupTasks!=='function'||typeof api.visibleFormTasks!=='function')return false;
  const groupBase=api.groupTasks;
  api.groupTasks=function(rows){
    const groups=groupBase.call(this,rows);
    for(const g of groups){
      const expanded=expandItems(g.items);
      if(expanded.length===g.items.length)continue;
      const baseState=g.states[g.items.findIndex(x=>sourceKey(x)==='GRND_LS')]||{};
      const oldLen=g.items.length;
      g.items=expanded;
      while(g.states.length<g.items.length)g.states.push({});
      for(let i=oldLen;i<g.items.length;i++)g.states[i]={...baseState,taskStatusV333:'UNCLAIMED',taskStatus:'UNCLAIMED',claimStatus:'UNCLAIMED',workPartStatus:'UNCLAIMED',syntheticChecklist:true};
      g.completed=g.items.every((x,i)=>api.itemCompleted(x,g.states[i]));
    }
    return groups;
  };
  api.__v6317ChecklistPatched=true;
  return true;
}
function patchLabel(){
  if(root.__SAGS_GRND_LS_CHECKLIST_LABEL_PATCH)return;
  root.__SAGS_GRND_LS_CHECKLIST_LABEL_PATCH=true;
  const style=document.createElement('style');
  style.id='sagsV6317ChecklistStyle';
  style.textContent='.v1199TaskBtn[data-task-aid*="__LOADCONTROL_CHECKLIST"],.v1199TaskBtn[data-task-aid*="__CLC_CHECKLIST"]{flex-basis:180px}';
  document.head.appendChild(style);
}
function install(){
  patchLabel();
  const api=root.__SAGS_DAILY_ROSTER_FINAL_V1199;
  patchQueue(api);
}
install();setTimeout(install,300);setTimeout(install,1200);setTimeout(install,3000);
root.addEventListener?.('pageshow',install,{passive:true});
})(typeof window!=='undefined'?window:globalThis);
