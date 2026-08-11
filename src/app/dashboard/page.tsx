import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, servers, nodes, apiKeys, auditLogs } from "@/db/schema";
import { eq, count, and, gte, sql } from "drizzle-orm";
import Link from "next/link";
import {
  IconUsers, IconReseller, IconServer, IconNode,
  IconKey, IconRunning, IconActivity, IconMemory,
  IconCpu, IconWarn, IconCheck, IconClose,
} from "@/components/Icons";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  const { user } = session;
  const isAdmin = user.role === "ADMIN";

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalResellers,
    totalServers,
    runningServers,
    totalNodes,
    totalApiKeys,
    activeApiKeys,
    revokedApiKeys,
    expiredApiKeys,
    requestsToday,
    failedToday,
    recentAudit,
    myServers,
  ] = await Promise.all([
    isAdmin ? db.select({ v: count() }).from(users).where(eq(users.role, "USER")) : Promise.resolve([{ v: 0 }]),
    isAdmin ? db.select({ v: count() }).from(users).where(eq(users.role, "RESELLER")) : Promise.resolve([{ v: 0 }]),
    isAdmin
      ? db.select({ v: count() }).from(servers)
      : db.select({ v: count() }).from(servers).where(eq(servers.ownerId, user.id)),
    isAdmin
      ? db.select({ v: count() }).from(servers).where(eq(servers.status, "RUNNING"))
      : db.select({ v: count() }).from(servers).where(and(eq(servers.ownerId, user.id), eq(servers.status, "RUNNING"))),
    isAdmin ? db.select({ v: count() }).from(nodes) : Promise.resolve([{ v: 0 }]),
    isAdmin ? db.select({ v: count() }).from(apiKeys) : Promise.resolve([{ v: 0 }]),
    isAdmin ? db.select({ v: count() }).from(apiKeys).where(eq(apiKeys.status, "ACTIVE")) : Promise.resolve([{ v: 0 }]),
    isAdmin ? db.select({ v: count() }).from(apiKeys).where(eq(apiKeys.status, "REVOKED")) : Promise.resolve([{ v: 0 }]),
    isAdmin ? db.select({ v: count() }).from(apiKeys).where(eq(apiKeys.status, "EXPIRED")) : Promise.resolve([{ v: 0 }]),
    db.select({ v: count() }).from(auditLogs).where(gte(auditLogs.createdAt, startOfDay)),
    db.select({ v: count() }).from(auditLogs).where(and(gte(auditLogs.createdAt, startOfDay), gte(auditLogs.statusCode, 400))),
    db.select().from(auditLogs).orderBy(sql`${auditLogs.createdAt} DESC`).limit(8),
    isAdmin
      ? db.select().from(servers).orderBy(sql`${servers.createdAt} DESC`).limit(5)
      : db.select().from(servers).where(eq(servers.ownerId, user.id)).orderBy(sql`${servers.createdAt} DESC`).limit(5),
  ]);

  const statusDot = (s: string) => {
    switch (s) {
      case "RUNNING": return "#00e676";
      case "STOPPED": return "#607d8b";
      case "CRASHED": return "#ff5252";
      case "STARTING": return "#ffab40";
      default: return "#607d8b";
    }
  };

  const StatCard = ({ label, value, sub, color, Icon }: {
    label: string; value: string | number; sub?: string; color: string; Icon: React.ComponentType<{size?: number; color?: string}>;
  }) => (
    <div className="metric-card relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</div>
        <div className="p-2 rounded-lg" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div className="text-3xl font-bold" style={{ color }}>{String(value)}</div>
      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub || "\u00a0"}</div>
    </div>
  );

  const userStats = isAdmin
    ? [
        { label: "Users",    value: totalUsers[0].v,      color: "#00c8ff", Icon: IconUsers },
        { label: "Resellers", value: totalResellers[0].v, color: "#ffab40", Icon: IconReseller },
        { label: "Servers",  value: totalServers[0].v,    color: "#0080ff", Icon: IconServer, sub: `${runningServers[0].v} running` },
        { label: "Nodes",    value: totalNodes[0].v,      color: "#00e676", Icon: IconNode },
      ]
    : [
        { label: "Servers",  value: totalServers[0].v,    color: "#00c8ff", Icon: IconServer },
        { label: "Running",  value: runningServers[0].v,  color: "#00e676", Icon: IconRunning },
      ];

  const resourceStats = isAdmin ? [
    { label: "API Keys",     value: totalApiKeys[0].v,   color: "#00c8ff", Icon: IconKey, sub: `${activeApiKeys[0].v} active` },
    { label: "Requests Today", value: requestsToday[0].v, color: "#00e676", Icon: IconActivity },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Welcome back, <span style={{ color: "var(--accent-cyan)" }}>{user.username}</span>
            <span className={`ml-2 badge badge-${user.role.toLowerCase()}`}>{user.role}</span>
          </p>
        </div>
      </div>

      {/* Bot integration banner (admin only) */}
      {isAdmin && (
        <Link href="/admin/api-docs" className="block rounded-2xl p-5 transition-all hover:scale-[1.005]" style={{
          background: "linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,200,255,0.08))",
          border: "1px solid rgba(0,230,118,0.3)",
          boxShadow: "0 0 30px rgba(0,230,118,0.08)",
        }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{ background: "rgba(0,230,118,0.15)", border: "1px solid rgba(0,230,118,0.3)" }}>
                <IconKey size={22} color="#00e676" />
              </div>
              <div>
                <div className="font-bold text-base" style={{ color: "#00e676" }}>Bot Auto-Order Endpoint</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  <code style={{ color: "var(--accent-cyan)" }}>POST /api/provision</code> creates account + server + starts in one call.
                </div>
              </div>
            </div>
            <span className="btn-primary py-2 px-4 rounded-lg text-sm whitespace-nowrap">Open Docs</span>
          </div>
        </Link>
      )}

      {/* Primary stats */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Overview</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {userStats.map((s, i) => (
            <StatCard key={i} {...s} />
          ))}
        </div>
      </div>

      {/* Resource stats */}
      {isAdmin && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>API & Usage</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {resourceStats.map((s, i) => <StatCard key={i} {...s} />)}
            <StatCard label="Revoked Keys" value={revokedApiKeys[0].v} color="#ff5252" Icon={IconClose} />
            <StatCard label="Failed Today" value={failedToday[0].v} color="#ffab40" Icon={IconWarn} />
          </div>
        </div>
      )}

      {/* Two-column: servers + activity */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Servers */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-2">
              <IconServer size={16} color="var(--accent-cyan)" />
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Recent Servers</h2>
            </div>
            <Link href={isAdmin ? "/admin/servers" : "/servers"} className="text-xs" style={{ color: "var(--accent-cyan)" }}>
              View all &rarr;
            </Link>
          </div>
          <div>
            {myServers.length === 0 ? (
              <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
                <IconServer size={32} color="var(--text-muted)" />
                <div className="text-sm mt-2">No servers yet</div>
              </div>
            ) : myServers.map((s, i) => (
              <Link
                key={s.id}
                href={isAdmin ? `/admin/servers/${s.id}` : `/servers/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
                style={{ borderTop: i > 0 ? "1px solid rgba(0,200,255,0.05)" : undefined }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{s.name}</div>
                  <div className="text-xs mt-0.5 font-mono truncate" style={{ color: "var(--text-muted)" }}>
                    node-{s.nodeVersion} &middot; {s.ramMb} MB
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: statusDot(s.status), boxShadow: `0 0 6px ${statusDot(s.status)}` }} />
                  <span className="text-xs font-semibold" style={{ color: statusDot(s.status) }}>{s.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-2">
              <IconActivity size={16} color="var(--accent-cyan)" />
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Recent Activity</h2>
            </div>
            {isAdmin && (
              <Link href="/admin/audit-logs" className="text-xs" style={{ color: "var(--accent-cyan)" }}>View all &rarr;</Link>
            )}
          </div>
          <div>
            {recentAudit.length === 0 ? (
              <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
                <IconActivity size={32} color="var(--text-muted)" />
                <div className="text-sm mt-2">No activity yet</div>
              </div>
            ) : recentAudit.map((log, i) => (
              <div key={log.id} className="px-4 py-3 flex items-start gap-3" style={{ borderTop: i > 0 ? "1px solid rgba(0,200,255,0.05)" : undefined }}>
                <div className="mt-0.5 p-1.5 rounded" style={{
                  background: log.statusCode && log.statusCode >= 400 ? "rgba(255,82,82,0.1)" : "rgba(0,230,118,0.1)",
                }}>
                  {log.statusCode && log.statusCode >= 400
                    ? <IconClose size={12} color="#ff5252" />
                    : <IconCheck size={12} color="#00e676" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{log.action}</div>
                  {log.endpoint && (
                    <div className="text-[11px] font-mono mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {log.method} {log.endpoint}
                    </div>
                  )}
                </div>
                {log.statusCode && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{
                    background: log.statusCode < 400 ? "rgba(0,230,118,0.1)" : "rgba(255,82,82,0.1)",
                    color: log.statusCode < 400 ? "#00e676" : "#ff5252",
                  }}>{log.statusCode}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
