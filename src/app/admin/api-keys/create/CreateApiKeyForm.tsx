"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ALL_SCOPES, SCOPE_PRESETS } from "@/lib/utils";

type User = { id: string; username: string; role: string };

export default function CreateApiKeyForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    ownerId: users[0]?.id || "",
    selectedScopes: [] as string[],
    expiration: "never",
    customExpiration: "",
    rateLimitPerMinute: 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  const getExpiresAt = () => {
    switch (form.expiration) {
      case "7d": return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d": return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      case "90d": return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      case "1y": return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      case "custom": return form.customExpiration ? new Date(form.customExpiration).toISOString() : null;
      default: return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.selectedScopes.length === 0) {
      setError("Please select at least one scope.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          ownerId: form.ownerId,
          scopes: form.selectedScopes,
          expiresAt: getExpiresAt(),
          rateLimitPerMinute: form.rateLimitPerMinute,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedKey(data.data.key);
      } else {
        setError(data.error?.message || "Failed to create API key.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (createdKey) {
    return (
      <div className="max-w-2xl animate-fade-in">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4"></div>
          <h2 className="text-2xl font-bold gradient-text mb-2">API Key Created!</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Your API key has been generated. Copy it now — it will not be shown again.
          </p>

          <div
            className="rounded-xl p-5 mb-4 text-left"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,200,255,0.3)" }}
          >
            <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Your API Key
            </div>
            <code
              className="block text-sm break-all"
              style={{ color: "var(--accent-cyan)", fontFamily: "monospace", lineHeight: 1.8 }}
            >
              {createdKey}
            </code>
          </div>

          <div
            className="rounded-xl p-4 mb-6 text-left"
            style={{ background: "rgba(255,171,64,0.08)", border: "1px solid rgba(255,171,64,0.3)" }}
          >
            <div className="text-sm font-semibold mb-1" style={{ color: "#ffab40" }}>
              [!] Important Security Notice
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              This secret API key will <strong>not be shown again</strong>. Store it securely in a password manager or secret vault.
              Never share it publicly, commit it to Git, or include it in client-side code.
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button onClick={copyKey} className="btn-primary py-3 px-8 rounded-xl font-semibold text-base">
              {copied ? "[OK] Copied!" : " Copy API Key"}
            </button>
            <Link href="/admin/api-keys" className="btn-secondary py-3 px-8 rounded-xl">
              Done
            </Link>
          </div>

          <div className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
            Usage: <code style={{ color: "var(--accent-cyan)" }}>Authorization: Bearer {createdKey.substring(0, 24)}...</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/api-keys" className="btn-secondary py-2 px-3 text-sm rounded-lg">&larr; Back</Link>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Create API Key</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Generate a cryptographically secure API key</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Key Name *
              </label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input-field" placeholder="BirdServer Production API" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Owner *
              </label>
              <select value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))} className="input-field">
                {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Description
            </label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field" placeholder="Optional description for this API key" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Expiration
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[
                { val: "never", label: "Never" },
                { val: "7d", label: "7 Days" },
                { val: "30d", label: "30 Days" },
                { val: "90d", label: "90 Days" },
                { val: "1y", label: "1 Year" },
                { val: "custom", label: "Custom" },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, expiration: opt.val }))}
                  className="py-2 px-3 text-xs rounded-lg font-medium border transition-all"
                  style={form.expiration === opt.val ? {
                    background: "linear-gradient(135deg, #0080ff, #00c8ff)",
                    border: "1px solid #00c8ff",
                    color: "white",
                  } : {
                    background: "rgba(0,200,255,0.05)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.expiration === "custom" && (
              <input type="datetime-local" value={form.customExpiration}
                onChange={e => setForm(f => ({ ...f, customExpiration: e.target.value }))}
                className="input-field mt-2" />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Rate Limit (requests/minute)
            </label>
            <input type="number" value={form.rateLimitPerMinute}
              onChange={e => setForm(f => ({ ...f, rateLimitPerMinute: Number(e.target.value) }))}
              className="input-field" min={1} max={1000} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Permissions / Scopes *
              </label>
              <select value={preset} onChange={e => applyPreset(e.target.value)} className="input-field text-xs" style={{ width: "auto", padding: "6px 10px" }}>
                <option value="">— Apply Preset —</option>
                {Object.keys(SCOPE_PRESETS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_SCOPES.map(scope => (
                <label
                  key={scope}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: form.selectedScopes.includes(scope) ? "rgba(0,200,255,0.1)" : "rgba(0,200,255,0.02)",
                    border: `1px solid ${form.selectedScopes.includes(scope) ? "rgba(0,200,255,0.4)" : "var(--border-color)"}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="w-3 h-3 flex-shrink-0"
                  />
                  <span className="text-xs font-mono" style={{ color: form.selectedScopes.includes(scope) ? "var(--accent-cyan)" : "var(--text-secondary)" }}>
                    {scope}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              {form.selectedScopes.length} scope{form.selectedScopes.length !== 1 ? "s" : ""} selected
            </div>
          </div>

          {error && (
            <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>
              [!] {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 rounded-xl">
              {loading ? "Generating..." : " Generate API Key"}
            </button>
            <Link href="/admin/api-keys" className="btn-secondary py-2.5 px-6 rounded-xl">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
