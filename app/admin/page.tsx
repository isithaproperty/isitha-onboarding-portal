"use client";

import { Header } from "@/components/Header";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  employee_id?: string;
  legal_first_name?: string;
  legal_last_name?: string;
  personal_email?: string;
  mobile_number?: string;
  declaration_accepted?: boolean;
  status?: string;
};

type TrainingProgress = { employee_id: string; progress_percent: number };
type PolicyAcknowledgement = { employee_id: string };

export default function AdminPage() {
  const [realEmployees, setRealEmployees] = useState<Employee[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([]);
  const [policyAcknowledgements, setPolicyAcknowledgements] = useState<PolicyAcknowledgement[]>([]);
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffMessage, setStaffMessage] = useState("");
  const [staffError, setStaffError] = useState("");

  useEffect(() => {
    async function loadAdminData() {
      const [employeesResult, trainingResult, policyResult] = await Promise.all([
        supabase.from("employee_hr_onboarding").select("*"),
        supabase.from("training_progress_with_names").select("*"),
        supabase.from("policy_acknowledgements_with_names").select("*"),
      ]);

      if (employeesResult.error) console.error("Error loading employees:", employeesResult.error);
      else setRealEmployees(employeesResult.data || []);

      if (trainingResult.error) console.error("Error loading training progress:", trainingResult.error);
      else setTrainingProgress(trainingResult.data || []);

      if (policyResult.error) console.error("Error loading policy acknowledgements:", policyResult.error);
      else setPolicyAcknowledgements(policyResult.data || []);
    }

    loadAdminData();
  }, []);

  async function handleAddStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingStaff(true);
    setStaffMessage("");
    setStaffError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          email: formData.get("email"),
          jobTitle: formData.get("jobTitle"),
          employeeNumber: formData.get("employeeNumber"),
          startDate: formData.get("startDate"),
        }),
      });

      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) setStaffError(result.error || "Unable to add staff.");
      else {
        setStaffMessage(result.message || "Staff member added successfully.");
        form.reset();
      }
    } catch {
      setStaffError("Unable to contact the server. Please try again.");
    } finally {
      setSavingStaff(false);
    }
  }

  return (
    <main className="shell">
      <Header />

      <section className="hero">
        <span className="pill">HR Admin</span>
        <h1>Compliance Dashboard</h1>
        <p className="muted">Monitor onboarding, training and staff compliance.</p>
      </section>

      <div className="grid">
        <div className="card"><div className="muted">Onboarding records</div><div className="metric">{realEmployees.length}</div></div>
        <div className="card"><div className="muted">Declarations accepted</div><div className="metric">{realEmployees.filter((employee) => employee.declaration_accepted).length}</div></div>
        <div className="card"><div className="muted">Onboarding outstanding</div><div className="metric">{realEmployees.filter((employee) => !employee.declaration_accepted).length}</div></div>
      </div>

      <section className="section">
        <div className="card">
          <h2>Add New Staff</h2>
          <p className="muted">Create the employee record and send the employee a secure invitation to set up their portal login.</p>

          <form onSubmit={handleAddStaff} className="admin-form">
            <label>First name<input name="firstName" required autoComplete="given-name" /></label>
            <label>Last name<input name="lastName" required autoComplete="family-name" /></label>
            <label>Work email<input name="email" type="email" required autoComplete="email" /></label>
            <label>Job title<input name="jobTitle" /></label>
            <label>Employee number<input name="employeeNumber" /></label>
            <label>Start date<input name="startDate" type="date" /></label>
            <div className="admin-form-actions">
              <button className="button" type="submit" disabled={savingStaff}>
                {savingStaff ? "Adding staff..." : "Add staff and send invite"}
              </button>
            </div>
          </form>

          {staffMessage && <p className="ok">{staffMessage}</p>}
          {staffError && <p className="warn">{staffError}</p>}
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2>Employee Compliance</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead><tr><th>Employee</th><th>Email</th><th>Mobile</th><th>Declaration</th><th>Training</th><th>Policies</th><th>Status</th></tr></thead>
              <tbody>
                {realEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td><strong>{employee.legal_first_name} {employee.legal_last_name}</strong></td>
                    <td>{employee.personal_email}</td>
                    <td>{employee.mobile_number}</td>
                    <td>{employee.declaration_accepted ? "Accepted" : "Outstanding"}</td>
                    <td>{trainingProgress.filter((item) => item.employee_id === employee.employee_id).map((item) => `${item.progress_percent}%`).join(", ") || "Not started"}</td>
                    <td>{policyAcknowledgements.some((item) => item.employee_id === employee.employee_id) ? "Accepted" : "Outstanding"}</td>
                    <td><strong>{employee.status}</strong></td>
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
