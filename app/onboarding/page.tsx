"use client";

import { useState } from "react";

export default function OnboardingPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1>Employee HR Onboarding</h1>

      <p>
        Please complete your personal and employment information below.
        Information provided will be securely submitted to Isitha Global HR.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <h2>Personal Details</h2>

        <label>First Name</label>
        <input name="first_name" required />

        <label>Last Name</label>
        <input name="last_name" required />

        <label>South African ID / Passport Number</label>
        <input name="id_number" required />

        <label>Date of Birth</label>
        <input name="date_of_birth" type="date" required />

        <label>Mobile Number</label>
        <input name="mobile_number" required />

        <label>Personal Email Address</label>
        <input name="personal_email" type="email" required />

        <h2>Residential Address</h2>

        <label>Address</label>
        <textarea name="residential_address" required />

        <h2>Emergency Contact</h2>

        <label>Emergency Contact Name</label>
        <input name="emergency_contact_name" required />

        <label>Relationship</label>
        <input name="emergency_contact_relationship" required />

        <label>Emergency Contact Number</label>
        <input name="emergency_contact_number" required />

        <h2>Banking Details</h2>

        <label>Bank</label>
        <input name="bank_name" required />

        <label>Account Holder</label>
        <input name="bank_account_holder" required />

        <label>Account Number</label>
        <input name="bank_account_number" required />

        <label>Branch Code</label>
        <input name="bank_branch_code" required />

        <label>Account Type</label>
        <select name="bank_account_type" required>
          <option value="">Select</option>
          <option value="current">Current / Cheque</option>
          <option value="savings">Savings</option>
        </select>

        <h2>Identification Document</h2>

        <p>
          Upload a clear copy of your South African ID document or passport.
        </p>

        <input
          name="id_document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          required
        />

        <h2>Employee Declaration</h2>

        <label>
          <input type="checkbox" required />
          {" "}
          I confirm that the information provided is true and correct and
          consent to Isitha Global processing this information for employment,
          payroll and HR administration purposes.
        </label>

        <div style={{ marginTop: 30 }}>
          <button type="submit">Submit to HR</button>
        </div>

        {submitted && (
          <p style={{ marginTop: 20, fontWeight: 600 }}>
            Form ready for submission.
          </p>
        )}
      </form>
    </main>
  );
}
