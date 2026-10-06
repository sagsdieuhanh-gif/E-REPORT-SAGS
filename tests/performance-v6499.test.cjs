const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shell=read('app/boot/32-v6494-aviation-shell.js');
const home=read('app/modules/aviation-reference.v1.js');
const prefs=read('app/modules/ui-preferences.v1.js');
const roster=read('app/modules/daily-roster.v502.js');
const enh=read('app/boot/33-v6497-dossier-enhancements.js');
const settings=read('app/modules/settings.v1.js');
const flightLite=read('app/modules/roster-lite.v5.js');

assert.doesNotMatch(shell,/observe\(document\.body,\{subtree:true/,'aviation shell must not observe whole DOM subtree');
assert.doesNotMatch(shell,/setInterval\(/,'aviation shell must not poll');
assert.doesNotMatch(home,/new MutationObserver/,'Home reference UI must be event-driven');
assert.doesNotMatch(prefs,/setInterval\(.*1200/,'UI preferences must not rescan every 1.2 seconds');
assert.doesNotMatch(prefs,/observe\(document\.documentElement,\{subtree:true/,'UI polish must not observe whole document subtree');
assert.doesNotMatch(settings,/setInterval\(/,'Settings must not poll');
assert.doesNotMatch(settings,/observe\(document\.body,\{subtree:true/,'Settings observer must stay scoped to menu');
assert.doesNotMatch(flightLite,/observe\(document\.body,\{childList:true,subtree:true\}/,'Flight search observer must stay scoped to fwcBody');

const rs=roster.slice(roster.indexOf('async function readState(aid,force=false){'),roster.indexOf('const dossierDocCache',roster.indexOf('async function readState(aid,force=false){')));
assert.match(rs,/roster_sessions\/['"]?\+safe\(aid\)/,'queue status must read compact assignment session root once');
assert.doesNotMatch(rs,/QUEUE_STATUS_FIELDS\.map/,'queue status must not issue one RTDB request per field');
assert.doesNotMatch(roster,/sagsAirlineFormPolicy\?\.ready\(true\)/,'Receive action must not force-refresh airline policy');

const inputLine=(enh.match(/document\.addEventListener\('input'[^\n]+/)||[''])[0];
assert.ok(inputLine,'uppercase input listener must exist');
assert.doesNotMatch(inputLine,/uppercaseFormState/,'typing must not rescan entire form state on each keystroke');

console.log('Performance regression passed: no global UI polling/observers and compact My Flight status reads.');
