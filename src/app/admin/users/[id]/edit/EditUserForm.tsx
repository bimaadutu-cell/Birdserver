"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "RESELLER" | "ADMIN";
  firstName: string | null;
  lastName: string | null;
  suspended: boolean;
};

export default function EditUserForm({ user }: { user: User }) {
  const router = useRouter();
  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    role: user.role,
    suspended: user.suspended,
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        username: form.username,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        suspended: form.suspended,
      };
      if (form.password) payload.password = form.password;

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("User updated successfully!");
        setTimeout(() => router.push("/admin/users"), 1000);
      } else {
        setError(data.error?.message || "Failed to update user.");
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
        <Link href="/admin/users" className="btn-secondary py-2 px-3 text-sm rounded-lg">&larr; Back</Link>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Edit User</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>@{user.username}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>First Name</label>
              <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Last Name</label>
              <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Username *</label>
            <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>New Password (leave blank to keep current)</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field pr-10" placeholder="Leave blank to keep current password" minLength={8} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                {showPassword ? "" : ""}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Role *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as "USER" | "RESELLER" | "ADMIN" }))} className="input-field">
              <option value="USER">USER</option>
              <option value="RESELLER">RESELLER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="suspended" checked={form.suspended}
              onChange={e => setForm(f => ({ ...f, suspended: e.target.checked }))}
              className="w-4 h-4 rounded" />
            <label htmlFor="suspended" className="text-sm" style={{ color: "var(--text-secondary)" }}>Suspend this user</label>
          </div>
          {error && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>[!] {error}</div>}
          {success && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)", color: "#00e676" }}>[OK] {success}</div>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 rounded-xl">
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <Link href="/admin/users" className="btn-secondary py-2.5 px-6 rounded-xl">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
