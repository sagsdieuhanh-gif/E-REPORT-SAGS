'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=fs.readFileSync('app/modules/theme-contrast.v2.js','utf8');
const css=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
let emitted='';
vm.runInNewContext(source,{window:{},document:{createElement:()=>({}),head:{appendChild:s=>emitted=s.textContent}}});
const start=emitted.indexOf('/* V2.5.6 · audited legacy dialogs:');
const end=emitted.indexOf('/* V1.0 scoped A/C LIMITS surface contract.',start);
assert(start>0&&end>start,'Original generic and scoped theme ownership blocks must remain');
const generic=emitted.slice(start,end),scoped=emitted.slice(end);
let audited=0;
for(const [,selector] of generic.matchAll(/([^{}]+)\{[^{}]*\}/g)){
 if(!selector.includes('#accountManagerModal#accountManagerModal'))continue;
 audited++;
 assert(!selector.includes('#aclSimpleModal#aclSimpleModal'),
 'A/C LIMITS light editor must never inherit high-specificity generic dark dialog rules');
}
assert(audited>=10,'Other dark dialogs must retain their existing global theme rules');
for(const selector of [
 '#aclSimpleModal#aclSimpleModal .acls-panel',
 '#aclSimpleModal#aclSimpleModal .acls-top>h3',
 '#aclSimpleModal#aclSimpleModal :is(.acls-step-title',
 '#aclSimpleModal#aclSimpleModal :is(.acls-filter',
 '#aclSimpleModal#aclSimpleModal .acls-tab.active'
])assert(scoped.includes(selector),'Dedicated A/C LIMITS contrast contract missing '+selector);
assert.match(generic,/#aclSimpleModal#aclSimpleModal :is\(\.acls-step-title,\.acls-hint,\.acls-sub,#aclSVisibleCount\)\{color:#17324d!important;/,'A/C status text must use a concrete light-surface foreground');
assert(css.includes('A/C LIMITS LIGHT SURFACE CONTRAST · V1.2 HOTFIX 2026-11-22'),'Keep final CSS foreground fallback');
assert(!generic.includes(',#aclSimpleModal#aclSimpleModal'),'Old generic selector remains');
console.log('A/C LIMITS source isolation: '+audited+' dark generic selectors excluded; dedicated light contract PASS');
