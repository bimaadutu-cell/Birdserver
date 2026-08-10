export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function ResellerUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const myUsers = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      suspended: users.suspended,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.resellerId, session.user.id))
    .orderBy(sql`${users.createdAt} DESC`);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">My Users</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage users under your reseller account
          </p>
        </div>
        <Link
          href="/reseller/users/create"
          className="btn-primary py-2.5 px-5 rounded-xl text-sm"
        >
          + Create User
        </Link>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {myUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg, #0080ff, #00c8ff)",
                        }}
                      >
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{u.username}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                  <td>
                    <span
                      className={`badge ${
                        u.suspended ? "badge-revoked" : "badge-active"
                      }`}
                    >
                      {u.suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                    }}
                  >
                    {formatDate(u.createdAt)}
                  </td>
                </tr>
              ))}
              {myUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-12"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No users yet. Create one to get started.
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
