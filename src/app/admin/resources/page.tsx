export const dynamic = "force-dynamic";

import { db } from "@/db";
import { nodes, servers } from "@/db/schema";
import { eq, count, sum, sql } from "drizzle-orm";
import { formatBytes } from "@/lib/utils";

export default async function ResourcesPage() {
  const allNodes = await db.select().from(nodes);

  const serverStats = await db
    .select({
      nodeId: servers.nodeId,
      totalServers: count(),
      totalRam: sum(servers.ramMb),
      totalCpu: sum(servers.cpuPercent),
      totalStorage: sum(servers.storageMb),
    })
    .from(servers)
    .groupBy(servers.nodeId);

  const statsMap = new Map(serverStats.map(s => [s.nodeId, s]));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Resources</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Node resource allocation overview</p>
      </div>

      {allNodes.map(node => {
        const stats = statsMap.get(node.id);
        const usedRam = Number(stats?.totalRam || 0);
        const usedCpu = Number(stats?.totalCpu || 0);
        const usedStorage = Number(stats?.totalStorage || 0);
        const serverCount = Number(stats?.totalServers || 0);

        return (
          <div key={node.id} className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>{node.name}</h3>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>{node.fqdn} · {serverCount} servers</div>
              </div>
              <span className={`badge badge-${node.status.toLowerCase()}`}>{node.status}</span>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {[
                { label: "RAM", used: usedRam, total: node.totalRamMb, color: "#00c8ff", format: (v: number) => formatBytes(v) },
                { label: "CPU", used: usedCpu, total: node.totalCpuPercent, color: "#0080ff", format: (v: number) => `${v}%` },
                { label: "Storage", used: usedStorage, total: node.totalStorageMb, color: "#ffab40", format: (v: number) => formatBytes(v) },
              ].map(res => {
                const pct = res.total > 0 ? Math.min((res.used / res.total) * 100, 100) : 0;
                return (
                  <div key={res.label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span style={{ color: "var(--text-secondary)" }}>{res.label}</span>
                      <span style={{ color: res.color }}>{res.format(res.used)} / {res.format(res.total)}</span>
                    </div>
                    <div className="h-3 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: pct > 85 ? "#ff5252" : pct > 70 ? "#ffab40" : res.color,
                        }}
                      />
                    </div>
                    <div className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {allNodes.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center" style={{ color: "var(--text-muted)" }}>
          <div className="text-5xl mb-3"></div>
          <div>No nodes configured. Add a node first.</div>
        </div>
      )}
    </div>
  );
}
