export const dynamic = "force-dynamic";

import { db } from "@/db";
import { servers, users, nodes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import ServerActionButtons from "./ServerActionButtons";

export default async function ServersPage() {
  const allServers = await db
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
      ownerUsername: users.username,
      nodeName: nodes.name,
      ownerId: servers.ownerId,
    })
    .from(servers)
    .leftJoin(users, eq(servers.ownerId, users.id))
    .leftJoin(nodes, eq(servers.nodeId, nodes.id))
    .orderBy(sql`${servers.createdAt} DESC`);

  const getStatusBadge = (status: string, suspended: boolean) => {
    if (suspended) return "badge-suspended";
    switch (status) {
      case "RUNNING": return "badge-running";
      case "STOPPED": return "badge-stopped";
      case "CRASHED": return "badge-crashed";
      case "STARTING": return "badge-starting";
      default: return "badge-stopped";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Servers</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Manage all BirdServer instances</p>
        </div>
        <Link href="/admin/servers/create" className="btn-primary py-2.5 px-5 rounded-xl text-sm">
          + Create Server
        </Link>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{allServers.length} server{allServers.length !== 1 ? "s" : ""} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Server</th>
                <th>Owner</th>
                <th>Node</th>
                <th>Resources</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allServers.map((server) => (
                <tr key={server.id}>
                  <td>
                    <div>
                      <div className="font-medium">{server.name}</div>
                      <div className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {server.id.substring(0, 16)}...
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{server.ownerUsername}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{server.nodeName}</td>
                  <td>
                    <div className="text-xs space-y-0.5" style={{ color: "var(--text-secondary)" }}>
                      <div>RAM: {server.ramMb === 0 ? "∞" : `${server.ramMb >= 1024 ? `${server.ramMb/1024}GB` : `${server.ramMb}MB`}`}</div>
                      <div>CPU: {server.cpuPercent === 0 ? "∞" : `${server.cpuPercent}%`}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(server.status, server.suspended)}`}>
                      {server.suspended ? "SUSPENDED" : server.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{formatDate(server.createdAt)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/servers/${server.id}`} className="btn-secondary py-1.5 px-3 text-xs rounded-lg">
                        Manage
                      </Link>
                      <ServerActionButtons serverId={server.id} status={server.status} suspended={server.suspended} />
                    </div>
                  </td>
                </tr>
              ))}
              {allServers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>No servers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
