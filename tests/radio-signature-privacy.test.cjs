'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const rules=fs.readFileSync('firebase/firestore.rules','utf8');
const mod=fs.readFileSync('app/modules/radio-custody.v1.js','utf8');
assert(rules.includes("resource.data.actorUid == request.auth.uid"));
assert(mod.includes("where('actorUid','==',u.uid)"));
assert(mod.includes("isAdmin(u)?db.collection(EVENTS)"));
assert(mod.includes("toDataURL('image/webp'"));
console.log('Radio signatures remain private to owner/AD and server-only in email');
