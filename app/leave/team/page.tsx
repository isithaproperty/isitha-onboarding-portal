'use client';

import { useEffect,useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';

type Row={id:string;employee_id:string;leave_type:string;start_date:string;end_date:string;reason:string|null;status:string;manager_comment:string|null;employees?:{first_name:string|null;last_name:string|null}|null};
export default function TeamLeave(){
 const router=useRouter(); const [rows,setRows]=useState<Row[]>([]); const [allowed,setAllowed]=useState(false); const [loading,setLoading]=useState(true);
 useEffect(()=>{load()},[]);
 async function load(){const {data:{user}}=await supabase.auth.getUser();if(!user){router.push('/login');return;} const role=String(user.app_metadata?.role||'staff').toLowerCase(); if(!['manager','hr','admin'].includes(role)){setLoading(false);return;} setAllowed(true); const {data}=await supabase.from('leave_requests').select('id,employee_id,leave_type,start_date,end_date,reason,status,manager_comment,employees(first_name,last_name)').order('created_at',{ascending:false}); setRows((data||[]) as unknown as Row[]);setLoading(false);}
 async function decide(id:string,status:'approved'|'declined'){const comment=window.prompt('Manager comment (optional):')||'';const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from('leave_requests').update({status,manager_comment:comment,decided_by:user?.id||null,decided_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);if(error){alert(error.message);return;}await load();}
 if(loading)return <main className="shell"><Header/><section className="hero"><h1>Loading team leave...</h1></section></main>;
 if(!allowed)return <main className="shell"><Header/><section className="hero"><h1>Team Leave</h1><p className="muted">This page is only available to Managers, HR and Admin.</p><Link href="/">← Back to My Portal</Link></section></main>;
 return <main className="shell"><Header/><section className="hero"><span className="pill">Manager</span><h1>Team Leave Requests</h1><p className="muted">Managers see only staff assigned to them. HR and Admin can see all requests.</p></section><section className="section"><div className="grid">{rows.length===0?<div className="card"><p>No team leave requests.</p></div>:rows.map(r=><div className="card" key={r.id}><span className="pill">{r.status}</span><h3>{r.employees?.first_name} {r.employees?.last_name}</h3><p><strong>{r.leave_type.replaceAll('_',' ')}</strong></p><p>{r.start_date} to {r.end_date}</p>{r.reason&&<p className="muted">{r.reason}</p>}{r.manager_comment&&<p><strong>Comment:</strong> {r.manager_comment}</p>}{r.status==='pending'&&<div style={{display:'flex',gap:8}}><button className="button" onClick={()=>decide(r.id,'approved')}>Approve</button><button className="button" onClick={()=>decide(r.id,'declined')}>Decline</button></div>}</div>)}</div></section><section className="section"><Link href="/">← Back to My Portal</Link></section></main>;
}
