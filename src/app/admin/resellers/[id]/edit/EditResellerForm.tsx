"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = { id: string; username: string; email: string; firstName: string | null; lastName: string | null; suspended: boolean };
type Quota = { maxUsers: number; maxServers: number; maxRamMb: number; maxCpuPercent: number; maxStorageMb: number } | null;

export default function EditResellerForm({ user, quota }: { user: User; quota: Quota }) {
  const router = useRouter();
  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    suspended: user.suspended,
    password: "",
    maxUsers: quota?.maxUsers || 10,
    maxServers: quota?.maxServers || 20,
    maxRamMb: quota?.maxRamMb || 10240,
    maxCpuPercent: quota?.maxCpuPercent || 200,
    maxStorageMb: quota?.maxStorageMb || 51200,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.password) delete payload.password;
      const res = await fetch(`/api/resellers/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Reseller updated!");
        setTimeout(() => router.push("/admin/resellers"), 1000);
      } else {
        setError(data.error?.message || "Failed.");
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
          <h1 className="text-2xl font-bold gradient-text">Edit Reseller</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>@{user.username}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Username</label>
              <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>New Password (optional)</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field" minLength={8} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="suspended" checked={form.suspended} onChange={e => setForm(f => ({ ...f, suspended: e.target.checked }))} />
            <label htmlFor="suspended" className="text-sm" style={{ color: "var(--text-secondary)" }}>Suspend account</label>
          </div>

          <div className="border-t pt-5" style={{ borderColor: "var(--border-color)" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Resource Quota</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "maxUsers", label: "Max Users" },
                { key: "maxServers", label: "Max Servers" },
                { key: "maxRamMb", label: "Max RAM (MB)" },
                { key: "maxCpuPercent", label: "Max CPU (%)" },
                { key: "maxStorageMb", label: "Max Storage (MB)" },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{field.label}</label>
                  <input type="number" value={form[field.key as keyof typeof form] as number}
                    onChange={e => setForm(f => ({ ...f, [field.key]: Number(e.target.value) }))}
                    className="input-field" min={0} />
                </div>
              ))}
            </div>
          </div>

          {error && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>[!] {error}</div>}
          {success && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)", color: "#00e676" }}>[OK] {success}</div>}

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 rounded-xl">
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <Link href="/admin/resellers" className="btn-secondary py-2.5 px-6 rounded-xl">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
