'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('app/styles/aviation-reference.v1.css','utf8');
const marker='PC SHELL READABILITY · 2026-11-22';
const start=css.indexOf(marker);
assert(start>0,'Desktop readability owner must exist in the last-loaded screen stylesheet');
assert.equal(css.lastIndexOf(marker),start,'Only one desktop readability owner may exist');
const layer=css.slice(start);
assert.match(layer,/@media screen and \(min-width:1024px\)/,'Desktop-only rules required');
assert.match(layer,/@media screen and \(min-width:768px\) and \(max-width:1199px\)/,'Compact desktop breakpoint required');
for(const selector of [
 '#v6494AviationHome .v6494Side',
 '#v6494AviationHome .v6494Nav button span b',
 '#v6494AviationHome .v6494Top',
 '#v6494AviationHome .v6494Scroll',
 '#v6494AviationHome #opsHomeMetrics',
 '#opsAirlineStrip .opsAirlineIdentity small',
 '#opsHomeFlights :is(th,td)',
 '#opsHomeQueue .opsFlightTableWrap',
 '#fwcModal.show .fwcPanel',
 '#fwcModal.show .fwcTools',
 '#fwcList.v1199Queue .v1199FlightGrid',
 '#sagsSettingsCenter .sagsSettingsLayout',
 '#sagsSettingsCenter .sagsSettingsContent',
 '#roleLoginModal .roleLoginCard input'
]) assert(layer.includes(selector),'Desktop screen surface missing: '+selector);
for(const rule of [
 'font-size:14.5px!important',
 'font-size:15px!important',
 'font-size:16px!important',
 'flex-wrap:wrap!important',
 'grid-template-columns:repeat(2,minmax(0,1fr))!important',
 'overflow-x:auto!important',
 'min-width:0!important'
]) assert(layer.includes(rule),'Readability or overlap guard missing: '+rule);
for(const forbidden of ['@import','transform:scale(', 'zoom:', '.sheet', '.form-page','svg text','[id^="page"]','@media print']) {
 assert(!layer.includes(forbidden),'Do not affect paper/PDF/print/zoom: '+forbidden);
}
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('app/styles/aviation-reference.v1.css?v='),'Canonical screen stylesheet is loaded');
assert(html.indexOf('app/styles/new-ui-v1.css?v=')<html.indexOf('app/styles/aviation-reference.v1.css?v='),
 'Desktop correction layer must follow the historical UI cascade');
console.log('PC typography, overlapping controls, compact laptop and PDF isolation PASS');
