import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { assignableRoles, canManageManagers, normaliseRole } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';
const ALLOWED_STATUSES = new Set(['submitted', 'active', 'inactive', 'leaver']);
const ALLOWED_ROLES = new Set(['staff', 'manager', 'hr_admin', 'compliance_admin', 'admin']);

function clean(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function PATCH(request: Request, context: { params: Promise<{ employeeId: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const requestingRole = roleForUser(user);
    if (!canManageManagers(requestingRole)) return NextResponse.json({ error: 'Only HR or Admin can update employee records.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { employeeId } = await context.params;
    const body = await request.json();
    const status = clean(body.status).toLowerCase();
    const role = body.role ? normaliseRole(body.role) : '';
    if (status && !ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid employment status.' }, { status: 400 });
    if (role && (!ALLOWED_ROLES.has(role) || !assignableRoles(requestingRole).includes(role))) return NextResponse.json({ error: 'You cannot assign that portal role.' }, { status: 403 });

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
    return NextResponse.json({ error: safeApiError(error, 'Unable to update employee.') }, { status: 500 });
  }
}
