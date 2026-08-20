-- Employee contracts: private upload by Manager/HR/Admin and employee signing.
create table if not exists public.employee_contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  file_path text not null,
  original_filename text not null,
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now(),
  status text not null default 'awaiting_signature' check (status in ('awaiting_signature','signed')),
  signed_at timestamptz,
  signed_by uuid references auth.users(id),
  signer_name text
);
create index if not exists employee_contracts_employee_idx on public.employee_contracts(employee_id);
alter table public.employee_contracts enable row level security;

drop policy if exists "employee read own contracts" on public.employee_contracts;
create policy "employee read own contracts" on public.employee_contracts for select to authenticated
using (employee_id in (select id from public.employees where auth_user_id=auth.uid()));

drop policy if exists "management read contracts" on public.employee_contracts;
create policy "management read contracts" on public.employee_contracts for select to authenticated
using (coalesce(auth.jwt()->'app_metadata'->>'role','') in ('manager','hr_admin','admin'));

drop policy if exists "management upload contracts" on public.employee_contracts;
create policy "management upload contracts" on public.employee_contracts for insert to authenticated
with check (coalesce(auth.jwt()->'app_metadata'->>'role','') in ('manager','hr_admin','admin'));

drop policy if exists "employee sign own contracts" on public.employee_contracts;
create policy "employee sign own contracts" on public.employee_contracts for update to authenticated
using (employee_id in (select id from public.employees where auth_user_id=auth.uid()))
with check (employee_id in (select id from public.employees where auth_user_id=auth.uid()) and status='signed' and signed_by=auth.uid());

insert into storage.buckets (id,name,public) values ('employee-contracts','employee-contracts',false)
on conflict (id) do update set public=false;

drop policy if exists "employee read own contract files" on storage.objects;
create policy "employee read own contract files" on storage.objects for select to authenticated
using (bucket_id='employee-contracts' and (storage.foldername(name))[1] in (select id::text from public.employees where auth_user_id=auth.uid()));

drop policy if exists "management read contract files" on storage.objects;
create policy "management read contract files" on storage.objects for select to authenticated
using (bucket_id='employee-contracts' and coalesce(auth.jwt()->'app_metadata'->>'role','') in ('manager','hr_admin','admin'));

drop policy if exists "management upload contract files" on storage.objects;
create policy "management upload contract files" on storage.objects for insert to authenticated
with check (bucket_id='employee-contracts' and coalesce(auth.jwt()->'app_metadata'->>'role','') in ('manager','hr_admin','admin'));
