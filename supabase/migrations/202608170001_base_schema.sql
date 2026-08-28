-- Baseline schema for the Isitha Global staff onboarding portal.
-- This migration intentionally sorts before the audit-remediation migrations so a
-- clean Supabase project can be rebuilt entirely from source control.

create extension if not exists pgcrypto;

-- Core employee directory. Portal roles live in trusted Auth app_metadata.
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  first_name text,
  last_name text,
  job_title text,
  annual_leave_entitlement numeric(6,2) not null default 20 check (annual_leave_entitlement >= 0),
  manager_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists employees_email_unique on public.employees (lower(email));
create unique index if not exists employees_auth_user_id_unique on public.employees(auth_user_id) where auth_user_id is not null;
create index if not exists employees_manager_idx on public.employees(manager_id);
alter table public.employees enable row level security;
revoke all on public.employees from anon;
grant select to authenticated;
drop policy if exists "employee read own directory record" on public.employees;
create policy "employee read own directory record" on public.employees
for select to authenticated using (
  auth_user_id=(select auth.uid())
  or (auth_user_id is null and lower(email)=lower(coalesce((select auth.jwt())->>'email','')))
);

-- HR onboarding details and sensitive payroll/personal information.
create table if not exists public.employee_hr_onboarding (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references public.employees(id) on delete cascade,
  legal_first_name text not null,
  legal_last_name text not null,
  id_passport_number text not null,
  tax_number text not null,
  date_of_birth date not null,
  mobile_number text not null,
  personal_email text not null,
  residential_address text not null,
  emergency_contact_name text not null,
  emergency_contact_relationship text not null,
  emergency_contact_number text not null,
  bank_name text not null,
  account_holder text not null,
  account_number text not null,
  bank_branch_code text not null,
  account_type text not null check (account_type in ('current','savings')),
  id_document_path text not null,
  declaration_accepted boolean not null default false,
  declaration_accepted_at timestamptz,
  status text not null default 'submitted' check (status in ('submitted','active','inactive','leaver')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.employee_hr_onboarding enable row level security;
revoke all on public.employee_hr_onboarding from anon;
grant select,insert,update to authenticated;
drop policy if exists "employee read own onboarding" on public.employee_hr_onboarding;
create policy "employee read own onboarding" on public.employee_hr_onboarding
for select to authenticated using (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));
drop policy if exists "employee create own onboarding" on public.employee_hr_onboarding;
create policy "employee create own onboarding" on public.employee_hr_onboarding
for insert to authenticated with check (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));
drop policy if exists "employee update own onboarding" on public.employee_hr_onboarding;
create policy "employee update own onboarding" on public.employee_hr_onboarding
for update to authenticated
using (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())))
with check (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));

create table if not exists public.employee_document_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  document_key text not null,
  document_title text not null,
  document_version text not null,
  acknowledged boolean not null default true,
  acknowledged_at timestamptz not null default now(),
  unique(employee_id,document_key)
);
alter table public.employee_document_acknowledgements enable row level security;
revoke all on public.employee_document_acknowledgements from anon;
grant select,insert,update to authenticated;
drop policy if exists "employee manage own document acknowledgements" on public.employee_document_acknowledgements;
create policy "employee manage own document acknowledgements" on public.employee_document_acknowledgements
for all to authenticated
using (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())))
with check (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));

-- Versioned training catalogue and completion evidence.
create table if not exists public.training_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  version text not null default '1.0',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.training_courses enable row level security;
revoke all on public.training_courses from anon;
grant select to authenticated;
drop policy if exists "authenticated read training courses" on public.training_courses;
create policy "authenticated read training courses" on public.training_courses for select to authenticated using (true);
insert into public.training_courses(slug,title,version,is_active) values
  ('hr-employment','HR & Employment Training','1.0',true),
  ('ohsa-awareness','OHSA Awareness Training','1.0',true),
  ('emergency-induction','Emergency & Office Induction','1.0',true),
  ('popia-data-protection','POPIA & Data Protection Training','1.0',true)
on conflict(slug) do update set title=excluded.title,is_active=true;

