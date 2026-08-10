export const dynamic = "force-dynamic";

import { db } from "@/db";
import { servers, nodes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function UserServersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const myServers = await db
    .select({
      id: servers.id,
      name: servers.name,
      status: servers.status,
      nodeVersion: servers.nodeVersion,
      ramMb: servers.ramMb,
      cpuPercent: servers.cpuPercent,
      storageMb: servers.storageMb,
      suspended: servers.suspended,
      createdAt: servers.createdAt,
      nodeName: nodes.name,
    })
    .from(servers)
    .leftJoin(nodes, eq(servers.nodeId, nodes.id))
    .where(eq(servers.ownerId, session.user.id))
    .orderBy(sql`${servers.createdAt} DESC`);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RUNNING": return "#00e676";
      case "STOPPED": return "#607d8b";
      case "CRASHED": return "#ff5252";
      case "STARTING": return "#ffab40";
      default: return "#607d8b";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">My Servers</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage your server instances
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {myServers.map((server) => (
          <Link
            key={server.id}
            href={`/servers/${server.id}`}
            className="glass-card rounded-2xl p-5 block hover:border-cyan-500/40 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{
                    background: "rgba(0,200,255,0.08)",
                    border: "1px solid rgba(0,200,255,0.2)",
                  }}
                >
                  
                </div>
                <div>
                  <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {server.name}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Node.js {server.nodeVersion} · {server.nodeName} ·{" "}
                    {server.ramMb === 0 ? "Unlimited" : server.ramMb >= 1024 ? `${server.ramMb / 1024}GB` : `${server.ramMb}MB`} RAM
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {server.suspended && (
                  <span className="badge badge-suspended">SUSPENDED</span>
                )}
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: getStatusColor(server.status),
                    boxShadow: `0 0 8px ${getStatusColor(server.status)}`,
                  }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: getStatusColor(server.status) }}
                >
                  {server.status}
                </span>
                <span
                  className="text-xs px-3 py-1.5 rounded-lg ml-2"
                  style={{
                    background: "rgba(0,200,255,0.08)",
                    border: "1px solid var(--border-color)",
                    color: "var(--accent-cyan)",
                  }}
                >
                  Manage &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}

        {myServers.length === 0 && (
          <div
            className="glass-card rounded-2xl p-16 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            <div className="text-6xl mb-4"></div>
            <div className="text-xl font-medium mb-2">No servers yet</div>
            <div className="text-sm">Contact your administrator to create a server.</div>
          </div>
        )}
      </div>
    </div>
  );
}
