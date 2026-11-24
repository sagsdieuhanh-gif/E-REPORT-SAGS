'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve('supabase/auth');
 const mod=await import(pathToFileURL(path.join(root,'password-service.mjs')).href);
 assert.throws(()=>mod.validateConfig({url:'https://ivixjhwghprfxdtaupxc.supabase.co/',publishableKey:'sb_publishable_fake'}),/backend khác/);
 assert(mod.validateConfig({url:'https://wggirxzdcfnxyjgjvpgh.supabase.co/',publishableKey:'sb_publishable_public'}));
 assert.throws(()=>mod.validatePassword('123456','123456'),/12/);
 assert.throws(()=>mod.validatePassword('Password123456','wrong'),/trùng/);
 const calls=[];
 const auth={
  getUser:async()=>({data:{user:{id:'u1'}}}),
  signInWithPassword:async v=>{calls.push(['login',v]);return{data:{user:{id:'u1'}}}},
  resetPasswordForEmail:async(e,o)=>{calls.push(['forgot',e,o]);return{data:{}}},
  updateUser:async v=>{calls.push(['update',v]);return{data:{user:{id:'u1'}}}},
  signOut:async v=>{calls.push(['logout',v]);return{}},
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
 };
 const svc=mod.makePasswordService({auth},'https://test.example.org/account');
 assert((await svc.forgot('PERSON@EXAMPLE.ORG')).startsWith('Nếu email'));
 assert.deepEqual(calls.at(-1),['forgot','person@example.org',{redirectTo:'https://test.example.org/account'}]);
 await assert.rejects(()=>svc.change({password:'Password123456',confirm:'Password123456'}),/hiện tại/);
 await svc.change({password:'Password123456',confirm:'Password123456',currentPassword:'oldSecret123'});
 assert.deepEqual(calls.at(-2),['update',{password:'Password123456',current_password:'oldSecret123'}]);
 assert.deepEqual(calls.at(-1),['logout',{scope:'global'}]);
 await svc.change({password:'NewPassword876543',confirm:'NewPassword876543',recovery:true});
 assert.deepEqual(calls.at(-2),['update',{password:'NewPassword876543'}]);
 assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('Gửi email khôi phục'));
 console.log('Supabase self-service password: isolation, email, change, current-password, recovery, logout pass');
})().catch(e=>{console.error(e);process.exitCode=1});
