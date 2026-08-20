'use client';

import { Header } from '@/components/Header';
import { FormEvent, useEffect, useState } from 'react';

type Employee = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  manager_id: string | null;
  role: string;
};

type AssignmentData = {
  employees?: Employee[];
  managers?: Employee[];
  error?: string;
};

const fullName = (employee?: Employee) =>
  employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email || 'Employee' : 'Not assigned';

export default function ManagerAllocationPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadAssignments() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/manager-assignments', { cache: 'no-store' });
      const data = (await response.json()) as AssignmentData;
      if (!response.ok) {
        setError(data.error || 'Unable to load manager allocations.');
        return;
      }
      setEmployees(data.employees || []);
      setManagers(data.managers || []);
    } catch {
      setError('Unable to load manager allocations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssignments(); }, []);

  function chooseEmployee(employeeId: string) {
    setSelectedEmployee(employeeId);
    const employee = employees.find((item) => item.id === employeeId);
    setSelectedManager(employee?.manager_id || '');
    setMessage('');
    setError('');
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployee) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/manager-assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee, managerId: selectedManager || null }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.error || 'Unable to save manager allocation.');
      else {
        setMessage(result.message || 'Manager allocation saved.');
        await loadAssignments();
      }
    } catch {
      setError('Unable to save manager allocation.');
    } finally {
      setSaving(false);
    }
  }

  const selected = employees.find((item) => item.id === selectedEmployee);
  const currentManager = managers.find((item) => item.id === selected?.manager_id);

  return (
    <main className="shell">
      <Header />
      <section className="hero">
        <span className="pill">HR Admin</span>
        <h1>Manager Allocation</h1>
        <p className="muted">Allocate each employee to the manager responsible for their day-to-day approvals and team oversight.</p>
      </section>

      <section className="section">
        <div className="card">
          {loading ? <p>Loading manager allocations...</p> : error && !employees.length ? <p className="warn">{error}</p> : (
            <form className="admin-form" onSubmit={saveAssignment}>
              <label>Employee
                <select value={selectedEmployee} onChange={(event) => chooseEmployee(event.target.value)} required>
                  <option value="">Select employee</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{fullName(employee)}{employee.email ? ` — ${employee.email}` : ''}</option>)}
                </select>
              </label>
              <label>Assigned manager
                <select value={selectedManager} onChange={(event) => setSelectedManager(event.target.value)} disabled={!selectedEmployee}>
                  <option value="">No manager assigned</option>
                  {managers.filter((manager) => manager.id !== selectedEmployee).map((manager) => <option key={manager.id} value={manager.id}>{fullName(manager)} ({manager.role})</option>)}
                </select>
              </label>
              <div className="admin-form-actions"><button className="button" disabled={saving || !selectedEmployee}>{saving ? 'Saving...' : 'Save manager allocation'}</button></div>
            </form>
          )}
          {selected && <p className="muted" style={{ marginTop: 18 }}><strong>Current allocation:</strong> {currentManager ? fullName(currentManager) : 'No manager assigned'}</p>}
          {message && <p className="ok">{message}</p>}
          {error && employees.length > 0 && <p className="warn">{error}</p>}
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2>Current Team Structure</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr><th>Employee</th><th>Email</th><th>Portal role</th><th>Manager</th></tr></thead>
              <tbody>
                {employees.map((employee) => {
                  const manager = managers.find((item) => item.id === employee.manager_id);
                  return <tr key={employee.id}><td><strong>{fullName(employee)}</strong></td><td>{employee.email}</td><td>{employee.role}</td><td>{manager ? fullName(manager) : 'Not assigned'}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
