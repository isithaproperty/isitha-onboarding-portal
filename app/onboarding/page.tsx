"use client";

import { useState } from "react";

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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
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
            Submit to HR
          </button>

          {submitted && (
            <p
              style={{
                marginTop: 20,
                padding: 14,
                borderRadius: 8,
                background: "#f3f4f6",
                fontWeight: 600,
              }}
            >
              Form ready for submission.
            </p>
          )}
        </section>
      </form>
    </main>
  );
}
