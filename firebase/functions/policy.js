/* Pure 48-hour lifecycle policy, shared by browser and Firebase tests. */
(function(root,factory){
  const policy=factory();
  if(typeof module==='object'&&module.exports)module.exports=policy;
  else root.SAGSFlightRetentionPolicy=policy;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const TTL=48*60*60*1000;
  const clock=v=>/^(?:[01]?\d|2[0-3])[:.]?[0-5]\d$/.test(String(v??'').trim());
  function door(state={}){
    for(const k of ['h21Start','f421_h21Start','f551_h21Start','vz_cabinDoorClosed']){
      const v=String(state[k]??'').trim();if(clock(v))return k+':'+v.replace(/[.:]/,'');
    }
    return '';
  }
  function transition(previous,state,now){
    const signature=door(state);
    if(!signature)return null;
    const same=previous?.doorSignature===signature&&Number(previous.completedAtMs)>0;
    const completedAtMs=same?Number(previous.completedAtMs):now;
    return {schema:1,doorSignature:signature,completedAtMs,expiresAtMs:completedAtMs+TTL};
  }
  function due(record,now){return !!record&&Number(record.completedAtMs)>0&&Number(record.expiresAtMs)===Number(record.completedAtMs)+TTL&&now>=Number(record.expiresAtMs);}
  function keys(value={}){
    const values=[[value.matchKey],value.matchKeys,value.rampMatchKeys,value.identity?.matchKeys,value.identity?.rampMatchKeys,value.package?.matchKeys,value.package?.identity?.matchKeys,value.finalSnapshot?.matchKeys];
    const out=new Set(values.flatMap(x=>Array.isArray(x)?x:[]).filter(x=>/^FS09\|\d{8}\|[A-Z0-9]+\|[A-Z0-9]+\|CXR$/.test(String(x))));
    for(const i of [value.identity,value.package?.identity,value.finalSnapshot?.identity,value].filter(Boolean)){
    for(const flight of [...(Array.isArray(i.flights)?i.flights:[]),i.flightToken].filter(Boolean)){
      const k=['FS09',i.dateToken,flight,i.acRegToken,'CXR'].join('|');
      if(/^FS09\|\d{8}\|[A-Z0-9]+\|[A-Z0-9]+\|CXR$/.test(k))out.add(k);
    }
    }
    return [...out];
  }
  const intersects=(a,b)=>a.some(k=>b.includes(k));
  return {TTL,clock,door,transition,due,keys,intersects};
});
