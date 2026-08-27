-- Repair legacy manager assignments that stored an Auth user ID
-- instead of the manager's public.employees ID.
update public.employees employee
set manager_id = manager.id,
    updated_at = now()
from public.employees manager
where employee.manager_id = manager.auth_user_id
  and employee.id <> manager.id
  and not exists (
    select 1
    from public.employees valid_manager
    where valid_manager.id = employee.manager_id
  );
