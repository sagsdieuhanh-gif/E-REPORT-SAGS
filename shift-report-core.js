/* SAGS V4.2.24 · deterministic shift report calculations; no invented source values */
(function(root){'use strict';
const S=x=>String(x??'').trim(), U=x=>S(x).toUpperCase(), DAY=86400000;
const VN=new Set('HAN SGN CXR DAD HPH VII VDH HUI VCL UIH TBB BMV PXU DLI VCA PQC VCS VKG CAH DIN THD VDO'.split(' '));
const INT=new Set('ICN PUS TAE CJJ MWX GMP NRT HND KIX NGO FUK HKG TPE RMQ KHH KUL SIN BKK DMK PVG SHA PEK PKX CAN SZX CTU TFU CKG CZX WUH XIY HGH NKG CSX KMG NNG HFE TNA CGO HAK SYX TSN NGB WNZ WUX HET TYN LHW URC TAO DLC HRB SVO DME VKO IKT KJA OVB VVO KHV TAS ALA NQZ FRU UBN DEL BOM DOH DXB FRA MUC'.split(' '));
const dateOk=s=>/^\d{4}-\d{2}-\d{2}$/.test(S(s))&&Number.isFinite(Date.parse(s+'T00:00:00Z'));
const day=(ms)=>new Date(ms+7*3600000).toISOString().slice(0,10);
const local=ms=>Number.isFinite(ms)?new Date(ms+7*3600000).toISOString().slice(0,16):'';
const parse=v=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(S(v))?Date.parse(v+':00+07:00'):NaN;
function clock(v){const m=U(v).match(/^(\d{1,2}):?(\d{2})(?:\s*\+(\d+))?$/);return m&&+m[1]<24&&+m[2]<60?{text:m[1].padStart(2,'0')+':'+m[2],offset:+m[3]||0}:null}
function addDay(d,n){return new Date(Date.parse(d+'T00:00:00Z')+n*DAY).toISOString().slice(0,10)}
function stamp(v,d,offset=0){if(typeof v==='number'&&v>1e11)return v;if(/^\d{4}-\d{2}-\d{2}T/.test(S(v))){const x=/Z$|[+-]\d\d:\d\d$/.test(v)?Date.parse(v):parse(S(v).slice(0,16));return Number.isFinite(x)?x:null}const c=clock(v);return c&&dateOk(d)?parse(addDay(d,c.offset||offset)+'T'+c.text):null}
function preset(d,shift){return shift==='night'?{from:d+'T18:15',to:addDay(d,1)+'T08:15'}:{from:d+'T08:15',to:d+'T18:15'}}
function region(port){return VN.has(port)?'QN':INT.has(port)?'QT':'CHƯA RÕ'}
function normalize(rec,override={}){
 const date=S(rec.opDate),id=date+'/'+S(rec.flightId),ramp=rec._ramp||rec.modules?.RAMP||{},route=U(rec.route).split(/[^A-Z]+/).filter(x=>/^[A-Z]{3}$/.test(x)),cx=route.indexOf('CXR');
 const from=U(rec.route1)||(cx>0?route[cx-1]:''),dest=U(rec.route3)||(cx>=0&&cx<route.length-1?route[cx+1]:''),warnings=[];
 const sta=stamp(rec.staClock||rec.sta,rec.arrFlightDate||date,rec.arrFlightDate?0:Number(rec.staDayOffset)||0),std=stamp(rec.stdClock||rec.std,rec.depFlightDate||date,rec.depFlightDate?0:Number(rec.stdDayOffset)||0);
 const etd=stamp(rec.etdClock||rec.etd,rec.etdFlightDate||rec.depFlightDate||date,rec.etdFlightDate?0:Number(rec.etdDayOffset)||0);
 function actual(key,anchor,base){if(override[key])return parse(override[key]);const raw=ramp[key+'AtMs']||ramp[key],t=stamp(raw,ramp[key+'Date']||base);if(raw&&!Number.isFinite(t))warnings.push(key+': giờ chưa đọc được');if(Number.isFinite(t)&&Number.isFinite(anchor)&&!ramp[key+'Date']&&!ramp[key+'AtMs']&&clock(raw)&&Math.abs(t-anchor)>12*3600000){warnings.push(key+': cần xác nhận ngày thực tế (qua đêm/chậm dài)');return null}return t}
 const on=actual('chockOn',sta,rec.arrFlightDate||date),door=actual('doorClose',std,rec.depFlightDate||date),pb=actual('pushback',std,rec.depFlightDate||date);
 const arr=U(rec.arrFlight),dep=U(rec.depFlight),cancelled=rec.cancelled===true||['CANCELLED','CANCELED','CNL','HUỶ','HỦY'].includes(U(rec.status));
 const mk=(dir,num,port,plan,act)=>({key:id+'/'+dir,id,num,dir,route:dir==='ĐẾN'?(port?port+'-CXR':'CHƯA RÕ CHẶNG'):(port?'CXR-'+port:'CHƯA RÕ CHẶNG'),region:override[dir==='ĐẾN'?'arrRegion':'depRegion']||region(port),airline:num.match(/^[A-Z0-9]{2}(?=\d)/)?.[0]||'CHƯA RÕ',reg:U(rec.acReg),plan,actual:act,etd:dir==='ĐI'?etd:null,door:dir==='ĐI'?door:null,cancelled,removed:rec.rosterActive===false,reason:S(override[dir==='ĐẾN'?'arrReason':'depReason']||rec.delayReason),flightId:rec.flightId,opDate:date});
 if(!arr&&!dep)warnings.push('Thiếu số hiệu đến/đi riêng');
 if(arr&&!Number.isFinite(sta))warnings.push('Thiếu STA');if(dep&&!Number.isFinite(std))warnings.push('Thiếu STD');
 const legs=[...(arr?[mk('ĐẾN',arr,from,sta,on)]:[]),...(dep?[mk('ĐI',dep,dest,std,pb)]:[])];
 if(legs.some(l=>l.region==='CHƯA RÕ'))warnings.push('Chưa xác định quốc nội/quốc tế');
 if(Number.isFinite(on)&&Number.isFinite(pb)&&pb<on)warnings.push('PUSHBACK trước CHOCK ON: cần xác nhận ngày');
 return {id,flightId:rec.flightId,opDate:date,label:arr&&dep?arr+' / '+dep:arr||dep||S(rec.flightName),reg:U(rec.acReg),arr,dep,on,door,pb,sta,std,etd,legs,warnings,assignments:rec.assignments||{},cancelled,removed:rec.rosterActive===false,source:S(rec._source||'Hồ sơ chuyến chung')};
}
function aggregate(records,from,to,asOf,overrides={},scopeUser=''){
 const cutoff=Math.min(to,asOf),inside=t=>Number.isFinite(t)&&t>=from&&t<to&&t<=cutoff,planned=t=>Number.isFinite(t)&&t>=from&&t<to;
 const all=records.map(r=>normalize(r,overrides[S(r.opDate)+'/'+S(r.flightId)]||{}));
 const flights=all.filter(f=>!scopeUser||Object.values(f.assignments).some(a=>a.active!==false&&[a.user,...(a.coAssigneeUsers||[])].map(U).includes(U(scopeUser))));
 const relevant=flights.filter(f=>f.legs.some(l=>planned(l.plan)||inside(l.actual)||inside(l.door))||((!f.legs.length||f.legs.some(l=>!Number.isFinite(l.plan)&&!Number.isFinite(l.actual)))&&f.opDate>=day(from)&&f.opDate<=day(to-1))||(Number.isFinite(f.on)&&f.on<cutoff&&(!Number.isFinite(f.pb)||f.pb>=from)));
 const legMap=new Map(),duplicateWarnings=[];for(const l of relevant.flatMap(f=>f.legs)){const stamp=Number.isFinite(l.plan)?day(l.plan):l.opDate,key=[l.dir,l.num,stamp].join('|');if(legMap.has(key)){duplicateWarnings.push(l.num+': hồ sơ trùng lượt, chỉ tính một lần');continue}legMap.set(key,l)}
 const legs=[...legMap.values()],groups=new Map(),lists={planned:[],actual:[],delays:[],remaining:[],missing:[],changes:[],plannedPairs:[],open:[],closed:[],received:[],handover:[],pairs:[]};
 for(const l of legs){if(planned(l.plan))lists.planned.push(l);if(inside(l.actual))lists.actual.push(l);
 const groupKey=[l.airline,l.region,l.dir].join('|');if(planned(l.plan)||inside(l.actual)){if(!groups.has(groupKey))groups.set(groupKey,{airline:l.airline,region:l.region,dir:l.dir,planned:[],actual:[]});const g=groups.get(groupKey);if(planned(l.plan))g.planned.push(l);if(inside(l.actual))g.actual.push(l)}
 const delayTime=l.dir==='ĐẾN'?l.actual:l.door;if(Number.isFinite(l.plan)&&Number.isFinite(delayTime)&&delayTime>l.plan&&delayTime<=cutoff&&(planned(l.plan)||inside(delayTime)))lists.delays.push({...l,delay:Math.round((delayTime-l.plan)/60000),delayTime});
 if(planned(l.plan)&&l.plan>cutoff&&!l.cancelled&&!l.removed&&!(Number.isFinite(l.actual)&&l.actual<=cutoff))lists.remaining.push(l);
 if(planned(l.plan)&&l.plan<=cutoff&&!Number.isFinite(l.actual)&&!l.cancelled&&!l.removed)lists.missing.push(l);
 if((l.cancelled||l.removed)&&(planned(l.plan)||inside(l.actual)))lists.changes.push({...l,change:l.cancelled?'Hủy (nguồn xác nhận)':'Đã gỡ khỏi lịch; chưa kết luận hủy'});
 if(l.dir==='ĐI'&&planned(l.plan)&&Number.isFinite(l.etd)&&l.etd!==l.plan)lists.changes.push({...l,change:'STD '+local(l.plan)+' → ETD '+local(l.etd)});
 }
 for(const f of relevant){const started=Number.isFinite(f.on)&&f.on<=asOf&&f.on<to,finished=Number.isFinite(f.pb)&&f.pb<=asOf&&f.pb<to,closed=Number.isFinite(f.door)&&f.door<=asOf&&f.door<to;
 if(started&&!finished&&legs.some(l=>l.id===f.id)){lists.handover.push(f);(closed?lists.closed:lists.open).push(f);if(f.on<from)lists.received.push(f)}
 // A completed pair is counted once, in the reporting interval containing departure PUSHBACK.
 if(legs.some(l=>l.id===f.id&&l.dir==='ĐI')&&f.arr&&f.dep&&Number.isFinite(f.on)&&Number.isFinite(f.pb)&&f.on<=f.pb&&inside(f.pb))lists.pairs.push(f);
 if(legs.some(l=>l.id===f.id&&l.dir==='ĐI')&&f.arr&&f.dep&&Number.isFinite(f.sta)&&Number.isFinite(f.std)&&f.sta<=f.std&&planned(f.std))lists.plannedPairs.push(f);
 }

 for(const [listName,actualMode] of [['pairs',true],['plannedPairs',false]]){
  const taken=new Set(lists[listName].flatMap(f=>[f.id+'/ĐẾN',f.id+'/ĐI'])),pending=new Map();
  const sequence=legs.filter(l=>l.reg&&Number.isFinite(actualMode?l.actual:l.plan)).sort((a,b)=>(actualMode?a.actual:a.plan)-(actualMode?b.actual:b.plan));
  for(const l of sequence){if(taken.has(l.key))continue;const t=actualMode?l.actual:l.plan;
   if(l.dir==='ĐẾN'){pending.set(l.reg,l);continue}const a=pending.get(l.reg);
   if(a&&(actualMode?inside(t):planned(t))){lists[listName].push({id:a.id+'|'+l.id,label:a.num+' / '+l.num,reg:l.reg,on:a.actual,pb:l.actual,sta:a.plan,std:l.plan});taken.add(a.key);taken.add(l.key);pending.delete(l.reg)}
  }
 }
 return {from,to,asOf,cutoff,scopeUser,relevant,groups:[...groups.values()].sort((a,b)=>[a.airline,a.region,a.dir].join().localeCompare([b.airline,b.region,b.dir].join())),lists,warnings:[...duplicateWarnings,...relevant.flatMap(f=>f.warnings.map(w=>f.label+': '+w))],unassigned:all.filter(f=>!Object.values(f.assignments).some(a=>a.active!==false)).length};
}
root.SagsShiftCore={normalize,aggregate,preset,stamp,parse,local,day,addDay,clock};
})(typeof window==='undefined'?globalThis:window);
