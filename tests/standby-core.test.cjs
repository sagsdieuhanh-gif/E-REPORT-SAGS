'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const core=require('../firebase/functions/standby-core.cjs');
const batch='94d96467-1780-4c98-912e-101394e4bb21';
assert.equal(core.stable({b:2,a:{z:3,c:1}}),'{"a":{"c":1,"z":3},"b":2}');
const first=core.makeRow('rtdb','roster_manifests','2026-11-17',{z:1,a:2},batch);
const repeated=core.makeRow('rtdb','roster_manifests','2026-11-17',{a:2,z:1},batch);
assert.deepEqual(first,repeated,'stable source hashes are retry-idempotent');
assert.match(first.key_hash,/^[a-f0-9]{64}$/);
assert.equal(first.deleted,false);
assert.equal(first.namespace,'roster_manifests');
assert.equal(first.record_key,'2026-11-17');
assert.throws(()=>core.makeRow('bad','users','x',{},batch),/Invalid source/);
assert.throws(()=>core.makeRow('rtdb','bad/name','x',{},batch),/Invalid namespace/);
assert.throws(()=>core.makeRow('rtdb','users','',{},batch),/Source key invalid/);
assert.throws(()=>core.makeRow('firestore','users','doc',{big:'a'.repeat(500)},batch,{maxPayloadBytes:120}),/exceeds mirror row limit/);
const b=Buffer.from('photo bytes that must remain byte-identical');
const url='data:image/jpeg;base64,'+b.toString('base64');
const img=core.proofBinary(url);
assert.deepEqual(img.bytes,b);
assert.equal(img.mime,'image/jpeg');
assert.match(img.path,/^firestore\/sags_radio_proofs_v22\/[a-f0-9]{2}\/[a-f0-9]{64}\.jpg$/);
const decomposed=core.redactEvidence({eventId:'test',image:url,actorUid:'example'});
assert.equal(decomposed.proof.sha256,img.sha256);
assert.equal(decomposed.value.image._sags_storage_v1.path,img.path);
assert(!JSON.stringify(decomposed.value).includes(b.toString('base64')),
 'Mirrored evidence metadata cannot silently contain original image base64 when separate private Storage was used');
assert.throws(()=>core.proofBinary('data:image/heic;base64,YQ=='),/Unsupported/);
assert.throws(()=>core.proofBinary('data:image/jpeg;base64,YQ==garbage'),/Unsupported|invalid/i);
assert(core.summarizeRows([first]).fingerprint.length===64);

const source=fs.readFileSync('firebase/functions/standby-replicate.cjs','utf8');
const wf=fs.readFileSync('.github/workflows/supabase-standby-mirror.yml','utf8');
assert(source.includes('const APPLY=process.argv.includes'), 'No automatic standby mutation on default command');
assert(source.includes("await verifyFirebaseIsLeader()"),'No write while promoted to Supabase');
assert(source.includes("if(nodes.length===0&&previous.some"),'Avoid deleting real production backups after an empty Firebase read');
assert(source.includes("if(!Array.isArray(verified)||verified.length!==expected.size"),'Verify mirror before promoting checkpoint');
assert(source.includes("state:'FAILED'"),'Failed replication audit remains visible');
assert(!source.includes('firebase.database().ref('),'No Firebase client SDK in backup worker');
assert(wf.includes("vars.SAGS_STANDBY_REPLICATION_ACTIVE == 'true'"),'Schedule must be opt-in');
assert(wf.includes("secrets.SAGS_STANDBY_SUPABASE_SERVICE_ROLE_KEY"),'Keys must be GitHub encrypted secrets');
assert(wf.includes("secrets.SAGS_STANDBY_FIREBASE_SERVICE_ACCOUNT_JSON"),'Firebase machine credentials must be server-side');
const test=cp.spawnSync(process.execPath,['firebase/functions/standby-replicate.cjs','--apply'],
 {encoding:'utf8',env:{PATH:process.env.PATH,
  SAGS_STANDBY_SUPABASE_URL:'https://wggirxzdcfnxyjgjvpgh.supabase.co',
  SAGS_STANDBY_SUPABASE_SERVICE_ROLE_KEY:'synthetic-never-valid'}});
assert.notEqual(test.status,0,'Missing secrets must refuse to write');
assert.match(test.stderr,/STANDBY NOT READY/);
assert.match(test.stderr,/server credentials are not configured/);
console.log('Supabase standby server-only mirror, immutable evidence, deterministic hashes, no auto-activation and missing-credential safety PASS');
