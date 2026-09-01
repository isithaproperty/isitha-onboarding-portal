"use client";

import { Header } from "@/components/Header";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Employee = {
  id: string;
  employee_id?: string;
  legal_first_name?: string;
  legal_last_name?: string;
  personal_email?: string;
  mobile_number?: string;
  declaration_accepted?: boolean;
  status?: string;
  role?: string;
  annual_leave_entitlement?: number;
  id_passport_number?: string;
  tax_number?: string;
  date_of_birth?: string;
  residential_address?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_number?: string;
  bank_name?: string;
  account_holder?: string;
  account_number?: string;
  bank_branch_code?: string;
  account_type?: string;
  id_document_url?: string;
  submitted_at?: string;
};

type TrainingProgress = {
  employee_id: string;
  progress_percent: number;
  title?: string;
  slug?: string;
  completed_at?: string;
};

type PolicyAcknowledgement = { employee_id: string };
type SignedContract = {
  id: string;
  employee_id: string;
  original_filename: string;
  status: string;
  signed_at?: string | null;
  signer_name?: string | null;
  url?: string | null;
};
type ComplianceData = {
  employees?: Employee[];
  training?: TrainingProgress[];
  policies?: PolicyAcknowledgement[];
  contracts?: SignedContract[];
  assignableRoles?: string[];
  error?: string;
};

const courseLabel = (item: TrainingProgress, index: number) => {
  const text = `${item.slug || ""} ${item.title || ""}`.toLowerCase();
  if (text.includes("ohsa")) return "OHSA";
  if (text.includes("emergency")) return "Emergency";
  if (text.includes("employment") || text.includes("hr")) return "HR";
  if (text.includes("popia") || text.includes("data protection")) return "POPIA";
  return ["OHSA", "Emergency", "HR", "POPIA"][index] || `Course ${index + 1}`;
};

const roleLabel = (role?: string) =>
  ({ staff: "Staff", manager: "Manager", hr_admin: "HR", compliance_admin: "Compliance", admin: "Admin" }[role || "staff"] || "Staff");

const value = (v?: string) => v || "Not provided";

