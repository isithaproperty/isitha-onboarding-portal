'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';

type Balance = {
  employee_id: string;
  first_name: string | null;
  last_name: string | null;
  annual_leave_entitlement: number;
  approved_days: number;
  pending_days: number;
  remaining_days: number;
  sick_leave_entitlement?: number;
  sick_days_taken?: number;
  sick_days_remaining?: number;
};

type BalanceResponse = { balances?: Balance[]; error?: string };

export default function StaffLeaveOverview() {
  const router = useRouter();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const role = String(user.app_metadata?.role || 'staff').toLowerCase();
    if (!['hr', 'hr_admin', 'admin', 'administrator'].includes(role)) {
      setLoading(false);
      return;
    }

    setAllowed(true);
    try {
      const response = await fetch('/api/admin/leave-balances', { cache: 'no-store' });
      const data = await response.json() as BalanceResponse;
      if (!response.ok) {
        setErrorMessage(data.error || 'Unable to load staff leave balances.');
        setLoading(false);
        return;
      }
      setBalances(data.balances || []);
    } catch {
      setErrorMessage('Unable to load staff leave balances.');
    }
    setLoading(false);
  }

  if (loading) return <main className="shell"><Header/><section className="hero"><h1>Loading staff leave...</h1></section></main>;

  if (!allowed) return <main className="shell"><Header/><section className="hero"><span className="pill">HR Admin</span><h1>Staff Leave</h1><p className="muted">This page is only available to HR and Admin.</p><Link href="/">← Back to My Portal</Link></section></main>;

  return (
    <main className="shell">
      <Header />
      <section className="hero">
        <span className="pill">HR Admin</span>
        <h1>Staff Leave</h1>
        <p className="muted">View annual and sick leave balances for all staff in one place.</p>
      </section>

      <section className="section">
        <div className="card">
          <h2>All Staff Leave Balances</h2>
          {errorMessage && <p className="warn"><strong>{errorMessage}</strong></p>}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Annual entitlement</th>
                  <th>Annual taken</th>
                  <th>Annual pending</th>
                  <th>Annual remaining</th>
                  <th>Sick entitlement</th>
                  <th>Sick taken</th>
                  <th>Sick remaining</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 ? (
                  <tr><td colSpan={8}>No staff leave balances available.</td></tr>
                ) : balances.map((b) => (
                  <tr key={b.employee_id}>
                    <td><strong>{b.first_name} {b.last_name}</strong></td>
                    <td>{b.annual_leave_entitlement ?? 0}</td>
                    <td>{b.approved_days ?? 0}</td>
                    <td>{b.pending_days ?? 0}</td>
                    <td><strong>{b.remaining_days ?? 0}</strong></td>
                    <td>{b.sick_leave_entitlement ?? 0}</td>
                    <td>{b.sick_days_taken ?? 0}</td>
                    <td><strong>{b.sick_days_remaining ?? 0}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section"><Link href="/admin">← Back to HR Admin</Link></section>
    </main>
  );
}
