import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export default async function AuditLogsPage() {
  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resource: auditLogs.resource,
      resourceId: auditLogs.resourceId,
      endpoint: auditLogs.endpoint,
      method: auditLogs.method,
      statusCode: auditLogs.statusCode,
      ipAddress: auditLogs.ipAddress,
      apiKeyId: auditLogs.apiKeyId,
      createdAt: auditLogs.createdAt,
      username: users.username,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(sql`${auditLogs.createdAt} DESC`)
    .limit(200);

  const getActionColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("REVOKE")) return "#ff5252";
    if (action.includes("CREATE") || action.includes("START")) return "#00e676";
    if (action.includes("UPDATE") || action.includes("RESTART")) return "#ffab40";
    if (action === "LOGIN") return "#00c8ff";
    return "#6b8cad";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Audit Logs</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Security and activity audit trail</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{logs.length} recent events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>User</th>
                <th>Resource</th>
                <th>Endpoint</th>
                <th>Status</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td>
                    <span className="text-xs font-semibold font-mono" style={{ color: getActionColor(log.action) }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                    {log.username || (log.apiKeyId ? <span style={{ color: "#ffab40" }}>API Key</span> : "—")}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    {log.resource}
                    {log.resourceId && <span className="ml-1 font-mono text-xs">{log.resourceId.substring(0, 8)}</span>}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "monospace" }}>
                    {log.method && <span className="mr-1" style={{ color: "var(--accent-cyan)" }}>{log.method}</span>}
                    {log.endpoint}
                  </td>
                  <td>
                    {log.statusCode && (
                      <span className="text-xs font-mono font-semibold" style={{
                        color: log.statusCode < 400 ? "#00e676" : log.statusCode < 500 ? "#ffab40" : "#ff5252",
                      }}>
                        {log.statusCode}
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "monospace" }}>
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>No audit logs yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
