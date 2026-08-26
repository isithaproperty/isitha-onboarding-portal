import { NextResponse } from 'next/server';
import { canReviewLeave } from '@/lib/authz';
import { resolveEmployeeForUser } from '@/lib/employee-link';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

async function authorisedRequest(requestId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { response: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) };
  const role = roleForUser(user);
  if (!canReviewLeave(role)) return { response: NextResponse.json({ error: 'You are not authorised to review leave.' }, { status: 403 }) };

  const admin = createSupabaseAdminClient();
  const reviewer = await resolveEmployeeForUser(user);
  if (!reviewer) return { response: NextResponse.json({ error: 'Your employee profile is not linked. Please contact HR.' }, { status: 409 }) };

  const { data: leave, error } = await admin.from('leave_requests')
    .select('id,employee_id,status,medical_certificate_path')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!leave) return { response: NextResponse.json({ error: 'Leave request not found.' }, { status: 404 }) };
  if (leave.employee_id === reviewer.id) return { response: NextResponse.json({ error: 'You cannot review your own leave request.' }, { status: 403 }) };

  if (role === 'manager') {
    const { data: assigned, error: assignedError } = await admin.from('employees')
      .select('id').eq('id', leave.employee_id).eq('manager_id', reviewer.id).maybeSingle();
    if (assignedError) throw assignedError;
    if (!assigned) return { response: NextResponse.json({ error: 'This employee is not assigned to you.' }, { status: 403 }) };
  }
  return { admin, leave, user };
}

export async function PATCH(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await context.params;
    const access = await authorisedRequest(requestId);
    if ('response' in access) return access.response;
    if (access.leave.status !== 'pending') return NextResponse.json({ error: 'This leave request has already been decided.' }, { status: 409 });

    const body = await request.json() as { status?: unknown; comment?: unknown };
    const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) : '';
    if (status !== 'approved' && status !== 'declined') {
      return NextResponse.json({ error: 'Select approve or decline.' }, { status: 400 });
    }

    const { data, error } = await access.admin.from('leave_requests').update({
      status,
      manager_comment: comment || null,
      decided_by: access.user.id,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', requestId).eq('status', 'pending').select('id,status').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'This leave request was already updated.' }, { status: 409 });
    return NextResponse.json({ request: data, message: `Leave request ${status}.` });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'The leave decision could not be saved.') }, { status: 500 });
  }
}

export async function GET(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await context.params;
    const access = await authorisedRequest(requestId);
    if ('response' in access) return access.response;
    if (!access.leave.medical_certificate_path) return NextResponse.json({ error: 'No medical certificate is attached.' }, { status: 404 });
    const { data, error } = await access.admin.storage.from('medical-certificates')
      .createSignedUrl(access.leave.medical_certificate_path, 60);
    if (error || !data?.signedUrl) throw error || new Error('Signed URL missing');
    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'The medical certificate could not be opened.') }, { status: 500 });
  }
}
