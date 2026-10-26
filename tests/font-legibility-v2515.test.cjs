const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const css=fs.readFileSync(__dirname+'/../app/styles/boot-36-v6494-aviation-final.css','utf8');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
/* Geometry and typography must remain unchanged; V1.6 deliberately themes visual fills. */
const normalize=s=>s.replace(/(?<=[{;])(\s*)(color|font-size|font-weight|letter-spacing|background|background-color|border-color|color-scheme)\s*:\s*([^;}]+)/g,'$1$2:__VISUAL__');
const structuralHash=crypto.createHash('sha256').update(normalize(css)).digest('hex');
assert.equal(structuralHash,'a0bc3d0c431ef80042a86e1964d48c1feb6ef643cb3ba4140b4826cafa5d7ef2','V1.6 altered layout/geometry outside the explicitly themeable visual CSS properties');
assert.match(css,/\.v6494Nav button span small\{[^}]*font-size:9px/);
assert.match(css,/\.v6494MobileBrand small\{[^}]*font-size:8px/);
assert.match(css,/#fwcModal\.show \.fwcSub\{color:#b9ced9/);
assert(!css.includes('@import'),'No third-party font requests');
assert.equal([...html.matchAll(/<link[^>]+rel="stylesheet"/g)].length,6,'Do not add an extra CSS request');
assert(!html.includes('ui-readable-flight360.v1.css'),'Do not restore failed V2.5.14 extra CSS');
console.log('Typography V2.5.15: original layout-rule digest and stylesheet count preserved.');
