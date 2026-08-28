import { NextResponse } from 'next/server';
import { resolveEmployeeForUser } from '@/lib/employee-link';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser, safeApiError } from '@/lib/server-auth';

async function ownContract(contractId:string){
  const user=await getAuthenticatedUser();
  if(!user)return {response:NextResponse.json({error:'Please sign in again.'},{status:401})};
  const employee=await resolveEmployeeForUser(user);
  if(!employee)return {response:NextResponse.json({error:'Your employee profile is not linked. Please contact HR.'},{status:409})};
  const admin=createSupabaseAdminClient();
  const {data:contract,error}=await admin.from('employee_contracts')
    .select('id,employee_id,file_path,original_filename,status,opened_at,archived_at')
    .eq('id',contractId).eq('employee_id',employee.id).is('archived_at',null).maybeSingle();
  if(error)throw error;
  if(!contract)return {response:NextResponse.json({error:'This contract file is no longer held in the portal.'},{status:404})};
  return {admin,contract,user};
}

export async function GET(_request:Request,context:{params:Promise<{contractId:string}>}){
  try{
    const {contractId}=await context.params;const access=await ownContract(contractId);
    if('response'in access)return access.response;
    const openedAt=new Date().toISOString();
    const {error:updateError}=await access.admin.from('employee_contracts').update({opened_at:openedAt}).eq('id',contractId).is('opened_at',null).is('archived_at',null);
    if(updateError)throw updateError;
    const {data,error}=await access.admin.storage.from('employee-contracts').createSignedUrl(access.contract.file_path,300);
    if(error||!data?.signedUrl)throw error||new Error('Signed URL missing');
    return NextResponse.json({url:data.signedUrl,openedAt});
  }catch(error){return NextResponse.json({error:safeApiError(error,'The contract could not be opened.')},{status:500})}
}

export async function PATCH(request:Request,context:{params:Promise<{contractId:string}>}){
  try{
    const {contractId}=await context.params;const access=await ownContract(contractId);
    if('response'in access)return access.response;
    if(access.contract.status==='signed')return NextResponse.json({error:'This contract has already been signed.'},{status:409});
    if(!access.contract.opened_at)return NextResponse.json({error:'Open and review the contract before signing it.'},{status:409});
    const body=await request.json() as {signerName?:unknown;accepted?:unknown};
    const signerName=typeof body.signerName==='string'?body.signerName.trim().slice(0,160):'';
    if(!signerName||body.accepted!==true)return NextResponse.json({error:'Enter your full name and confirm the signing declaration.'},{status:400});
    const signedAt=new Date().toISOString();
    const {data,error}=await access.admin.from('employee_contracts').update({
      status:'signed',signed_at:signedAt,signed_by:access.user.id,signer_name:signerName,
      signed_file_path:access.contract.file_path,
      signing_declaration:'I confirm that I opened, read and agree to this contract.',
    }).eq('id',contractId).eq('employee_id',access.contract.employee_id).eq('status','awaiting_signature').is('archived_at',null).select('id,status,signed_at,signer_name').maybeSingle();
    if(error)throw error;
    if(!data)return NextResponse.json({error:'This contract was already updated.'},{status:409});
    return NextResponse.json({contract:data,message:'Contract signed successfully.'});
  }catch(error){return NextResponse.json({error:safeApiError(error,'The contract could not be signed.')},{status:500})}
}
