'use client';

import {useEffect,useState} from 'react';
import {Header} from '@/components/Header';

type Employee={id:string;first_name:string|null;last_name:string|null;email:string|null};
type Training={employee_id:string;progress_percent:number;status:string;completed_at:string|null;slug?:string;title?:string};
type Data={employees?:Employee[];training?:Training[];policies?:string[];error?:string};
const label=(item:Training)=>{const text=`${item.slug||''} ${item.title||''}`.toLowerCase();if(text.includes('ohsa'))return'OHSA';if(text.includes('emergency'))return'Emergency';if(text.includes('employment')||text.includes('hr'))return'HR';if(text.includes('popia')||text.includes('data protection'))return'POPIA';return item.title||'Training'};

export default function CompliancePage(){
  const[employees,setEmployees]=useState<Employee[]>([]);const[training,setTraining]=useState<Training[]>([]);const[policies,setPolicies]=useState<string[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
  useEffect(()=>{void load()},[]);
  async function load(){try{const response=await fetch('/api/compliance/summary',{cache:'no-store'});const data=await response.json() as Data;if(response.status===401){window.location.href='/login';return}if(!response.ok){setError(data.error||'Unable to load compliance records.');return}setEmployees(data.employees||[]);setTraining(data.training||[]);setPolicies(data.policies||[])}catch{setError('Unable to load compliance records.')}finally{setLoading(false)}}
  return <main className="shell"><Header/><section className="hero"><span className="pill">Compliance</span><h1>Training & Policy Compliance</h1><p className="muted">This view intentionally excludes private HR, payroll, banking, tax, ID and emergency-contact information.</p></section><section className="section"><div className="card">{loading?<p>Loading compliance records...</p>:error?<p className="warn">{error}</p>:<div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr><th>Employee</th><th>Work email</th><th>Training</th><th>Policies</th></tr></thead><tbody>{employees.map(employee=>{const rows=training.filter(t=>t.employee_id===employee.id);return <tr key={employee.id}><td><strong>{employee.first_name} {employee.last_name}</strong></td><td>{employee.email||'—'}</td><td>{rows.length?rows.map(r=>`${label(r)}: ${r.progress_percent}%`).join(' | '):'Not started'}</td><td>{policies.includes(employee.id)?'Accepted':'Outstanding'}</td></tr>})}</tbody></table></div>}</div></section></main>;
}
