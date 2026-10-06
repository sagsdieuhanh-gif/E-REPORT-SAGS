/* Preserve cascade order and legacy style IDs while reducing network requests. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let html=read('index.html');const build=JSON.parse(read('version.json')).build;
const configPath=path.join(root,'app/styles/boot-css-groups.json');
let groups=fs.existsSync(configPath)?JSON.parse(fs.readFileSync(configPath)):[];
if(!groups.length){
 const tags=[...html.matchAll(/<link\b[^>]*href="(\.\/app\/styles\/boot-(\d+)-[^"?]+)[^">]*"[^>]*>/g)];
 groups=[[1,18],[23,35]].map(([from,to])=>tags.filter(m=>Number(m[2])>=from&&Number(m[2])<=to).map(m=>({path:m[1],tag:m[0]})));
 fs.writeFileSync(configPath,JSON.stringify(groups,null,2)+'\n');
 for(let i=0;i<groups.length;i++){
  const rows=groups[i];if(!rows.length)continue;
  for(let j=0;j<rows.length;j++){
   const id=rows[j].tag.match(/\bid="([^"]+)"/)?.[1];
   const placeholder=id?'<style id="'+id+'" data-sags-css-source="'+rows[j].path+'"></style>':'';
   const link=j===0?'<link rel="stylesheet" href="./app/styles/boot-bundle-'+(i+1)+'.css?v='+build+'">\n':'';
   html=html.replace(rows[j].tag,link+placeholder);
  }
 }
}
const manifest=JSON.parse(read('asset-manifest.json'));
for(let i=0;i<groups.length;i++){
 const name='./app/styles/boot-bundle-'+(i+1)+'.css';
 fs.writeFileSync(path.join(root,name),groups[i].map(x=>'/* '+x.path+' */\n'+read(x.path)).join('\n'));
 manifest.assets[name]={};
}
fs.writeFileSync(path.join(root,'index.html'),html);
let sw=read('service-worker.js');
const match=sw.match(/const SAGS_BOOTSTRAP=(\[[^\n]*\]);/);
if(!match)throw Error('Bootstrap list not found');
const sources=new Set(groups.flatMap(g=>g.map(x=>x.path))),bootstrap=JSON.parse(match[1]).filter(p=>!sources.has(p));
groups.forEach((_,i)=>{const p='./app/styles/boot-bundle-'+(i+1)+'.css';if(!bootstrap.includes(p))bootstrap.push(p)});
sw=sw.replace(match[0],'const SAGS_BOOTSTRAP='+JSON.stringify(bootstrap)+';');fs.writeFileSync(path.join(root,'service-worker.js'),sw);
for(const name of Object.keys(manifest.assets)){const bytes=fs.readFileSync(path.join(root,name));manifest.assets[name]={sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}}
fs.writeFileSync(path.join(root,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Styles bundled: '+groups.map(g=>g.length).join(' + ')+' source stylesheets → '+groups.length+' requests.');
