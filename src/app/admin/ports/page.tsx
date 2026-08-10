export const dynamic = "force-dynamic";

import { db } from "@/db";
import { ports, nodes, servers } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

export default async function PortsPage() {
  const allPorts = await db
    .select({
      id: ports.id,
      port: ports.port,
      allocated: ports.allocated,
      serverId: ports.serverId,
      nodeId: ports.nodeId,
      nodeName: nodes.name,
      serverName: servers.name,
    })
    .from(ports)
    .leftJoin(nodes, eq(ports.nodeId, nodes.id))
    .leftJoin(servers, eq(ports.serverId, servers.id))
    .orderBy(sql`${ports.nodeId}, ${ports.port}`);

  const totalPorts = allPorts.length;
  const allocatedPorts = allPorts.filter(p => p.allocated).length;
  const freePorts = totalPorts - allocatedPorts;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Ports</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Port allocation management across nodes</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Ports", value: totalPorts, color: "#00c8ff" },
          { label: "Allocated", value: allocatedPorts, color: "#ffab40" },
          { label: "Free", value: freePorts, color: "#00e676" },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Port</th>
                <th>Node</th>
                <th>Status</th>
                <th>Server</th>
              </tr>
            </thead>
            <tbody>
              {allPorts.map(p => (
                <tr key={p.id}>
                  <td>
                    <code className="text-sm font-mono" style={{ color: "var(--accent-cyan)" }}>{p.port}</code>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{p.nodeName}</td>
                  <td>
                    <span className={`badge ${p.allocated ? "badge-running" : "badge-stopped"}`}>
                      {p.allocated ? "Allocated" : "Free"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    {p.serverName || "—"}
                  </td>
                </tr>
              ))}
              {allPorts.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12" style={{ color: "var(--text-muted)" }}>No ports configured</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