create table if not exists public.training_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  course_id uuid not null references public.training_courses(id) on delete cascade,
  course_version text not null,
  acknowledged_at timestamptz not null default now(),
  unique(employee_id,course_id)
);
alter table public.training_acknowledgements enable row level security;
revoke all on public.training_acknowledgements from anon;
grant select,insert to authenticated;
drop policy if exists "employee read own training acknowledgements" on public.training_acknowledgements;
create policy "employee read own training acknowledgements" on public.training_acknowledgements
for select to authenticated using (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));
drop policy if exists "employee acknowledge own training" on public.training_acknowledgements;
create policy "employee acknowledge own training" on public.training_acknowledgements
for insert to authenticated with check (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));

create table if not exists public.training_progress (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  course_id uuid not null references public.training_courses(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('not_started','in_progress','completed')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id,course_id)
);
alter table public.training_progress enable row level security;
revoke all on public.training_progress from anon;
grant select,insert,update to authenticated;
drop policy if exists "employee read own training progress" on public.training_progress;
create policy "employee read own training progress" on public.training_progress
for select to authenticated using (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));
-- Assessment-based courses are deliberately excluded from direct client writes.
drop policy if exists "employee write non assessment progress" on public.training_progress;
create policy "employee write non assessment progress" on public.training_progress
for insert to authenticated with check (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  and course_id in (select id from public.training_courses where slug not in ('ohsa-awareness','popia-data-protection'))
);
drop policy if exists "employee update non assessment progress" on public.training_progress;
create policy "employee update non assessment progress" on public.training_progress
for update to authenticated
using (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  and course_id in (select id from public.training_courses where slug not in ('ohsa-awareness','popia-data-protection'))
)
with check (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  and course_id in (select id from public.training_courses where slug not in ('ohsa-awareness','popia-data-protection'))
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  course_id uuid not null references public.training_courses(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  pass_mark integer not null default 80 check (pass_mark between 0 and 100),
  passed boolean not null,
  attempted_at timestamptz not null default now()
);
alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from anon;
grant select to authenticated;
drop policy if exists "employee read own quiz attempts" on public.quiz_attempts;
create policy "employee read own quiz attempts" on public.quiz_attempts
for select to authenticated using (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));

-- Employment contracts. All mutations are performed by authorised server routes.
create table if not exists public.employee_contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  file_path text not null,
  original_filename text not null,
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now(),
  status text not null default 'awaiting_signature' check (status in ('awaiting_signature','signed')),
  signed_at timestamptz,
  signed_by uuid references auth.users(id) on delete set null,
  signer_name text,
  opened_at timestamptz,
  signed_file_path text,
  signing_declaration text
);
create index if not exists employee_contracts_employee_idx on public.employee_contracts(employee_id);
alter table public.employee_contracts enable row level security;
revoke all on public.employee_contracts from anon;
grant select to authenticated;
drop policy if exists "employee read own contracts" on public.employee_contracts;
create policy "employee read own contracts" on public.employee_contracts
for select to authenticated using (employee_id in (select id from public.employees where auth_user_id=(select auth.uid())));

-- Leave requests. manager_id stores the responsible manager's Auth user ID.
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('annual','sick','family_responsibility','unpaid','other')),
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','declined','cancelled')),
  manager_comment text,
  medical_certificate_path text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_dates_valid check (end_date >= start_date)
);
create index if not exists leave_requests_employee_idx on public.leave_requests(employee_id);
create index if not exists leave_requests_status_idx on public.leave_requests(status);
alter table public.leave_requests enable row level security;
revoke all on public.leave_requests from anon;
grant select,insert,update to authenticated;
drop policy if exists "leave_select_authorised" on public.leave_requests;
create policy "leave_select_authorised" on public.leave_requests
for select to authenticated using (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  or employee_id in (select id from public.employees where manager_id=(select auth.uid()))
  or coalesce((select auth.jwt())->'app_metadata'->>'role','') in ('hr_admin','admin')
);
drop policy if exists "leave_insert_own_pending" on public.leave_requests;
create policy "leave_insert_own_pending" on public.leave_requests
for insert to authenticated with check (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  and status='pending' and decided_by is null and decided_at is null
);
drop policy if exists "leave_update_authorised_not_self" on public.leave_requests;
create policy "leave_update_authorised_not_self" on public.leave_requests
for update to authenticated
using (
  employee_id not in (select id from public.employees where auth_user_id=(select auth.uid()))
  and (
    employee_id in (select id from public.employees where manager_id=(select auth.uid()))
    or coalesce((select auth.jwt())->'app_metadata'->>'role','') in ('hr_admin','admin')
  )
)
with check (
  employee_id not in (select id from public.employees where auth_user_id=(select auth.uid()))
  and status in ('approved','declined')
  and decided_by=(select auth.uid())
  and decided_at is not null
);

