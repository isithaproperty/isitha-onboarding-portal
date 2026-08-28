import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { canViewCompliance } from '@/lib/authz';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

export async function GET(){
  try{
    const user=await getAuthenticatedUser();
    if(!user)return NextResponse.json({error:'Please sign in again.'},{status:401});
    if(!canViewCompliance(roleForUser(user)))return NextResponse.json({error:'Compliance access is restricted.'},{status:403});
    const admin=createSupabaseAdminClient();
    const[staffResult,trainingResult,coursesResult,policyResult]=await Promise.all([
      admin.from('employees').select('id,first_name,last_name,email').order('first_name'),
      admin.from('training_progress').select('employee_id,course_id,progress_percent,status,completed_at'),
      admin.from('training_courses').select('id,slug,title'),
      admin.from('employee_document_acknowledgements').select('employee_id,acknowledged'),
    ]);
    const error=staffResult.error||trainingResult.error||coursesResult.error||policyResult.error;
    if(error)throw error;
    const courses=new Map((coursesResult.data||[]).map(c=>[c.id,c]));
    const training=(trainingResult.data||[]).map(item=>({...item,...(courses.get(item.course_id)||{})}));
    const policies=(policyResult.data||[]).filter(i=>i.acknowledged).map(i=>i.employee_id);
    return NextResponse.json({employees:staffResult.data||[],training,policies});
  }catch(error){return NextResponse.json({error:safeApiError(error,'Unable to load compliance records.')},{status:500})}
}
