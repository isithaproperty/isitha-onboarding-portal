import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { assignableRoles, canViewHr } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';
function clean(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const role = roleForUser(user);
    if (!canViewHr(role)) return NextResponse.json({ error: 'Only HR, Compliance or Admin can view employee compliance records.' }, { status: 403 });
    const admin = createSupabaseAdminClient();

    const [employeesResult, staffResult, trainingResult, coursesResult, policyResult, usersResult, contractsResult] = await Promise.all([
      admin.from('employee_hr_onboarding').select('*'),
      admin.from('employees').select('id,auth_user_id,first_name,last_name,email,annual_leave_entitlement'),
      admin.from('training_progress').select('employee_id,course_id,progress_percent,completed_at'),
      admin.from('training_courses').select('id,slug,title'),
      admin.from('employee_document_acknowledgements').select('employee_id,acknowledged'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from('employee_contracts').select('id,employee_id,original_filename,status,signed_at,signer_name,signed_file_path,file_path,archived_at').eq('status','signed').is('archived_at',null).order('signed_at',{ascending:false}),
    ]);

    const error = employeesResult.error || staffResult.error || trainingResult.error || coursesResult.error || policyResult.error || usersResult.error || contractsResult.error;
    if (error) throw error;

    const authById = new Map((usersResult.data.users || []).map((authUser) => [authUser.id, authUser]));
    const onboardingByEmployee = new Map((employeesResult.data || []).map((employee) => [employee.employee_id, employee]));
    const courses = new Map((coursesResult.data || []).map((course) => [course.id, course]));

    const employees = await Promise.all((staffResult.data || []).map(async (staffRecord) => {
      const employee = onboardingByEmployee.get(staffRecord.id);
      const authUser = staffRecord?.auth_user_id ? authById.get(staffRecord.auth_user_id) : undefined;
      if (!employee) {
        return {
          id: `staff-${staffRecord.id}`,
          employee_id: staffRecord.id,
          legal_first_name: staffRecord.first_name || null,
          legal_last_name: staffRecord.last_name || null,
          personal_email: staffRecord.email || null,
          mobile_number: null,
          declaration_accepted: false,
          status: 'not_started',
          role: clean(authUser?.app_metadata?.role).toLowerCase() || 'staff',
          annual_leave_entitlement: Number(staffRecord.annual_leave_entitlement ?? 20),
          id_document_url: null,
        };
      }
      const archived = Boolean(employee.archived_at) || String(employee.status || '').toLowerCase() === 'archived';
      let idDocumentUrl: string | null = null;
      if (employee.id_document_path && !archived) {
        const { data } = await admin.storage.from('employee-hr-documents').createSignedUrl(employee.id_document_path, 300);
        idDocumentUrl = data?.signedUrl || null;
      }
      return {
        ...employee,
        legal_first_name: employee.legal_first_name || staffRecord?.first_name || null,
        legal_last_name: employee.legal_last_name || staffRecord?.last_name || null,
        personal_email: archived ? 'Archived' : (employee.personal_email || staffRecord?.email || null),
        id_passport_number: archived ? 'Archived' : employee.id_passport_number,
        tax_number: archived ? 'Archived' : employee.tax_number,
        date_of_birth: archived ? 'Archived' : employee.date_of_birth,
        mobile_number: archived ? 'Archived' : employee.mobile_number,
        residential_address: archived ? 'Archived' : employee.residential_address,
        emergency_contact_name: archived ? 'Archived' : employee.emergency_contact_name,
        emergency_contact_relationship: archived ? 'Archived' : employee.emergency_contact_relationship,
        emergency_contact_number: archived ? 'Archived' : employee.emergency_contact_number,
        bank_name: archived ? 'Archived' : employee.bank_name,
        account_holder: archived ? 'Archived' : employee.account_holder,
        account_number: archived ? 'Archived' : employee.account_number,
        bank_branch_code: archived ? 'Archived' : employee.bank_branch_code,
        account_type: archived ? 'Archived' : employee.account_type,
        id_document_url: idDocumentUrl,
        role: clean(authUser?.app_metadata?.role).toLowerCase() || 'staff',
        annual_leave_entitlement: Number(staffRecord?.annual_leave_entitlement ?? 20),
      };
    }));

    const contracts = await Promise.all((contractsResult.data || []).map(async (contract) => {
      const path = contract.signed_file_path || contract.file_path;
      const { data } = await admin.storage.from('employee-contracts').createSignedUrl(path, 300);
      return {
        id: contract.id,
        employee_id: contract.employee_id,
        original_filename: contract.original_filename,
        status: contract.status,
        signed_at: contract.signed_at,
        signer_name: contract.signer_name,
        url: data?.signedUrl || null,
      };
    }));

    const training = (trainingResult.data || []).map((item) => ({ ...item, ...(courses.get(item.course_id) || {}) }));
    const policies = (policyResult.data || []).filter((item) => item.acknowledged).map((item) => ({ employee_id: item.employee_id }));
    return NextResponse.json({ employees, training, policies, contracts, assignableRoles: assignableRoles(role) });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load compliance records.') }, { status: 500 });
  }
}
