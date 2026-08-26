import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { canReviewLeave } from '@/lib/authz';
import { resolveEmployeeForUser } from '@/lib/employee-link';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

    const role = roleForUser(user);
    if (!canReviewLeave(role)) return NextResponse.json({ error: 'This page is only available to Managers, HR and Admin.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    let employeeIds: string[] | null = null;
    if (role === 'manager') {
      const manager = await resolveEmployeeForUser(user);
      if (!manager) return NextResponse.json({ error: 'Your manager profile is not linked. Please contact HR.' }, { status: 409 });
      const { data: assigned, error } = await admin.from('employees').select('id').eq('manager_id', manager.id);
      if (error) throw error;
      employeeIds = (assigned || []).map(row => row.id);
      if (employeeIds.length === 0) return NextResponse.json({ requests: [] });
    }

    let requestQuery = admin.from('leave_requests')
      .select('id,employee_id,leave_type,start_date,end_date,reason,status,manager_comment,medical_certificate_path,created_at')
      .order('created_at', { ascending: false });
    if (employeeIds) requestQuery = requestQuery.in('employee_id', employeeIds);

    const { data: requests, error: requestError } = await requestQuery;
    if (requestError) throw requestError;

    const ids = [...new Set((requests || []).map(row => row.employee_id).filter(Boolean))];
    const names = new Map<string, { first_name: string | null; last_name: string | null }>();
    if (ids.length) {
      const { data: employees, error: employeeError } = await admin.from('employees').select('id,first_name,last_name').in('id', ids);
      if (employeeError) throw employeeError;
      for (const employee of employees || []) names.set(employee.id, { first_name: employee.first_name, last_name: employee.last_name });
    }

    return NextResponse.json({
      requests: (requests || []).map(row => ({ ...row, employees: names.get(row.employee_id) || null })),
    });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load team leave requests.') }, { status: 500 });
  }
}
