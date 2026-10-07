const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');let failed=0,count=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(js|cjs)$/.test(e.name)){count++;const r=cp.spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status!==0){failed++;console.error(r.stderr||r.error)}}}}
walk(root);console.log(`Syntax: ${count} files, ${failed} failures`);process.exitCode=failed?1:0;
