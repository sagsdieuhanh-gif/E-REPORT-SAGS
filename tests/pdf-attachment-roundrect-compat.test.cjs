const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('app/boot/05-legacy.js','utf8'),start=code.indexOf('function sagsPdfRoundedRect('),end=code.indexOf('async function renderAttachmentPage(',start);
assert(start>=0&&end>start,'helper exists');
assert.equal(code.split('sagsPdfRoundedRect(ctx,x,y,w,h,r);ctx.stroke();').length-1,4,'four attachment pages use helper');
assert(!code.includes('ctx.roundRect('),'no unsupported Canvas API call');
const context={};vm.runInNewContext(code.slice(start,end)+';globalThis.draw=sagsPdfRoundedRect;',context);
for(const r of [0,28,999]){
 const steps=[],ctx={beginPath(){steps.push('begin')},moveTo(){steps.push('move')},lineTo(){steps.push('line')},quadraticCurveTo(){steps.push('curve')},closePath(){steps.push('close')}};
 context.draw(ctx,42,42,200,280,r);
 assert.equal(steps[0],'begin');assert.equal(steps.at(-1),'close');assert.equal(steps.filter(s=>s==='curve').length,4);assert.equal(steps.filter(s=>s==='line').length,4);
}
console.log('PDF attachment Canvas fallback passed all four renderers');
