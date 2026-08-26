import { NextResponse } from 'next/server';
import { resolveEmployeeForUser } from '@/lib/employee-link';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser, safeApiError } from '@/lib/server-auth';

const TYPES=new Set(['access','correction','deletion','objection']);
export async function POST(request:Request){
  try{const user=await getAuthenticatedUser();if(!user)return NextResponse.json({error:'Please sign in again.'},{status:401});const employee=await resolveEmployeeForUser(user);if(!employee)return NextResponse.json({error:'Your employee profile is not linked. Please contact HR.'},{status:409});const body=await request.json() as{type?:unknown;details?:unknown};const type=typeof body.type==='string'?body.type.trim().toLowerCase():'';const details=typeof body.details==='string'?body.details.trim().slice(0,4000):'';if(!TYPES.has(type)||!details)return NextResponse.json({error:'Select a request type and provide details.'},{status:400});const admin=createSupabaseAdminClient();const{error}=await admin.from('data_subject_requests').insert({employee_id:employee.id,request_type:type,details,status:'received'});if(error)throw error;return NextResponse.json({message:'Your privacy request has been recorded for Isitha Global HR.'},{status:201})}catch(error){return NextResponse.json({error:safeApiError(error,'Your privacy request could not be recorded.')},{status:500})}
}
