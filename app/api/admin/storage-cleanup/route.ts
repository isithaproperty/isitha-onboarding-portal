import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

type BucketName='employee-hr-documents'|'employee-contracts';
const BUCKETS:BucketName[]=['employee-hr-documents','employee-contracts'];

async function listFiles(bucket:BucketName,prefix=''):Promise<string[]>{
  const admin=createSupabaseAdminClient();const{data,error}=await admin.storage.from(bucket).list(prefix,{limit:1000,sortBy:{column:'name',order:'asc'}});if(error)throw error;const files:string[]=[];
  for(const item of data||[]){const path=prefix?`${prefix}/${item.name}`:item.name;if(item.id)files.push(path);else files.push(...await listFiles(bucket,path))}return files;
}

async function orphanReport(){
  const admin=createSupabaseAdminClient();const[{data:onboarding,error:onboardingError},{data:contracts,error:contractError},hrFiles,contractFiles]=await Promise.all([admin.from('employee_hr_onboarding').select('id_document_path'),admin.from('employee_contracts').select('file_path'),listFiles('employee-hr-documents'),listFiles('employee-contracts')]);if(onboardingError)throw onboardingError;if(contractError)throw contractError;
  const hrReferences=new Set((onboarding||[]).map(row=>row.id_document_path).filter(Boolean));const contractReferences=new Set((contracts||[]).map(row=>row.file_path).filter(Boolean));
  return {'employee-hr-documents':hrFiles.filter(path=>!hrReferences.has(path)),'employee-contracts':contractFiles.filter(path=>!contractReferences.has(path))};
}

async function authorised(){const user=await getAuthenticatedUser();if(!user)return null;const role=roleForUser(user);return role==='hr_admin'||role==='admin'?user:null}
export async function GET(){try{if(!await authorised())return NextResponse.json({error:'Only HR or Admin can review unlinked documents.'},{status:403});const orphans=await orphanReport();return NextResponse.json({orphans,counts:Object.fromEntries(BUCKETS.map(bucket=>[bucket,orphans[bucket].length]))})}catch(error){return NextResponse.json({error:safeApiError(error,'Unable to review stored documents.')},{status:500})}}
export async function POST(request:Request){try{if(!await authorised())return NextResponse.json({error:'Only HR or Admin can remove unlinked documents.'},{status:403});const body=await request.json() as{confirm?:unknown;paths?:Partial<Record<BucketName,unknown>>};if(body.confirm!==true)return NextResponse.json({error:'Explicit confirmation is required.'},{status:400});const current=await orphanReport();const admin=createSupabaseAdminClient();const removed:Record<string,number>={};for(const bucket of BUCKETS){const requested=Array.isArray(body.paths?.[bucket])?body.paths![bucket] as unknown[]:[];const safe=requested.filter((path):path is string=>typeof path==='string'&&current[bucket].includes(path));if(safe.length){const{error}=await admin.storage.from(bucket).remove(safe);if(error)throw error}removed[bucket]=safe.length}return NextResponse.json({removed,message:'Confirmed unlinked documents were removed.'})}catch(error){return NextResponse.json({error:safeApiError(error,'Unable to remove unlinked documents.')},{status:500})}}
