'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';

type LeaveRequest = {
  id:string;
  leave_type:string;
  start_date:string;
  end_date:string;
  reason:string|null;
  status:string;
  manager_comment:string|null;
  created_at?:string;
};

type LeaveBalance = {
  annual_leave_entitlement:number;
  approved_days:number;
  pending_days:number;
  remaining_days:number;
};

export default function LeavePage() {
  const router = useRouter();
  const [employeeId,setEmployeeId]=useState('');
  const [requests,setRequests]=useState<LeaveRequest[]>([]);
  const [balance,setBalance]=useState<LeaveBalance|null>(null);
  const [message,setMessage]=useState('');
  const [errorMessage,setErrorMessage]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [loadingRequests,setLoadingRequests]=useState(true);

  useEffect(()=>{ load(); },[]);

  async function loadBalance(id:string){
    const {data,error}=await supabase
      .from('employee_leave_balances')
      .select('annual_leave_entitlement,approved_days,pending_days,remaining_days')
      .eq('employee_id',id)
      .maybeSingle();

    if(error){
      setErrorMessage(`Your leave balance could not be loaded: ${error.message}`);
      return;
    }
    if(data) setBalance(data as LeaveBalance);
  }

  async function loadRequests(id:string){
    setLoadingRequests(true);
    const {data,error}=await supabase
      .from('leave_requests')
      .select('id,leave_type,start_date,end_date,reason,status,manager_comment,created_at')
      .eq('employee_id',id)
      .order('created_at',{ascending:false});

    if(error){
      setErrorMessage(`Your leave requests could not be loaded: ${error.message}`);
      setLoadingRequests(false);
      return;
    }

    setRequests(data||[]);
    setLoadingRequests(false);
  }

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.push('/login');return;}

    let {data:employee}=await supabase
      .from('employees')
      .select('id')
      .eq('id',user.id)
      .maybeSingle();

    if(!employee&&user.email){
      const byEmail=await supabase
        .from('employees')
        .select('id')
        .eq('email',user.email.toLowerCase())
        .maybeSingle();
      employee=byEmail.data;
    }

    if(!employee){
      setErrorMessage('Your employee profile could not be found. Please contact HR.');
      setLoadingRequests(false);
      return;
    }

    setEmployeeId(employee.id);
    await Promise.all([loadRequests(employee.id),loadBalance(employee.id)]);
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(submitting)return;
    setMessage('');
    setErrorMessage('');

    if(!employeeId){
      setErrorMessage('Your employee profile is still loading. Please try again in a moment.');
      return;
    }

    const form=e.currentTarget;
    const fd=new FormData(form);
    const leaveType=String(fd.get('leave_type'));
    const startDate=String(fd.get('start_date'));
    const endDate=String(fd.get('end_date'));
    const reason=String(fd.get('reason')||'');

    if(endDate<startDate){
      setErrorMessage('End date cannot be before the start date.');
      return;
    }

    const duplicate=requests.some(r=>r.status==='pending'&&r.leave_type===leaveType&&r.start_date===startDate&&r.end_date===endDate);
    if(duplicate){
      setErrorMessage('You already have a pending leave request for these dates.');
      return;
    }

    setSubmitting(true);
    const payload={employee_id:employeeId,leave_type:leaveType,start_date:startDate,end_date:endDate,reason,status:'pending'};
    const {error}=await supabase.from('leave_requests').insert(payload);

    if(error){
      setErrorMessage(`Leave request could not be submitted: ${error.message}`);
      setSubmitting(false);
      return;
    }

    const optimistic:LeaveRequest={
      id:`pending-${Date.now()}`,
      leave_type:leaveType,
      start_date:startDate,
      end_date:endDate,
      reason:reason||null,
      status:'pending',
      manager_comment:null,
      created_at:new Date().toISOString(),
    };
    setRequests(current=>[optimistic,...current]);
    form.reset();
    setMessage('✓ Leave request submitted successfully and is awaiting manager approval.');
    setSubmitting(false);

    await Promise.all([loadRequests(employeeId),loadBalance(employeeId)]);
  }

  return <main className="shell"><Header/><section className="hero"><span className="pill">Leave</span><h1>My Leave</h1><p className="muted">Request leave and track your manager's decision. You can only see your own leave records.</p></section>
    <section className="section"><h2>Annual Leave Balance</h2><div className="grid">
      <div className="card"><div className="muted">Entitlement</div><div className="metric">{balance?.annual_leave_entitlement ?? 0}</div><p className="muted">days per year</p></div>
      <div className="card"><div className="muted">Taken</div><div className="metric">{balance?.approved_days ?? 0}</div><p className="muted">approved weekdays</p></div>
      <div className="card"><div className="muted">Pending</div><div className="metric">{balance?.pending_days ?? 0}</div><p className="muted">awaiting approval</p></div>
      <div className="card"><div className="muted">Remaining</div><div className="metric">{balance?.remaining_days ?? 0}</div><p className="muted">days available</p></div>
    </div></section>
    <section className="section"><div className="card"><h2>Request Leave</h2><form onSubmit={submit} className="grid">
      <label>Leave type<select name="leave_type" required defaultValue="annual"><option value="annual">Annual leave</option><option value="sick">Sick leave</option><option value="family_responsibility">Family responsibility</option><option value="unpaid">Unpaid leave</option><option value="other">Other</option></select></label>
      <label>Start date<input type="date" name="start_date" required/></label><label>End date<input type="date" name="end_date" required/></label>
      <label>Reason / note<textarea name="reason" rows={3}/></label><div><button className="button" type="submit" disabled={submitting||!employeeId}>{submitting?'Submitting...':'Submit leave request'}</button></div></form>
      {message&&<p className="ok"><strong>{message}</strong></p>}
      {errorMessage&&<p className="warn"><strong>{errorMessage}</strong></p>}
    </div></section>
    <section className="section"><h2>My requests</h2><div className="grid">
      {loadingRequests?<div className="card"><p className="muted">Loading leave requests...</p></div>:requests.length===0?<div className="card"><p className="muted">No leave requests yet.</p></div>:requests.map(r=><div className="card" key={r.id}><span className="pill">{r.status}</span><h3>{r.leave_type.replaceAll('_',' ')}</h3><p><strong>{r.start_date}</strong> to <strong>{r.end_date}</strong></p>{r.reason&&<p className="muted">{r.reason}</p>}{r.manager_comment&&<p><strong>Manager:</strong> {r.manager_comment}</p>}</div>)}
    </div></section>
    <section className="section"><Link href="/">← Back to My Portal</Link></section></main>;
}
