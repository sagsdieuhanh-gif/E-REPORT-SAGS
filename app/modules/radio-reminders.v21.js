/* E-REPORT SAGS V2.1 – visual-only radio custody reminders.
   No QR, SMS, Zalo, email, vibrations, audio, push or external messaging.
   Only live server-backed My Flight assignments and Firestore radio states qualify. */
(function(root){
'use strict';
if(root.SAGSRadioRemindersV21)return;
const $=id=>document.getElementById(id),S=x=>String(x??'').trim();
const VN='Asia/Ho_Chi_Minh',COLLECTION='sags_radio_devices_v1',OVERDUE_MS=12*60*60*1000;
const esc=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let roster=[],devices=[],haveRoster=false,haveDevices=false,lastRosterDate='',currentUid='',listener=null,timer=null,requestInFlight=false,scheduleId=null,lastNotice='';
function dateVN(){
 const data=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:VN,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
 return data.year+'-'+data.month+'-'+data.day;
}
function clockVN(){
 const data=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:VN,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
 return Number(data.hour)*60+Number(data.minute);
}
function hhmm(raw){
 const match=S(raw).match(/^([01]\d|2[0-3]):([0-5]\d)$/);return match?Number(match[1])*60+Number(match[2]):null;
}
function signedIn(){
 const p=root.__sagsGetSession?.()?.profile||root.currentUserProfile||{};
 const uid=root.firebase?.auth?.().currentUser?.uid||'';
 const role=S(root.__sagsGetSession?.()?.role||p.role||root.currentRole).toUpperCase();
 return {uid,role,username:S(p.username||p.userName||'').toUpperCase().replace(/\s+/g,'')};
}
function isEligible(item){
 return !!item&&item.active!==false&&item.duplicateInactive!==true&&S(item.flightId||item.flightRaw||item.flightName);
}
function isDone(item){
 const val=S(item.taskStatusV333||item.workPartStatus||item.claimStatus||'').toUpperCase();
 return item.completedPushback===true||['DONE','COMPLETED','COMPLETE','FINISHED'].includes(val);
}
function explicitDutyEnd(item){
 for(const field of ['dutyEnd','shiftEnd','endShift','shiftEndTime']){
  const t=hhmm(item[field]);if(t!==null)return t;
 }return null;
}
function evaluate(assignments,machines,uid,nowMs=Date.now()){
 const active=assignments.filter(isEligible),held=machines.filter(d=>d.status==='OUT'&&d.holderUid===uid);
 const primary=held[0]||null;
 const serverMs=d=>d.updatedAt?.toMillis?.()||d.updatedAt?.toDate?.()?.getTime?.()||0;
 if(primary){
  const overdue=held.some(d=>serverMs(d)>0&&nowMs-serverMs(d)>=OVERDUE_MS);
  const finished=active.length>0&&active.every(isDone);
  const endTimes=active.map(explicitDutyEnd);
  const endReached=active.length>0&&endTimes.every(x=>x!==null)&&clockVN()>=Math.max(...endTimes);
  const needsReturn=overdue||finished||endReached||active.length===0;
  if(!needsReturn)return null;
  const allCodes=held.map(x=>S(x.code)).filter(Boolean);
  const suffix=overdue?' (đã giữ trên 12 giờ)':'';
  return {kind:'RETURN',code:primary.code,text:'Bạn đang giữ '+allCodes.join(', ')+suffix+'. '+(overdue?'Cần kiểm tra và ký trả máy ngay.':finished?'Các phân công My Flight đã hoàn thành. Nếu đã hết ca, vui lòng ký trả máy.':endReached?'Đã đến giờ kết thúc ca theo lịch phân công. Vui lòng ký trả máy.':'Hôm nay không có phân công My Flight đang hiệu lực. Hãy kiểm tra và trả máy nếu đã hết ca.')};
 }
 if(!active.some(x=>!isDone(x)))return null;
 const starts=active.map(x=>hhmm(x.dutyStart||x.shiftStart||x.startShift));
 if(starts.every(x=>x!==null)&&clockVN()<Math.min(...starts))return null;
 return {kind:'ISSUE',code:'',text:'Bạn có '+active.filter(x=>!isDone(x)).length+' phân công My Flight hôm nay nhưng chưa ký nhận bộ đàm. Vui lòng nhận máy trước khi thực hiện nhiệm vụ.'};
}
function createStyle(){
 if($('sagsRadioReminderV21Style'))return;
 const el=document.createElement('style');el.id='sagsRadioReminderV21Style';
 el.textContent='.sagsRadioReminderV21{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:10px 0;padding:12px 13px;background:#0a3244;border:1px solid #37a0a7;border-left:4px solid #75f1df;border-radius:12px;color:#ecfbff;box-sizing:border-box;font:13px/1.5 system-ui,-apple-system,sans-serif}.sagsRadioReminderV21 strong{display:block;color:#a3fff0;font-size:13px;margin-bottom:3px}.sagsRadioReminderV21 p{margin:0;font-size:12px;color:#dbedf3}.sagsRadioReminderV21Text{flex:1;min-width:175px}.sagsRadioReminderV21 button{margin-left:auto;min-height:38px;padding:9px 12px;border:0;border-radius:9px;background:#66d9d1;color:#073247;font-weight:800;font-size:12px;cursor:pointer}#fwcModal .sagsRadioReminderV21{margin:10px 8px}#v6494AviationHome .sagsRadioReminderV21{position:relative;z-index:1}@media(max-width:600px){.sagsRadioReminderV21 button{width:100%;margin:0}}';
 document.head.appendChild(el);
}
function clear(){for(const el of document.querySelectorAll('[data-sags-radio-reminder-v21]'))el.remove();lastNotice=''}
function openRadio(){
 const radioAction=document.querySelector('#v6494AviationHome [data-v6494-key="radio"]');
 if(radioAction){radioAction.click();return}
 if(root.SAGSRadioCustodyV1?.open){root.SAGSRadioCustodyV1.open();return}
 // The shell owns the lazy-loaded module; this action never bypasses its auth checks.
 root.alert?.('Vui lòng vào menu Ký nhận bộ đàm để tiếp tục.');
}
function put(parent,where,notice){
 if(!parent)return;
 let el=parent.querySelector(':scope > [data-sags-radio-reminder-v21]');
 if(!notice){el?.remove();return}
 if(!el){
  el=document.createElement('section');el.className='sagsRadioReminderV21';el.dataset.sagsRadioReminderV21='1';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  el.innerHTML='<div class="sagsRadioReminderV21Text"><strong></strong><p></p></div><button type="button">Mở ký nhận bộ đàm</button>';
  el.querySelector('button').addEventListener('click',openRadio);
  parent.insertAdjacentElement? parent.insertAdjacentElement('afterbegin',el):parent.insertBefore(el,parent.firstChild);
 }
 const heading=notice.kind==='ISSUE'?'📻 CẦN NHẬN BỘ ĐÀM':'📻 NHẮC TRẢ BỘ ĐÀM';
 if(el.querySelector('strong').textContent!==heading)el.querySelector('strong').textContent=heading;
 if(el.querySelector('p').textContent!==notice.text)el.querySelector('p').textContent=notice.text;
}
function render(){
 const panel=document.querySelector('#v6494AviationHome .v6494Scroll'),work=document.querySelector('#fwcModal.show .fwcPanel');
 if(!haveDevices||!haveRoster||!currentUid){clear();return}
 const alert=evaluate(roster,devices,currentUid);
 put(panel,'home',alert);put(work,'myflight',alert);
 if(!alert)lastNotice='';
 else lastNotice=alert.kind+':'+alert.text;
}
function detach(){
 if(listener){try{listener()}catch(_){ }listener=null}
 if(timer){clearInterval(timer);timer=null}
 if(scheduleId){clearTimeout(scheduleId);scheduleId=null}
 currentUid='';roster=[];devices=[];haveRoster=false;haveDevices=false;clear();
}
function subscribeDevices(uid){
 if(listener){try{listener()}catch(_){ }listener=null}
 haveDevices=false;
 const db=root.firebase?.firestore?.();
 if(!db)return;
 listener=db.collection(COLLECTION).onSnapshot(s=>{
  if(currentUid!==uid)return;
  // Never claim a reminder is resolved from stale offline state.
  haveDevices=!s.metadata.fromCache&&navigator.onLine;
  devices=s.docs.map(d=>({code:d.id,...d.data()}));
  render();
 },()=>{haveDevices=false;devices=[];render()});
}
async function refreshRoster(){
 if(requestInFlight||!currentUid)return;
 const user=signedIn();if(user.uid!==currentUid)return detach();
 const d=dateVN();
 if(lastRosterDate!==d){lastRosterDate=d;roster=[];haveRoster=false;render()}
 if(typeof root.sagsV478ManifestForWorker!=='function')return;
 requestInFlight=true;
 try{
  const packet=await root.sagsV478ManifestForWorker(d);
  if(currentUid!==user.uid)return;
  const username=user.username;
  const valid=packet?.opDate===d&&packet?.fromDeviceCache===false;
  roster=valid?Object.values(packet.items||{}).filter(x=>S(x.targetUser||x.user).toUpperCase().replace(/\s+/g,'')===username):[];
  haveRoster=valid;
  render();
 }catch(e){haveRoster=false;roster=[];render()}
 finally{requestInFlight=false}
}
function schedule(delay=0){
 if(scheduleId)clearTimeout(scheduleId);
 scheduleId=setTimeout(()=>{scheduleId=null;refreshRoster();render()},delay);
}
function tick(){
 const user=signedIn();
 if(!document.body.classList.contains('v157-authenticated')||!user.uid||user.role==='AD'){
  if(currentUid)detach();return;
 }
 if(currentUid!==user.uid){
  detach();currentUid=user.uid;lastRosterDate='';subscribeDevices(user.uid);
  timer=setInterval(()=>{if(!document.hidden){schedule(0);render()}},90000);
 }
 schedule(0);
}
['sags:login','sags:logout','sags:rolechange'].forEach(event=>root.addEventListener?.(event,()=>{tick();setTimeout(tick,650)}));
['sags:personal-roster-updated','sags:ui-ready'].forEach(event=>root.addEventListener?.(event,()=>schedule(200)));
root.addEventListener?.('pageshow',()=>tick(),{passive:true});
document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)tick()},{passive:true});
document.addEventListener?.('click',e=>{if(e.target?.closest?.('[data-v6494-key="myflight"],[data-v6494-key="radio"],#roleBtnRosterFlights'))schedule(500)},{passive:true,capture:true});
root.SAGSRadioRemindersV21=Object.freeze({evaluate,refresh:()=>schedule(0),active:()=>!!currentUid,delivery:'VISUAL_ONLY'});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
setTimeout(tick,1600);
})(window);
