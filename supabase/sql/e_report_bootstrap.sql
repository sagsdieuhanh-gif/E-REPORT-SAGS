-- Supabase E-REPORT standalone copy: blueprint for a NEW empty project only.
-- Never run on SAGSCXR-RNS. Does not import Firebase users or data.
create schema if not exists e_report_private;
revoke all on schema e_report_private from public, anon;
grant usage on schema e_report_private to authenticated;
create table public.e_report_profiles (
 user_id uuid primary key references auth.users(id) on delete restrict,
 username text not null unique, full_name text not null default '',
 role_code text not null check (role_code in ('AD','ADMIN','DH','CBTT','KH','PVHK','GRND_COR','LOADING','EMPLOYEE')),
 department_code text, active boolean not null default true, updated_at timestamptz not null default now()
);
create table public.e_report_flights (
 id uuid primary key default gen_random_uuid(),
 flight_date date not null, legacy_flight_id text not null,
 carrier_code text not null default '', flight_number text not null default '',
 direction text not null default '', flight_state text not null default 'OPEN',
 detail jsonb not null default '{}'::jsonb, revision bigint not null default 0 check (revision>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(flight_date,legacy_flight_id)
);
create table public.e_report_assignments (
 assignment_id text primary key, flight_id uuid not null references public.e_report_flights(id),
 assignee_id uuid not null references public.e_report_profiles(user_id),
 form_code text not null, slot_code text not null default '', roster_revision bigint not null default 0,
 status text not null default 'READY', active boolean not null default true,
 metadata jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create index e_report_assignee_idx on public.e_report_assignments(assignee_id,active,flight_id);
create index e_report_flight_assignment_idx on public.e_report_assignments(flight_id,form_code,active);
create table public.e_report_documents (
 id uuid primary key default gen_random_uuid(),
 flight_id uuid not null references public.e_report_flights(id),
 assignment_id text references public.e_report_assignments(assignment_id),
 form_code text not null, owner_id uuid not null references public.e_report_profiles(user_id),
 status text not null default 'DRAFT' check (status in ('DRAFT','COMPLETED','SIGNED','REOPENED')),
 payload jsonb not null default '{}'::jsonb, revision bigint not null default 0 check(revision>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index e_report_doc_flight_idx on public.e_report_documents(flight_id,form_code,updated_at desc);
create table public.e_report_drafts (
 owner_id uuid not null references public.e_report_profiles(user_id),
 flight_id uuid not null references public.e_report_flights(id),
 form_code text not null, draft_key text not null, payload jsonb not null default '{}'::jsonb,
 hlc_at_ms bigint not null default 0, hlc_counter bigint not null default 0,
 writer_id text not null default '', tombstone boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(owner_id,flight_id,form_code,draft_key)
);
create table public.e_report_roster_imports (
 id uuid primary key default gen_random_uuid(), roster_date date not null,
 submitted_by uuid not null references public.e_report_profiles(user_id),
 source_label text not null default '', source_payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.e_report_handoffs (
 id uuid primary key default gen_random_uuid(),
 flight_id uuid not null references public.e_report_flights(id),
 assignment_id text not null references public.e_report_assignments(assignment_id),
 previous_user uuid references public.e_report_profiles(user_id),
 next_user uuid not null references public.e_report_profiles(user_id),
 changed_by uuid not null references public.e_report_profiles(user_id),
 event_payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.e_report_audit_events (
 id bigint generated always as identity primary key,
 actor_id uuid references public.e_report_profiles(user_id),
 flight_id uuid references public.e_report_flights(id),
 event_type text not null, event_payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
-- Only private, narrow SECURITY DEFINER predicates may inspect privileged role data.
create function e_report_private.current_role() returns text
 language sql stable security definer set search_path=''
 as $$ select role_code from public.e_report_profiles
 where user_id=(select auth.uid()) and active=true limit 1 $$;
create function e_report_private.is_manager() returns boolean
 language sql stable security definer set search_path=''
 as $$ select coalesce(e_report_private.current_role() in ('AD','ADMIN','DH'),false) $$;
create function e_report_private.can_access_flight(fid uuid) returns boolean
 language sql stable security definer set search_path=''
 as $$ select e_report_private.is_manager() or
 (e_report_private.current_role() is not null and exists(
  select 1 from public.e_report_assignments where flight_id=fid and
  assignee_id=(select auth.uid()) and active=true)) $$;
create function e_report_private.can_access_form(fid uuid, form text) returns boolean
 language sql stable security definer set search_path=''
 as $$ select e_report_private.is_manager() or
 (e_report_private.current_role() is not null and exists(
  select 1 from public.e_report_assignments where flight_id=fid and
  assignee_id=(select auth.uid()) and form_code=form and active=true)) $$;
revoke execute on all functions in schema e_report_private from public,anon;
grant execute on all functions in schema e_report_private to authenticated;
alter table public.e_report_profiles enable row level security;
alter table public.e_report_flights enable row level security;
alter table public.e_report_assignments enable row level security;
alter table public.e_report_documents enable row level security;
alter table public.e_report_drafts enable row level security;
alter table public.e_report_roster_imports enable row level security;
alter table public.e_report_handoffs enable row level security;
alter table public.e_report_audit_events enable row level security;
-- Only grant API access to this app's tables (leave other public tables alone).
revoke all on public.e_report_profiles,public.e_report_flights,public.e_report_assignments,
 public.e_report_documents,public.e_report_drafts,public.e_report_roster_imports,
 public.e_report_handoffs,public.e_report_audit_events from anon,authenticated;
grant select on public.e_report_profiles,public.e_report_flights,public.e_report_assignments,
 public.e_report_documents,public.e_report_drafts,public.e_report_roster_imports,
 public.e_report_handoffs,public.e_report_audit_events to authenticated;
grant insert,update on public.e_report_documents,public.e_report_drafts to authenticated;
create policy profiles_active_read on public.e_report_profiles for select to authenticated
 using (active and e_report_private.current_role() is not null);
create policy flights_staff_read on public.e_report_flights for select to authenticated
 using (e_report_private.can_access_flight(id));
create policy assignments_staff_read on public.e_report_assignments for select to authenticated
 using (e_report_private.can_access_flight(flight_id));
create policy documents_staff_read on public.e_report_documents for select to authenticated
 using (e_report_private.can_access_form(flight_id,form_code));
create policy documents_draft_insert on public.e_report_documents for insert to authenticated
 with check (owner_id=(select auth.uid()) and status='DRAFT' and
 e_report_private.can_access_form(flight_id,form_code));
create policy documents_draft_update on public.e_report_documents for update to authenticated
 using (owner_id=(select auth.uid()) and status='DRAFT' and e_report_private.can_access_form(flight_id,form_code))
 with check (owner_id=(select auth.uid()) and status='DRAFT' and e_report_private.can_access_form(flight_id,form_code));
create policy drafts_owner_read on public.e_report_drafts for select to authenticated
 using (owner_id=(select auth.uid()) and e_report_private.current_role() is not null);
create policy drafts_owner_insert on public.e_report_drafts for insert to authenticated
 with check (owner_id=(select auth.uid()) and e_report_private.can_access_form(flight_id,form_code));
create policy drafts_owner_update on public.e_report_drafts for update to authenticated
 using (owner_id=(select auth.uid()) and e_report_private.can_access_form(flight_id,form_code))
 with check (owner_id=(select auth.uid()) and e_report_private.can_access_form(flight_id,form_code));
create policy roster_management_read on public.e_report_roster_imports for select to authenticated
 using (e_report_private.is_manager());
create policy handoffs_staff_read on public.e_report_handoffs for select to authenticated
 using (e_report_private.can_access_flight(flight_id));
create policy audit_management_read on public.e_report_audit_events for select to authenticated
 using (e_report_private.is_manager());
-- Completion, signing, account/roster administration and handovers are intentionally
-- server-side only pending explicit atomic Edge Function implementations.
