-- Once an employee submits onboarding, further changes must be made by authorised HR/admin server routes.
drop policy if exists "Employees can update own HR onboarding" on public.employee_hr_onboarding;
drop policy if exists "employees can update own onboarding" on public.employee_hr_onboarding;
drop policy if exists "Employees can update own HR onboarding before submission" on public.employee_hr_onboarding;

create policy "Employees can update own HR onboarding before submission"
on public.employee_hr_onboarding
for update
to authenticated
using (
  coalesce(lower(status), '') <> 'submitted'
  and employee_id in (
    select id from public.employees where auth_user_id = (select auth.uid())
  )
)
with check (
  employee_id in (
    select id from public.employees where auth_user_id = (select auth.uid())
  )
  and lower(status) = 'submitted'
);