function openPrintableDocument(title: string, body: string) {
  const popup = window.open("", "_blank", "width=850,height=950");
  if (!popup) return;
  popup.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:40px;color:#1f2937;line-height:1.45}
          h1{margin-bottom:4px} h2{margin-top:26px;border-bottom:1px solid #d9d9d9;padding-bottom:7px}
          .brand{font-weight:700;letter-spacing:1px;color:#1d2a3a}.muted{color:#6b7280}
          .card{border:1px solid #d9d9d9;border-radius:12px;padding:24px;margin-top:20px}
          p{margin:8px 0}.actions{margin-top:28px}.print{padding:12px 18px;border:0;border-radius:8px;background:#1d2a3a;color:white;font-weight:700}
          @media print{.actions{display:none} body{padding:10px}}
        </style>
      </head>
      <body>
        <div class="brand">ISITHA GLOBAL</div>
        ${body}
        <div class="actions"><button class="print" onclick="window.print()">Print / Save as PDF</button></div>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
}

export default function AdminPage() {
  const [realEmployees, setRealEmployees] = useState<Employee[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([]);
  const [policyAcknowledgements, setPolicyAcknowledgements] = useState<PolicyAcknowledgement[]>([]);
  const [signedContracts, setSignedContracts] = useState<SignedContract[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<string | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffMessage, setStaffMessage] = useState("");
  const [staffError, setStaffError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [employeeMessage, setEmployeeMessage] = useState("");
  const [assignablePortalRoles, setAssignablePortalRoles] = useState<string[]>([]);

  async function loadAdminData() {
    try {
      const response = await fetch("/api/admin/compliance", { cache: "no-store" });
      const data = (await response.json()) as ComplianceData;
      if (!response.ok) {
        setAdminError(data.error || "Unable to load employee compliance records.");
        return;
      }
      setAdminError("");
      setRealEmployees(data.employees || []);
      setTrainingProgress(data.training || []);
      setPolicyAcknowledgements(data.policies || []);
      setSignedContracts(data.contracts || []);
      setAssignablePortalRoles(data.assignableRoles || []);
    } catch {
      setAdminError("Unable to load employee compliance records.");
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  async function handleAddStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingStaff(true);
    setStaffMessage("");
    setStaffError("");
    const form = event.currentTarget;
    const fd = new FormData(form);
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fd.get("firstName"),
          lastName: fd.get("lastName"),
          email: fd.get("email"),
          role: fd.get("role"),
        }),
      });
      const result = await response.json();
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

  async function handleEmployeeUpdate(event: FormEvent<HTMLFormElement>, employee: Employee) {
    event.preventDefault();
    if (!employee.employee_id) return;
    setSavingEmployee(true);
    setEmployeeMessage("");
    const fd = new FormData(event.currentTarget);
    const status = String(fd.get("status") || "").toLowerCase();
    if (status === "leaver") {
      const name = `${employee.legal_first_name || ""} ${employee.legal_last_name || ""}`.trim() || "this employee";
      const confirmed = window.confirm(
        `Remove ${name} from the system? This permanently deletes their portal login, employee record, HR documents, contracts, training and leave records. This cannot be undone.`,
      );
      if (!confirmed) {
        setSavingEmployee(false);
        return;
      }
      setDeletingEmployee(employee.employee_id);
      try {
        const response = await fetch(`/api/admin/employees/${employee.employee_id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: "DELETE" }),
        });
        const result = await response.json();
        if (!response.ok) setEmployeeMessage(result.error || "Unable to remove employee.");
        else {
          setEmployeeMessage(result.message || "Employee removed from the system.");
          setEditingEmployee(null);
          setExpandedEmployee(null);
          await loadAdminData();
        }
      } catch {
        setEmployeeMessage("Unable to remove employee.");
      } finally {
        setDeletingEmployee(null);
        setSavingEmployee(false);
      }
      return;
    }
    try {
      const response = await fetch(`/api/admin/employees/${employee.employee_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fd.get("firstName"),
          lastName: fd.get("lastName"),
          email: fd.get("email"),
          mobile: fd.get("mobile"),
          status,
          role: fd.get("role"),
          annualLeaveEntitlement: fd.get("annualLeaveEntitlement"),
        }),
      });
      const result = await response.json();
      if (!response.ok) setEmployeeMessage(result.error || "Unable to update employee.");
      else {
        setEmployeeMessage("Employee record updated.");
        setEditingEmployee(null);
        await loadAdminData();
      }
    } catch {
      setEmployeeMessage("Unable to update employee.");
    } finally {
      setSavingEmployee(false);
    }
  }

  function printOnboardingRecord(employee: Employee) {
    const name = `${employee.legal_first_name || ""} ${employee.legal_last_name || ""}`.trim() || "Employee";
    openPrintableDocument(
      `${name} - HR Onboarding Record`,
      `<h1>Employee HR Onboarding Record</h1>
       <p class="muted">${name}${employee.submitted_at ? ` • Submitted ${new Date(employee.submitted_at).toLocaleString()}` : ""}</p>
       <div class="card">
         <h2>Personal & Tax</h2>
         <p><b>ID / Passport:</b> ${value(employee.id_passport_number)}</p>
         <p><b>SARS tax number:</b> ${value(employee.tax_number)}</p>
         <p><b>Date of birth:</b> ${value(employee.date_of_birth)}</p>
         <p><b>Personal email:</b> ${value(employee.personal_email)}</p>
         <p><b>Mobile:</b> ${value(employee.mobile_number)}</p>
         <p><b>Residential address:</b> ${value(employee.residential_address)}</p>
         <h2>Emergency Contact</h2>
         <p><b>Name:</b> ${value(employee.emergency_contact_name)}</p>
         <p><b>Relationship:</b> ${value(employee.emergency_contact_relationship)}</p>
         <p><b>Number:</b> ${value(employee.emergency_contact_number)}</p>
         <h2>Banking Details</h2>
         <p><b>Bank:</b> ${value(employee.bank_name)}</p>
         <p><b>Account holder:</b> ${value(employee.account_holder)}</p>
         <p><b>Account number:</b> ${value(employee.account_number)}</p>
         <p><b>Branch code:</b> ${value(employee.bank_branch_code)}</p>
         <p><b>Account type:</b> ${value(employee.account_type)}</p>
         <h2>Declaration</h2>
         <p><b>Status:</b> ${employee.declaration_accepted ? "Accepted" : "Outstanding"}</p>
         <p><b>ID / Passport document:</b> ${employee.id_document_url ? "Stored securely in the staff portal" : "Not available"}</p>
       </div>`
    );
  }

  function printTrainingRecord(employee: Employee, employeeTraining: TrainingProgress[]) {
    const name = `${employee.legal_first_name || ""} ${employee.legal_last_name || ""}`.trim() || "Employee";
    const accepted = policyAcknowledgements.some((i) => i.employee_id === employee.employee_id);
    const rows = employeeTraining.length
      ? employeeTraining
          .map(
            (item, index) =>
              `<p><b>${courseLabel(item, index)}:</b> ${item.progress_percent}%${
                item.completed_at ? ` • Completed ${new Date(item.completed_at).toLocaleDateString()}` : ""
              }</p>`
          )
          .join("")
      : "<p>Training not started.</p>";

    openPrintableDocument(
      `${name} - Training Record`,
      `<h1>Employee Training & Compliance Record</h1>
       <p class="muted">${name}</p>
       <div class="card">
         <h2>Mandatory Training</h2>
         ${rows}
         <h2>Compliance</h2>
         <p><b>Policies:</b> ${accepted ? "Accepted" : "Outstanding"}</p>
       </div>`
    );
  }

  return (
    <main className="shell">
      <Header />
      <section className="hero">
        <span className="pill">HR Admin</span>
        <h1>Compliance Dashboard</h1>
        <p className="muted">Manage staff, onboarding, training and compliance.</p>
      </section>

      {adminError && (
        <section className="section">
          <div className="card"><p className="warn">{adminError}</p></div>
        </section>
      )}

      {!adminError && (
        <>
          <div className="grid">
            <div className="card"><div className="muted">Onboarding records</div><div className="metric">{realEmployees.length}</div></div>
            <div className="card"><div className="muted">Declarations accepted</div><div className="metric">{realEmployees.filter((e) => e.declaration_accepted).length}</div></div>
            <div className="card"><div className="muted">Active / submitted staff</div><div className="metric">{realEmployees.filter((e) => !["inactive", "leaver"].includes((e.status || "").toLowerCase())).length}</div></div>
          </div>

          {assignablePortalRoles.length>0&&<><section className="section">
            <div className="card">
              <h2>Contracts</h2>
              <p className="muted">Upload individual employee contracts and view signature status.</p>
              <Link className="button" href="/contracts/manage">Manage & upload contracts</Link>
            </div>
          </section>

          <section className="section">
            <div className="card">
              <h2>Add New Staff</h2>
              <p className="muted">Create the employee login, choose their portal access and send a secure invitation.</p>
              <form onSubmit={handleAddStaff} className="admin-form">
                <label>First name<input name="firstName" required /></label>
                <label>Last name<input name="lastName" required /></label>
                <label>Work email<input name="email" type="email" required /></label>
                <label>Portal role
                  <select name="role" defaultValue="staff">{assignablePortalRoles.map(role=><option key={role} value={role}>{roleLabel(role)}</option>)}</select>
                </label>
                <div className="admin-form-actions"><button className="button" disabled={savingStaff}>{savingStaff ? "Adding staff..." : "Add staff and send invite"}</button></div>
              </form>
              {staffMessage && <p className="ok">{staffMessage}</p>}
              {staffError && <p className="warn">{staffError}</p>}
            </div>
          </section></>}

          <section className="section">
            <div className="card">
              <h2>Employee Management & Compliance</h2>
              <p className="muted">Authorised managers can view submitted HR records. Staff cannot access other employees&apos; records.</p>
              {employeeMessage && <p className="ok">{employeeMessage}</p>}
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead><tr><th>Employee</th><th>Email</th><th>Mobile</th><th>Training</th><th>Policies</th><th>Status</th><th>Portal role</th><th>Actions</th></tr></thead>
                  <tbody>
                    {realEmployees.map((employee) => {
                      const employeeTraining = trainingProgress.filter((i) => i.employee_id === employee.employee_id);
                      const employeeContracts = signedContracts.filter((contract) => contract.employee_id === employee.employee_id);
                      const accepted = policyAcknowledgements.some((i) => i.employee_id === employee.employee_id);
                      const expanded = expandedEmployee === employee.id;
                      const editing = editingEmployee === employee.id;
                      return (
                        <>
                          <tr key={employee.id}>
                            <td><strong>{employee.legal_first_name} {employee.legal_last_name}</strong></td>
                            <td>{employee.personal_email}</td>
                            <td>{employee.mobile_number}</td>
                            <td>{employeeTraining.length ? employeeTraining.map((i, x) => `${courseLabel(i, x)}: ${i.progress_percent}%`).join(" | ") : "Not started"}</td>
                            <td>{accepted ? "Accepted" : "Outstanding"}</td>
                            <td><strong>{employee.status || "Not submitted"}</strong></td>
                            <td><strong>{roleLabel(employee.role)}</strong></td>
                            <td>
                              <button className="button" type="button" onClick={() => setExpandedEmployee(expanded ? null : employee.id)}>{expanded ? "Hide" : "View HR record"}</button>{" "}
                              <button className="button secondary" type="button" onClick={() => setEditingEmployee(editing ? null : employee.id)}>{editing ? "Cancel" : "Edit"}</button>
                            </td>
                          </tr>

                          {editing && (
                            <tr key={`${employee.id}-edit`}>
                              <td colSpan={8}>
                                <form className="admin-form" onSubmit={(e) => handleEmployeeUpdate(e, employee)}>
                                  <label>First name<input name="firstName" defaultValue={employee.legal_first_name || ""} required /></label>
                                  <label>Last name<input name="lastName" defaultValue={employee.legal_last_name || ""} required /></label>
                                  <label>Email<input name="email" type="email" defaultValue={employee.personal_email || ""} /></label>
                                  <label>Mobile<input name="mobile" defaultValue={employee.mobile_number || ""} /></label>
                                  <label>Employment status<select name="status" defaultValue={(employee.status || "submitted").toLowerCase()}><option value="submitted">Submitted</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="leaver">Leaver</option></select></label>
                                  <label>Portal role<select name="role" defaultValue={(employee.role || "staff").toLowerCase()}>{Array.from(new Set([employee.role||"staff",...assignablePortalRoles])).map(role=><option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
                                  <label>Annual leave entitlement (days)<input name="annualLeaveEntitlement" type="number" min="0" max="365" step="0.5" defaultValue={employee.annual_leave_entitlement ?? 20} required /></label>
                                  <div className="admin-form-actions"><button className="button" disabled={savingEmployee}>{deletingEmployee === employee.employee_id ? "Removing employee..." : savingEmployee ? "Saving..." : "Save employee"}</button></div>
                                </form>
                              </td>
                            </tr>
                          )}

                          {expanded && (
                            <tr key={`${employee.id}-details`}>
                              <td colSpan={8}>
                                <div className="card" style={{ margin: "12px 0" }}>
                                  <h3>{employee.legal_first_name} {employee.legal_last_name} — Submitted HR record</h3>
                                  <div className="grid">
                                    <div><h4>Personal & Tax</h4><p><strong>ID / Passport:</strong> {value(employee.id_passport_number)}</p><p><strong>SARS tax number:</strong> {value(employee.tax_number)}</p><p><strong>Date of birth:</strong> {value(employee.date_of_birth)}</p><p><strong>Personal email:</strong> {value(employee.personal_email)}</p><p><strong>Mobile:</strong> {value(employee.mobile_number)}</p><p><strong>Residential address:</strong> {value(employee.residential_address)}</p></div>
                                    <div><h4>Emergency Contact</h4><p><strong>Name:</strong> {value(employee.emergency_contact_name)}</p><p><strong>Relationship:</strong> {value(employee.emergency_contact_relationship)}</p><p><strong>Number:</strong> {value(employee.emergency_contact_number)}</p></div>
                                    <div><h4>Banking</h4><p><strong>Bank:</strong> {value(employee.bank_name)}</p><p><strong>Account holder:</strong> {value(employee.account_holder)}</p><p><strong>Account number:</strong> {value(employee.account_number)}</p><p><strong>Branch code:</strong> {value(employee.bank_branch_code)}</p><p><strong>Account type:</strong> {value(employee.account_type)}</p></div>
                                  </div>
                                  <p><strong>Annual leave entitlement:</strong> {employee.annual_leave_entitlement ?? 20} days</p>
                                  <p><strong>Submitted:</strong> {employee.submitted_at ? new Date(employee.submitted_at).toLocaleString() : "Not recorded"}</p>
                                  <p><strong>Declaration:</strong> {employee.declaration_accepted ? "Accepted" : "Outstanding"}</p>
                                  {employee.id_document_url && <p><a className="button secondary" href={employee.id_document_url} target="_blank" rel="noreferrer">Open ID / Passport</a></p>}
                                  <h4>Training & Compliance</h4>
                                  {employeeTraining.length ? employeeTraining.map((i, x) => <p key={`${employee.id}-${x}`}>{courseLabel(i, x)}: <strong>{i.progress_percent}%</strong>{i.completed_at ? ` — completed ${new Date(i.completed_at).toLocaleDateString()}` : ""}</p>) : <p>Training not started.</p>}
                                  <p><strong>Policies:</strong> {accepted ? "Accepted" : "Outstanding"}</p>
                                  <h4>Employment Contracts</h4>
                                  {employeeContracts.length === 0 ? <p>No signed contracts on record.</p> : employeeContracts.map((contract) => <div key={contract.id} style={{marginBottom:12}}><p><strong>{contract.original_filename}</strong></p><p className="muted">Signed {contract.signed_at ? new Date(contract.signed_at).toLocaleString() : "date not recorded"}{contract.signer_name ? ` by ${contract.signer_name}` : ""}</p>{contract.url && <a className="button secondary" href={contract.url} target="_blank" rel="noreferrer">Open signed contract</a>}</div>)}
                                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                                    <button className="button" type="button" onClick={() => printOnboardingRecord(employee)}>Print / Save Onboarding PDF</button>
                                    <button className="button secondary" type="button" onClick={() => printTrainingRecord(employee, employeeTraining)}>Print / Save Training PDF</button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
