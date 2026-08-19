import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const ADMIN_ROLES = new Set(['admin', 'manager', 'hr_admin', 'compliance_admin']);

type NewStaffRequest = {
  email?: string;
  firstName?: string;
  lastName?: string;
};

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

async function isAuthorisedManager(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
) {
  const configuredEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);

  if (user.email && configuredEmails.includes(user.email.toLowerCase())) return true;
  if (ADMIN_ROLES.has(clean(user.app_metadata?.role).toLowerCase())) return true;

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return ADMIN_ROLES.has(clean(profile?.role).toLowerCase());
}

export async function POST(request: Request) {
  try {
    const requestingUser = await getAuthenticatedUser();
    if (!requestingUser) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

    const admin = createSupabaseAdminClient();
    if (!(await isAuthorisedManager(admin, requestingUser))) {
      return NextResponse.json({ error: 'Only an authorised manager can add staff.' }, { status: 403 });
    }

    const body = (await request.json()) as NewStaffRequest;
    const email = clean(body.email).toLowerCase();
    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'First name, last name and email address are required.' }, { status: 400 });
    }

    const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/login`
      : undefined;

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}` },
      redirectTo,
    });

    if (inviteError || !invited.user) {
      const duplicate = inviteError?.message.toLowerCase().includes('already');
      return NextResponse.json({
        error: duplicate ? 'A login already exists for this email address.' : inviteError?.message || 'Unable to create the staff login.'
      }, { status: duplicate ? 409 : 400 });
    }

    // The existing employees table is the link between Supabase Auth and onboarding.
    // Only auth_user_id is required by the current portal; personal/employment details
    // are collected in employee_hr_onboarding when the employee completes onboarding.
    const { error: employeeError } = await admin.from('employees').insert({
      auth_user_id: invited.user.id,
    });

    if (employeeError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      throw new Error(`Employee record could not be created: ${employeeError.message}`);
    }

    return NextResponse.json({
      message: `${firstName} ${lastName} was added. An invitation email has been sent to ${email}.`
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to add staff.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
