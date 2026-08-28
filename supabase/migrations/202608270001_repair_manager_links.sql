-- Align manager authorization with the established schema:
-- public.employees.manager_id references auth.users.id.

drop policy if exists "leave_select_authorised" on public.leave_requests;
create policy "leave_select_authorised" on public.leave_requests
for select to authenticated using (
  employee_id in (select id from public.employees where auth_user_id=(select auth.uid()))
  or employee_id in (
    select e.id
    from public.employees e
    where e.manager_id=(select auth.uid())
  )
  or coalesce((select auth.jwt())->'app_metadata'->>'role','') in ('hr_admin','admin')
);

drop policy if exists "leave_update_authorised_not_self" on public.leave_requests;
create policy "leave_update_authorised_not_self" on public.leave_requests
for update to authenticated
using (
  employee_id not in (select id from public.employees where auth_user_id=(select auth.uid()))
  and (
    employee_id in (
      select e.id
      from public.employees e
      where e.manager_id=(select auth.uid())
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
          select e.id
          from public.employees e
          where e.manager_id=(select auth.uid())
        )
        or coalesce((select auth.jwt())->'app_metadata'->>'role','') in ('hr_admin','admin')
      )
  )
);
