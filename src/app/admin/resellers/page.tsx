export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users, resellerQuotas } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { formatDate, formatBytes } from "@/lib/utils";

export default async function ResellersPage() {
  const resellers = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      suspended: users.suspended,
      createdAt: users.createdAt,
      quota: resellerQuotas,
    })
    .from(users)
    .leftJoin(resellerQuotas, eq(users.id, resellerQuotas.resellerId))
    .where(eq(users.role, "RESELLER"))
    .orderBy(sql`${users.createdAt} DESC`);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Resellers</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Manage reseller accounts and quotas</p>
        </div>
        <Link href="/admin/resellers/create" className="btn-primary py-2.5 px-5 rounded-xl text-sm">
          + Create Reseller
        </Link>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reseller</th>
                <th>Users</th>
                <th>Servers</th>
                <th>RAM Quota</th>
                <th>CPU Quota</th>
                <th>Storage Quota</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resellers.map(r => (
                <tr key={r.id}>
                  <td>
                    <div>
                      <div className="font-medium">{r.username}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.email}</div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {r.quota ? `${r.quota.usedUsers} / ${r.quota.maxUsers}` : "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {r.quota ? `${r.quota.usedServers} / ${r.quota.maxServers}` : "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {r.quota ? `${formatBytes(r.quota.usedRamMb)} / ${formatBytes(r.quota.maxRamMb)}` : "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {r.quota ? `${r.quota.usedCpuPercent}% / ${r.quota.maxCpuPercent}%` : "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {r.quota ? `${formatBytes(r.quota.usedStorageMb)} / ${formatBytes(r.quota.maxStorageMb)}` : "—"}
                  </td>
                  <td>
                    <span className={`badge ${r.suspended ? "badge-revoked" : "badge-active"}`}>
                      {r.suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link href={`/admin/resellers/${r.id}/edit`} className="btn-secondary py-1.5 px-3 text-xs rounded-lg">Edit</Link>
                      <Link href={`/admin/resellers/${r.id}/quota`} className="btn-warning py-1.5 px-3 text-xs rounded-lg">Quota</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {resellers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12" style={{ color: "var(--text-muted)" }}>No resellers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
