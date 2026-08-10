"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RAM_OPTIONS, CPU_OPTIONS, STORAGE_OPTIONS, NODE_VERSIONS } from "@/lib/utils";

type User = { id: string; username: string; email: string };
type Node = { id: string; name: string; fqdn: string; status: string };

export default function CreateServerForm({ users, nodes }: { users: User[]; nodes: Node[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    ownerId: users[0]?.id || "",
    nodeId: nodes[0]?.id || "",
    nodeVersion: "20",
    startupCommand: 'if [ -d .git ] && [ "${AUTO_UPDATE}" = "1" ]; then git pull; fi; if [ -n "${NODE_PACKAGES}" ]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [ -n "${UNNODE_PACKAGES}" ]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/node /home/container/${MAIN_FILE}',
    ramMb: 1024,
    cpuPercent: 100,
    storageMb: 5120,
    dockerImage: "node:20-alpine",
    restartPolicy: "OFF",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dockerImage: `node:${form.nodeVersion}-alpine`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/admin/servers/${data.data.id}`);
      } else {
        setError(data.error?.message || "Failed to create server.");
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
        <Link href="/admin/servers" className="btn-secondary py-2 px-3 text-sm rounded-lg">&larr; Back</Link>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Create Server</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Deploy a new Node.js server instance</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Server Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="My Bot Server" required />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Optional description" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Owner *</label>
            <select value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))} className="input-field" required>
              {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Node *</label>
            <select value={form.nodeId} onChange={e => setForm(f => ({ ...f, nodeId: e.target.value }))} className="input-field" required>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.name} — {n.fqdn} ({n.status})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Node.js Version *</label>
            <select value={form.nodeVersion} onChange={e => setForm(f => ({ ...f, nodeVersion: e.target.value }))} className="input-field">
              {NODE_VERSIONS.map(v => <option key={v} value={v}>Node.js {v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Startup Command *</label>
            <input type="text" value={form.startupCommand} onChange={e => setForm(f => ({ ...f, startupCommand: e.target.value }))} className="input-field font-mono" placeholder="node index.js" required />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>RAM</label>
              <select value={form.ramMb} onChange={e => setForm(f => ({ ...f, ramMb: Number(e.target.value) }))} className="input-field">
                {RAM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>CPU</label>
              <select value={form.cpuPercent} onChange={e => setForm(f => ({ ...f, cpuPercent: Number(e.target.value) }))} className="input-field">
                {CPU_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Storage</label>
              <select value={form.storageMb} onChange={e => setForm(f => ({ ...f, storageMb: Number(e.target.value) }))} className="input-field">
                {STORAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Restart Policy</label>
            <select value={form.restartPolicy} onChange={e => setForm(f => ({ ...f, restartPolicy: e.target.value }))} className="input-field">
              <option value="OFF">Off</option>
              <option value="ON_FAILURE">On Failure</option>
              <option value="ALWAYS">Always</option>
            </select>
          </div>

          {error && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>[!] {error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 rounded-xl">
              {loading ? "Creating..." : "Create Server"}
            </button>
            <Link href="/admin/servers" className="btn-secondary py-2.5 px-6 rounded-xl">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
