'use client';

import { useEffect,useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';

type Row={id:string;employee_id:string;leave_type:string;start_date:string;end_date:string;reason:string|null;status:string;manager_comment:string|null;medical_certificate_path:string|null;employees?:{first_name:string|null;last_name:string|null}|null};
export default function TeamLeave(){
 const router=useRouter(); const [rows,setRows]=useState<Row[]>([]); const [allowed,setAllowed]=useState(false); const [loading,setLoading]=useState(true); const [openingCertificate,setOpeningCertificate]=useState<string|null>(null); const [errorMessage,setErrorMessage]=useState('');
 useEffect(()=>{load()},[]);
 async function load(){
  const {data:{user}}=await supabase.auth.getUser();if(!user){router.push('/login');return;}
  const response=await fetch('/api/leave/team',{cache:'no-store'}); const result=await response.json();
  if(response.status===403){setAllowed(false);setLoading(false);return;}
  if(!response.ok){setErrorMessage(result.error||'Unable to load team leave requests.');setLoading(false);return;}
  setAllowed(true);setRows((result.requests||[]) as Row[]);setLoading(false);
 }
 async function decide(id:string,status:'approved'|'declined'){const comment=window.prompt('Manager comment (optional):')||'';const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from('leave_requests').update({status,manager_comment:comment,decided_by:user?.id||null,decided_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);if(error){alert(error.message);return;}await load();}
 async function viewCertificate(path:string){setOpeningCertificate(path);const {data,error}=await supabase.storage.from('medical-certificates').createSignedUrl(path,60);setOpeningCertificate(null);if(error||!data?.signedUrl){alert(error?.message||'Unable to open the medical certificate.');return;}window.open(data.signedUrl,'_blank','noopener,noreferrer');}
 if(loading)return <main className="shell"><Header/><section className="hero"><h1>Loading team leave...</h1></section></main>;
 if(!allowed)return <main className="shell"><Header/><section className="hero"><h1>Team Leave</h1><p className="muted">This page is only available to Managers, HR and Admin.</p><Link href="/">← Back to My Portal</Link></section></main>;
 return <main className="shell"><Header/><section className="hero"><span className="pill">Manager</span><h1>Team Leave Requests</h1><p className="muted">Review and action leave requests. HR and Admin can use Staff Leave for the full company balance overview.</p></section><section className="section">{errorMessage&&<div className="card"><p className="warn">{errorMessage}</p></div>}<div className="grid">{rows.length===0?<div className="card"><p>No team leave requests.</p></div>:rows.map(r=>{const name=`${r.employees?.first_name||''} ${r.employees?.last_name||''}`.trim()||'Employee';return <div className="card" key={r.id}><h3 style={{marginTop:0,marginBottom:10}}>{name}</h3><span className="pill">{r.status}</span><p><strong>{r.leave_type.replaceAll('_',' ')}</strong></p><p>{r.start_date} to {r.end_date}</p>{r.reason&&<p className="muted">{r.reason}</p>}{r.medical_certificate_path&&<p><button className="button secondary" type="button" disabled={openingCertificate===r.medical_certificate_path} onClick={()=>viewCertificate(r.medical_certificate_path!)}>{openingCertificate===r.medical_certificate_path?'Opening certificate...':'View medical certificate'}</button></p>}{r.manager_comment&&<p><strong>Comment:</strong> {r.manager_comment}</p>}{r.status==='pending'&&<div style={{display:'flex',gap:8}}><button className="button" onClick={()=>decide(r.id,'approved')}>Approve</button><button className="button" onClick={()=>decide(r.id,'declined')}>Decline</button></div>}</div>})}</div></section><section className="section"><Link href="/">← Back to My Portal</Link></section></main>;
}
