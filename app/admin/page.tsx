import { Header } from '@/components/Header';

const employees = [
  {
    name: 'John Smith',
    client: 'UK Client A',
    onboarding: '100%',
    ohsa: 'Complete',
    policies: 'Complete',
    quiz: '90%',
    status: 'Compliant',
  },
  {
    name: 'Sarah Jones',
    client: 'UK Client B',
    onboarding: '72%',
    ohsa: 'Complete',
    policies: 'In progress',
    quiz: '-',
    status: 'In progress',
  },
  {
    name: 'Mark Green',
    client: 'UK Client A',
    onboarding: '100%',
    ohsa: 'Complete',
    policies: 'Complete',
    quiz: '60%',
    status: 'Retraining',
  },
];

export default function AdminPage() {
  return (
    <main className="shell">
      <Header />

      <section className="hero">
        <span className="pill">HR Admin</span>
        <h1>Compliance Dashboard</h1>
        <p className="muted">
          Monitor onboarding, training and staff compliance.
        </p>
      </section>

      <div className="grid">
        <div className="card">
          <div className="muted">Total employees</div>
          <div className="metric">3</div>
        </div>

        <div className="card">
          <div className="muted">Fully compliant</div>
          <div className="metric">1</div>
        </div>

        <div className="card">
          <div className="muted">Training outstanding</div>
          <div className="metric">2</div>
        </div>
      </div>

      <section className="section">
        <div className="card">
          <h2>Employee Compliance</h2>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: 20,
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Employee</th>
                  <th style={th}>Client</th>
                  <th style={th}>Onboarding</th>
                  <th style={th}>OHSA</th>
                  <th style={th}>Policies</th>
                  <th style={th}>Quiz</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.name}>
                    <td style={td}>
                      <strong>{employee.name}</strong>
                    </td>
                    <td style={td}>{employee.client}</td>
                    <td style={td}>{employee.onboarding}</td>
                    <td style={td}>{employee.ohsa}</td>
                    <td style={td}>{employee.policies}</td>
                    <td style={td}>{employee.quiz}</td>
                    <td style={td}>
                      <strong>{employee.status}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

const th = {
  textAlign: 'left' as const,
  padding: '12px',
  borderBottom: '2px solid #e5e7eb',
  fontSize: '14px',
};

const td = {
  padding: '14px 12px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
};
