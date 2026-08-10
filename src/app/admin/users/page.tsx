import { db } from "@/db";
import { users, servers } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import DeleteUserButton from "./DeleteUserButton";

export default async function UsersPage() {
  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      suspended: users.suspended,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(sql`${users.createdAt} DESC`);

  const serverCounts = await db
    .select({ ownerId: servers.ownerId, count: count() })
    .from(servers)
    .groupBy(servers.ownerId);

  const serverCountMap = new Map(serverCounts.map((s) => [s.ownerId, s.count]));

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN": return "badge-admin";
      case "RESELLER": return "badge-reseller";
      default: return "badge-user";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Users</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage all BirdServer users
          </p>
        </div>
        <Link href="/admin/users/create" className="btn-primary py-2.5 px-5 rounded-xl text-sm">
          + Create User
        </Link>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-color)" }}>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {allUsers.length} user{allUsers.length !== 1 ? "s" : ""} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Servers</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #0080ff, #00c8ff)" }}
                      >
                        {user.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        {(user.firstName || user.lastName) && (
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {[user.firstName, user.lastName].filter(Boolean).join(" ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{user.email}</td>
                  <td>
                    <span className={`badge ${getRoleBadge(user.role)}`}>{user.role}</span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {serverCountMap.get(user.id) || 0}
                  </td>
                  <td>
                    <span className={`badge ${user.suspended ? "badge-revoked" : "badge-active"}`}>
                      {user.suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    {formatDate(user.createdAt)}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/users/${user.id}/edit`}
                        className="btn-secondary py-1.5 px-3 text-xs rounded-lg"
                      >
                        Edit
                      </Link>
                      <DeleteUserButton userId={user.id} username={user.username} />
                    </div>
                  </td>
                </tr>
              ))}
              {allUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                    No users found
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
