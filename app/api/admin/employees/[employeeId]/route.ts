import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { assignableRoles, canManageManagers, normaliseRole } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';
const ALLOWED_STATUSES = new Set(['submitted', 'active', 'inactive', 'leaver']);
const ALLOWED_ROLES = new Set(['staff', 'manager', 'hr_admin', 'compliance_admin', 'admin']);

function clean(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function DELETE(request: Request, context: { params: Promise<{ employeeId: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canManageManagers(roleForUser(user))) return NextResponse.json({ error: 'Only HR or Admin can remove employees.' }, { status: 403 });

    const body = await request.json().catch(() => ({})) as { confirmation?: unknown };
    if (clean(body.confirmation).toUpperCase() !== 'DELETE') {
      return NextResponse.json({ error: 'Employee removal was not confirmed.' }, { status: 400 });
    }

    const { employeeId } = await context.params;
    const admin = createSupabaseAdminClient();
    const { data: employee, error: employeeError } = await admin
      .from('employees')
      .select('id,auth_user_id,first_name,last_name')
      .eq('id', employeeId)
      .maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) return NextResponse.json({ error: 'Employee was not found.' }, { status: 404 });
    if (employee.auth_user_id === user.id) {
      return NextResponse.json({ error: 'You cannot remove your own portal account.' }, { status: 409 });
    }

    const [onboardingResult, contractsResult, leaveResult] = await Promise.all([
      admin.from('employee_hr_onboarding').select('id_document_path').eq('employee_id', employeeId).maybeSingle(),
      admin.from('employee_contracts').select('file_path,signed_file_path').eq('employee_id', employeeId),
      admin.from('leave_requests').select('medical_certificate_path').eq('employee_id', employeeId),
    ]);
    const lookupError = onboardingResult.error || contractsResult.error || leaveResult.error;
    if (lookupError) throw lookupError;

    const removals: PromiseLike<{ error: Error | null }>[] = [];
    if (onboardingResult.data?.id_document_path) {
      removals.push(admin.storage.from('employee-hr-documents').remove([onboardingResult.data.id_document_path]));
    }
    const contractPaths = Array.from(new Set((contractsResult.data || []).flatMap(contract =>
      [contract.file_path, contract.signed_file_path].filter(Boolean) as string[]
    )));
    if (contractPaths.length) removals.push(admin.storage.from('employee-contracts').remove(contractPaths));
    const medicalPaths = Array.from(new Set((leaveResult.data || []).map(row => row.medical_certificate_path).filter(Boolean) as string[]));
    if (medicalPaths.length) removals.push(admin.storage.from('medical-certificates').remove(medicalPaths));

    const storageResults = await Promise.all(removals);
    const storageError = storageResults.find(result => result.error)?.error;
    if (storageError) throw storageError;

    const { error: deleteEmployeeError } = await admin.from('employees').delete().eq('id', employeeId);
    if (deleteEmployeeError) throw deleteEmployeeError;

    if (employee.auth_user_id) {
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(employee.auth_user_id);
      if (deleteUserError) throw deleteUserError;
    }

    const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee';
    return NextResponse.json({ message: `${name} was removed from the portal and can no longer sign in.` });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to remove employee from the system.') }, { status: 500 });
  }
}

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

    const directoryUpdates: Record<string, string | number> = { updated_at: new Date().toISOString() };
    if (body.firstName !== undefined) directoryUpdates.first_name = clean(body.firstName);
    if (body.lastName !== undefined) directoryUpdates.last_name = clean(body.lastName);
    if (body.email !== undefined) directoryUpdates.email = clean(body.email).toLowerCase();
    if (annualLeaveEntitlement !== undefined) directoryUpdates.annual_leave_entitlement = annualLeaveEntitlement;
    const { error: directoryError } = await admin
      .from('employees')
      .update(directoryUpdates)
      .eq('id', employeeId);
    if (directoryError) throw directoryError;

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
