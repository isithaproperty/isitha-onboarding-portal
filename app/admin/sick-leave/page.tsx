'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';

type SickBalance = {
  employee_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  employment_start_date: string | null;
  sick_leave_entitlement: number;
  sick_days_taken: number;
  sick_days_remaining: number;
};

export default function SickLeaveOverview() {
  const [rows, setRows] = useState<SickBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/sick-leave', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load sick leave balances.');
        setRows(data.balances || []);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load sick leave balances.'))
      .finally(() => setLoading(false));
  }, []);

  return <main className="shell">
    <Header />
    <section className="hero">
      <span className="pill">HR Admin</span>
      <h1>Sick Leave Overview</h1>
      <p className="muted">View staff sick-leave entitlement, approved days taken and remaining balance.</p>
    </section>
    <section className="section">
      <div className="card">
        {loading && <p className="muted">Loading sick leave balances...</p>}
        {error && <p className="warn"><strong>{error}</strong></p>}
        {!loading && !error && rows.length === 0 && <p className="muted">No employee sick-leave records found.</p>}
        {!loading && !error && rows.length > 0 && <div style={{overflowX:'auto'}}>
          <table className="admin-table">
            <thead><tr><th>Employee</th><th>Email</th><th>Employment start</th><th>Entitlement</th><th>Taken</th><th>Remaining</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.employee_id}>
              <td><strong>{[row.first_name,row.last_name].filter(Boolean).join(' ') || 'Employee'}</strong></td>
              <td>{row.email || '—'}</td>
              <td>{row.employment_start_date || 'Not set'}</td>
              <td>{row.sick_leave_entitlement ?? 30}</td>
              <td>{row.sick_days_taken ?? 0}</td>
              <td><strong>{row.sick_days_remaining ?? 0}</strong></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div>
    </section>
    <section className="section"><Link href="/admin">← Back to HR Admin</Link></section>
  </main>;
}
