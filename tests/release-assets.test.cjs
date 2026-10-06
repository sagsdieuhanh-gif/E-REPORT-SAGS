const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'asset-manifest.json'),'utf8'));
for(const [file,metadata]of Object.entries(manifest.assets)){
 const bytes=fs.readFileSync(path.join(root,file));
 assert.equal(bytes.length,metadata.bytes,'Release asset size: '+file);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),metadata.sha256,'Release asset checksum: '+file);
}
for(const name of ['shared','archive','tools','flight','control','postcontrol','performance']){
 const source=fs.readFileSync(path.join(root,'app/core/phases/core-'+name+'.js'),'utf8').replace(/\r\n/g,'\n').trimEnd()+'\n';
 assert.equal(fs.readFileSync(path.join(root,'app/generated/core-'+name+'.js'),'utf8'),source,'Compiled phase differs from its canonical source: '+name);
}
console.log('Release asset integrity passed: '+Object.keys(manifest.assets).length+' checksums and canonical phase parity');
