export const dynamic = "force-dynamic";

import { db } from "@/db";
import { serverLogs, servers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export default async function SystemLogsPage() {
  const logs = await db
    .select({
      id: serverLogs.id,
      level: serverLogs.level,
      message: serverLogs.message,
      createdAt: serverLogs.createdAt,
      serverName: servers.name,
      serverId: serverLogs.serverId,
    })
    .from(serverLogs)
    .leftJoin(servers, eq(serverLogs.serverId, servers.id))
    .orderBy(sql`${serverLogs.createdAt} DESC`)
    .limit(200);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error": return "#ff5252";
      case "warn": return "#ffab40";
      default: return "#00e676";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">System Logs</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Real-time server log output</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="terminal-container p-4 h-screen max-h-[70vh] overflow-y-auto" style={{ background: "#0a0a0f" }}>
          {logs.length === 0 ? (
            <div style={{ color: "#607d8b" }}>No logs available.</div>
          ) : (
            [...logs].reverse().map(log => (
              <div key={log.id} className="mb-1" style={{ fontFamily: "monospace", fontSize: "13px" }}>
                <span style={{ color: "#607d8b" }}>[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                {" "}
                <span style={{ color: "#00c8ff" }}>[{log.serverName || log.serverId?.substring(0, 8)}]</span>
                {" "}
                <span style={{ color: getLevelColor(log.level) }}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
