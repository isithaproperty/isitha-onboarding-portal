"use client";

import { Header } from "@/components/Header";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const [realEmployees, setRealEmployees] = useState<any[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<any[]>([]);
const [policyAcknowledgements, setPolicyAcknowledgements] = useState<any[]>([]);
useEffect(() => {
  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employee_hr_onboarding")
      .select("*");

    if (error) {
      console.error("Error loading employees:", error);
      return;
    }

    setRealEmployees(data || []);
  }

  loadEmployees();
  async function loadTrainingProgress() {
  const { data, error } = await supabase
    .from("training_progress")
    .select("*");

  if (error) {
    console.error("Error loading training progress:", error);
    return;
  }

  setTrainingProgress(data || []);
}
  loadTrainingProgress();
  loadPolicyAcknowledgements();
  async function loadPolicyAcknowledgements() {
  const { data, error } = await supabase
    .from("employee_document_acknowledgements")
    .select("*");

  if (error) {
    console.error("Error loading policy acknowledgements:", error);
    return;
  }

  setPolicyAcknowledgements(data || []); 
}
  loadPolicyAcknowledgements();
}, []);

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
<th style={th}>Email</th>
<th style={th}>Mobile</th>
<th style={th}>Declaration</th>
<th style={th}>Training</th>
  <th style={th}>Policies</th>                
<th style={th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {realEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td style={td}>
                      <strong>
  {employee.legal_first_name} {employee.legal_last_name}
</strong>
                    </td>
                    <td style={td}>{employee.personal_email}</td>
<td style={td}>{employee.mobile_number}</td>
<td style={td}>
  {employee.declaration_accepted ? "Accepted" : "Outstanding"}
</td>
  <td style={td}>
  {trainingProgress
    .filter((t) => t.employee_id === employee.employee_id)
    .map((t) => `${t.progress_percent}%`)
    .join(", ") || "Not started"}
</td>  
    <td style={td}>
  {policyAcknowledgements.filter(
    (p) => p.employee_id === employee.employee_id
  ).length > 0
    ? "Accepted"
    : "Outstanding"}
</td>                
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
