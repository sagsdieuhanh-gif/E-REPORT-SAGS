const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app/boot/05-legacy.js','utf8');
const gesture=source.slice(source.indexOf('const activeTouchPointers=new Set'),source.indexOf('(function v9LiftRemaining423Values()'));
function setup(){
  const listeners={document:{},window:{}};const timers=new Map();const opened=[];let next=0;
  const surface=name=>({addEventListener(type,fn){(listeners[name][type]??=[]).push(fn)}});
  const context=vm.createContext({Set,Math,document:surface('document'),window:surface('window'),activate:f=>opened.push(f.key),setTimeout:fn=>{timers.set(++next,fn);return next},clearTimeout:id=>timers.delete(id)});
  vm.runInContext(gesture,context);
  const emit=(name,type,event)=>{for(const fn of listeners[name][type]||[])fn(event)};
  const pointer=(id,x=0,y=0)=>({pointerType:'touch',pointerId:id,clientX:x,clientY:y});
  return {context,opened,timers,emit,pointer,
    down(id,key='field'){const e=pointer(id);emit('document','pointerdown',e);context.beginTouchHit(e,{key})},
    up(id){emit('document','pointerup',pointer(id))},
    fire(){for(const [id,fn] of [...timers]){timers.delete(id);fn()}}};
}
// A long press opens the editor, whose draw removes the original hit node.
// The next pointerup reaches the document, with no original node handler.
{
 const t=setup();t.down(1);t.fire();t.up(1);t.down(2,'next');t.up(2);
 assert.deepEqual(t.opened,['field','next']);
}
// A short tap still opens once even when both capture and rect handlers run.
{
 const t=setup();t.down(1);t.up(1);t.context.endTouchHit(t.pointer(1));t.fire();
 assert.deepEqual(t.opened,['field']);
}
// Pinch with the second finger outside a field never opens an input.
{
 const t=setup();t.down(1);t.emit('document','pointerdown',t.pointer(2));t.fire();t.up(2);t.up(1);
 assert.deepEqual(t.opened,[]);t.down(3);t.up(3);assert.deepEqual(t.opened,['field']);
}
// Scroll ends outside the field, cancellation, and hidden-page interruption.
for(const termination of ['pointerup','pointercancel','blur','pagehide','visibilitychange','touchend','touchcancel']){
 const t=setup();t.down(1);t.emit('document','pointermove',t.pointer(1,30,0));
 if(['blur','pagehide'].includes(termination))t.emit('window',termination,{});
 else if(termination==='visibilitychange'){t.context.document.hidden=true;t.emit('document',termination,{})}
 else t.emit('document',termination,termination.startsWith('touch')?{touches:[]}:t.pointer(1));
 t.fire();assert.deepEqual(t.opened,[],termination);t.down(2);t.up(2);assert.deepEqual(t.opened,['field'],termination);
}
// Redrawing while a finger is down cancels delayed activation.
{
 assert.match(source,/function draw\(\)\{cancelPendingTouchHit\(\);/);
 const t=setup();t.down(1);t.context.cancelPendingTouchHit();t.fire();t.up(1);assert.deepEqual(t.opened,[]);
 t.down(2);t.up(2);assert.deepEqual(t.opened,['field']);
}
// Native touch completion also recovers if an implicit pointer capture vanished.
{
 const t=setup();t.down(1);t.fire();t.emit('document','touchend',{touches:[]});
 t.down(2);t.up(2);assert.deepEqual(t.opened,['field','field']);
}
// Mouse and pen are not included in the touch gesture bookkeeping.
{
 const t=setup();t.emit('document','pointerdown',{pointerType:'mouse',pointerId:9});
 t.down(1);t.up(1);assert.deepEqual(t.opened,['field']);
}
console.log('Direct form touch lifecycle regression checks passed');
