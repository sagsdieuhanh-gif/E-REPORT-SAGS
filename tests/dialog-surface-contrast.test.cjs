const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let css='';vm.runInNewContext(fs.readFileSync('app/modules/theme-contrast.v2.js','utf8'),{window:{},document:{createElement:()=>({}),head:{appendChild:style=>{css=style.textContent}}}});
const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb.reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0)};
let pairs=0;const check=(fg,bg,label)=>{const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,`${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);pairs++};
const revised=css.slice(css.indexOf('/* V2.5.6'));
let dialogThemes=0,settingsThemes=0;
for(const [,selector,body]of revised.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
 const props=Object.fromEntries([...body.matchAll(/([\w-]+)\s*:\s*([^;]+);?/g)].map(x=>[x[1],x[2].replace(/!important/g,'').trim()]));
 for(const prefix of ['sags-dialog','sc']){
  if(!props['--'+prefix+'-bg'])continue;
  if(prefix==='sags-dialog')dialogThemes++;else settingsThemes++;
  check(props['--'+prefix+'-fg'],props['--'+prefix+'-bg'],prefix+' main');
  check(props['--'+prefix+'-fg'],props['--'+prefix+'-card'],prefix+' card');
  check(props['--'+prefix+'-muted'],props['--'+prefix+'-bg'],prefix+' secondary');
  check(props['--'+prefix+'-muted'],props['--'+prefix+'-card'],prefix+' card secondary');
  check(props['--'+prefix+'-button-fg'],props['--'+prefix+'-button'],prefix+' button');
 }
 if(/^#[0-9a-f]{6}$/i.test(props.color||'')&&/^#[0-9a-f]{6}$/i.test(props.background||''))check(props.color,props.background,selector.slice(-100));
}
assert.equal(dialogThemes,2,'dialogs must have dark and light surface pairs');assert.equal(settingsThemes,2,'settings must have dark and light surface pairs');assert.ok(pairs>=20);
console.log(`Dialog surface contrast: ${pairs} actual emitted color pairs >=4.5:1`);
