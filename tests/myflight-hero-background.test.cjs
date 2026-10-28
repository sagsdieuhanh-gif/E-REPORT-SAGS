'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'app/styles/new-ui-v1.css'),'utf8');
assert(!css.includes('previews/final-ui/assets/ui/myflight-hero-v64101.webp'),'no stale preview assets in production stylesheet');
const urls=[...css.matchAll(/url\\(\\s*['\"]?([^'\")]+)['\"]?\\s*\\)/g)].map(m=>m[1]);
assert(urls.length>=4,'login, home and mobile drawer backgrounds are referenced');
for(const url of urls){
 if(/^(?:data:|https?:|\\/)/.test(url))continue;
 const absolute=path.resolve(root,'app/styles',url);
 assert(absolute.startsWith(root+path.sep),'CSS asset must remain within release root: '+url);
 assert(fs.existsSync(absolute),'referenced CSS background missing: '+url);
}
assert.equal(urls.filter(u=>u.endsWith('assets/branding/apron-night-v6494.webp')).length,4);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('<meta name="mobile-web-app-capable" content="yes"/>'));
console.log('My Flight background URLs verified against production asset tree');
