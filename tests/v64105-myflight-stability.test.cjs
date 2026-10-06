const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const file of ['app/generated/runtime-1.js','app/core/runtime.v503hf2.bundle.js']){
  const src=read(file);
  assert.match(src,/const ownSel="[^"]*#fwcModal[^"]*"/,file+' must exclude MY FLIGHT from the global UI MutationObserver');
  const a=src.indexOf('function decorateWorkMenuHeader()');
  const b=src.indexOf('function openMyFlightFromCurrentUi',a);
  assert(a>=0&&b>a,file+' decorateWorkMenuHeader missing');
  const fn=src.slice(a,b);
  assert.match(fn,/textContent!=="☰ MENU"/,file+' MENU text write must be idempotent');
  assert.match(fn,/home\.style\.display!==display/,file+' home-button display write must be idempotent');
  assert.match(fn,/back\.textContent!==backText/,file+' back-button text write must be idempotent');
  assert.match(fn,/if\(close\.textContent!=="☰ MENU"\)close\.textContent="☰ MENU"/,file+' MENU text assignment must stay guarded');
}
const roster=read('app/modules/daily-roster.v502.js');
assert.match(roster,/h&&h\.textContent!==\'MY FLIGHT\'/,'daily roster header must share the same stable MY FLIGHT title');
assert.doesNotMatch(roster,/h\.textContent=\'✈ MY FLIGHT\'/,'daily roster must not toggle the title against the shell');

const flight=read('app/generated/core-flight.js');
assert.match(flight,/function formAssignmentBadges\(rec\)/,'all-flight cards need generated-form assignment summaries');
assert.match(flight,/fwcFormOverviewTitle/,'flight card overview title missing');
assert.match(flight,/BIỂU MẪU CỦA CHUYẾN BAY/,'flight card form overview heading missing');
assert.match(flight,/st\.completedBy\|\|st\.claimedBy\|\|st\.ownerUser\|\|item\.user\|\|item\.targetUser/,'form summary must surface the responsible/actual user');
assert.match(flight,/configuredFlightFormLabel\("fsags54"/,'54 label must honor Form Manager naming');
assert.match(flight,/configuredFlightFormLabel\("fsags94"/,'94 label must honor Form Manager naming');
assert.match(flight,/renderCargoAllFlights[\s\S]{0,1800}hydrateFlightAssignments/,'Kho hàng/all-flight view must hydrate form owners and live statuses before rendering');

console.log('V6.4.105 MY FLIGHT stability + form overview regression passed.');
