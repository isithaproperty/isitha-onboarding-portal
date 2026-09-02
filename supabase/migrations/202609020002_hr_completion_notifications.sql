create table if not exists public.hr_notifications (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null check (event_type in ('onboarding_completed','appraisal_completed','probation_completed')),
  entity_id uuid,
  employee_id uuid references public.employees(id) on delete set null,
  title text not null,
  message text not null,
  action_path text,
  email_status text not null default 'pending' check (email_status in ('pending','sent','configuration_required','failed')),
  email_recipients text[] not null default '{}',
  email_error text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  read_by uuid references auth.users(id) on delete set null
);

alter table public.hr_notifications enable row level security;

drop policy if exists hr_notifications_select_hr_admin on public.hr_notifications;
create policy hr_notifications_select_hr_admin on public.hr_notifications
for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('hr_admin','admin'));

drop policy if exists hr_notifications_update_hr_admin on public.hr_notifications;
create policy hr_notifications_update_hr_admin on public.hr_notifications
for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('hr_admin','admin'))
with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('hr_admin','admin'));

create index if not exists hr_notifications_created_at_idx on public.hr_notifications(created_at desc);
create index if not exists hr_notifications_unread_idx on public.hr_notifications(read_at) where read_at is null;
