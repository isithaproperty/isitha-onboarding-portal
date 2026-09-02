import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { resolveEmployeeForUser } from '@/lib/employee-link';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

function dueDate(value: string) {
  const date = new Date(value);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date;
}

function daysUntil(date: Date) {
  const today = new Date();
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.ceil((end - start) / 86400000);
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const role = roleForUser(user);
    const admin = createSupabaseAdminClient();

    let employeeIds: string[] = [];
    if (role === 'hr_admin' || role === 'admin') {
      const { data, error } = await admin.from('employees').select('id').or('onboarding_status.is.null,onboarding_status.neq.leaver');
      if (error) throw error;
      employeeIds = (data || []).map(item => item.id);
    } else if (role === 'manager') {
      const own = await resolveEmployeeForUser(user);
      const { data, error } = await admin.from('employees').select('id').eq('manager_id', user.id).or('onboarding_status.is.null,onboarding_status.neq.leaver');
      if (error) throw error;
      employeeIds = [...new Set([...(own ? [own.id] : []), ...(data || []).map(item => item.id)])];
    } else {
      const own = await resolveEmployeeForUser(user);
      employeeIds = own ? [own.id] : [];
    }

    if (!employeeIds.length) return NextResponse.json({ renewals: [] });

    const [{ data: employees, error: employeeError }, { data: training, error: trainingError }, { data: appraisals, error: appraisalError }] = await Promise.all([
      admin.from('employees').select('id,first_name,last_name,email').in('id', employeeIds),
      admin.from('training_progress').select('id,employee_id,course_id,status,completed_at,training_courses(title,slug)').in('employee_id', employeeIds).in('status', ['completed','renewal_due']).not('completed_at', 'is', null),
      admin.from('appraisals').select('id,employee_id,appraisal_type,review_date,completed_at').in('employee_id', employeeIds).eq('status', 'completed').neq('appraisal_type', 'probation').not('completed_at', 'is', null),
    ]);
    if (employeeError) throw employeeError;
    if (trainingError) throw trainingError;
    if (appraisalError) throw appraisalError;

    const employeeMap = new Map((employees || []).map(employee => [employee.id, employee]));
    const renewals: Array<Record<string, unknown>> = [];

    for (const row of training || []) {
      if (!row.completed_at) continue;
      const due = dueDate(row.completed_at);
      const employee = employeeMap.get(row.employee_id);
      const course = Array.isArray(row.training_courses) ? row.training_courses[0] : row.training_courses;
      renewals.push({
        id: `training:${row.id}`,
        kind: 'training',
        employee_id: row.employee_id,
        employee_name: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.email || 'Employee',
        title: course?.title || 'Mandatory training',
        completed_at: row.completed_at,
        due_at: due.toISOString(),
        days_remaining: daysUntil(due),
        renewal_due: row.status === 'renewal_due',
        action_path: course?.slug ? `/training/${course.slug}` : '/',
      });
    }

    const latestByEmployee = new Map<string, any>();
    for (const row of appraisals || []) {
      if (!row.completed_at) continue;
      const current = latestByEmployee.get(row.employee_id);
      const timestamp = new Date(row.completed_at).getTime();
      if (!current || timestamp > current.timestamp) latestByEmployee.set(row.employee_id, { row, timestamp });
    }
    for (const { row } of latestByEmployee.values()) {
      const completed = row.completed_at as string;
      const due = dueDate(completed);
      const employee = employeeMap.get(row.employee_id);
      renewals.push({
        id: `appraisal:${row.id}`,
        kind: 'appraisal',
        employee_id: row.employee_id,
        employee_name: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.email || 'Employee',
        title: 'Performance appraisal',
        completed_at: completed,
        due_at: due.toISOString(),
        days_remaining: daysUntil(due),
        action_path: '/appraisals',
      });
    }

    renewals.sort((a, b) => Number(a.days_remaining) - Number(b.days_remaining));
    return NextResponse.json({ renewals, scope: role });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load annual renewals.') }, { status: 500 });
  }
}
