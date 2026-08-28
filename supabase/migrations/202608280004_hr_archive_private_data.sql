alter table public.employee_hr_onboarding
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

alter table public.employee_contracts
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

create index if not exists employee_contracts_archived_at_idx on public.employee_contracts(archived_at);
create index if not exists employee_hr_onboarding_archived_at_idx on public.employee_hr_onboarding(archived_at);
