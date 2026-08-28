import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { canManageContracts } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';
const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTRACT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_CONTRACT_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const role = roleForUser(user);
    if (!canManageContracts(role)) return NextResponse.json({ error: 'This area is for Manager, HR and Admin only.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    let employeeQuery = admin.from('employees').select('id,first_name,last_name').order('first_name');
    if (role === 'manager') employeeQuery = employeeQuery.eq('manager_id', user.id);
    const employeeResult = await employeeQuery;
    if (employeeResult.error) throw employeeResult.error;

    const employeeIds = (employeeResult.data || []).map(e => e.id);
    let contractQuery = admin.from('employee_contracts').select('*').is('archived_at', null).order('uploaded_at', { ascending: false });
    if (role === 'manager') {
      if (employeeIds.length === 0) return NextResponse.json({ employees: [], contracts: [] });
      contractQuery = contractQuery.in('employee_id', employeeIds);
    }
    const contractResult = await contractQuery;
    if (contractResult.error) throw contractResult.error;

    const contracts = await Promise.all((contractResult.data || []).map(async contract => {
      const { data } = await admin.storage.from('employee-contracts').createSignedUrl(contract.file_path, 300);
      return { ...contract, signed_url: data?.signedUrl || null };
    }));

    return NextResponse.json({
      employees: (employeeResult.data || []).map(e => ({ id: e.id, first_name: e.first_name, last_name: e.last_name })),
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
    const role = roleForUser(user);
    if (!canManageContracts(role)) return NextResponse.json({ error: 'This area is for Manager, HR and Admin only.' }, { status: 403 });

    const form = await request.formData();
    const employeeId = clean(form.get('employee_id'));
    const file = form.get('contract');
    if (!employeeId || !(file instanceof File) || !file.name) {
      return NextResponse.json({ error: 'Select an employee and contract file.' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_CONTRACT_EXTENSIONS.has(extension) || !ALLOWED_CONTRACT_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Contract must be a PDF, DOC or DOCX file.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Contract must be 10 MB or smaller.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    if (role === 'manager') {
      const { data: managedEmployee, error: managedEmployeeError } = await admin.from('employees').select('id').eq('id', employeeId).eq('manager_id', user.id).maybeSingle();
      if (managedEmployeeError) throw managedEmployeeError;
      if (!managedEmployee) return NextResponse.json({ error: 'Managers can only upload contracts for employees assigned to their team.' }, { status: 403 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${employeeId}/${Date.now()}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from('employee-contracts').upload(path, bytes, {
      contentType: file.type,
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
