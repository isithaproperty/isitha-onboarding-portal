'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';

type Renewal = {
  id: string;
  kind: 'training' | 'appraisal';
  employee_name: string;
  title: string;
  completed_at: string;
  due_at: string;
  days_remaining: number;
  action_path: string;
};

function statusFor(days: number) {
  if (days < 0) return { label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`, tone: '#991b1b' };
  if (days === 0) return { label: 'Due today', tone: '#991b1b' };
  if (days <= 30) return { label: `${days} day${days === 1 ? '' : 's'} remaining`, tone: '#92400e' };
  return { label: `${days} days remaining`, tone: '#166534' };
}

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const response = await fetch('/api/renewals', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || 'Unable to load annual renewals.'); return; }
      setRenewals(data.renewals || []);
    } catch {
      setMessage('Unable to load annual renewals.');
    } finally {
      setLoading(false);
    }
  }

  const dueSoon = renewals.filter(item => item.days_remaining <= 30).length;
  const overdue = renewals.filter(item => item.days_remaining < 0).length;

  return <main className="shell"><Header/>
    <section className="hero"><span className="pill">Annual compliance cycle</span><h1>Training & Appraisal Renewals</h1><p className="muted">Completed mandatory training and performance appraisals renew 12 months after completion. This timer is visible according to your portal role.</p></section>
    <section className="section"><div className="grid"><div className="card"><div className="muted">Annual items tracked</div><div className="metric">{renewals.length}</div></div><div className="card"><div className="muted">Due within 30 days</div><div className="metric">{dueSoon}</div></div><div className="card"><div className="muted">Overdue</div><div className="metric">{overdue}</div></div></div></section>
    <section className="section"><div className="card"><h2>Renewal timers</h2>{loading?<p>Loading renewal timers…</p>:message?<p role="status">{message}</p>:renewals.length===0?<p className="muted">No completed training or appraisals are currently waiting for annual renewal.</p>:<div style={{display:'grid',gap:12}}>{renewals.map(item=>{const status=statusFor(item.days_remaining);return <div key={item.id} style={{border:'1px solid #e5e7eb',borderRadius:10,padding:16,display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><span className="pill">{item.kind==='training'?'Training':'Appraisal'}</span><h3 style={{marginBottom:4}}>{item.title}</h3><div><strong>{item.employee_name}</strong></div><div className="muted">Completed {new Date(item.completed_at).toLocaleDateString()} · Renews {new Date(item.due_at).toLocaleDateString()}</div><div style={{fontWeight:700,color:status.tone,marginTop:6}}>{status.label}</div></div><Link className="button" href={item.action_path}>{item.kind==='training'?'Open training':'Open appraisals'}</Link></div>})}</div>}</div></section>
  </main>;
}
