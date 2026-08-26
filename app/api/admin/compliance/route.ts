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

    const [employeesResult, staffResult, trainingResult, coursesResult, policyResult, usersResult] = await Promise.all([
      admin.from('employee_hr_onboarding').select('*'),
      admin.from('employees').select('id,auth_user_id,annual_leave_entitlement'),
      admin.from('training_progress').select('employee_id,course_id,progress_percent,completed_at'),
      admin.from('training_courses').select('id,slug,title'),
      admin.from('employee_document_acknowledgements').select('employee_id,acknowledged'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const error = employeesResult.error || staffResult.error || trainingResult.error || coursesResult.error || policyResult.error || usersResult.error;
    if (error) throw error;

    const authById = new Map((usersResult.data.users || []).map((authUser) => [authUser.id, authUser]));
    const staffByEmployee = new Map((staffResult.data || []).map((employee) => [employee.id, employee]));
    const courses = new Map((coursesResult.data || []).map((course) => [course.id, course]));

    const employees = await Promise.all((employeesResult.data || []).map(async (employee) => {
      const staffRecord = staffByEmployee.get(employee.employee_id);
      const authUser = staffRecord?.auth_user_id ? authById.get(staffRecord.auth_user_id) : undefined;
      let idDocumentUrl: string | null = null;
      if (employee.id_document_path) {
        const { data } = await admin.storage.from('employee-hr-documents').createSignedUrl(employee.id_document_path, 300);
        idDocumentUrl = data?.signedUrl || null;
      }
      return {
        ...employee,
        id_document_url: idDocumentUrl,
        role: clean(authUser?.app_metadata?.role).toLowerCase() || 'staff',
        annual_leave_entitlement: Number(staffRecord?.annual_leave_entitlement ?? 20),
      };
    }));
    const training = (trainingResult.data || []).map((item) => ({ ...item, ...(courses.get(item.course_id) || {}) }));
    const policies = (policyResult.data || []).filter((item) => item.acknowledged).map((item) => ({ employee_id: item.employee_id }));
    return NextResponse.json({ employees, training, policies, assignableRoles: assignableRoles(role) });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load compliance records.') }, { status: 500 });
  }
}
