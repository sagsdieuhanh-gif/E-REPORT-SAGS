'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'app/modules/form-edit-history.v1.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'app/core/runtime.v503hf2.bundle.js'),'utf8'),generated=fs.readFileSync(path.join(root,'app/generated/runtime-1.js'),'utf8');
for(const text of [runtime,generated]){
 const start=text.indexOf('const menuDefs='),end=text.indexOf('const UI_BACK_KEY=',start);
 assert.ok(start>=0&&end>start,'canonical menu definition exists');
 const menu=text.slice(start,end);
 assert.match(menu,/\{key:"history",icon:"🕘",label:"Lịch sử thay đổi"/,'native visible menu item must be added');
 assert.match(menu,/action:\(\)=>root\.SAGSFormEditHistoryV1\?\.open\?\.\(\)/,'history action must open viewer directly');
 assert.match(menu,/available:\(\)=>typeof root\.SAGSFormEditHistoryV1\?\.open==="function"/,'available whenever logged-in viewer loads');
 assert.ok(menu.indexOf('key:"history"')>menu.indexOf('key:"myflight"')&&menu.indexOf('key:"history"')<menu.indexOf('key:"alerts"'),'history located directly after My Flight');
}
assert.doesNotMatch(src,/head\.appendChild\(b\)/,'do not place shortcut in disappearing/rebuilt menu containers');
assert.match(src,/actionButton\('sagsHistoryDossierShortcut'/,'workspace history entry must remain');
assert.match(src,/if\(!account\.username\)return/,'logged-in users can see their history without admin role');
assert.doesNotMatch(src,/if\(!isAdmin\(\)\)return|if\(role\(\)==='AD'\)installButtons/,'opening history must not be administrator-only');
assert.match(src,/all participating roles/,'authorized colleagues edits should be visible in assigned flight');
assert.match(src,/S\(e\.sessionId\)===S\(m\.id\)&&S\(e\.assignmentId\)===S\(m\.rosterAssignmentId\)/,'remote events must match assigned flight/session');
assert.match(src,/root\.sagsV470Ref\?\./,'backend authorization remains responsible for remote access');
assert.match(src,/sags:login/,'late login should re-install shortcuts');
assert.match(runtime,/class=\\"v157MenuItem/,'native menu styling applies equally on PC and mobile');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(index,/app\/modules\/form-edit-history\.v1\.js/,'source must load in every role');
const version=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
assert.match(version.version,/^V2\.5\.24$/);
console.log('PASS visible all-role history entry in stable menu header + workspace and authorized flight filter');
