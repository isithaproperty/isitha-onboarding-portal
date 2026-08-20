import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const MANAGE_ROLES = new Set(['admin', 'hr_admin']);
const MANAGER_ROLES = new Set(['manager', 'admin', 'hr_admin']);

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase public credentials are not configured.');
  const client = createServerClient(url, key, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

function canManageAssignments(user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>) {
  const configuredEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (user.email && configuredEmails.includes(user.email.toLowerCase())) return true;
  return MANAGE_ROLES.has(clean(user.app_metadata?.role).toLowerCase());
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canManageAssignments(user)) return NextResponse.json({ error: 'Only HR or an administrator can allocate managers.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const [employeesResult, usersResult] = await Promise.all([
      admin.from('employees').select('id,email,first_name,last_name,manager_id').order('first_name'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (employeesResult.error) throw employeesResult.error;
    if (usersResult.error) throw usersResult.error;

    const authUsers = usersResult.data.users || [];
    const authById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
    const employees = (employeesResult.data || []).map((employee) => {
      const authUser = authById.get(employee.id);
      return {
        ...employee,
        role: clean(authUser?.app_metadata?.role).toLowerCase() || 'staff',
      };
    });

    const employeeIds = new Set(employees.map((employee) => employee.id));
    const configuredAdminEmails = new Set((process.env.ADMIN_EMAILS || '')
      .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));

    const authOnlyManagers = authUsers
      .filter((authUser) => {
        if (employeeIds.has(authUser.id)) return false;
        const role = clean(authUser.app_metadata?.role).toLowerCase();
        const isConfiguredAdmin = Boolean(authUser.email && configuredAdminEmails.has(authUser.email.toLowerCase()));
        return MANAGER_ROLES.has(role) || isConfiguredAdmin;
      })
      .map((authUser) => ({
        id: authUser.id,
        email: authUser.email || null,
        first_name: clean(authUser.user_metadata?.first_name) || clean(authUser.user_metadata?.firstName) || null,
        last_name: clean(authUser.user_metadata?.last_name) || clean(authUser.user_metadata?.lastName) || null,
        manager_id: null,
        role: clean(authUser.app_metadata?.role).toLowerCase() || 'admin',
      }));

    const managers = [
      ...employees.filter((employee) => MANAGER_ROLES.has(employee.role)),
      ...authOnlyManagers,
    ];

    return NextResponse.json({ employees, managers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load manager assignments.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canManageAssignments(user)) return NextResponse.json({ error: 'Only HR or an administrator can allocate managers.' }, { status: 403 });

    const body = await request.json();
    const employeeId = clean(body.employeeId);
    const managerId = clean(body.managerId) || null;
    if (!employeeId) return NextResponse.json({ error: 'Please select an employee.' }, { status: 400 });
    if (managerId === employeeId) return NextResponse.json({ error: 'An employee cannot be their own manager.' }, { status: 400 });

    const admin = createSupabaseAdminClient();
    if (managerId) {
      const { data: managerUser, error: managerError } = await admin.auth.admin.getUserById(managerId);
      if (managerError) throw managerError;
      const managerRole = clean(managerUser.user?.app_metadata?.role).toLowerCase();
      const configuredAdminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
      const isConfiguredAdmin = Boolean(managerUser.user?.email && configuredAdminEmails.includes(managerUser.user.email.toLowerCase()));
      if (!MANAGER_ROLES.has(managerRole) && !isConfiguredAdmin) {
        return NextResponse.json({ error: 'The selected person must have Manager, HR or Admin portal access.' }, { status: 400 });
      }
    }

    const { data, error } = await admin.from('employees')
      .update({ manager_id: managerId })
      .eq('id', employeeId)
      .select('id,email,first_name,last_name,manager_id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Employee record was not found.' }, { status: 404 });

    return NextResponse.json({ employee: data, message: managerId ? 'Manager allocated successfully.' : 'Manager allocation removed.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save manager allocation.' }, { status: 500 });
  }
}
