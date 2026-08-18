"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 16,
  boxSizing: "border-box" as const,
};
 
const labelStyle = {
  display: "block",
  fontWeight: 600,
  marginBottom: 6,
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column" as const,
};

const sectionStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 24,
  marginTop: 24,
};

export default function OnboardingPage() {
  const [submitted, setSubmitted] = useState(false);
const [saving, setSaving] = useState(false);
const [message, setMessage] = useState("");
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  setSaving(true);
  setMessage("");

  try {
    const form = e.currentTarget;
    const formData = new FormData(form);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be signed in to submit onboarding.");
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (employeeError || !employee) {
      throw new Error("Employee record could not be found.");
    }

    const idFile = formData.get("id_document") as File;

    if (!idFile || idFile.size === 0) {
      throw new Error("Please upload your ID or passport document.");
    }

    const safeFileName = idFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("employee-hr-documents")
      .upload(filePath, idFile);

    if (uploadError) {
      throw uploadError;
    }

    const now = new Date().toISOString();

    const { error: saveError } = await supabase
      .from("employee_hr_onboarding")
      .upsert(
        {
          employee_id: employee.id,
          legal_first_name: formData.get("first_name"),
          legal_last_name: formData.get("last_name"),
          id_passport_number: formData.get("id_number"),
          tax_number: formData.get("tax_number"),
          date_of_birth: formData.get("date_of_birth"),
          mobile_number: formData.get("mobile_number"),
          personal_email: formData.get("personal_email"),
          residential_address: formData.get("residential_address"),
          emergency_contact_name: formData.get("emergency_contact_name"),
          emergency_contact_relationship: formData.get(
            "emergency_contact_relationship"
          ),
          emergency_contact_number: formData.get("emergency_contact_number"),
          bank_name: formData.get("bank_name"),
          account_holder: formData.get("bank_account_holder"),
          account_number: formData.get("bank_account_number"),
          account_type: formData.get("bank_account_type"),
          id_document_path: filePath,
          declaration_accepted: true,
          declaration_accepted_at: now,
          status: "submitted",
          submitted_at: now,
          updated_at: now,
        },
        {
          onConflict: "employee_id",
        }
      );

    if (saveError) {
      throw saveError;
    }
const { error: policyError } = await supabase
  .from("employee_document_acknowledgements")
  .insert({
    employee_id: employee.id,
    document_key: "hr_onboarding_policy",
    document_title: "HR Onboarding Policy",
    document_version: "1.0",
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
  });

if (policyError) {
  throw policyError;
}
    setSubmitted(true);
    setMessage("Your HR onboarding has been submitted successfully.");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unable to submit onboarding.";

    setMessage(errorMessage);
  } finally {
    setSaving(false);
  }
}
  return (
    <main
      style={{
        maxWidth: 950,
        margin: "40px auto",
        padding: "0 20px 50px",
      }}
    >
      <div style={{ marginBottom: 30 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          ISITHA GLOBAL
        </div>

        <h1 style={{ fontSize: 42, margin: "0 0 12px" }}>
          Employee HR Onboarding
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.5, color: "#4b5563" }}>
          Please complete your personal and employment information below.
          Your information will be securely submitted to Isitha Global HR.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <section style={sectionStyle}>
          <h2>Personal Details</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            <div style={fieldStyle}>
              <label style={labelStyle}>First Name</label>
              <input name="first_name" required style={inputStyle} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Last Name</label>
              <input name="last_name" required style={inputStyle} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                South African ID / Passport Number
              </label>
              <input name="id_number" required style={inputStyle} />
            </div>
            <div style={fieldStyle}>
  <label style={labelStyle}>SARS Income Tax Number</label>
  <input
    name="tax_number"
    required
    style={inputStyle}
  />
</div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Date of Birth</label>
              <input
                name="date_of_birth"
                type="date"
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Mobile Number</label>
              <input name="mobile_number" required style={inputStyle} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Personal Email Address</label>
              <input
                name="personal_email"
                type="email"
                required
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2>Residential Address</h2>

          <div style={fieldStyle}>
            <label style={labelStyle}>Address</label>
            <textarea
              name="residential_address"
              required
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </section>

        <section style={sectionStyle}>
          <h2>Emergency Contact</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            <div style={fieldStyle}>
              <label style={labelStyle}>Emergency Contact Name</label>
              <input
                name="emergency_contact_name"
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Relationship</label>
              <input
                name="emergency_contact_relationship"
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Emergency Contact Number</label>
              <input
                name="emergency_contact_number"
                required
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2>Banking Details</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            <div style={fieldStyle}>
              <label style={labelStyle}>Bank</label>
              <input name="bank_name" required style={inputStyle} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Account Holder</label>
              <input
                name="bank_account_holder"
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Account Number</label>
              <input
                name="bank_account_number"
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Branch Code</label>
              <input
                name="bank_branch_code"
                required
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Account Type</label>
              <select
                name="bank_account_type"
                required
                style={inputStyle}
              >
                <option value="">Select</option>
                <option value="current">Current / Cheque</option>
                <option value="savings">Savings</option>
              </select>
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2>Identification Document</h2>

          <p style={{ color: "#4b5563" }}>
            Upload a clear copy of your South African ID document or passport.
          </p>

          <input
            name="id_document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            required
            style={{
              ...inputStyle,
              padding: 18,
              background: "#f9fafb",
            }}
          />
        </section>

        <section style={sectionStyle}>
          <h2>Employee Declaration</h2>

          <label
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              lineHeight: 1.5,
            }}
          >
            <input type="checkbox" required style={{ marginTop: 5 }} />
            <span>
              I confirm that the information provided is true and correct
              and consent to Isitha Global processing this information for
              employment, payroll and HR administration purposes.
            </span>
          </label>

          <button
            disabled={saving}
            type="submit"
            style={{
              marginTop: 28,
              width: "100%",
              padding: "15px 20px",
              border: 0,
              borderRadius: 8,
              background: "#111827",
              color: "white",
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {saving ? "Submitting..." : "Submit to HR"}
          </button>

        {message && (
  <p
    style={{
      marginTop: 20,
      padding: 14,
      borderRadius: 8,
      background: "#f3f4f6",
      fontWeight: 600,
    }}
  >
    {message}
  </p>
)}
        </section>
      </form>
    </main>
  );
}
