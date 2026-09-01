import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { resolveEmployeeForUser } from '@/lib/employee-link';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser, safeApiError } from '@/lib/server-auth';

const SIGNING_DECLARATION='I confirm that I opened, read and agree to this contract.';
const ascii=(value:string)=>value.replace(/[^\x20-\x7E]/g,'?');

async function ownContract(contractId:string){
  const user=await getAuthenticatedUser();
  if(!user)return {response:NextResponse.json({error:'Please sign in again.'},{status:401})};
  const employee=await resolveEmployeeForUser(user);
  if(!employee)return {response:NextResponse.json({error:'Your employee profile is not linked. Please contact HR.'},{status:409})};
  const admin=createSupabaseAdminClient();
  const {data:contract,error}=await admin.from('employee_contracts')
    .select('id,employee_id,file_path,original_filename,status,opened_at,archived_at,signed_file_path,signed_at,signer_name')
    .eq('id',contractId).eq('employee_id',employee.id).is('archived_at',null).maybeSingle();
  if(error)throw error;
  if(!contract)return {response:NextResponse.json({error:'This contract file is no longer held in the portal.'},{status:404})};
  return {admin,contract,user};
}

function signedFilename(originalFilename:string){
  const stem=originalFilename.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9._-]/g,'_') || 'contract';
  return `${stem}-signed.pdf`;
}

async function buildSignedPdf(admin:ReturnType<typeof createSupabaseAdminClient>,contract:{file_path:string;original_filename:string},signerName:string,signedAt:string){
  const isPdf=contract.original_filename.toLowerCase().endsWith('.pdf');
  let pdf:PDFDocument;
  if(isPdf){
    const {data,error}=await admin.storage.from('employee-contracts').download(contract.file_path);
    if(error||!data)throw error||new Error('Original contract could not be read.');
    pdf=await PDFDocument.load(await data.arrayBuffer());
  }else{
    pdf=await PDFDocument.create();
  }

  const page=pdf.addPage([595.28,841.89]);
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const {height}=page.getSize();
  const signedDate=new Date(signedAt);
  const dateText=Number.isNaN(signedDate.getTime())?signedAt:signedDate.toISOString().replace('T',' ').replace('Z',' UTC');

  page.drawText('Electronic Signature Record',{x:50,y:height-80,size:20,font:bold,color:rgb(0,0,0)});
  page.drawText(`Contract: ${ascii(contract.original_filename)}`,{x:50,y:height-125,size:11,font:regular});
  page.drawText('Signed by:',{x:50,y:height-180,size:11,font:bold});
  page.drawText(ascii(signerName),{x:50,y:height-210,size:22,font:regular});
  page.drawLine({start:{x:50,y:height-220},end:{x:360,y:height-220},thickness:1,color:rgb(0,0,0)});
  page.drawText(`Signed at: ${ascii(dateText)}`,{x:50,y:height-255,size:11,font:regular});
  page.drawText('Declaration:',{x:50,y:height-305,size:11,font:bold});
  page.drawText(SIGNING_DECLARATION,{x:50,y:height-330,size:11,font:regular,maxWidth:495,lineHeight:15});
  page.drawText('This page forms part of the portal signing audit record.',{x:50,y:80,size:9,font:regular,color:rgb(0.25,0.25,0.25)});

  return new Uint8Array(await pdf.save());
}

export async function GET(request:Request,context:{params:Promise<{contractId:string}>}){
  try{
    const {contractId}=await context.params;const access=await ownContract(contractId);
    if('response'in access)return access.response;
    const openedAt=new Date().toISOString();
    const {error:updateError}=await access.admin.from('employee_contracts').update({opened_at:openedAt}).eq('id',contractId).is('opened_at',null).is('archived_at',null);
    if(updateError)throw updateError;

    const url=new URL(request.url);
    const wantsSigned=url.searchParams.get('signed')==='1';
    const wantsDownload=url.searchParams.get('download')==='1';
    if(wantsSigned&&!access.contract.signed_file_path){
      return NextResponse.json({error:'A signed copy is not available yet.'},{status:404});
    }
    const path=wantsSigned?access.contract.signed_file_path:access.contract.file_path;
    const filename=wantsSigned?signedFilename(access.contract.original_filename):access.contract.original_filename;
    const options=wantsDownload?{download:filename}:undefined;
    const {data,error}=await access.admin.storage.from('employee-contracts').createSignedUrl(path,300,options);
    if(error||!data?.signedUrl)throw error||new Error('Signed URL missing');
    return NextResponse.json({url:data.signedUrl,openedAt});
  }catch(error){return NextResponse.json({error:safeApiError(error,'The contract could not be opened.')},{status:500})}
}

export async function PATCH(request:Request,context:{params:Promise<{contractId:string}>}){
  let uploadedSignedPath:string|null=null;
  try{
    const {contractId}=await context.params;const access=await ownContract(contractId);
    if('response'in access)return access.response;
    if(access.contract.status==='signed')return NextResponse.json({error:'This contract has already been signed.'},{status:409});
    if(!access.contract.opened_at)return NextResponse.json({error:'Open and review the contract before signing it.'},{status:409});
    const body=await request.json() as {signerName?:unknown;accepted?:unknown};
    const signerName=typeof body.signerName==='string'?body.signerName.trim().slice(0,160):'';
    if(!signerName||body.accepted!==true)return NextResponse.json({error:'Enter your full name and confirm the signing declaration.'},{status:400});

    const signedAt=new Date().toISOString();
    const signedBytes=await buildSignedPdf(access.admin,access.contract,signerName,signedAt);
    uploadedSignedPath=`${access.contract.employee_id}/signed/${contractId}-${Date.now()}.pdf`;
    const {error:uploadError}=await access.admin.storage.from('employee-contracts').upload(uploadedSignedPath,signedBytes,{contentType:'application/pdf',upsert:false});
    if(uploadError)throw uploadError;

    const {data,error}=await access.admin.from('employee_contracts').update({
      status:'signed',signed_at:signedAt,signed_by:access.user.id,signer_name:signerName,
      signed_file_path:uploadedSignedPath,
      signing_declaration:SIGNING_DECLARATION,
    }).eq('id',contractId).eq('employee_id',access.contract.employee_id).eq('status','awaiting_signature').is('archived_at',null).select('id,status,signed_at,signer_name,signed_file_path').maybeSingle();
    if(error)throw error;
    if(!data){
      await access.admin.storage.from('employee-contracts').remove([uploadedSignedPath]);
      uploadedSignedPath=null;
      return NextResponse.json({error:'This contract was already updated.'},{status:409});
    }
    return NextResponse.json({contract:data,message:'Contract signed successfully. Your signed PDF is ready to download.'});
  }catch(error){
    if(uploadedSignedPath){
      try{const admin=createSupabaseAdminClient();await admin.storage.from('employee-contracts').remove([uploadedSignedPath]);}catch{}
    }
    return NextResponse.json({error:safeApiError(error,'The contract could not be signed.')},{status:500})
  }
}
