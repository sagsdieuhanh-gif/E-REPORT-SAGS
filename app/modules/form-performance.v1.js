/* Opt-in local performance recording; no telemetry, form values, or UI changes. */
(function(root){
 'use strict';
 const enabled=root.__SAGS_FORM_PERF__===true||new URLSearchParams(root.location?.search||'').get('sags_perf')==='1';
 const p=root.performance,history=[];let click=null,sequence=0,current=null;
 const names=['form-open-start','form-session-ready','form-local-data-ready','form-server-data-ready','form-render-start','form-first-visible','form-interactive'];
 const now=()=>p?.now?.()||0;
 function mark(t,name){if(!t||t.closed||t.marks[name]!==undefined)return;t.marks[name]=now();try{p.clearMarks?.(name);p.mark(name);p.mark('sags-form:'+t.id+':'+name)}catch(_){}return t.marks[name]}
 function start(){if(!enabled||!p)return null;if(current&&!current.closed)finish(current,'superseded');const t={id:++sequence,start:click&&now()-click<10000?click:now(),marks:{},spans:[],status:'opening'};click=null;current=t;mark(t,'form-open-start');t.marks['form-open-start']=t.start;return t}
 function begin(t,category,label){return t&&!t.closed?{category,label,start:now()}:null}
 function end(t,s){if(t&&!t.closed&&s)t.spans.push({...s,end:now(),durationMs:Math.max(0,now()-s.start)})}
 function finish(t,status='interactive'){if(!t||t.closed)return;t.status=status;t.closed=true;const first=t.marks['form-first-visible'],interactive=t.marks['form-interactive'];t.clickToFirstVisibleMs=first===undefined?null:first-t.start;t.clickToInteractiveMs=interactive===undefined?null:interactive-t.start;t.unmeasured=['IndexedDB','Firebase transport','image readiness'];history.push(t);if(history.length>30){const old=history.shift();for(const name of names){try{p.clearMarks?.('sags-form:'+old.id+':'+name);p.clearMeasures?.('sags-form:'+old.id+':'+name)}catch(_){}}}for(const name of ['form-first-visible','form-interactive'])if(t.marks[name]!==undefined)try{p.measure('sags-form:'+t.id+':'+name,{start:t.start,end:t.marks[name]})}catch(_){}return t}
 function rendered(t){if(!t||t.closed)return;const frame=root.requestAnimationFrame||function(fn){return setTimeout(fn,16)};frame(()=>{if(t!==current||t.closed||root.document?.hidden)return;frame(()=>{if(t!==current||t.closed||root.document?.hidden)return;mark(t,'form-first-visible');if(t.ready)interactive(t)})})}
 function interactive(t){if(!t||t.closed)return;t.ready=true;if(t.marks['form-first-visible']!==undefined){mark(t,'form-interactive');finish(t)}}
 if(enabled)root.document?.addEventListener('click',e=>{if(e.target?.closest?.('[data-task-aid],[data-task-open],.v1199TaskBtn'))click=now()},true);
 root.sagsFormPerformance={enabled,start,mark,begin,end,finish,rendered,interactive,current:()=>current,results:()=>JSON.parse(JSON.stringify(history)),names};
})(typeof window!=='undefined'?window:globalThis);
