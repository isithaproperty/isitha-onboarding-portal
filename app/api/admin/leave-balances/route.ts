import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const ADMIN_ROLES = new Set(['admin', 'administrator', 'hr', 'hr_admin', 'compliance_admin']);
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

    const configuredEmails = (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    const authorised = (user.email && configuredEmails.includes(user.email.toLowerCase())) || ADMIN_ROLES.has(clean(user.app_metadata?.role).toLowerCase());
    if (!authorised) return NextResponse.json({ error: 'Only HR and Admin can view all staff leave balances.' }, { status: 403 });

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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load staff leave balances.' }, { status: 500 });
  }
}
