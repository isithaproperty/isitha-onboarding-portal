import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';

async function getUser() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase public credentials are not configured.');
  const client = createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

    const role = clean(user.app_metadata?.role).toLowerCase();
    const configuredAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    const isConfiguredAdmin = Boolean(user.email && configuredAdmins.includes(user.email.toLowerCase()));
    const isAdmin = isConfiguredAdmin || ['admin', 'administrator', 'hr', 'hr_admin'].includes(role);
    const isManager = role === 'manager';
    if (!isAdmin && !isManager) return NextResponse.json({ error: 'This page is only available to Managers, HR and Admin.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    let employeeIds: string[] | null = null;
    if (isManager && !isAdmin) {
      const { data: assigned, error } = await admin.from('employees').select('id').eq('manager_id', user.id);
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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load team leave requests.' }, { status: 500 });
  }
}
