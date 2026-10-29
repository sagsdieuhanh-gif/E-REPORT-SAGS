-- Applied only to E-REPORT-SAGS-SUPABASE on 2026-10-29.
-- Private staging: do not expose raw user, roster or document payloads to browsers.
create table if not exists public.e_report_migration_batches(
 id uuid primary key default gen_random_uuid(),
 source_sha256 text not null unique check(source_sha256 ~ '^[0-9a-f]{64}$'),
 source_schema text not null check(source_schema='E_REPORT_SAGS_BACKUP_V503'),
 source_created_at timestamptz not null,source_build text not null default '',
 scope jsonb not null default '{}'::jsonb,
 status text not null default 'STAGING' check(status in ('STAGING','VERIFIED')),
 expected_records integer not null check(expected_records>=0),
 imported_records integer not null default 0 check(imported_records>=0),
 created_at timestamptz not null default now(),verified_at timestamptz,
 check(imported_records<=expected_records)
);
create table if not exists public.e_report_migration_entries(
 batch_id uuid not null references public.e_report_migration_batches(id) on delete restrict,
 source_path text not null check(length(source_path)>0 and length(source_path)<=2048),
 node_kind text not null check(node_kind in ('object','array','string','value')),
 payload jsonb not null,value_sha256 text not null check(value_sha256 ~ '^[0-9a-f]{64}$'),
 staged_at timestamptz not null default now(),primary key(batch_id,source_path)
);
create index if not exists e_report_migration_entries_batch_idx on public.e_report_migration_entries(batch_id);
alter table public.e_report_migration_batches enable row level security;
alter table public.e_report_migration_entries enable row level security;
revoke all on public.e_report_migration_batches,public.e_report_migration_entries from public,anon,authenticated;
grant select,insert,update on public.e_report_migration_batches,public.e_report_migration_entries to service_role;
revoke delete on public.e_report_migration_batches,public.e_report_migration_entries from service_role;
-- No RLS policies: deny all client reads/writes. service_role bypasses RLS.
