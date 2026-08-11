import { db } from "@/db";
import { apiKeys, users } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import ApiKeyActions from "./ApiKeyActions";

export default async function ApiKeysPage() {
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      description: apiKeys.description,
      prefix: apiKeys.prefix,
      status: apiKeys.status,
      scopes: apiKeys.scopes,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      ownerUsername: users.username,
      ownerRole: users.role,
    })
    .from(apiKeys)
    .leftJoin(users, eq(apiKeys.ownerId, users.id))
    .orderBy(sql`${apiKeys.createdAt} DESC`);

  const totalKeys = keys.length;
  const activeKeys = keys.filter(k => k.status === "ACTIVE").length;
  const revokedKeys = keys.filter(k => k.status === "REVOKED").length;
  const expiredKeys = keys.filter(k => k.status === "EXPIRED" || (k.expiresAt && new Date(k.expiresAt) < new Date())).length;

  const stats = [
    { label: "Total Keys", value: totalKeys, color: "#00c8ff" },
    { label: "Active", value: activeKeys, color: "#00e676" },
    { label: "Revoked", value: revokedKeys, color: "#ff5252" },
    { label: "Expired", value: expiredKeys, color: "#607d8b" },
  ];

  const getStatusBadge = (status: string, expiresAt: Date | null) => {
    if (status === "REVOKED") return "badge-revoked";
    if (status === "EXPIRED" || (expiresAt && new Date(expiresAt) < new Date())) return "badge-expired";
    return "badge-active";
  };

  const getStatusLabel = (status: string, expiresAt: Date | null) => {
    if (status === "REVOKED") return "REVOKED";
    if (status === "EXPIRED" || (expiresAt && new Date(expiresAt) < new Date())) return "EXPIRED";
    return "ACTIVE";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">API Keys</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage cryptographic API keys for BirdServer API access
          </p>
        </div>
        <Link href="/admin/api-keys/create" className="btn-primary py-2.5 px-5 rounded-xl text-sm">
          + Create API Key
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
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
                <th>Name</th>
                <th>Owner</th>
                <th>Prefix</th>
                <th>Status</th>
                <th>Scopes</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Last Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td>
                    <div>
                      <div className="font-medium text-sm">{key.name}</div>
                      {key.description && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{key.description}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{key.ownerUsername}</div>
                    {key.ownerRole && (
                      <div className={`badge badge-${key.ownerRole.toLowerCase()} mt-1 text-xs`} style={{ fontSize: "10px" }}>
                        {key.ownerRole}
                      </div>
                    )}
                  </td>
                  <td>
                    <code className="text-xs px-2 py-1 rounded" style={{ background: "rgba(0,200,255,0.1)", color: "var(--accent-cyan)", fontFamily: "monospace" }}>
                      {key.prefix}****
                    </code>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(key.status, key.expiresAt)}`}>
                      {getStatusLabel(key.status, key.expiresAt)}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-48">
                      {(key.scopes as string[]).slice(0, 3).map((scope) => (
                        <span key={scope} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(0,128,255,0.1)", color: "#6eb4ff", fontSize: "10px" }}>
                          {scope}
                        </span>
                      ))}
                      {(key.scopes as string[]).length > 3 && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(0,128,255,0.1)", color: "#6eb4ff", fontSize: "10px" }}>
                          +{(key.scopes as string[]).length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{formatDate(key.createdAt)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    {key.expiresAt ? formatDate(key.expiresAt) : <span style={{ color: "var(--text-muted)" }}>Never</span>}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : <span style={{ color: "var(--text-muted)" }}>Never</span>}
                  </td>
                  <td>
                    <ApiKeyActions keyId={key.id} keyName={key.name} status={key.status} />
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                    <div className="text-4xl mb-2"></div>
                    <div>No API keys yet. Create one to get started.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
