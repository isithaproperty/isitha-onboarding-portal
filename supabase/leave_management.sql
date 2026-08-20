-- Leave management schema for Isitha Global portal
-- Run this migration in Supabase SQL Editor before using the Leave pages.

alter table public.employees
  add column if not exists manager_id uuid references public.employees(id) on delete set null;

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('annual','sick','family_responsibility','unpaid','other')),
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','declined','cancelled')),
  manager_comment text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_dates_valid check (end_date >= start_date)
);

create index if not exists leave_requests_employee_idx on public.leave_requests(employee_id);
create index if not exists leave_requests_status_idx on public.leave_requests(status);
create index if not exists employees_manager_idx on public.employees(manager_id);

alter table public.leave_requests enable row level security;

-- Staff may only see their own leave records.
drop policy if exists "staff read own leave" on public.leave_requests;
create policy "staff read own leave" on public.leave_requests
for select to authenticated
using (employee_id in (select id from public.employees where auth_user_id = auth.uid()));

-- Staff may only create requests for themselves and new requests must be pending.
drop policy if exists "staff create own leave" on public.leave_requests;
create policy "staff create own leave" on public.leave_requests
for insert to authenticated
with check (
  employee_id in (select id from public.employees where auth_user_id = auth.uid())
  and status = 'pending'
);

-- Managers can see requests belonging to employees assigned to them.
drop policy if exists "manager read team leave" on public.leave_requests;
create policy "manager read team leave" on public.leave_requests
for select to authenticated
using (
  employee_id in (
    select e.id from public.employees e
    join public.employees m on e.manager_id = m.id
    where m.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') in ('hr','admin')
);

-- Managers may decide requests for their assigned staff; HR/Admin may decide all.
drop policy if exists "manager decide team leave" on public.leave_requests;
create policy "manager decide team leave" on public.leave_requests
for update to authenticated
using (
  employee_id in (
    select e.id from public.employees e
    join public.employees m on e.manager_id = m.id
    where m.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') in ('hr','admin')
)
with check (status in ('pending','approved','declined','cancelled'));
