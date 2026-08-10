"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ALL_SCOPES, SCOPE_PRESETS } from "@/lib/utils";

type ApiKey = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  scopes: unknown;
  status: string;
  expiresAt: Date | null;
  rateLimitPerMinute: number;
};
type User = { id: string; username: string; role: string };

export default function EditApiKeyForm({ apiKey, users }: { apiKey: ApiKey; users: User[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: apiKey.name,
    description: apiKey.description || "",
    ownerId: apiKey.ownerId,
    selectedScopes: (apiKey.scopes as string[]) || [],
    status: apiKey.status,
    rateLimitPerMinute: apiKey.rateLimitPerMinute,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preset, setPreset] = useState("");

  const toggleScope = (scope: string) => {
    setForm(f => ({
      ...f,
      selectedScopes: f.selectedScopes.includes(scope)
        ? f.selectedScopes.filter(s => s !== scope)
        : [...f.selectedScopes, scope],
    }));
  };

  const applyPreset = (presetName: string) => {
    setPreset(presetName);
    if (presetName in SCOPE_PRESETS) {
      setForm(f => ({ ...f, selectedScopes: SCOPE_PRESETS[presetName as keyof typeof SCOPE_PRESETS] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/api-keys/${apiKey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          ownerId: form.ownerId,
          scopes: form.selectedScopes,
          status: form.status,
          rateLimitPerMinute: form.rateLimitPerMinute,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("API key updated!");
        setTimeout(() => router.push("/admin/api-keys"), 1000);
      } else {
        setError(data.error?.message || "Failed to update.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/api-keys" className="btn-secondary py-2 px-3 text-sm rounded-lg">&larr; Back</Link>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Edit API Key</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{apiKey.name}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="mb-5 p-3 rounded-lg text-xs" style={{ background: "rgba(255,171,64,0.08)", border: "1px solid rgba(255,171,64,0.2)", color: "#ffab40" }}>
          [!] Note: The secret key cannot be viewed or recovered. Editing this key does not change the underlying secret.
          Use Rotate to generate a new secret.
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Key Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Owner</label>
              <select value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))} className="input-field">
                {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
                <option value="ACTIVE">ACTIVE</option>
                <option value="REVOKED">REVOKED</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Rate Limit (req/min)</label>
              <input type="number" value={form.rateLimitPerMinute}
                onChange={e => setForm(f => ({ ...f, rateLimitPerMinute: Number(e.target.value) }))}
                className="input-field" min={1} max={1000} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Scopes *</label>
              <select value={preset} onChange={e => applyPreset(e.target.value)} className="input-field text-xs" style={{ width: "auto", padding: "6px 10px" }}>
                <option value="">— Apply Preset —</option>
                {Object.keys(SCOPE_PRESETS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_SCOPES.map(scope => (
                <label key={scope} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                  style={{
                    background: form.selectedScopes.includes(scope) ? "rgba(0,200,255,0.1)" : "rgba(0,200,255,0.02)",
                    border: `1px solid ${form.selectedScopes.includes(scope) ? "rgba(0,200,255,0.4)" : "var(--border-color)"}`,
                  }}>
                  <input type="checkbox" checked={form.selectedScopes.includes(scope)} onChange={() => toggleScope(scope)} className="w-3 h-3" />
                  <span className="text-xs font-mono" style={{ color: form.selectedScopes.includes(scope) ? "var(--accent-cyan)" : "var(--text-secondary)" }}>
                    {scope}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>[!] {error}</div>}
          {success && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)", color: "#00e676" }}>[OK] {success}</div>}

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 rounded-xl">
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <Link href="/admin/api-keys" className="btn-secondary py-2.5 px-6 rounded-xl">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
