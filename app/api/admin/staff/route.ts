import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const ADMIN_ROLES = new Set(['admin', 'manager', 'hr_admin', 'compliance_admin']);
const ASSIGNABLE_ROLES = new Set(['staff', 'manager', 'hr_admin', 'admin']);

type NewStaffRequest = {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
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
  _admin: ReturnType<typeof createSupabaseAdminClient>,
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
) {
  const configuredEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);

  if (user.email && configuredEmails.includes(user.email.toLowerCase())) return true;
  return ADMIN_ROLES.has(clean(user.app_metadata?.role).toLowerCase());
}

function getInviteRedirect(request: Request) {
  const configuredSite = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredSite && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredSite)) {
    return `${configuredSite.replace(/\/$/, '')}/set-password`;
  }

  const origin = new URL(request.url).origin;
  return `${origin.replace(/\/$/, '')}/set-password`;
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
    const role = clean(body.role || 'staff').toLowerCase();

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'First name, last name and email address are required.' }, { status: 400 });
    }
    if (!ASSIGNABLE_ROLES.has(role)) {
      return NextResponse.json({ error: 'Please select a valid portal role.' }, { status: 400 });
    }

    const redirectTo = getInviteRedirect(request);

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

    const { error: roleError } = await admin.auth.admin.updateUserById(invited.user.id, {
      app_metadata: { ...(invited.user.app_metadata || {}), role },
    });
    if (roleError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      throw new Error(`Portal role could not be assigned: ${roleError.message}`);
    }

    const { error: employeeError } = await admin.from('employees').insert({
      id: invited.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
    });

    if (employeeError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      throw new Error(`Employee record could not be created: ${employeeError.message}`);
    }

    return NextResponse.json({
      message: `${firstName} ${lastName} was added as ${role === 'hr_admin' ? 'HR' : role.charAt(0).toUpperCase() + role.slice(1)}. An invitation email has been sent to ${email}.`
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to add staff.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
