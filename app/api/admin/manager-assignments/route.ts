import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { canManageManagers, normaliseRole } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

const MANAGER_ROLES = new Set(['manager', 'admin', 'hr_admin']);

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canManageManagers(roleForUser(user))) return NextResponse.json({ error: 'Only HR or an administrator can allocate managers.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const [employeesResult, usersResult] = await Promise.all([
      admin.from('employees').select('id,auth_user_id,email,first_name,last_name,manager_id').order('first_name'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (employeesResult.error) throw employeesResult.error;
    if (usersResult.error) throw usersResult.error;

    const authUsers = usersResult.data.users || [];
    const authById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
    const employeeIdByAuthId = new Map(
      (employeesResult.data || [])
        .filter((employee) => employee.auth_user_id)
        .map((employee) => [employee.auth_user_id as string, employee.id]),
    );
    const employees = (employeesResult.data || []).map((employee) => {
      const authUser = employee.auth_user_id ? authById.get(employee.auth_user_id) : undefined;
      return {
        ...employee,
        manager_id: employee.manager_id ? employeeIdByAuthId.get(employee.manager_id) || null : null,
        role: normaliseRole(authUser?.app_metadata?.role),
      };
    });

    const managers = employees.filter((employee) => MANAGER_ROLES.has(employee.role));

    return NextResponse.json({ employees, managers });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load manager assignments.') }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canManageManagers(roleForUser(user))) return NextResponse.json({ error: 'Only HR or an administrator can allocate managers.' }, { status: 403 });

    const body = await request.json();
    const employeeId = clean(body.employeeId);
    const managerId = clean(body.managerId) || null;
    if (!employeeId) return NextResponse.json({ error: 'Please select an employee.' }, { status: 400 });
    if (managerId === employeeId) return NextResponse.json({ error: 'An employee cannot be their own manager.' }, { status: 400 });

    const admin = createSupabaseAdminClient();
    let storedManagerAuthUserId: string | null = null;
    if (managerId) {
      const { data: managerRecord, error: managerRecordError } = await admin.from('employees').select('auth_user_id').eq('id', managerId).maybeSingle();
      if (managerRecordError) throw managerRecordError;
      if (!managerRecord?.auth_user_id) return NextResponse.json({ error: 'The selected manager is not linked to a portal login.' }, { status: 400 });
      const { data: managerUser, error: managerError } = await admin.auth.admin.getUserById(managerRecord.auth_user_id);
      if (managerError) throw managerError;
      const managerRole = normaliseRole(managerUser.user?.app_metadata?.role);
      if (!MANAGER_ROLES.has(managerRole)) {
        return NextResponse.json({ error: 'The selected person must have Manager, HR or Admin portal access.' }, { status: 400 });
      }
      storedManagerAuthUserId = managerRecord.auth_user_id;
    }

    const { data, error } = await admin.from('employees')
      .update({ manager_id: storedManagerAuthUserId })
      .eq('id', employeeId)
      .select('id,email,first_name,last_name,manager_id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Employee record was not found.' }, { status: 404 });

    return NextResponse.json({ employee: data, message: managerId ? 'Manager allocated successfully.' : 'Manager allocation removed.' });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to save manager allocation.') }, { status: 500 });
  }
}
