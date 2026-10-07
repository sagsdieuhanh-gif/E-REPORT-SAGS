const fs=require('fs'),path=require('path'),cp=require('child_process');
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
const dir=path.resolve(arg('--dir')||__dirname),results=[];
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.test.cjs')).sort()){
 const r=cp.spawnSync(process.execPath,[path.join(dir,file)],{encoding:'utf8',maxBuffer:16*1024*1024});const pass=r.status===0&&!r.error;
 results.push({test:file,pass,exitCode:r.status,output:(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error):'')});
 console.log((pass?'PASS ':'FAIL ')+file);if(!pass)console.error(results.at(-1).output.slice(0,1200));
}
if(arg('--json'))fs.writeFileSync(path.resolve(arg('--json')),JSON.stringify(results,null,2)+'\n');
const pass=results.filter(r=>r.pass).length;console.log(`Regression: ${pass} pass, ${results.length-pass} fail, ${results.length} total`);process.exitCode=pass===results.length?0:1;
