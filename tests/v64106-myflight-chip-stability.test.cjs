const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const flight=read('app/generated/core-flight.js');
const roster=read('app/modules/daily-roster.v502.js');
const runtime1=read('app/generated/runtime-1.js');
const runtime2=read('app/generated/runtime-2.js');
const css=read('app/styles/new-ui-v1.css');

assert.match(flight,/fwcFormChipRail/,'MY FLIGHT must use compact chip rail');
assert.match(flight,/fwcFormChip /,'form chips missing');
assert.match(flight,/function ensureListShell\(date\)/,'stable shell helper missing');
assert.match(flight,/function applyListMarkup\(markup\)/,'stable list diff helper missing');
assert.match(flight,/if\(!list\|\|markup===lastListMarkup\)return false/,'identical card markup must not be rewritten');
assert.match(flight,/flightWorkspacePrepareShell/,'lightweight personal MY FLIGHT shell missing');

assert.match(roster,/flightWorkspacePrepareShell/,'employee queue must use lightweight shell');
assert.match(roster,/if\(!allFlightScope\(\)\)\{await renderPersonal\(d\);return true\}/,'employee refresh must bypass all-flight renderer');
assert.doesNotMatch(roster,/setTimeout\(\(\)=>renderPersonal\(d\),80\)/,'old delayed double-render path must be removed');
assert.doesNotMatch(roster,/setTimeout\(\(\)=>renderPersonal\(d\),100\)/,'old delayed refresh double-render path must be removed');

assert.match(runtime1,/mailPriming=true/,'mailbox startup replay guard missing');
assert.match(runtime1,/mailQueuedAdds/,'mailbox initial child replay queue missing');
assert.match(runtime1,/typeof root\.flightWorkspaceRefresh==="function"\?root\.flightWorkspaceRefresh/,'realtime refresh must prefer stable refresh');
assert.match(runtime2,/installTimer=setTimeout\(\(\)=>\{if\(!document\.hidden\)install\(\)\},140\)/,'whole-document cleanup observer must be debounced');

assert.match(css,/V6\.4\.106 · MY FLIGHT COMPACT CHIP RAIL/);
assert.match(css,/flex-wrap:nowrap!important/,'chips must stay on one horizontal row');
assert.match(css,/overflow-x:auto!important/,'chip rail must scroll horizontally when needed');

console.log('V6.4.106 compact chips, flicker prevention and observer performance regression passed');
