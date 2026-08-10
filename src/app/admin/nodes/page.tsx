export const dynamic = "force-dynamic";

import { db } from "@/db";
import { nodes, servers } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import Link from "next/link";
import { formatDate, formatBytes } from "@/lib/utils";

export default async function NodesPage() {
  const allNodes = await db.select().from(nodes).orderBy(sql`${nodes.createdAt} DESC`);
  const serverCounts = await db.select({ nodeId: servers.nodeId, count: count() }).from(servers).groupBy(servers.nodeId);
  const countMap = new Map(serverCounts.map(s => [s.nodeId, s.count]));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Nodes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Manage BirdServer deployment nodes</p>
        </div>
        <Link href="/admin/nodes/create" className="btn-primary py-2.5 px-5 rounded-xl text-sm">
          + Add Node
        </Link>
      </div>

      <div className="grid gap-4">
        {allNodes.map(node => (
          <div key={node.id} className="glass-card rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl"></div>
                <div>
                  <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{node.name}</div>
                  <div className="text-sm" style={{ color: "var(--text-muted)" }}>{node.fqdn}:{node.port}</div>
                  {node.description && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{node.description}</div>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge badge-${node.status.toLowerCase()}`}>{node.status}</span>
                <Link href={`/admin/nodes/${node.id}/edit`} className="btn-secondary py-1.5 px-3 text-xs rounded-lg">Edit</Link>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Servers", value: String(countMap.get(node.id) || 0) },
                { label: "RAM", value: `${formatBytes(node.usedRamMb)} / ${formatBytes(node.totalRamMb)}` },
                { label: "CPU", value: `${node.usedCpuPercent}% / ${node.totalCpuPercent}%` },
                { label: "Storage", value: `${formatBytes(node.usedStorageMb)} / ${formatBytes(node.totalStorageMb)}` },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {allNodes.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center" style={{ color: "var(--text-muted)" }}>
            <div className="text-5xl mb-3"></div>
            <div className="text-lg font-medium">No nodes configured</div>
            <div className="text-sm mt-1">Add a node to start deploying servers</div>
          </div>
        )}
      </div>
    </div>
  );
}
