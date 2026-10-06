const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'app/styles/new-ui-v1.css'),'utf8');
assert.match(html,/app\/boot\/32-v6494-aviation-shell\.js/);
assert.match(css,/SUPERVISOR ALL-FLIGHT HOME \+ AD CONTRAST HARDENING/);
const script=html.match(/<script id="sagsCanonicalProduction">([\s\S]*?)<\/script>/)[1];
for(const hostname of ['sagsdieuhanh-gif.github.io','e-report-sags.vercel.app']){
 let redirected='';const location={hostname,search:'?flight=TEST',hash:'#home',replace:url=>redirected=url};
 vm.runInNewContext(script,{location,URL});
 assert.equal(redirected,hostname.endsWith('.github.io')?'https://e-report-sags.vercel.app/?flight=TEST#home':'');
}
console.log('Production dashboard and canonical host contract passed');
