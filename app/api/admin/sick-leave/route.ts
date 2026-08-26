import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { canViewHr } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canViewHr(roleForUser(user))) return NextResponse.json({ error: 'Only authorised HR, Compliance or Admin users can view sick leave balances.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from('employee_sick_leave_balances').select('*').order('first_name').order('last_name');
    if (error) throw error;
    return NextResponse.json({ balances: data || [] });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load sick leave balances.') }, { status: 500 });
  }
}
