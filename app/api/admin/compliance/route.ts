import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const ADMIN_ROLES = new Set(['admin', 'manager', 'hr_admin', 'compliance_admin']);
function clean(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) throw new Error('Supabase public credentials are not configured.');
  const client = createServerClient(url, publishableKey, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

async function isAuthorisedManager(user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>) {
  const configuredEmails = (process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (user.email && configuredEmails.includes(user.email.toLowerCase())) return true;
  return ADMIN_ROLES.has(clean(user.app_metadata?.role).toLowerCase());
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const admin = createSupabaseAdminClient();
    if (!(await isAuthorisedManager(user))) return NextResponse.json({ error: 'Only an authorised manager can view employee compliance records.' }, { status: 403 });

    const [employeesResult, staffResult, trainingResult, coursesResult, policyResult, usersResult] = await Promise.all([
      admin.from('employee_hr_onboarding').select('*'),
      admin.from('employees').select('id,auth_user_id'),
      admin.from('training_progress').select('employee_id,course_id,progress_percent,completed_at'),
      admin.from('training_courses').select('id,slug,title'),
      admin.from('employee_document_acknowledgements').select('employee_id,acknowledged'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const error = employeesResult.error || staffResult.error || trainingResult.error || coursesResult.error || policyResult.error || usersResult.error;
    if (error) throw error;

    const authById = new Map((usersResult.data.users || []).map((authUser) => [authUser.id, authUser]));
    const authUserByEmployee = new Map((staffResult.data || []).map((employee) => [employee.id, employee.auth_user_id]));
    const courses = new Map((coursesResult.data || []).map((course) => [course.id, course]));

    const employees = await Promise.all((employeesResult.data || []).map(async (employee) => {
      const authUserId = authUserByEmployee.get(employee.employee_id);
      const authUser = authUserId ? authById.get(authUserId) : undefined;
      let idDocumentUrl: string | null = null;
      if (employee.id_document_path) {
        const { data } = await admin.storage.from('employee-hr-documents').createSignedUrl(employee.id_document_path, 300);
        idDocumentUrl = data?.signedUrl || null;
      }
      return { ...employee, id_document_url: idDocumentUrl, role: clean(authUser?.app_metadata?.role).toLowerCase() || 'staff' };
    }));
    const training = (trainingResult.data || []).map((item) => ({ ...item, ...(courses.get(item.course_id) || {}) }));
    const policies = (policyResult.data || []).filter((item) => item.acknowledged).map((item) => ({ employee_id: item.employee_id }));
    return NextResponse.json({ employees, training, policies });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load compliance records.' }, { status: 500 });
  }
}
