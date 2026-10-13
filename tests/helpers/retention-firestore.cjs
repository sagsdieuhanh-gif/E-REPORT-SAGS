/* Firestore simulator for behavioral worker tests, with sorted bounded cursors. */
module.exports=function fakeFirestore(seed){
 const rows=new Map(Object.entries(seed));
 const getField=(obj,path)=>path.split('.').reduce((x,k)=>x?.[k],obj);
 const snapshot=path=>{const original=rows.get(path);return {id:path.split('/').at(-1),exists:rows.has(path),data:()=>original,ref:doc(path)};};
 function doc(path){return {id:path.split('/').at(-1),path,get:async()=>snapshot(path),set:async(x,o)=>rows.set(path,o?.merge?{...rows.get(path),...x}:x),delete:async()=>rows.delete(path)}}
 function query(collection,filters=[],opts={}){
  const next=patch=>query(collection,filters,{...opts,...patch});
  return {doc:id=>doc(collection+'/'+id),where:(field,op,value)=>query(collection,[...filters,{field,op,value}],opts),orderBy:field=>next({order:[...opts.order||[],field]}),limit:n=>next({limit:n}),startAt:(...args)=>next({start:args,inclusive:true}),startAfter:(...args)=>next({start:args,inclusive:false}),endAt:value=>next({end:value}),get:async()=>{
   const value=(path,field)=>field==='__name__'?path.split('/').at(-1):getField(rows.get(path),field);
   let paths=[...rows.keys()].filter(path=>path.startsWith(collection+'/')&&!path.slice(collection.length+1).includes('/')).filter(path=>filters.every(({field,op,value:wanted})=>{const x=value(path,field);return op==='array-contains'?Array.isArray(x)&&x.includes(wanted):op==='=='?x===wanted:op==='<='?x<=wanted:false}));
   if(opts.order){paths=paths.filter(path=>opts.order.every(field=>value(path,field)!==undefined));paths.sort((a,b)=>{for(const field of opts.order){const av=value(a,field),bv=value(b,field);if(av!==bv)return av<bv?-1:1;}return 0});}
   if(opts.end!==undefined)paths=paths.filter(path=>value(path,opts.order[0])<=opts.end);
   if(opts.start)paths=paths.filter(path=>{for(let n=0;n<opts.start.length;n++){const x=value(path,opts.order[n]),v=opts.start[n];if(x!==v)return x>v;}return opts.inclusive;});
   return {docs:paths.slice(0,opts.limit??Infinity).map(snapshot)};
  }};
 }
 return {rows,collection:c=>query(c),runTransaction:async fn=>{const writes=[];const tx={get:ref=>ref.get(),set:(ref,x,o)=>writes.push(()=>ref.set(x,o)),delete:ref=>writes.push(()=>ref.delete())};const result=await fn(tx);for(const write of writes)await write();return result},batch:()=>{const writes=[];return {delete:ref=>writes.push(ref),commit:async()=>{for(const ref of writes)await ref.delete()}}}};
};
