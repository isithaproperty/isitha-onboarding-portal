alter table public.employee_hr_onboarding
  add column if not exists archive_pending_at timestamptz;

create index if not exists employee_hr_onboarding_archive_pending_at_idx
  on public.employee_hr_onboarding(archive_pending_at);
