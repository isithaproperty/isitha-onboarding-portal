-- Restrict manager contract access to employees explicitly assigned to that manager.
-- HR/Admin retain organisation-wide contract access.

drop policy if exists "management read contracts" on public.employee_contracts;
create policy "management read contracts"
on public.employee_contracts
for select
to authenticated
using (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'),'') in ('hr_admin','admin')
  or (
    coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'),'') = 'manager'
    and employee_id in (
      select e.id from public.employees e where e.manager_id = (select auth.uid())
    )
  )
);

drop policy if exists "management upload contracts" on public.employee_contracts;
create policy "management upload contracts"
on public.employee_contracts
for insert
to authenticated
with check (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'),'') in ('hr_admin','admin')
  or (
    coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'),'') = 'manager'
    and employee_id in (
      select e.id from public.employees e where e.manager_id = (select auth.uid())
    )
  )
);

drop policy if exists "management read contract files" on storage.objects;
create policy "management read contract files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'employee-contracts'
  and (
    coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'),'') in ('hr_admin','admin')
    or (
      coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'),'') = 'manager'
      and (storage.foldername(name))[1] in (
        select e.id::text from public.employees e where e.manager_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists "management upload contract files" on storage.objects;
create policy "management upload contract files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'employee-contracts'
  and (
    coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'),'') in ('hr_admin','admin')
    or (
      coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'),'') = 'manager'
      and (storage.foldername(name))[1] in (
        select e.id::text from public.employees e where e.manager_id = (select auth.uid())
      )
    )
  )
);
