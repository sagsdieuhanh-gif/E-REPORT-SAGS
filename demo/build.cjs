const fs=require('fs'),path=require('path');
const source=path.resolve(__dirname,'..'),out=path.join(__dirname,'dist');
require('child_process').execFileSync(process.execPath,[path.join(source,'tests/run.cjs')],{stdio:'inherit'});
fs.mkdirSync(out,{recursive:true});
for(const name of ['app','assets','data','forms','pdf-bg','index.html','repair.html','service-worker.js','version.json','asset-manifest.json','manifest.webmanifest','favicon.ico']){const file=path.join(source,name);if(fs.existsSync(file))fs.cpSync(file,path.join(out,name),{recursive:true});}
console.log('Static V1 package ready.');
