'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
const base=fs.readFileSync('app/generated/core-tools.js','utf8');
const contrast=fs.readFileSync('app/modules/theme-contrast.v2.js','utf8');
const marker='A/C LIMITS LIGHT SURFACE CONTRAST · V1.2 HOTFIX 2026-11-22';
const pos=css.indexOf(marker);
assert(pos>0,'A/C LIMITS contrast layer missing from the final application stylesheet');
assert.equal(css.lastIndexOf(marker),pos,'A/C LIMITS light surface must have one final correction layer');
const layer=css.slice(pos);
for(const target of [
 '#aclSimpleModal#aclSimpleModal .acls-panel',
 '#aclSimpleModal#aclSimpleModal :is(.acls-step,.acls-type,.acls-help',
 '.acls-step-title,.acls-type>label,.acls-grid>label',
 '.acls-hint,.acls-sub,.acls-meta',
 '.acls-reg,.acls-date,.acls-filter,.acls-textarea',
 '.acls-types.disabled .acls-type',
 '.acls-num',
 '.acls-top h3',
 '.acls-save',
 '.acls-tab.active'
])assert(layer.includes(target),'Missing A/C LIMITS readable surface: '+target);
for(const token of ['background:#fff!important','color:#17324d!important','-webkit-text-fill-color:#17324d!important','color-scheme:light!important','opacity:.86!important'])assert(layer.includes(token),'Missing Safari/text readability guard: '+token);
assert(base.includes('id="aclSReg" class="acls-reg"'));
assert(base.includes('id="aclSFrom" class="acls-date"'));
assert(base.includes('id="aclSTo" class="acls-date"'));
assert(base.includes('class="acls-step-title"'));
assert(contrast.includes('V1.0 scoped A/C LIMITS surface contract'),'Keep pre-existing contrast theme support');
for(const forbidden of ['@import','transform:scale(','.form-page','svg text','@media print'])assert(!layer.includes(forbidden),'Do not affect other forms or print: '+forbidden);
console.log('V1.2 A/C LIMITS readable labels, help, dates and dark/light-theme isolation PASS');
