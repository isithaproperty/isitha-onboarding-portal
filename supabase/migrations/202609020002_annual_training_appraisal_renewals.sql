alter table public.appraisals add column if not exists completed_at timestamptz;

update public.appraisals
set completed_at = coalesce(completed_at, updated_at, created_at)
where status = 'completed' and completed_at is null;

alter table public.hr_notifications drop constraint if exists hr_notifications_event_type_check;
alter table public.hr_notifications add constraint hr_notifications_event_type_check
check (event_type = any (array[
  'onboarding_completed'::text,
  'appraisal_completed'::text,
  'probation_completed'::text,
  'training_renewal_due'::text,
  'appraisal_renewal_due'::text
]));

create index if not exists training_progress_completed_at_idx on public.training_progress(completed_at) where completed_at is not null;
create index if not exists appraisals_completed_at_idx on public.appraisals(completed_at) where completed_at is not null;
