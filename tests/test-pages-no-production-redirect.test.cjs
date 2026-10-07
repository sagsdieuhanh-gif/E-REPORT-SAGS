/* The repository entry is a production candidate, not a resettable TEST deployment.
 * Keep the historical filename; validate host isolation without requiring test banners. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),repair=fs.readFileSync(__dirname+'/../repair.html','utf8');
const script=html.match(/<script id="sagsCanonicalProduction">([\s\S]*?)<\/script>/)[1];
for(const hostname of ['localhost','preview.example.test','e-report-sags.vercel.app']){let redirected=false;vm.runInNewContext(script,{URL,location:{hostname,search:'?flight=TEST',hash:'#home',replace:()=>redirected=true}});assert.equal(redirected,false,'local/preview candidate must not redirect to production')}
assert.doesNotMatch(html,/__SAGS_TEST_DEPLOYMENT=true|id="sagsTestResetGate"/,'production candidate must not force test resets');
assert.match(repair,/startsWith\('sags-'\)/);assert.match(repair,/startsWith\('e-report-'\)/);assert.match(repair,/\.\/index\.html/);assert.match(repair,/__repair/);
assert.doesNotMatch(repair,/localStorage\.clear\(|indexedDB\.deleteDatabase\(/,'repair preserves user drafts');
console.log('Candidate host isolation passed: previews stay local and repair only clears app caches');
