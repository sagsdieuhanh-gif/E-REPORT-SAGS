const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const hierarchy=fs.readFileSync(path.join(root,'app/boot/14-v18CanonicalAccountHierarchy.js'),'utf8');
const search=fs.readFileSync(path.join(root,'app/boot/15-v116-account-name-search.js'),'utf8');
const perms=fs.readFileSync(path.join(root,'app/boot/13-v485FeaturePermissions.js'),'utf8');

const s=hierarchy.indexOf('adminCreatePersonalAccount=async function(){');
const e=hierarchy.indexOf('window.adminCreatePersonalAccount=adminCreatePersonalAccount',s);
assert.ok(s>=0&&e>s,'canonical account create function must exist');
const create=hierarchy.slice(s,e);
assert.match(create,/createUserWithEmailAndPassword\(email,"123456"\)/,'new account must create Firebase Authentication user');
assert.match(create,/collection\("users"\)/,'new account must use Firestore users collection');
assert.match(create,/users\.doc\(uid\)\.set/,'new account profile must be keyed by Firebase UID');
assert.match(create,/firebaseUid:uid/,'new account profile must preserve Firebase UID');
assert.match(create,/cred\.user\.delete\(\)/,'failed profile creation must roll back newly created Auth user');
assert.doesNotMatch(create,/initHandoverFirebase\(\)|HANDOVER_COLLECTION|passHash/,'registration must not fall back to legacy personal-user password records');

assert.match(search,/firebase\.firestore\(\)\.collection\("users"\)\.get\(\)/,'account manager list must read Firebase users');
assert.doesNotMatch(search,/HANDOVER_COLLECTION|PERSONAL_USER_KIND/,'account search/list must not use legacy personal-user records');

const handoverRefs=(perms.match(/HANDOVER_COLLECTION/g)||[]).length;
assert.equal(handoverRefs,0,'feature permission editor/runtime must not fetch legacy account records');
assert.match(perms,/firebase\.firestore\(\)\.collection\("users"\)\.doc\(id\)/,'permission editor must read Firebase user profile');
assert.match(perms,/currentUserProfile\?\.firebaseUid/,'live permission refresh must resolve current Firebase UID');

console.log('Firebase account registration regression passed: Auth + users/{UID} is canonical.');
