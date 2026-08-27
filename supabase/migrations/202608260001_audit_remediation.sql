-- Audit remediation for the Isitha Global onboarding portal.
-- Apply through the normal Supabase migration workflow before deploying the matching application release.

-- Resolve portal roles from trusted Auth app metadata without elevated database privileges.
create or replace function public.current_portal_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $
  select lower(coalesce((select auth.jwt())->'app_metadata'->>'role', 'staff'))
$;

revoke all on function public.current_portal_role() from public;
grant execute on function public.current_portal_role() to authenticated, service_role;

-- Repair existing employee/login links and prevent duplicate links.
update public.employees e
set auth_user_id = u.id
from auth.users u
where e.auth_user_id is null
  and e.email is not null
  and lower(e.email) = lower(u.email);

create unique index if not exists employees_auth_user_id_unique
  on public.employees(auth_user_id) where auth_user_id is not null;

-- Contract evidence now records that the exact file was opened and signed.
alter table public.employee_contracts
  add column if not exists opened_at timestamptz,
  add column if not exists signed_file_path text,
  add column if not exists signing_declaration text;

-- Privacy/data-subject request workflow.
create table if not exists public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  request_type text not null check (request_type in ('access','correction','deletion','objection')),
  details text not null,
  status text not null default 'received' check (status in ('received','in_review','completed','declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text
);
alter table public.data_subject_requests enable row level security;
revoke all on public.data_subject_requests from anon;
grant select,insert on public.data_subject_requests to authenticated;
drop policy if exists "employee create own privacy request" on public.data_subject_requests;
create policy "employee create own privacy request" on public.data_subject_requests
for insert to authenticated
with check (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())) and status='received');
drop policy if exists "employee read own privacy requests" on public.data_subject_requests;
create policy "employee read own privacy requests" on public.data_subject_requests
for select to authenticated
using (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));

-- Replace every overlapping leave policy with one canonical generation.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='leave_requests'
  loop execute format('drop policy if exists %I on public.leave_requests',p.policyname); end loop;
end $$;

alter table public.leave_requests enable row level security;
revoke all on public.leave_requests from anon;
grant select,insert,update on public.leave_requests to authenticated;

create policy "leave_select_authorised" on public.leave_requests
for select to authenticated using (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  or employee_id in (
    select e.id from public.employees e
    join public.employees reviewer on e.manager_id=reviewer.id
    where reviewer.auth_user_id=(select auth.uid())
  )
  or coalesce((select auth.jwt())->'app_metadata'->>'role','') in ('hr_admin','admin')
);

create policy "leave_insert_own_pending" on public.leave_requests
for insert to authenticated with check (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  and status='pending' and decided_by is null and decided_at is null
);

create policy "leave_update_authorised_not_self" on public.leave_requests
for update to authenticated
using (
  employee_id not in (select id from public.employees where auth_user_id=(select auth.uid()))
  and (
    employee_id in (
      select e.id from public.employees e
      join public.employees reviewer on e.manager_id=reviewer.id
      where reviewer.auth_user_id=(select auth.uid())
    )
    or coalesce((select auth.jwt())->'app_metadata'->>'role','') in ('hr_admin','admin')
  )
)
with check (
  employee_id not in (select id from public.employees where auth_user_id=(select auth.uid()))
  and status in ('approved','declined')
  and decided_by=(select auth.uid())
  and decided_at is not null
);

create or replace function public.protect_leave_decision_fields()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.employee_id is distinct from old.employee_id
     or new.leave_type is distinct from old.leave_type
     or new.start_date is distinct from old.start_date
     or new.end_date is distinct from old.end_date then
    raise exception 'Leave request identity and dates cannot be changed during a decision';
  end if;
  if old.status <> 'pending' and new is distinct from old then
    raise exception 'A decided leave request is immutable';
  end if;
  return new;
end $$;
drop trigger if exists protect_leave_decision_fields on public.leave_requests;
create trigger protect_leave_decision_fields before update on public.leave_requests
for each row execute function public.protect_leave_decision_fields();

-- Assessment attempts and pass/completion records can only be written by trusted server code.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='quiz_attempts'
  loop execute format('drop policy if exists %I on public.quiz_attempts',p.policyname); end loop;
end $$;
alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from anon;
grant select on public.quiz_attempts to authenticated;
create policy "employee_read_own_quiz_attempts" on public.quiz_attempts
for select to authenticated using (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='training_progress' and cmd in ('INSERT','UPDATE','ALL')
  loop execute format('drop policy if exists %I on public.training_progress',p.policyname); end loop;
end $$;
create policy "employee_write_non_assessment_progress" on public.training_progress
for insert to authenticated with check (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  and course_id in (select id from public.training_courses where slug not in ('ohsa-awareness','popia-data-protection'))
);
create policy "employee_update_non_assessment_progress" on public.training_progress
for update to authenticated
using (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  and course_id in (select id from public.training_courses where slug not in ('ohsa-awareness','popia-data-protection'))
)
with check (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  and course_id in (select id from public.training_courses where slug not in ('ohsa-awareness','popia-data-protection'))
);

-- Signing is server-controlled; employees retain read-only access to their own contracts.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='employee_contracts' and cmd in ('UPDATE','ALL')
  loop execute format('drop policy if exists %I on public.employee_contracts',p.policyname); end loop;
end $$;

-- Authorised reviewers may retrieve the private medical certificate attached to an accessible request.
drop policy if exists "authorised reviewer read medical certificates" on storage.objects;
create policy "authorised reviewer read medical certificates" on storage.objects
for select to authenticated using (
  bucket_id='medical-certificates'
  and exists (
    select 1 from public.leave_requests lr
    where lr.medical_certificate_path=storage.objects.name
      and lr.employee_id not in (select id from public.employees where auth_user_id=(select auth.uid()))
      and (
        lr.employee_id in (
          select e.id from public.employees e
          join public.employees reviewer on e.manager_id=reviewer.id
          where reviewer.auth_user_id=(select auth.uid())
        )
        or coalesce((select auth.jwt())->'app_metadata'->>'role','') in ('hr_admin','admin')
      )
  )
);

-- Defence in depth: anonymous API access is explicitly revoked from sensitive relations.
revoke all on public.employees, public.employee_hr_onboarding, public.employee_contracts,
  public.leave_requests, public.quiz_attempts, public.training_progress,
  public.training_acknowledgements, public.employee_document_acknowledgements
from anon;
