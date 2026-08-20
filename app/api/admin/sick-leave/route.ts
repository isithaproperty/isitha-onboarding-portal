import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const ADMIN_ROLES = new Set(['admin', 'manager', 'hr_admin', 'compliance_admin']);
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
    const emails = (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    const authorised = (user.email && emails.includes(user.email.toLowerCase())) || ADMIN_ROLES.has(clean(user.app_metadata?.role).toLowerCase());
    if (!authorised) return NextResponse.json({ error: 'Only authorised HR/Admin users can view sick leave balances.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from('employee_sick_leave_balances').select('*').order('first_name').order('last_name');
    if (error) throw error;
    return NextResponse.json({ balances: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load sick leave balances.' }, { status: 500 });
  }
}
