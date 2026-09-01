'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { canReviewLeave, normaliseRole } from '@/lib/authz';

type Employee={id:string;first_name:string|null;last_name:string|null;email:string|null};

export default function BookLeaveForStaff(){
 const router=useRouter();
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [allowed,setAllowed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [submitting,setSubmitting]=useState(false);
 const [message,setMessage]=useState('');
 const [errorMessage,setErrorMessage]=useState('');
 const [leaveType,setLeaveType]=useState('annual');

 useEffect(()=>{void load()},[]);
 async function load(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){router.push('/login');return;}
  const role=normaliseRole(user.app_metadata?.role);
  if(!canReviewLeave(role)){setLoading(false);return;}
  setAllowed(true);
  let query=supabase.from('employees').select('id,first_name,last_name,email').neq('onboarding_status','leaver').order('first_name');
  if(role==='manager') query=query.eq('manager_id',user.id);
  const {data,error}=await query;
  if(error)setErrorMessage('Unable to load employees.'); else setEmployees((data||[]) as Employee[]);
  setLoading(false);
 }

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(submitting)return;setMessage('');setErrorMessage('');
  const {data:{user}}=await supabase.auth.getUser();if(!user){router.push('/login');return;}
  const form=e.currentTarget;const fd=new FormData(form);
  const employeeId=String(fd.get('employee_id')||'');const startDate=String(fd.get('start_date')||'');const endDate=String(fd.get('end_date')||'');
  if(!employeeId){setErrorMessage('Select an employee.');return;} if(endDate<startDate){setErrorMessage('End date cannot be before the start date.');return;}
  setSubmitting(true);
  const {error}=await supabase.from('leave_requests').insert({employee_id:employeeId,leave_type:String(fd.get('leave_type')),start_date:startDate,end_date:endDate,reason:String(fd.get('reason')||''),status:'pending',submitted_by:user.id});
  if(error){setErrorMessage('Leave could not be booked. Please try again.');setSubmitting(false);return;}
  form.reset();setLeaveType('annual');setMessage('✓ Leave booked successfully and sent into the normal approval workflow.');setSubmitting(false);
 }

 if(loading)return <main className="shell"><Header/><section className="hero"><h1>Loading...</h1></section></main>;
 if(!allowed)return <main className="shell"><Header/><section className="hero"><h1>Book Leave for Staff</h1><p className="muted">This page is only available to Managers, HR and Admin.</p><Link href="/leave">← Back to Leave</Link></section></main>;
 return <main className="shell"><Header/><section className="hero"><span className="pill">Leave</span><h1>Book Leave for Staff</h1><p className="muted">Managers can book for their team. HR and Admin can book for any active employee.</p></section><section className="section"><div className="card"><form onSubmit={submit} className="grid"><label>Employee<select name="employee_id" required defaultValue=""><option value="" disabled>Select employee</option>{employees.map(e=><option key={e.id} value={e.id}>{`${e.first_name||''} ${e.last_name||''}`.trim()||e.email||'Employee'}</option>)}</select></label><label>Leave type<select name="leave_type" required value={leaveType} onChange={e=>setLeaveType(e.target.value)}><option value="annual">Annual leave</option><option value="sick">Sick leave</option><option value="family_responsibility">Family responsibility</option><option value="unpaid">Unpaid leave</option><option value="other">Other</option></select></label><label>Start date<input type="date" name="start_date" required/></label><label>End date<input type="date" name="end_date" required/></label><label>Reason / note<textarea name="reason" rows={3}/></label><div><button className="button" disabled={submitting}>{submitting?'Booking...':'Book leave'}</button></div></form>{message&&<p className="ok"><strong>{message}</strong></p>}{errorMessage&&<p className="warn"><strong>{errorMessage}</strong></p>}</div></section><section className="section"><Link href="/leave/team">← Back to Team Leave</Link></section></main>;
}
