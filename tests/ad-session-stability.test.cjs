const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync(__dirname+'/../app/boot/06-legacy.js','utf8');
assert.doesNotMatch(s,/setTimeout\(\(\)=>verifyPersonalSession\(true\),500\)/,'must not force a redundant auth recheck 500ms after successful login restore');
assert.match(s,/setTimeout\(r,1600\)/,'session verification must allow Firebase auth hydration before logout');
assert.match(s,/adFirebaseWaitForUser\(3500\)/,'session verification must retry current Firebase user');
assert.match(s,/const profile=await firebasePersonalBuildProfile\(authUser\)/,'login restore must still validate canonical Firestore profile');
console.log('AD session stability regression passed');
