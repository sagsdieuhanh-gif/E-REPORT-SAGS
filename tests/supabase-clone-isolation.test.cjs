'use strict';
const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
const sql=fs.readFileSync(path.join(root,'supabase/sql/e_report_bootstrap.sql'),'utf8');
const client=fs.readFileSync(path.join(root,'supabase/client/e-report-gateway.mjs'),'utf8');
const names=['profiles','flights','assignments','documents','drafts','roster_imports','handoffs','audit_events'];
for(const n of names){
 assert(sql.includes('create table public.e_report_'+n),'missing '+n);
 assert(sql.includes('alter table public.e_report_'+n+' enable row level security'),'missing RLS '+n);
}
assert(sql.includes('auth.uid()'));
assert(!sql.includes('using (true)'));
assert(client.includes('Cannot reuse the SAGS-RNS production backend'));
assert(client.includes('saveDraft'));
console.log('Supabase copy: schema RLS and isolation checks pass');
