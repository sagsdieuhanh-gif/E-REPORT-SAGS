'use strict';
/* Private Firebase Admin worker for E-REPORT SAGS radio daily/weekly reporting.
   No Firebase or SMTP secrets in browser, source code or logs. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const PROJECT='e-report-sags',TZ='Asia/Ho_Chi_Minh';
const RECIPIENTS=Object.freeze(['HUNGHT-CXR@SAGS.VN','XUANDT-CXR@SAGS.VN','MANAGERONDUTY-CXR@SAGS.VN']);
function ymd(date){
 const x=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
 return x.year+'-'+x.month+'-'+x.day;
}
const ms=s=>Date.parse(s+'T00:00:00+07:00'),day=(s,n)=>ymd(new Date(ms(s)+n*86400000));
function range(period,now=new Date()){
 if(!['daily','weekly'].includes(period))throw Error('Invalid report type');
 const today=ymd(now);
 if(period==='daily'){const start=day(today,-1);return{period,start,end:today,key:'daily_'+start};}
 const wd=new Date(today+'T00:00:00Z').getUTCDay();
 const monday=day(today,-((wd+6)%7)),start=day(monday,-7);
 return{period,start,end:monday,key:'weekly_'+start};
}
const safe=x=>String(x??'').replace(/[\u0000-\u001f]/g,' ').slice(0,500);
const STATUS={READY:'Sẵn sàng',OUT:'Đang sử dụng',CHARGING:'Đang sạc',FAULT:'Báo hỏng',LOST:'Thất lạc'};
const WHY={BATTERY_EMPTY:'Hết pin',BATTERY_WEAK:'Pin yếu',WEAK_SIGNAL:'Sóng yếu',INTERMITTENT:'Chập chờn nguồn',AUDIO:'Lỗi loa',MIC:'Lỗi micro',PTT:'Lỗi nút bấm',CHARGING:'Lỗi sạc',DAMAGED:'Hư hỏng',LOST:'Thất lạc',OTHER:'Khác'};
function eventRow(e){
 const t=e.at?.toDate?.();
 return{time:t?new Intl.DateTimeFormat('vi-VN',{timeZone:TZ,dateStyle:'short',timeStyle:'short'}).format(t):'',
 code:safe(e.deviceCode),action:safe(e.action),actor:safe(e.actorName),actorUid:safe(e.actorUid),shift:safe(e.shift),
 from:safe(STATUS[e.beforeStatus]||e.beforeStatus),to:safe(STATUS[e.afterStatus]||e.afterStatus),
 reason:safe(WHY[e.reasonCode]||e.reasonCode),details:safe(e.details),related:safe(e.relatedDeviceCode)};
}
function summarize(devices,events,r,now=Date.now()){
 const status=Object.fromEntries(Object.keys(STATUS).map(s=>[s,devices.filter(d=>d.status===s).length]));
 const actions=Object.fromEntries(['INIT','ISSUE','RETURN','REPORT','SWAP_OUT','SWAP_IN','RELEASE'].map(s=>[s,events.filter(e=>e.action===s).length]));
 const problems=events.filter(e=>['REPORT','SWAP_OUT'].includes(e.action)).map(eventRow);
 const unresolved=devices.filter(d=>['FAULT','CHARGING','LOST'].includes(d.status)).map(d=>({code:safe(d.code),status:STATUS[d.status],reason:safe(WHY[d.faultCode]||d.faultCode)}));
 const overdue=devices.filter(d=>d.status==='OUT'&&d.updatedAt?.toMillis?.()&&now-d.updatedAt.toMillis()>43200000).map(d=>({code:safe(d.code),holder:safe(d.holderName)}));
 const counts={};for(const e of events.filter(e=>['REPORT','SWAP_OUT'].includes(e.action)))counts[e.deviceCode]=(counts[e.deviceCode]||0)+1;
 const recurring=Object.entries(counts).filter(([,count])=>count>=2).map(([code,count])=>({code,count}));
 return {period:r.period,from:r.start,to:day(r.end,-1),recipients:[...RECIPIENTS],status,actions,
 totalDevices:devices.length,totalEvents:events.length,problems,unresolved,overdue,recurring,rows:events.map(eventRow),generatedAt:new Date(now).toISOString()};
}
async function reportData(db,admin,r){
 const start=admin.firestore.Timestamp.fromDate(new Date(ms(r.start)));
 const end=admin.firestore.Timestamp.fromDate(new Date(ms(r.end)));
 const [d,e]=await Promise.all([db.collection('sags_radio_devices_v1').get(),db.collection('sags_radio_events_v1').where('at','>=',start).where('at','<',end).get()]);
 if(d.empty)throw Error('Radio inventory not initialized: no empty report sent.');
 return summarize(d.docs.map(x=>x.data()),e.docs.map(x=>x.data()),r);
}
async function reserve(db,r){
 const ref=db.collection('sags_radio_mail_runs_v1').doc(r.key),now=Date.now();
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref),prev=snap.data();
  if(prev?.status==='SENT')return null;
  if(prev?.status==='CLAIMED'&&now-Number(prev.claimAtMs||0)<15*60000)return null;
  tx.set(ref,{status:'CLAIMED',period:r.period,periodStart:r.start,periodEndExclusive:r.end,claimAtMs:now,attempts:(prev?.attempts||0)+1,recipients:[...RECIPIENTS]},{merge:true});
  return ref;
 });
}
function mail(data){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sags-radio-mail-'));
 try{
  const file=path.join(dir,'report.json');fs.writeFileSync(file,JSON.stringify(data),{mode:0o600});
  const res=spawnSync('python3',[path.join(__dirname,'radio-report-mailer.py'),file],{encoding:'utf8',timeout:70000,env:process.env,stdio:['ignore','pipe','pipe']});
  if(res.status!==0)throw Error('SMTP report delivery failed. Verify SMTP and recipient permissions.');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
}
async function main(){
 const args=process.argv.slice(2),type=args.find(a=>['daily','weekly'].includes(a)),dry=args.includes('--dry-run'),r=range(type);
 if(process.env.FIREBASE_PROJECT_ID!==PROJECT)throw Error('Wrong Firebase project. Refusing to send.');
 if(!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw Error('Firebase service account identity not configured.');
 if(!dry&&['SAGS_SMTP_HOST','SAGS_SMTP_USER','SAGS_SMTP_PASSWORD','SAGS_SMTP_FROM'].some(x=>!process.env[x]))throw Error('SMTP secrets missing. Report was not sent.');
 const admin=require('firebase-admin');
 if(!admin.apps.length)admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:PROJECT});
 const db=admin.firestore(),data=await reportData(db,admin,r);
 if(dry){console.log(JSON.stringify({status:'DRY_RUN',key:r.key,devices:data.totalDevices,events:data.totalEvents,to:[...RECIPIENTS]}));return;}
 const ref=await reserve(db,r);
 if(!ref){console.log('Report already sent or in progress: '+r.key);return;}
 try{
  mail(data);
  await ref.update({status:'SENT',sentAt:admin.firestore.FieldValue.serverTimestamp(),events:data.totalEvents,issues:data.problems.length});
  console.log('Radio report sent for '+r.key+' (3 internal recipients)');
 }catch(e){
  await ref.update({status:'FAILED',failedAt:admin.firestore.FieldValue.serverTimestamp(),errorCode:'DELIVERY_FAILED'});
  throw e;
 }
}
if(require.main===module)main().catch(e=>{console.error('Radio report aborted: '+e.message);process.exitCode=1;});
module.exports={range,summarize,RECIPIENTS,day};
