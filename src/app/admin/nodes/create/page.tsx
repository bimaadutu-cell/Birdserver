"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateNodePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    fqdn: "",
    port: 8080,
    totalRamMb: 8192,
    totalCpuPercent: 400,
    totalStorageMb: 102400,
    dockerSocket: "/var/run/docker.sock",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/admin/nodes");
      } else {
        setError(data.error?.message || "Failed to create node.");
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
        <Link href="/admin/nodes" className="btn-secondary py-2 px-3 text-sm rounded-lg">&larr; Back</Link>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Add Node</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Register a new deployment node</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Node Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Node-01 (Singapore)" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>FQDN / IP *</label>
              <input type="text" value={form.fqdn} onChange={e => setForm(f => ({ ...f, fqdn: e.target.value }))} className="input-field" placeholder="node1.example.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Agent Port</label>
              <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Total RAM (MB)</label>
              <input type="number" value={form.totalRamMb} onChange={e => setForm(f => ({ ...f, totalRamMb: Number(e.target.value) }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Total CPU (%)</label>
              <input type="number" value={form.totalCpuPercent} onChange={e => setForm(f => ({ ...f, totalCpuPercent: Number(e.target.value) }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Total Storage (MB)</label>
              <input type="number" value={form.totalStorageMb} onChange={e => setForm(f => ({ ...f, totalStorageMb: Number(e.target.value) }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Docker Socket</label>
            <input type="text" value={form.dockerSocket} onChange={e => setForm(f => ({ ...f, dockerSocket: e.target.value }))} className="input-field font-mono" />
          </div>
          {error && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>[!] {error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 rounded-xl">
              {loading ? "Creating..." : "Add Node"}
            </button>
            <Link href="/admin/nodes" className="btn-secondary py-2.5 px-6 rounded-xl">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
