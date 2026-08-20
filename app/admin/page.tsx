"use client";

import { Header } from "@/components/Header";
import { FormEvent, useEffect, useState } from "react";

type Employee = { id: string; employee_id?: string; legal_first_name?: string; legal_last_name?: string; personal_email?: string; mobile_number?: string; declaration_accepted?: boolean; status?: string; };
type TrainingProgress = { employee_id: string; progress_percent: number; title?: string; slug?: string; completed_at?: string; };
type PolicyAcknowledgement = { employee_id: string };
type ComplianceData = { employees?: Employee[]; training?: TrainingProgress[]; policies?: PolicyAcknowledgement[]; error?: string };

const courseLabel = (item: TrainingProgress, index: number) => {
  const text = `${item.slug || ""} ${item.title || ""}`.toLowerCase();
  if (text.includes("ohsa")) return "OHSA";
  if (text.includes("emergency")) return "Emergency";
  if (text.includes("employment") || text.includes("hr")) return "HR";
  if (text.includes("popia") || text.includes("data protection")) return "POPIA";
  return ["OHSA", "Emergency", "HR", "POPIA"][index] || `Course ${index + 1}`;
};

export default function AdminPage() {
  const [realEmployees, setRealEmployees] = useState<Employee[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([]);
  const [policyAcknowledgements, setPolicyAcknowledgements] = useState<PolicyAcknowledgement[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffMessage, setStaffMessage] = useState("");
  const [staffError, setStaffError] = useState("");
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    async function loadAdminData() {
      try {
        const response = await fetch("/api/admin/compliance", { cache: "no-store" });
        const data = (await response.json()) as ComplianceData;
        if (!response.ok) { setAdminError(data.error || "Unable to load employee compliance records."); return; }
        setRealEmployees(data.employees || []); setTrainingProgress(data.training || []); setPolicyAcknowledgements(data.policies || []);
      } catch { setAdminError("Unable to load employee compliance records."); }
    }
    loadAdminData();
  }, []);

  async function handleAddStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingStaff(true); setStaffMessage(""); setStaffError("");
    const form = event.currentTarget; const formData = new FormData(form);
    try {
      const response = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: formData.get("firstName"), lastName: formData.get("lastName"), email: formData.get("email") }) });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) setStaffError(result.error || "Unable to add staff."); else { setStaffMessage(result.message || "Staff member added successfully."); form.reset(); }
    } catch { setStaffError("Unable to contact the server. Please try again."); } finally { setSavingStaff(false); }
  }

  function printComplianceRecord(employee: Employee, employeeTraining: TrainingProgress[]) {
    const policiesAccepted = policyAcknowledgements.some((item) => item.employee_id === employee.employee_id);
    const popup = window.open("", "_blank", "width=800,height=900"); if (!popup) return;
    const name = `${employee.legal_first_name || ""} ${employee.legal_last_name || ""}`.trim() || "Employee";
    const rows = employeeTraining.length ? employeeTraining.map((item, index) => `<p>${courseLabel(item, index)}: <strong>${item.progress_percent}%</strong>${item.completed_at ? ` — completed ${new Date(item.completed_at).toLocaleDateString()}` : ""}</p>`).join("") : "<p>Training not started.</p>";
    popup.document.write(`<html><head><title>${name} - Compliance Record</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#222}h1{margin-bottom:4px}.muted{color:#666}.card{border:1px solid #ddd;border-radius:12px;padding:24px;margin-top:24px}@media print{button{display:none}}</style></head><body><h1>Employee Compliance Record</h1><p class="muted">Isitha Global Staff Portal</p><div class="card"><h2>${name}</h2><p><strong>Email:</strong> ${employee.personal_email || "Not provided"}</p><p><strong>Mobile:</strong> ${employee.mobile_number || "Not provided"}</p><p><strong>Status:</strong> ${employee.status || "Not submitted"}</p><p><strong>Declaration:</strong> ${employee.declaration_accepted ? "Accepted" : "Outstanding"}</p><p><strong>Policies:</strong> ${policiesAccepted ? "Accepted" : "Outstanding"}</p><h3>Training</h3>${rows}</div><p class="muted">Generated ${new Date().toLocaleString()}</p><button onclick="window.print()">Print / Save as PDF</button></body></html>`);
    popup.document.close(); popup.focus();
  }

  return <main className="shell"><Header />
    <section className="hero"><span className="pill">HR Admin</span><h1>Compliance Dashboard</h1><p className="muted">Monitor onboarding, training and staff compliance.</p></section>
    {adminError && <section className="section"><div className="card"><p className="warn">{adminError}</p></div></section>}
    {!adminError && <><div className="grid"><div className="card"><div className="muted">Onboarding records</div><div className="metric">{realEmployees.length}</div></div><div className="card"><div className="muted">Declarations accepted</div><div className="metric">{realEmployees.filter((e) => e.declaration_accepted).length}</div></div><div className="card"><div className="muted">Onboarding outstanding</div><div className="metric">{realEmployees.filter((e) => !e.declaration_accepted).length}</div></div></div>
    <section className="section"><div className="card"><h2>Add New Staff</h2><p className="muted">Create the employee login and send a secure invitation. The employee completes their remaining HR details during onboarding.</p><form onSubmit={handleAddStaff} className="admin-form"><label>First name<input name="firstName" required autoComplete="given-name" /></label><label>Last name<input name="lastName" required autoComplete="family-name" /></label><label>Work email<input name="email" type="email" required autoComplete="email" /></label><div className="admin-form-actions"><button className="button" type="submit" disabled={savingStaff}>{savingStaff ? "Adding staff..." : "Add staff and send invite"}</button></div></form>{staffMessage && <p className="ok">{staffMessage}</p>}{staffError && <p className="warn">{staffError}</p>}</div></section>
    <section className="section"><div className="card"><h2>Employee Compliance</h2><p className="muted">Only authorised managers can access this dashboard. Select an employee to view or export their compliance record.</p><div style={{ overflowX: "auto" }}><table className="admin-table"><thead><tr><th>Employee</th><th>Email</th><th>Mobile</th><th>Declaration</th><th>Training</th><th>Policies</th><th>Status</th><th>Details</th></tr></thead><tbody>{realEmployees.map((employee) => { const employeeTraining = trainingProgress.filter((item) => item.employee_id === employee.employee_id); const trainingSummary = employeeTraining.length ? employeeTraining.map((item,index) => `${courseLabel(item,index)}: ${item.progress_percent}%`).join(" | ") : "Not started"; const expanded = expandedEmployee === employee.id; const accepted = policyAcknowledgements.some((item) => item.employee_id === employee.employee_id); return <><tr key={employee.id}><td><strong>{employee.legal_first_name} {employee.legal_last_name}</strong></td><td>{employee.personal_email}</td><td>{employee.mobile_number}</td><td>{employee.declaration_accepted ? "Accepted" : "Outstanding"}</td><td>{trainingSummary}</td><td>{accepted ? "Accepted" : "Outstanding"}</td><td><strong>{employee.status}</strong></td><td><button className="button" type="button" onClick={() => setExpandedEmployee(expanded ? null : employee.id)}>{expanded ? "Hide" : "View"}</button></td></tr>{expanded && <tr key={`${employee.id}-details`}><td colSpan={8}><div className="card" style={{ margin: "12px 0" }}><h3>{employee.legal_first_name} {employee.legal_last_name} — Compliance record</h3><p><strong>Email:</strong> {employee.personal_email || "Not provided"}</p><p><strong>Mobile:</strong> {employee.mobile_number || "Not provided"}</p><p><strong>Declaration:</strong> {employee.declaration_accepted ? "Accepted" : "Outstanding"}</p><p><strong>Policies:</strong> {accepted ? "Accepted" : "Outstanding"}</p><p><strong>Training:</strong></p>{employeeTraining.length ? employeeTraining.map((item,index) => <p key={`${employee.id}-${index}`}>{courseLabel(item,index)}: <strong>{item.progress_percent}%</strong>{item.completed_at ? ` — completed ${new Date(item.completed_at).toLocaleDateString()}` : ""}</p>) : <p>Training not started.</p>}<button className="button" type="button" onClick={() => printComplianceRecord(employee, employeeTraining)}>Print / Save PDF</button></div></td></tr>}</>; })}</tbody></table></div></div></section></>}
  </main>;
}
