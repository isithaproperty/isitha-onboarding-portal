import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const ADMIN_ROLES = new Set(['admin', 'manager', 'hr_admin', 'compliance_admin']);
const ALLOWED_STATUSES = new Set(['submitted', 'active', 'inactive', 'leaver']);
const ALLOWED_ROLES = new Set(['staff', 'manager', 'hr_admin', 'admin']);

function clean(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase public credentials are not configured.');
  const client = createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

async function isAuthorisedManager(user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>) {
  const configuredEmails = (process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (user.email && configuredEmails.includes(user.email.toLowerCase())) return true;
  return ADMIN_ROLES.has(clean(user.app_metadata?.role).toLowerCase());
}

export async function PATCH(request: Request, context: { params: Promise<{ employeeId: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!(await isAuthorisedManager(user))) return NextResponse.json({ error: 'Only an authorised manager can update employee records.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { employeeId } = await context.params;
    const body = await request.json();
    const status = clean(body.status).toLowerCase();
    const role = clean(body.role).toLowerCase();
    if (status && !ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid employment status.' }, { status: 400 });
    if (role && !ALLOWED_ROLES.has(role)) return NextResponse.json({ error: 'Invalid portal role.' }, { status: 400 });

    let annualLeaveEntitlement: number | undefined;
    if (body.annualLeaveEntitlement !== undefined && body.annualLeaveEntitlement !== null && body.annualLeaveEntitlement !== '') {
      annualLeaveEntitlement = Number(body.annualLeaveEntitlement);
      if (!Number.isFinite(annualLeaveEntitlement) || annualLeaveEntitlement < 0 || annualLeaveEntitlement > 365) {
        return NextResponse.json({ error: 'Annual leave entitlement must be between 0 and 365 days.' }, { status: 400 });
      }
    }

    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (body.firstName !== undefined) updates.legal_first_name = clean(body.firstName);
    if (body.lastName !== undefined) updates.legal_last_name = clean(body.lastName);
    if (body.email !== undefined) updates.personal_email = clean(body.email).toLowerCase();
    if (body.mobile !== undefined) updates.mobile_number = clean(body.mobile);
    if (status) updates.status = status;

    const { data, error } = await admin.from('employee_hr_onboarding').update(updates).eq('employee_id', employeeId).select('id,employee_id,legal_first_name,legal_last_name,personal_email,mobile_number,declaration_accepted,status').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Employee onboarding record was not found.' }, { status: 404 });

    if (annualLeaveEntitlement !== undefined) {
      const { error: leaveError } = await admin
        .from('employees')
        .update({ annual_leave_entitlement: annualLeaveEntitlement })
        .eq('id', employeeId);
      if (leaveError) throw leaveError;
    }

    if (role) {
      const { data: staffRecord, error: staffLookupError } = await admin
        .from('employees')
        .select('auth_user_id')
        .eq('id', employeeId)
        .maybeSingle();
      if (staffLookupError) throw staffLookupError;
      const authUserId = staffRecord?.auth_user_id || employeeId;
      const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(authUserId);
      if (authLookupError) throw authLookupError;
      if (!authUser.user) return NextResponse.json({ error: 'This employee is not linked to a portal login.' }, { status: 400 });
      const appMetadata = { ...(authUser.user.app_metadata || {}), role };
      const { error: roleError } = await admin.auth.admin.updateUserById(authUserId, { app_metadata: appMetadata });
      if (roleError) throw roleError;
    }

    return NextResponse.json({ employee: { ...data, role: role || undefined, annual_leave_entitlement: annualLeaveEntitlement }, message: 'Employee record updated.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update employee.' }, { status: 500 });
  }
}
