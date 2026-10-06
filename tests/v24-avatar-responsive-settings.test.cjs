const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const settings=read('app/modules/settings.v1.js');
const shell=read('app/boot/32-v6494-aviation-shell.js');
const css=read('app/styles/new-ui-v1.css');
const ver=JSON.parse(read('version.json'));

assert.match(ver.version,/^V2\.\d+$/,'Avatar/Settings contract requires a V2 release');
assert.ok(ver.build.startsWith(ver.version+'-'),'Avatar/Settings contract requires build/version alignment');

for(const id of ['v157DrawerAvatar','sagsWelcomeAvatar','v6494Avatar','v6494TopAvatar','v6494MobileAvatar']){
  assert.ok(settings.includes("'"+id+"'")||settings.includes('"'+id+'"'),'Settings profile sync missing avatar surface '+id);
}
for(const id of ['v6494Name','v6494TopName','v6494MobileName']){
  assert.ok(settings.includes("'"+id+"'")||settings.includes('"'+id+'"'),'Settings display-name sync missing '+id);
}
assert.match(settings,/sags:profile-display-updated/,'profile update event missing');
assert.match(settings,/sagsApplyProfileUi=applyProfile/,'profile UI refresh API missing');
assert.match(shell,/id="v6494TopAvatar"/,'PC top-bar avatar markup missing');
assert.match(shell,/sagsGetSettings/,'home shell must read display preferences');
assert.match(shell,/avatarData/,'home shell must read custom avatar data');
assert.match(shell,/\['v6494Avatar','v6494TopAvatar','v6494MobileAvatar'\]/,'home shell must update all identity avatar surfaces');
assert.match(shell,/sags:profile-display-updated/,'home shell must react immediately to avatar/profile changes');

assert.match(css,/@media \(min-width:901px\)\{/,'dedicated PC Settings layout missing');
assert.match(css,/@media \(max-width:760px\)\{/,'dedicated mobile Settings layout missing');
assert.match(css,/\.v6494TopAvatar\{/,'PC top-bar avatar styling missing');
assert.match(css,/\.v6494TopUser\{/,'PC top identity wrapper missing');
assert.match(css,/\.v6494TopAvatar,\.v6494TopUser\{display:none!important\}/,'mobile must hide desktop top identity avatar');
assert.match(css,/\.sagsSettingsLayout\{grid-template-columns:292px minmax\(0,1fr\)\}/,'PC Settings must use fixed sidebar + content');
assert.match(css,/\.sagsSettingsLayout\{display:flex;flex-direction:column;min-height:0\}/,'mobile Settings must switch to vertical full-screen flow');
assert.match(css,/\.sagsSettingsNav button span\{display:inline!important\}/,'mobile Settings tabs must keep readable labels');

console.log(ver.version+' avatar identity + dedicated PC/mobile Settings regression passed');
