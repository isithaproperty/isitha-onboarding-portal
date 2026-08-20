"use client";

type Employee = {
  employee_id?: string;
  legal_first_name?: string;
  legal_last_name?: string;
  personal_email?: string;
  mobile_number?: string;
  declaration_accepted?: boolean;
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
  progress_percent: number;
  title?: string;
  slug?: string;
  completed_at?: string;
};

type Props = {
  employee: Employee;
  employeeTraining: TrainingProgress[];
  policiesAccepted: boolean;
  courseLabel: (item: TrainingProgress, index: number) => string;
  onPrint: () => void;
};

const value = (v?: string) => v || "Not provided";
const blockStyle = { border: "1px solid #e3e7eb", borderRadius: 12, padding: 18, background: "#fff" } as const;

export function HRRecordDetails({ employee, employeeTraining, policiesAccepted, courseLabel, onPrint }: Props) {
  const fullName = `${employee.legal_first_name || ""} ${employee.legal_last_name || ""}`.trim() || "Employee";

  function downloadRecord() {
    const training = employeeTraining.length
      ? employeeTraining.map((item, index) => `${courseLabel(item, index)}: ${item.progress_percent}%${item.completed_at ? ` — completed ${new Date(item.completed_at).toLocaleDateString()}` : ""}`).join("\n")
      : "Training not started.";

    const text = [
      "ISITHA GLOBAL — EMPLOYEE HR RECORD",
      "",
      `Employee: ${fullName}`,
      `Submitted: ${employee.submitted_at ? new Date(employee.submitted_at).toLocaleString() : "Not recorded"}`,
      "",
      "PERSONAL & TAX",
      `ID / Passport: ${value(employee.id_passport_number)}`,
      `SARS tax number: ${value(employee.tax_number)}`,
      `Date of birth: ${value(employee.date_of_birth)}`,
      `Personal email: ${value(employee.personal_email)}`,
      `Mobile: ${value(employee.mobile_number)}`,
      `Residential address: ${value(employee.residential_address)}`,
      "",
      "EMERGENCY CONTACT",
      `Name: ${value(employee.emergency_contact_name)}`,
      `Relationship: ${value(employee.emergency_contact_relationship)}`,
      `Number: ${value(employee.emergency_contact_number)}`,
      "",
      "BANKING DETAILS",
      `Bank: ${value(employee.bank_name)}`,
      `Account holder: ${value(employee.account_holder)}`,
      `Account number: ${value(employee.account_number)}`,
      `Branch code: ${value(employee.bank_branch_code)}`,
      `Account type: ${value(employee.account_type)}`,
      "",
      "COMPLIANCE",
      `Declaration: ${employee.declaration_accepted ? "Accepted" : "Outstanding"}`,
      `Policies: ${policiesAccepted ? "Accepted" : "Outstanding"}`,
      training,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fullName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "employee"}-hr-record.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card" style={{ margin: "12px 0", background: "#f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <span className="pill">Submitted HR Record</span>
          <h3 style={{ marginBottom: 6 }}>{fullName}</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Submitted {employee.submitted_at ? new Date(employee.submitted_at).toLocaleString() : "date not recorded"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {employee.id_document_url && <a className="button secondary" href={employee.id_document_url} target="_blank" rel="noreferrer">Open ID / Passport</a>}
          <button className="button secondary" type="button" onClick={downloadRecord}>Download HR record</button>
          <button className="button" type="button" onClick={onPrint}>Print / Save PDF</button>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        <div style={blockStyle}>
          <h4>Personal & Tax</h4>
          <p><strong>ID / Passport:</strong> {value(employee.id_passport_number)}</p>
          <p><strong>SARS tax number:</strong> {value(employee.tax_number)}</p>
          <p><strong>Date of birth:</strong> {value(employee.date_of_birth)}</p>
          <p><strong>Personal email:</strong> {value(employee.personal_email)}</p>
          <p><strong>Mobile:</strong> {value(employee.mobile_number)}</p>
          <p><strong>Residential address:</strong> {value(employee.residential_address)}</p>
        </div>

        <div style={blockStyle}>
          <h4>Emergency Contact</h4>
          <p><strong>Name:</strong> {value(employee.emergency_contact_name)}</p>
          <p><strong>Relationship:</strong> {value(employee.emergency_contact_relationship)}</p>
          <p><strong>Number:</strong> {value(employee.emergency_contact_number)}</p>
        </div>

        <div style={{ ...blockStyle, borderColor: "rgba(200,154,75,.45)" }}>
          <h4>Banking Details</h4>
          <p><strong>Bank:</strong> {value(employee.bank_name)}</p>
          <p><strong>Account holder:</strong> {value(employee.account_holder)}</p>
          <p><strong>Account number:</strong> {value(employee.account_number)}</p>
          <p><strong>Branch code:</strong> {value(employee.bank_branch_code)}</p>
          <p><strong>Account type:</strong> {value(employee.account_type)}</p>
        </div>
      </div>

      <div style={{ ...blockStyle, marginTop: 18 }}>
        <h4>Training & Compliance</h4>
        <p><strong>Declaration:</strong> {employee.declaration_accepted ? "Accepted" : "Outstanding"}</p>
        <p><strong>Policies:</strong> {policiesAccepted ? "Accepted" : "Outstanding"}</p>
        {employeeTraining.length ? employeeTraining.map((item, index) => (
          <p key={index}>{courseLabel(item, index)}: <strong>{item.progress_percent}%</strong>{item.completed_at ? ` — completed ${new Date(item.completed_at).toLocaleDateString()}` : ""}</p>
        )) : <p>Training not started.</p>}
      </div>
    </div>
  );
}
