'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let css='';
vm.runInNewContext(fs.readFileSync('app/modules/theme-contrast.v2.js','utf8'),{
 window:{},document:{createElement:()=>({}),head:{appendChild:st=>{css=st.textContent}}}
});
const style=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
const palettes={
 light:{'--et-card':'#ffffff','--et-raised':'#f0f4f8','--et-fg':'#111827','--et-sub':'#334155','--et-edge':'#b8c5d3'},
 dark:{'--et-card':'#151d2a','--et-raised':'#202b3b','--et-fg':'#f8fafc','--et-sub':'#dbe4ee','--et-edge':'#52677c'}
};
for(const [theme,defs] of Object.entries(palettes)){
 assert.ok(style.includes('data-ui-theme="'+theme+'"'),theme+' palette selector missing');
 for(const [name,color] of Object.entries(defs))assert.ok(style.includes(name+':'+color),'Palette mismatch: '+theme+' '+name);
}
const resolve=(raw,theme)=>{
 const v=String(raw||'').trim();
 if(/^#[0-9a-f]{6}$/i.test(v))return v;
 const match=v.match(/^var\((--et-[\w-]+),(#[0-9a-f]{6})\)$/i);
 if(match)return palettes[theme][match[1]]||match[2];
 throw Error('Unsafe/non-semantic UI color: '+v+' for '+theme);
};
const luminance=hex=>{
 const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255)
  .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
};
let pairs=0;
function check(fg,bg,label,theme){
 const a=luminance(resolve(fg,theme)),b=luminance(resolve(bg,theme));
 const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 assert.ok(ratio>=4.5,label+' '+theme+': '+fg+' on '+bg+' is '+ratio.toFixed(2)+':1');
 pairs++;
}
const revised=css.slice(css.indexOf('/* V2.5.6'));
let dialogThemes=0,settingsThemes=0;
for(const [,selector,body] of revised.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
 const props=Object.fromEntries([...body.matchAll(/([\w-]+)\s*:\s*([^;]+);?/g)]
  .map(m=>[m[1],m[2].replace(/!important/g,'').trim()]));
 for(const prefix of ['sags-dialog','sc']){
  if(!props['--'+prefix+'-bg'])continue;
  if(prefix==='sags-dialog')dialogThemes++;else settingsThemes++;
  const modes=selector.includes('data-ui-theme="light"')?['light']:selector.includes('data-ui-theme="dark"')?['dark']:['light','dark'];
  for(const mode of modes){
   check(props['--'+prefix+'-fg'],props['--'+prefix+'-bg'],prefix+' main',mode);
   check(props['--'+prefix+'-fg'],props['--'+prefix+'-card'],prefix+' card',mode);
   check(props['--'+prefix+'-muted'],props['--'+prefix+'-bg'],prefix+' muted',mode);
   check(props['--'+prefix+'-muted'],props['--'+prefix+'-card'],prefix+' card muted',mode);
   check(props['--'+prefix+'-button-fg'],props['--'+prefix+'-button'],prefix+' button',mode);
  }
 }
 if(/^#[0-9a-f]{6}$/i.test(props.color||'')&&/^#[0-9a-f]{6}$/i.test(props.background||''))
  check(props.color,props.background,selector.slice(-80),'light');
}
assert.equal(dialogThemes,2,'dialogs need two mode palettes');
assert.equal(settingsThemes,2,'settings need two mode palettes');
assert.ok(pairs>=20,'Theme must validate at least 20 foreground/background pairs');
console.log('Dialog contrast: '+pairs+' real palette light/dark combinations verified >=4.5:1');
