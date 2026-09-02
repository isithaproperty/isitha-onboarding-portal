"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};
type Contract = {
  id: string;
  employee_id: string;
  original_filename: string;
  status: string;
  uploaded_at: string;
  signed_at: string | null;
  signer_name: string | null;
  original_url?: string | null;
  signed_url?: string | null;
  signed_download_url?: string | null;
};
export default function ManageContracts() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<Contract[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    load();
  }, []);
  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const response = await fetch("/api/admin/contracts", {
        cache: "no-store",
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        setAllowed(false);
        setMsg(data.error || "Unable to load contracts.");
        return;
      }
      setAllowed(true);
      setEmployees(data.employees || []);
      setRows(data.contracts || []);
      setCanDelete(Boolean(data.can_delete));
    } catch {
      setAllowed(false);
      setMsg("Unable to load contracts.");
    } finally {
      setLoading(false);
    }
  }
  async function upload(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setSaving(true);
    setMsg("");
    const form = ev.currentTarget;
    try {
      const response = await fetch("/api/admin/contracts", {
        method: "POST",
        body: new FormData(form),
      });
      const raw = await response.text();
      let data: { error?: string; message?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}
      if (!response.ok) {
        setMsg(
          response.status === 413
            ? "The contract is too large for the upload service. Please use a file smaller than 10 MB."
            : data.error || `Unable to upload contract (${response.status}).`,
        );
        return;
      }
      form.reset();
      setMsg(data.message || "Contract uploaded.");
      await load();
    } catch {
      setMsg("Unable to upload contract. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }
  async function deleteContract(contract: Contract) {
    const name = employeeName(contract.employee_id);
    const confirmed = window.confirm(
      `Delete ${name}'s contract from the portal? Make sure you have downloaded and stored the signed contract on your company drive first.`,
    );
    if (!confirmed) return;

    setDeletingId(contract.id);
    setMsg("");
    try {
      const response = await fetch("/api/admin/contracts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contract.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMsg(data.error || "Unable to delete contract.");
        return;
      }
      setRows((current) => current.filter((row) => row.id !== contract.id));
      setMsg(data.message || "Contract deleted from the portal.");
    } catch {
      setMsg("Unable to delete contract. Check your connection and try again.");
    } finally {
      setDeletingId(null);
    }
  }
  function openUrl(url: string | null | undefined, message: string) {
    if (!url) {
      setMsg(message);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }
  function downloadUrl(url: string | null | undefined) {
    if (!url) {
      setMsg("Unable to create a secure download link. Please refresh and try again.");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noopener";
    anchor.click();
  }
  const employeeName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name || ""} ${e.last_name || ""}`.trim() : "Employee";
  };
  if (loading)
    return (
      <main className="shell">
        <Header />
        <section className="hero">
          <h1>Loading Contracts...</h1>
        </section>
      </main>
    );
  if (!allowed)
    return (
      <main className="shell">
        <Header />
        <section className="hero">
          <h1>Contracts</h1>
          <p>{msg || "This area is for Manager, HR and Admin only."}</p>
          <Link href="/">← Back</Link>
        </section>
      </main>
    );
  return (
    <main className="shell">
      <Header />
      <section className="hero">
        <span className="pill">Management</span>
        <h1>Contracts</h1>
        <p className="muted">
          Upload an individual contract to an employee. The employee opens and
          signs it from their dashboard.
        </p>
      </section>
      <section className="section">
        <div className="card">
          <h2>Upload Contract</h2>
          <form className="admin-form" onSubmit={upload}>
            <label>
              Employee
              <select name="employee_id" required defaultValue="">
                <option value="" disabled>
                  Select employee
                </option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contract file
              <input
                name="contract"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required
              />
              <span className="muted">
                PDF, DOC or DOCX, up to 10 MB. PDF is recommended because the
                employee signature page can be appended directly to the contract.
              </span>
            </label>
            <div className="admin-form-actions">
              <button className="button" disabled={saving}>
                {saving ? "Uploading..." : "Upload contract"}
              </button>
            </div>
          </form>
          {msg && (
            <p role="status">
              <strong>{msg}</strong>
            </p>
          )}
        </div>
      </section>
      <section className="section">
        <h2>Employee Contracts</h2>
        <div className="grid">
          {rows.length === 0 ? (
            <div className="card">
              <p>No contracts uploaded yet.</p>
            </div>
          ) : (
            rows.map((c) => (
              <div className="card" key={c.id}>
                <span className="pill">
                  {c.status === "signed" ? "Signed" : "Awaiting signature"}
                </span>
                <h3>{employeeName(c.employee_id)}</h3>
                <p>{c.original_filename}</p>
                <p className="muted">
                  Uploaded {new Date(c.uploaded_at).toLocaleDateString()}
                </p>
                {c.signed_at && (
                  <p>
                    <strong>Signed:</strong>{" "}
                    {new Date(c.signed_at).toLocaleString()} by {c.signer_name}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="button secondary"
                    onClick={() =>
                      openUrl(
                        c.original_url,
                        "Unable to create a secure link for the original contract. Please refresh and try again.",
                      )
                    }
                  >
                    Open original
                  </button>
                  {c.status === "signed" && c.signed_url && (
                    <button
                      className="button"
                      onClick={() =>
                        openUrl(c.signed_url, "The signed PDF is not available.")
                      }
                    >
                      Open signed PDF
                    </button>
                  )}
                  {c.status === "signed" && c.signed_download_url && (
                    <button
                      className="button secondary"
                      onClick={() => downloadUrl(c.signed_download_url)}
                    >
                      Download signed PDF
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="button secondary"
                      disabled={deletingId === c.id}
                      onClick={() => void deleteContract(c)}
                      style={{ color: "#991b1b", borderColor: "#fecaca" }}
                    >
                      {deletingId === c.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="section">
        <Link href="/admin">← Back to Admin</Link>
      </section>
    </main>
  );
}