-- Leave balance views use invoker permissions so underlying RLS remains effective.
create or replace function public.weekdays_between(start_on date,end_on date)
returns integer language sql immutable security invoker set search_path='' as $$
  select count(*)::integer
  from generate_series(start_on,end_on,interval '1 day') d
  where extract(isodow from d) between 1 and 5
$$;
revoke all on function public.weekdays_between(date,date) from public;
grant execute on function public.weekdays_between(date,date) to authenticated,service_role;

create or replace view public.employee_leave_balances
with (security_invoker=true) as
select e.id as employee_id,e.first_name,e.last_name,e.annual_leave_entitlement,
  coalesce(sum(public.weekdays_between(l.start_date,l.end_date)) filter (where l.leave_type='annual' and l.status='approved'),0)::numeric as approved_days,
  coalesce(sum(public.weekdays_between(l.start_date,l.end_date)) filter (where l.leave_type='annual' and l.status='pending'),0)::numeric as pending_days,
  greatest(e.annual_leave_entitlement-coalesce(sum(public.weekdays_between(l.start_date,l.end_date)) filter (where l.leave_type='annual' and l.status='approved'),0),0)::numeric as remaining_days
from public.employees e left join public.leave_requests l on l.employee_id=e.id
group by e.id,e.first_name,e.last_name,e.annual_leave_entitlement;
revoke all on public.employee_leave_balances from anon;
grant select on public.employee_leave_balances to authenticated,service_role;

create or replace view public.employee_sick_leave_balances
with (security_invoker=true) as
select e.id as employee_id,e.first_name,e.last_name,30::numeric as sick_leave_entitlement,
  coalesce(sum(public.weekdays_between(l.start_date,l.end_date)) filter (
    where l.leave_type='sick' and l.status='approved' and l.start_date >= current_date - interval '36 months'
  ),0)::numeric as sick_days_taken,
  greatest(30-coalesce(sum(public.weekdays_between(l.start_date,l.end_date)) filter (
    where l.leave_type='sick' and l.status='approved' and l.start_date >= current_date - interval '36 months'
  ),0),0)::numeric as sick_days_remaining
from public.employees e left join public.leave_requests l on l.employee_id=e.id
group by e.id,e.first_name,e.last_name;
revoke all on public.employee_sick_leave_balances from anon;
grant select on public.employee_sick_leave_balances to authenticated,service_role;

-- Private document stores. Client-side uploads are restricted to the signed-in employee.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('employee-hr-documents','employee-hr-documents',false,10485760,array['application/pdf','image/jpeg','image/png']::text[]),
  ('medical-certificates','medical-certificates',false,10485760,array['application/pdf','image/jpeg','image/png']::text[]),
  ('employee-contracts','employee-contracts',false,null,null)
on conflict(id) do update set public=false;

drop policy if exists "employee manage own hr documents" on storage.objects;
create policy "employee manage own hr documents" on storage.objects
for all to authenticated
using (bucket_id='employee-hr-documents' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='employee-hr-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "employee manage own medical certificates" on storage.objects;
create policy "employee manage own medical certificates" on storage.objects
for all to authenticated
using (
  bucket_id='medical-certificates'
  and (storage.foldername(name))[1] in (select id::text from public.employees where auth_user_id=(select auth.uid()))
)
with check (
  bucket_id='medical-certificates'
  and (storage.foldername(name))[1] in (select id::text from public.employees where auth_user_id=(select auth.uid()))
);

-- Contract files are never public. Employees receive short-lived signed URLs from the server.
drop policy if exists "employee read own contract files" on storage.objects;
create policy "employee read own contract files" on storage.objects
for select to authenticated using (
  bucket_id='employee-contracts'
  and (storage.foldername(name))[1] in (select id::text from public.employees where auth_user_id=(select auth.uid()))
);
