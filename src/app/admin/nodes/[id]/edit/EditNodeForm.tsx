"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Node = {
  id: string;
  name: string;
  description: string | null;
  fqdn: string;
  port: number;
  status: string;
  totalRamMb: number;
  totalCpuPercent: number;
  totalStorageMb: number;
  dockerSocket: string | null;
};

export default function EditNodeForm({ node }: { node: Node }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: node.name,
    description: node.description || "",
    fqdn: node.fqdn,
    port: node.port,
    status: node.status,
    totalRamMb: node.totalRamMb,
    totalCpuPercent: node.totalCpuPercent,
    totalStorageMb: node.totalStorageMb,
    dockerSocket: node.dockerSocket || "/var/run/docker.sock",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Node updated!");
        setTimeout(() => router.push("/admin/nodes"), 1000);
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
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/nodes" className="btn-secondary py-2 px-3 text-sm rounded-lg">&larr; Back</Link>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Edit Node</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{node.name}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Node Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
              <option value="ONLINE">ONLINE</option>
              <option value="OFFLINE">OFFLINE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>FQDN / IP</label>
              <input type="text" value={form.fqdn} onChange={e => setForm(f => ({ ...f, fqdn: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Port</label>
              <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>RAM (MB)</label>
              <input type="number" value={form.totalRamMb} onChange={e => setForm(f => ({ ...f, totalRamMb: Number(e.target.value) }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>CPU (%)</label>
              <input type="number" value={form.totalCpuPercent} onChange={e => setForm(f => ({ ...f, totalCpuPercent: Number(e.target.value) }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Storage (MB)</label>
              <input type="number" value={form.totalStorageMb} onChange={e => setForm(f => ({ ...f, totalStorageMb: Number(e.target.value) }))} className="input-field" />
            </div>
          </div>
          {error && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>[!] {error}</div>}
          {success && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)", color: "#00e676" }}>[OK] {success}</div>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 rounded-xl">
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <Link href="/admin/nodes" className="btn-secondary py-2.5 px-6 rounded-xl">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
