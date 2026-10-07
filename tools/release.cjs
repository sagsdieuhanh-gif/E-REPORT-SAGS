/* Only this command declares a release ready. Any failed stage stops the build. */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
// Match the repository's LF contract BEFORE hashing; do not hash Windows checkout bytes.
function normalize(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())normalize(p);else if(/\.(js|cjs|css|html|json|webmanifest|svg)$/.test(e.name)){const s=fs.readFileSync(p,'utf8');if(s.includes('\r\n'))fs.writeFileSync(p,s.replace(/\r\n/g,'\n'))}}}
normalize(root);
for(const stage of ['tools/build-runtime.cjs','tools/build-styles.cjs','tools/release-manifest.cjs','tools/check-syntax.cjs','tests/run.cjs']){console.log('Release stage: '+stage);const r=cp.spawnSync(process.execPath,[path.join(root,stage)],{cwd:root,stdio:'inherit'});if(r.status!==0){console.error('RELEASE NOT READY: '+stage);process.exit(r.status||1)}}
require('./release-manifest.cjs').verify();console.log('RELEASE READY (local checks only; production approval required)');
