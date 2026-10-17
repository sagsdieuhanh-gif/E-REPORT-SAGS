/* Canonical deployed phase/runtime sources. Do not compile the archived monolith:
 * it lacks fixes previously applied only to generated files. See RELEASE.md. */
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..'),out=path.join(root,'app/generated');
const check=process.argv.includes('--check'),read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');
function emit(p,s){if(check){if(read(p)!==s)throw Error('Generated asset out of date: '+p)}else fs.writeFileSync(path.join(root,p),s)}
for(const phase of ['shared','archive','tools','flight','control','postcontrol','performance'])emit('app/generated/core-'+phase+'.js',read('app/core/phases/core-'+phase+'.js'));
const runtime=read('app/core/runtime.v503hf2.bundle.js').split(/\/\* SAGS_RUNTIME_CHUNK:\d+ \*\/\n/).slice(1);if(runtime.length!==5)throw Error('Expected five canonical runtime chunks');runtime.forEach((s,i)=>emit('app/generated/runtime-'+(i+1)+'.js',s));
const groups=JSON.parse(read('app/generated/boot-groups.json'));groups.forEach((files,i)=>emit('app/generated/boot-group-'+(i+1)+'.js',files.map(p=>'/* '+p+' */\n'+read(p).trimEnd()+'\n').join('\n;\n')));
console.log('Canonical runtime built: 7 phases, '+runtime.length+' chunks, '+groups.length+' boot groups');

// Inline the storage decoder and codec together so old executable assets cannot
// run before the reader is available, including on an offline launch.
const storageBoot=read('app/vendor/lz-string-1.5.0.js')+'\n;\n'+read('app/modules/storage-capacity.v1.js');
const storageTag='<script id="sags-storage-capacity-bootstrap">\n'+storageBoot.replace(/<\/script/gi,'<\\/script')+'\n</script>';
for(const file of ['index.html','storage-recovery.html']){
 const index=read(file);
 const next=index.replace(/<script id="sags-storage-capacity-bootstrap">[\s\S]*?<\/script>/,()=>storageTag);
 if(next===index&&!index.includes(storageTag))throw Error('Missing storage bootstrap slot: '+file);
 emit(file,next);
}
