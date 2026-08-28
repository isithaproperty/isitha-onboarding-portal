import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

function canArchive(role: string) {
  return role === 'hr_admin' || role === 'admin';
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canArchive(roleForUser(user))) return NextResponse.json({ error: 'Only HR or Admin can archive employee records.' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const [staffResult, onboardingResult, contractsResult] = await Promise.all([
      admin.from('employees').select('id,first_name,last_name,email').order('first_name'),
      admin.from('employee_hr_onboarding').select('employee_id,status,submitted_at,archived_at'),
      admin.from('employee_contracts').select('employee_id,status,archived_at'),
    ]);
    const error = staffResult.error || onboardingResult.error || contractsResult.error;
    if (error) throw error;

    const onboardingByEmployee = new Map((onboardingResult.data || []).map(row => [row.employee_id, row]));
    const contracts = contractsResult.data || [];
    const employees = (staffResult.data || []).map(staff => {
      const onboarding = onboardingByEmployee.get(staff.id);
      const employeeContracts = contracts.filter(contract => contract.employee_id === staff.id);
      return {
        employee_id: staff.id,
        name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Employee',
        email: staff.email || null,
        status: onboarding?.status || 'not_started',
        submitted_at: onboarding?.submitted_at || null,
        archived_at: onboarding?.archived_at || null,
        signed_contracts: employeeContracts.filter(contract => contract.status === 'signed' && !contract.archived_at).length,
        awaiting_contracts: employeeContracts.filter(contract => contract.status !== 'signed' && !contract.archived_at).length,
      };
    });

    return NextResponse.json({ employees });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load archive records.') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (!canArchive(roleForUser(user))) return NextResponse.json({ error: 'Only HR or Admin can archive employee records.' }, { status: 403 });

    const body = await request.json() as { employeeId?: unknown; confirmation?: unknown };
    const employeeId = typeof body.employeeId === 'string' ? body.employeeId.trim() : '';
    const confirmation = typeof body.confirmation === 'string' ? body.confirmation.trim().toUpperCase() : '';
    if (!employeeId || confirmation !== 'ARCHIVE') {
      return NextResponse.json({ error: 'Type ARCHIVE to confirm permanent removal of private portal data.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: onboarding, error: onboardingError } = await admin.from('employee_hr_onboarding')
      .select('*').eq('employee_id', employeeId).maybeSingle();
    if (onboardingError) throw onboardingError;
    if (!onboarding) return NextResponse.json({ error: 'No onboarding record was found for this employee.' }, { status: 404 });

    const currentStatus = String(onboarding.status || '').toLowerCase();
    const onboardingAlreadyArchived = Boolean(onboarding.archived_at) || currentStatus === 'archived';
    const archiveInProgress = currentStatus === 'archive_pending';
    if (!onboardingAlreadyArchived && !archiveInProgress && currentStatus !== 'submitted') {
      return NextResponse.json({ error: 'Only submitted onboarding records can be archived.' }, { status: 409 });
    }

    const { data: contracts, error: contractsError } = await admin.from('employee_contracts')
      .select('id,status,file_path,signed_file_path,archived_at').eq('employee_id', employeeId).is('archived_at', null);
    if (contractsError) throw contractsError;
    const activeContracts = contracts || [];
    if (activeContracts.some(contract => contract.status !== 'signed')) {
      return NextResponse.json({ error: 'This employee still has a contract awaiting signature. Complete or remove it before archiving.' }, { status: 409 });
    }
    if (onboardingAlreadyArchived && activeContracts.length === 0) {
      return NextResponse.json({ error: 'There is no new private portal data to archive for this employee.' }, { status: 409 });
    }

    if (!onboardingAlreadyArchived && !archiveInProgress) {
      const { error: pendingError } = await admin.from('employee_hr_onboarding').update({
        status: 'archive_pending',
        archived_by: user.id,
        updated_at: new Date().toISOString(),
      }).eq('employee_id', employeeId).eq('status', 'submitted');
      if (pendingError) throw pendingError;
    }

    if (!onboardingAlreadyArchived && onboarding.id_document_path) {
      const { error } = await admin.storage.from('employee-hr-documents').remove([onboarding.id_document_path]);
      if (error) throw error;
    }

    const contractPaths = Array.from(new Set(activeContracts.flatMap(contract => [contract.file_path, contract.signed_file_path].filter(Boolean) as string[])));
    if (contractPaths.length > 0) {
      const { error } = await admin.storage.from('employee-contracts').remove(contractPaths);
      if (error) throw error;
    }

    const archivedAt = new Date().toISOString();
    if (!onboardingAlreadyArchived) {
      const { error: updateOnboardingError } = await admin.from('employee_hr_onboarding').update({
        legal_first_name: null,
        legal_last_name: null,
        id_passport_number: null,
        date_of_birth: null,
        nationality: null,
        mobile_number: null,
        personal_email: null,
        residential_address: null,
        emergency_contact_name: null,
        emergency_contact_relationship: null,
        emergency_contact_number: null,
        bank_name: null,
        account_holder: null,
        account_number: null,
        account_type: null,
        tax_number: null,
        id_document_path: null,
        bank_branch_code: null,
        status: 'archived',
        archived_at: archivedAt,
        archived_by: user.id,
        updated_at: archivedAt,
      }).eq('employee_id', employeeId).in('status', ['submitted', 'archive_pending']);
      if (updateOnboardingError) throw updateOnboardingError;
    }

    if (activeContracts.length > 0) {
      const { error: updateContractsError } = await admin.from('employee_contracts').update({
        archived_at: archivedAt,
        archived_by: user.id,
      }).eq('employee_id', employeeId).is('archived_at', null);
      if (updateContractsError) throw updateContractsError;
    }

    return NextResponse.json({
      message: onboardingAlreadyArchived
        ? 'New signed contract files were removed from the portal and their signature audit records were retained.'
        : 'Private onboarding data and signed contract files were removed from the portal. Minimal audit records were retained.',
      archivedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'The archive could not be completed. No further changes will be made until HR retries the archive action.') }, { status: 500 });
  }
}
