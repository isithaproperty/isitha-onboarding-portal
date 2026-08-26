import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { assignableRoles, normaliseRole } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

type NewStaffRequest = {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
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

    const requestingRole = roleForUser(requestingUser);
    const rolesAllowed = assignableRoles(requestingRole);
    if (!rolesAllowed.length) {
      return NextResponse.json({ error: 'Only an authorised manager can add staff.' }, { status: 403 });
    }
    const admin = createSupabaseAdminClient();

    const body = (await request.json()) as NewStaffRequest;
    const email = clean(body.email).toLowerCase();
    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const requestedRole = normaliseRole(body.role || 'staff');

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'First name, last name and email address are required.' }, { status: 400 });
    }
    if (!rolesAllowed.includes(requestedRole)) {
      return NextResponse.json({ error: 'You cannot assign that portal role.' }, { status: 403 });
    }

    const redirectTo = getInviteRedirect(request);

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}` },
      redirectTo,
    });

    if (inviteError || !invited.user) {
      const duplicate = inviteError?.message.toLowerCase().includes('already');
      return NextResponse.json({
        error: duplicate ? 'A login already exists for this email address.' : 'Unable to create the staff login. Please check the email and try again.'
      }, { status: duplicate ? 409 : 400 });
    }

    const { error: roleError } = await admin.auth.admin.updateUserById(invited.user.id, {
      app_metadata: { ...(invited.user.app_metadata || {}), role: requestedRole },
    });
    if (roleError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      throw new Error(`Portal role could not be assigned: ${roleError.message}`);
    }

    const { data: existingEmployee, error: lookupError } = await admin
      .from('employees').select('id').eq('email', email).maybeSingle();
    if (lookupError) throw lookupError;

    const employeeWrite = existingEmployee
      ? admin.from('employees').update({ auth_user_id: invited.user.id, first_name: firstName, last_name: lastName }).eq('id', existingEmployee.id)
      : admin.from('employees').insert({ auth_user_id: invited.user.id, email, first_name: firstName, last_name: lastName });
    const { error: employeeError } = await employeeWrite;

    if (employeeError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      throw new Error(`Employee record could not be created: ${employeeError.message}`);
    }

    return NextResponse.json({
      message: `${firstName} ${lastName} was added as ${requestedRole === 'hr_admin' ? 'HR' : requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1)}. An invitation email has been sent to ${email}.`
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to add staff. Please try again or contact HR.') }, { status: 500 });
  }
}
