create table if not exists public.appraisals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id),
  review_date date not null,
  review_period_start date not null,
  review_period_end date not null,
  appraisal_type text not null default 'annual' check (appraisal_type in ('annual','probation','quarterly','mid_year','other')),
  status text not null default 'draft' check (status in ('draft','completed')),
  performance_rating smallint check (performance_rating between 1 and 5),
  quality_rating smallint check (quality_rating between 1 and 5),
  communication_rating smallint check (communication_rating between 1 and 5),
  teamwork_rating smallint check (teamwork_rating between 1 and 5),
  reliability_rating smallint check (reliability_rating between 1 and 5),
  initiative_rating smallint check (initiative_rating between 1 and 5),
  leadership_rating smallint check (leadership_rating between 1 and 5),
  overall_rating smallint check (overall_rating between 1 and 5),
  achievements text,
  objectives_review text,
  strengths text,
  improvement_areas text,
  attendance_comments text,
  conduct_comments text,
  training_development text,
  career_goals text,
  future_objectives text,
  manager_comments text,
  employee_comments text,
  hr_comments text,
  action_plan text,
  next_review_date date,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (review_period_end >= review_period_start)
);

create index if not exists appraisals_employee_id_idx on public.appraisals(employee_id);
create index if not exists appraisals_review_date_idx on public.appraisals(review_date desc);
create index if not exists appraisals_status_idx on public.appraisals(status);

alter table public.appraisals enable row level security;

grant select, insert, update on public.appraisals to authenticated;
revoke delete on public.appraisals from authenticated;

drop policy if exists appraisals_select_manager_hr on public.appraisals;
create policy appraisals_select_manager_hr on public.appraisals
for select to authenticated
using (
  coalesce(auth.jwt()->'app_metadata'->>'role','') in ('hr','hr_admin','admin','administrator')
  or exists (
    select 1 from public.employees e
    where e.id = appraisals.employee_id
      and e.manager_id = auth.uid()
  )
);

drop policy if exists appraisals_insert_manager_hr on public.appraisals;
create policy appraisals_insert_manager_hr on public.appraisals
for insert to authenticated
with check (
  created_by = auth.uid()
  and reviewer_user_id = auth.uid()
  and (
    coalesce(auth.jwt()->'app_metadata'->>'role','') in ('hr','hr_admin','admin','administrator')
    or exists (
      select 1 from public.employees e
      where e.id = appraisals.employee_id
        and e.manager_id = auth.uid()
    )
  )
);

drop policy if exists appraisals_update_manager_hr on public.appraisals;
create policy appraisals_update_manager_hr on public.appraisals
for update to authenticated
using (
  coalesce(auth.jwt()->'app_metadata'->>'role','') in ('hr','hr_admin','admin','administrator')
  or exists (
    select 1 from public.employees e
    where e.id = appraisals.employee_id
      and e.manager_id = auth.uid()
  )
)
with check (
  updated_by = auth.uid()
  and (
    coalesce(auth.jwt()->'app_metadata'->>'role','') in ('hr','hr_admin','admin','administrator')
    or exists (
      select 1 from public.employees e
      where e.id = appraisals.employee_id
        and e.manager_id = auth.uid()
    )
  )
);
