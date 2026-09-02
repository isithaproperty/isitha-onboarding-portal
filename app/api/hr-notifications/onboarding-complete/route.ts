import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser, safeApiError } from '@/lib/server-auth';
import { createHrCompletionNotification } from '@/lib/hr-notifications';

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

    const admin = createSupabaseAdminClient();
    let employeeQuery = admin.from('employees').select('id,first_name,last_name,email').eq('auth_user_id', user.id).maybeSingle();
    let { data: employee, error: employeeError } = await employeeQuery;
    if (employeeError) throw employeeError;

    if (!employee && user.email) {
      const byEmail = await admin.from('employees').select('id,first_name,last_name,email').ilike('email', user.email).maybeSingle();
      if (byEmail.error) throw byEmail.error;
      employee = byEmail.data;
    }
    if (!employee) return NextResponse.json({ error: 'Employee record not found.' }, { status: 404 });

    const { data: onboarding, error: onboardingError } = await admin.from('employee_hr_onboarding')
      .select('status,submitted_at')
      .eq('employee_id', employee.id)
      .maybeSingle();
    if (onboardingError) throw onboardingError;
    if (String(onboarding?.status || '').toLowerCase() !== 'submitted') {
      return NextResponse.json({ error: 'Onboarding has not been submitted.' }, { status: 409 });
    }

    const employeeName = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim() || employee.email || 'Employee';
    const result = await createHrCompletionNotification({
      eventKey: `onboarding:${employee.id}:submitted`,
      eventType: 'onboarding_completed',
      entityId: employee.id,
      employeeId: employee.id,
      title: `Onboarding completed – ${employeeName}`,
      message: `${employeeName} has completed and submitted their HR onboarding. Please log in to the Isitha portal to review the record.`,
      actionPath: '/admin',
    });

    return NextResponse.json({ notified: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to notify HR about this onboarding.') }, { status: 500 });
  }
}
