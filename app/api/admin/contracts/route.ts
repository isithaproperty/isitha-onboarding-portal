import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { canManageContracts } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';
const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canManageContracts(roleForUser(user))) return NextResponse.json({ error: 'This area is for Manager, HR and Admin only.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const [employeeResult, contractResult] = await Promise.all([
      admin.from('employee_hr_onboarding').select('employee_id,legal_first_name,legal_last_name').order('legal_first_name'),
      admin.from('employee_contracts').select('*').order('uploaded_at', { ascending: false }),
    ]);
    if (employeeResult.error) throw employeeResult.error;
    if (contractResult.error) throw contractResult.error;

    const contracts = await Promise.all((contractResult.data || []).map(async contract => {
      const { data } = await admin.storage.from('employee-contracts').createSignedUrl(contract.file_path, 300);
      return { ...contract, signed_url: data?.signedUrl || null };
    }));

    return NextResponse.json({
      employees: (employeeResult.data || []).map(e => ({ id: e.employee_id, first_name: e.legal_first_name, last_name: e.legal_last_name })),
      contracts,
    });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load contracts.') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canManageContracts(roleForUser(user))) return NextResponse.json({ error: 'This area is for Manager, HR and Admin only.' }, { status: 403 });

    const form = await request.formData();
    const employeeId = clean(form.get('employee_id'));
    const file = form.get('contract');
    if (!employeeId || !(file instanceof File) || !file.name) {
      return NextResponse.json({ error: 'Select an employee and contract file.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${employeeId}/${Date.now()}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from('employee-contracts').upload(path, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { error: insertError } = await admin.from('employee_contracts').insert({
      employee_id: employeeId,
      file_path: path,
      original_filename: file.name,
      uploaded_by: user.id,
      status: 'awaiting_signature',
    });
    if (insertError) {
      await admin.storage.from('employee-contracts').remove([path]);
      throw insertError;
    }

    return NextResponse.json({ message: 'Contract uploaded. It is now waiting for the employee to sign.' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to upload contract.') }, { status: 500 });
  }
}
