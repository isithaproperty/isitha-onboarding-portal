import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { canViewHr } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

    if (!canViewHr(roleForUser(user))) return NextResponse.json({ error: 'Only HR, Compliance and Admin can view all staff leave balances.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const [annualResult, sickResult] = await Promise.all([
      admin.from('employee_leave_balances').select('employee_id,first_name,last_name,annual_leave_entitlement,approved_days,pending_days,remaining_days').order('first_name').order('last_name'),
      admin.from('employee_sick_leave_balances').select('employee_id,sick_leave_entitlement,sick_days_taken,sick_days_remaining'),
    ]);

    if (annualResult.error) throw annualResult.error;
    if (sickResult.error) throw sickResult.error;

    const sickMap = new Map((sickResult.data || []).map(row => [row.employee_id, row]));
    const balances = (annualResult.data || []).map(row => ({ ...row, ...(sickMap.get(row.employee_id) || {}) }));
    return NextResponse.json({ balances });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load staff leave balances.') }, { status: 500 });
  }
}
