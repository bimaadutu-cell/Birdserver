"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "USER",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const genPassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, password: out }));
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      // Safely parse response body - may be empty on 500
      const rawText = await res.text();
      let data: { success?: boolean; data?: { username: string; role: string }; error?: { code: string; message: string } } | null = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        setError(`Server returned invalid response (HTTP ${res.status}): ${rawText.substring(0, 200) || "empty body"}`);
        return;
      }
      if (data?.success) {
        setSuccess(`\u2714  Account created: ${data.data!.username} (${data.data!.role})`);
        setTimeout(() => router.push("/admin/users"), 900);
      } else {
        setError(`[${data?.error?.code || "HTTP" + res.status}] ${data?.error?.message || `Server error (HTTP ${res.status})`}`);
      }
    } catch (e) {
      setError("Network error: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="btn-secondary py-2 px-3 text-sm rounded-lg">&larr; Back</Link>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Create User</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>&#9873; Add a new account to BirdServer</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>First Name</label>
              <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field" placeholder="John" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Last Name</label>
              <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field" placeholder="Doe" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Username *</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") }))}
              className="input-field font-mono"
              placeholder="johndoe"
              required
              minLength={3}
            />
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Only lowercase letters, numbers, dot, underscore, dash.</div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="john@example.com" required />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Password *</label>
              <button type="button" onClick={genPassword} className="text-xs" style={{ color: "var(--accent-cyan)" }}>&#9881; Generate</button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field pr-16 font-mono"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {showPassword ? "hide" : "show"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Role *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "USER", label: "USER", desc: "Owns own servers", sym: "\u25CF" },
                { v: "RESELLER", label: "RESELLER", desc: "Manages users w/ quota", sym: "\u2726" },
                { v: "ADMIN", label: "ADMIN", desc: "Full panel access", sym: "\u2605" },
              ].map(r => (
                <button
                  key={r.v}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: r.v }))}
                  className="py-3 px-3 rounded-xl border text-left transition-all"
                  style={form.role === r.v ? {
                    background: "linear-gradient(135deg, rgba(0,128,255,0.2), rgba(0,200,255,0.2))",
                    borderColor: "#00c8ff",
                    color: "#00c8ff",
                  } : {
                    background: "rgba(0,200,255,0.03)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span>{r.sym}</span> {r.label}
                  </div>
                  <div className="text-xs mt-1 opacity-75">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg p-3 text-sm font-mono" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>
              &#9888; {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)", color: "#00e676" }}>
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 rounded-xl">
              {loading ? "Creating..." : "\u2714 Create Account"}
            </button>
            <Link href="/admin/users" className="btn-secondary py-2.5 px-6 rounded-xl">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
