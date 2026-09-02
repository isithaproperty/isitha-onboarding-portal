'use client';

import { useEffect, useMemo, useState } from 'react';
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

type Filter = 'all' | 'due' | 'overdue' | 'current';

function statusFor(days: number) {
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, tone: '#991b1b' };
  if (days === 0) return { label: 'Due today', tone: '#991b1b' };
  if (days <= 30) return { label: `Due in ${days}d`, tone: '#92400e' };
  return { label: 'Up to date', tone: '#166534' };
}

function date(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return renewals.filter(item => {
      const matchesSearch = !term || item.employee_name.toLowerCase().includes(term) || item.title.toLowerCase().includes(term) || item.kind.includes(term);
      const matchesFilter = filter === 'all'
        || (filter === 'overdue' && item.days_remaining < 0)
        || (filter === 'due' && item.days_remaining >= 0 && item.days_remaining <= 30)
        || (filter === 'current' && item.days_remaining > 30);
      return matchesSearch && matchesFilter;
    });
  }, [renewals, search, filter]);

  const dueSoon = renewals.filter(item => item.days_remaining >= 0 && item.days_remaining <= 30).length;
  const overdue = renewals.filter(item => item.days_remaining < 0).length;

  return <main className="shell"><Header/>
    <section className="hero"><span className="pill">Annual compliance cycle</span><h1>Training & Appraisal Renewals</h1><p className="muted">A compact overview of annual training and performance appraisal renewal dates. Your view is limited by your portal role.</p></section>
    <section className="section"><div className="card">
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:16}}>
        <div><h2 style={{marginBottom:4}}>Renewal overview</h2><div className="muted">{renewals.length} tracked · {dueSoon} due within 30 days · {overdue} overdue</div></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input aria-label="Search renewals" placeholder="Search staff or training…" value={search} onChange={event=>setSearch(event.target.value)} style={{minWidth:220,padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8}}/>
          <select aria-label="Filter renewals" value={filter} onChange={event=>setFilter(event.target.value as Filter)} style={{padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8}}><option value="all">All</option><option value="due">Due soon</option><option value="overdue">Overdue</option><option value="current">Up to date</option></select>
        </div>
      </div>
      {loading?<p>Loading renewal overview…</p>:message?<p role="status">{message}</p>:renewals.length===0?<p className="muted">No completed training or appraisals are currently waiting for annual renewal.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:14,minWidth:820}}><thead><tr style={{textAlign:'left',borderBottom:'2px solid #e5e7eb'}}><th style={{padding:'10px 8px'}}>Employee</th><th style={{padding:'10px 8px'}}>Type</th><th style={{padding:'10px 8px'}}>Training / Appraisal</th><th style={{padding:'10px 8px'}}>Completed</th><th style={{padding:'10px 8px'}}>Renewal due</th><th style={{padding:'10px 8px'}}>Status</th><th style={{padding:'10px 8px'}}>Action</th></tr></thead><tbody>{filtered.map(item=>{const status=statusFor(item.days_remaining);return <tr key={item.id} style={{borderBottom:'1px solid #e5e7eb'}}><td style={{padding:'10px 8px',fontWeight:700,whiteSpace:'nowrap'}}>{item.employee_name}</td><td style={{padding:'10px 8px'}}>{item.kind==='training'?'Training':'Appraisal'}</td><td style={{padding:'10px 8px'}}>{item.title}</td><td style={{padding:'10px 8px',whiteSpace:'nowrap'}}>{date(item.completed_at)}</td><td style={{padding:'10px 8px',whiteSpace:'nowrap'}}>{date(item.due_at)}</td><td style={{padding:'10px 8px',fontWeight:700,color:status.tone,whiteSpace:'nowrap'}}>{status.label}</td><td style={{padding:'10px 8px'}}><Link href={item.action_path}>Open</Link></td></tr>})}</tbody></table>{filtered.length===0&&<p className="muted" style={{padding:'16px 8px'}}>No renewals match your search or filter.</p>}</div>}
    </div></section>
  </main>;
}
