'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';

type ArchiveEmployee = {
  employee_id: string;
  name: string;
  email: string | null;
  status: string;
  submitted_at: string | null;
  archived_at: string | null;
  signed_contracts: number;
  awaiting_contracts: number;
};

export default function HrArchivePage() {
  const [rows,setRows]=useState<ArchiveEmployee[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [working,setWorking]=useState<string|null>(null);

  async function load(){
    setLoading(true);setMessage('');
    try{
      const response=await fetch('/api/admin/archive',{cache:'no-store'});
      const data=await response.json();
      if(response.status===401){window.location.href='/login';return}
      if(!response.ok){setMessage(data.error||'Unable to load archive records.');return}
      setRows(data.employees||[]);
    }catch{setMessage('Unable to load archive records.')}finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[]);

  async function archive(row:ArchiveEmployee){
    if(row.awaiting_contracts>0){setMessage(`${row.name} still has a contract awaiting signature.`);return}
    const alreadyArchived=Boolean(row.archived_at);
    const confirmation=window.prompt(alreadyArchived
      ? `Download the new signed contract file(s) to your secure server first.\n\nThis permanently removes those contract files from the portal while retaining the signature audit record.\n\nType ARCHIVE to continue.`
      : `Before continuing, download the employee onboarding PDF and every signed contract to your secure server.\n\nThis action permanently removes the private onboarding fields, ID/passport file and signed contract files from the portal.\n\nType ARCHIVE to continue.`);
    if(confirmation?.trim().toUpperCase()!=='ARCHIVE')return;
    setWorking(row.employee_id);setMessage('');
    try{
      const response=await fetch('/api/admin/archive',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:row.employee_id,confirmation})});
      const data=await response.json();
      if(!response.ok){setMessage(data.error||'The employee record could not be archived.');return}
      setMessage(`${row.name}: ${data.message}`);
      await load();
    }catch{setMessage('The employee record could not be archived.')}finally{setWorking(null)}
  }

  return <main className="shell"><Header/><section className="hero"><span className="pill">HR only</span><h1>HR Archive</h1><p className="muted">Use this only after the employee pack has been downloaded and saved to your secure server. The portal keeps only minimum audit evidence after archiving.</p></section>{message&&<section className="section"><div className="card" role="status"><strong>{message}</strong></div></section>}<section className="section"><div className="card"><h2>Employee records</h2>{loading?<p>Loading...</p>:<div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr><th>Employee</th><th>Status</th><th>Submitted</th><th>Signed files to archive</th><th>Awaiting signature</th><th>Action</th></tr></thead><tbody>{rows.map(row=><tr key={row.employee_id}><td><strong>{row.name}</strong><br/><span className="muted">{row.email||''}</span></td><td>{row.archived_at?'Archived':row.status}</td><td>{row.submitted_at?new Date(row.submitted_at).toLocaleString():'—'}</td><td>{row.signed_contracts}</td><td>{row.awaiting_contracts}</td><td>{row.status!=='submitted'&&!row.archived_at?<span className="muted">Submit onboarding first</span>:row.awaiting_contracts>0?<span className="warn">Complete contract signing first</span>:row.archived_at&&row.signed_contracts===0?<span className="ok">Private portal data removed</span>:<button className="button" type="button" disabled={working===row.employee_id} onClick={()=>archive(row)}>{working===row.employee_id?'Archiving...':row.archived_at?'Archive new contract files':'Archive & remove private data'}</button>}</td></tr>)}</tbody></table></div>}</div></section><section className="section"><p className="muted">Export the onboarding PDF from HR Admin and download signed contracts before using the archive action.</p><Link href="/admin">← Back to HR Admin</Link></section></main>;
}
