'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';

type LeaveRequest = { id:string; leave_type:string; start_date:string; end_date:string; reason:string|null; status:string; manager_comment:string|null };

export default function LeavePage() {
  const router = useRouter();
  const [employeeId,setEmployeeId]=useState('');
  const [requests,setRequests]=useState<LeaveRequest[]>([]);
  const [message,setMessage]=useState('');

  useEffect(()=>{ load(); },[]);
  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.push('/login');return;}
    const {data:employee}=await supabase.from('employees').select('id').eq('auth_user_id',user.id).single();
    if(!employee)return;
    setEmployeeId(employee.id);
    const {data}=await supabase.from('leave_requests').select('id,leave_type,start_date,end_date,reason,status,manager_comment').eq('employee_id',employee.id).order('created_at',{ascending:false});
    setRequests(data||[]);
  }
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setMessage('');
    const fd=new FormData(e.currentTarget);
    const payload={employee_id:employeeId,leave_type:String(fd.get('leave_type')),start_date:String(fd.get('start_date')),end_date:String(fd.get('end_date')),reason:String(fd.get('reason')||''),status:'pending'};
    const {error}=await supabase.from('leave_requests').insert(payload);
    if(error){setMessage(error.message);return;}
    e.currentTarget.reset(); setMessage('Leave request submitted for manager approval.'); await load();
  }
  return <main className="shell"><Header/><section className="hero"><span className="pill">Leave</span><h1>My Leave</h1><p className="muted">Request leave and track your manager's decision. You can only see your own leave records.</p></section>
    <section className="section"><div className="card"><h2>Request Leave</h2><form onSubmit={submit} className="grid">
      <label>Leave type<select name="leave_type" required><option value="annual">Annual leave</option><option value="sick">Sick leave</option><option value="family_responsibility">Family responsibility</option><option value="unpaid">Unpaid leave</option><option value="other">Other</option></select></label>
      <label>Start date<input type="date" name="start_date" required/></label><label>End date<input type="date" name="end_date" required/></label>
      <label>Reason / note<textarea name="reason" rows={3}/></label><div><button className="button" type="submit">Submit leave request</button></div></form>{message&&<p><strong>{message}</strong></p>}</div></section>
    <section className="section"><h2>My requests</h2><div className="grid">{requests.length===0?<div className="card"><p className="muted">No leave requests yet.</p></div>:requests.map(r=><div className="card" key={r.id}><span className="pill">{r.status}</span><h3>{r.leave_type.replaceAll('_',' ')}</h3><p><strong>{r.start_date}</strong> to <strong>{r.end_date}</strong></p>{r.reason&&<p className="muted">{r.reason}</p>}{r.manager_comment&&<p><strong>Manager:</strong> {r.manager_comment}</p>}</div>)}</div></section>
    <section className="section"><Link href="/">← Back to My Portal</Link></section></main>;
}
