import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const ADMIN_ROLES = new Set(['admin', 'manager', 'hr_admin', 'compliance_admin']);

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) throw new Error('Supabase public credentials are not configured.');
  const client = createServerClient(url, publishableKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

async function isAuthorisedManager(admin: ReturnType<typeof createSupabaseAdminClient>, user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>) {
  const configuredEmails = (process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (user.email && configuredEmails.includes(user.email.toLowerCase())) return true;
  if (ADMIN_ROLES.has(clean(user.app_metadata?.role).toLowerCase())) return true;
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return ADMIN_ROLES.has(clean(profile?.role).toLowerCase());
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const admin = createSupabaseAdminClient();
    if (!(await isAuthorisedManager(admin, user))) {
      return NextResponse.json({ error: 'Only an authorised manager can view employee compliance records.' }, { status: 403 });
    }

    const [employeesResult, trainingResult, coursesResult, policyResult] = await Promise.all([
      admin.from('employee_hr_onboarding').select('id,employee_id,legal_first_name,legal_last_name,personal_email,mobile_number,declaration_accepted,status'),
      admin.from('training_progress').select('employee_id,course_id,progress_percent,completed_at'),
      admin.from('training_courses').select('id,slug,title'),
      admin.from('employee_document_acknowledgements').select('employee_id,acknowledged'),
    ]);

    const error = employeesResult.error || trainingResult.error || coursesResult.error || policyResult.error;
    if (error) throw error;
    const courses = new Map((coursesResult.data || []).map((course) => [course.id, course]));
    const training = (trainingResult.data || []).map((item) => ({ ...item, ...(courses.get(item.course_id) || {}) }));
    const policies = (policyResult.data || []).filter((item) => item.acknowledged).map((item) => ({ employee_id: item.employee_id }));

    return NextResponse.json({ employees: employeesResult.data || [], training, policies });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load compliance records.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
