'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const rules=fs.readFileSync('firebase/firestore.rules','utf8'),snippet=fs.readFileSync('firebase/radio-custody.rules.snippet','utf8').trimEnd();
assert(snippet.includes('function radioEventShape(')&&snippet.includes('match /sags_radio_devices_v1/'));
assert(snippet.includes('match /sags_radio_events_v1/')&&snippet.includes('data:image/png;base64'));
assert(rules.includes(snippet));
assert(!snippet.includes('match /{document=**}'));
console.log('Radio-only Firebase Rules snippet exactly matches tested main rules');
