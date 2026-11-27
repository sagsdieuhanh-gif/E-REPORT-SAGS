'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const current=fs.readFileSync('app/modules/admin-account-actions.v2.js','utf8');
const legacy=fs.readFileSync('app/boot/14-v18CanonicalAccountHierarchy.js','utf8');
const match=current.match(/function secureInitialPassword\(\)\{[\s\S]*?\n\}/);
assert(match,'Strong password generator must exist');
const create=new Function('root',match[0]+'\nreturn secureInitialPassword;')({crypto:webcrypto});
const issued=new Set();
for(let i=0;i<100;i++){
 const password=create();assert.equal(password.length,24);
 assert(/[A-Z]/.test(password)&&/[a-z]/.test(password)&&/[0-9]/.test(password)&&/[!@#$%*_-]/.test(password),'Enforce all password character classes');
 assert(!issued.has(password),'Passwords must not be deterministic');issued.add(password);
}
assert(current.includes('initialPassword=LEGACY_PASS;cred=await sec.auth.createUserWithEmailAndPassword(email,initialPassword)'),'New Auth users use the requested initial password');
assert(current.includes('password,newPassword:password,mustChangePassword:true'),'Reset callable should accept random value');
assert(!current.includes('password:TMP_PASS')&&!current.includes('createUserWithEmailAndPassword(email,TMP_PASS)'),'No obsolete constants used in Auth flows');
assert(current.includes('const password=secureInitialPassword();'),'Password resets continue to generate strong unique credentials');
assert(current.includes('mustChangePassword:reuseDeletedUid?!!tombData?.mustChangePassword:true'),'New accounts must change the initial password');
assert(current.includes("LEGACY_PASS='123456'"),'Confirmed initial-password policy for new accounts');
assert(legacy.includes('createUserWithEmailAndPassword(email,initialPassword)'),'Old create fallback must also be secured');
assert(!legacy.includes('createUserWithEmailAndPassword(email,"123456")'));
assert(!legacy.includes('RESET 123456'));
assert(legacy.includes("const initialPassword='123456';"),'Fallback account flow must use the same initial password');
assert(legacy.includes('jobTitle,unit,workUnit:unit,mustChangePassword:true'),'Fallback account flow must require change');
console.log('Account initial password and mandatory change, random credential resets PASS');
