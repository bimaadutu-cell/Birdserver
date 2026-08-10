"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateResellerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    maxUsers: 10,
    maxServers: 20,
    maxRamMb: 10240,
    maxCpuPercent: 200,
    maxStorageMb: 51200,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/resellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/admin/resellers");
      } else {
        setError(data.error?.message || "Failed to create reseller.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/resellers" className="btn-secondary py-2 px-3 text-sm rounded-lg">&larr; Back</Link>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Create Reseller</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Add a new reseller account with quota</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="border-b pb-4 mb-4" style={{ borderColor: "var(--border-color)" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Account Details</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>First Name</label>
                <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Last Name</label>
                <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Username *</label>
                <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Password *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field pr-10" required minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                    {showPassword ? "" : ""}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Resource Quota</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Max Users</label>
                <input type="number" value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: Number(e.target.value) }))} className="input-field" min={1} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Max Servers</label>
                <input type="number" value={form.maxServers} onChange={e => setForm(f => ({ ...f, maxServers: Number(e.target.value) }))} className="input-field" min={1} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Max RAM (MB)</label>
                <input type="number" value={form.maxRamMb} onChange={e => setForm(f => ({ ...f, maxRamMb: Number(e.target.value) }))} className="input-field" min={512} />
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{form.maxRamMb >= 1024 ? `${(form.maxRamMb/1024).toFixed(1)} GB` : `${form.maxRamMb} MB`}</div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Max CPU (%)</label>
                <input type="number" value={form.maxCpuPercent} onChange={e => setForm(f => ({ ...f, maxCpuPercent: Number(e.target.value) }))} className="input-field" min={10} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Max Storage (MB)</label>
                <input type="number" value={form.maxStorageMb} onChange={e => setForm(f => ({ ...f, maxStorageMb: Number(e.target.value) }))} className="input-field" min={1024} />
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{form.maxStorageMb >= 1024 ? `${(form.maxStorageMb/1024).toFixed(1)} GB` : `${form.maxStorageMb} MB`}</div>
              </div>
            </div>
          </div>

          {error && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>[!] {error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 rounded-xl">
              {loading ? "Creating..." : "Create Reseller"}
            </button>
            <Link href="/admin/resellers" className="btn-secondary py-2.5 px-6 rounded-xl">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
