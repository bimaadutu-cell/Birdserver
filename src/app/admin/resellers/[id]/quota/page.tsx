import { db } from "@/db";
import { users, resellerQuotas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatBytes } from "@/lib/utils";

export default async function ResellerQuotaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await db
    .select({ user: users, quota: resellerQuotas })
    .from(users)
    .leftJoin(resellerQuotas, eq(users.id, resellerQuotas.resellerId))
    .where(eq(users.id, id))
    .limit(1);

  if (!result.length || result[0].user.role !== "RESELLER") notFound();

  const { user, quota } = result[0];

  const items = quota
    ? [
        {
          label: "Users",
          used: quota.usedUsers,
          max: quota.maxUsers,
          format: (v: number) => String(v),
          color: "#00c8ff",
        },
        {
          label: "Servers",
          used: quota.usedServers,
          max: quota.maxServers,
          format: (v: number) => String(v),
          color: "#0080ff",
        },
        {
          label: "RAM",
          used: quota.usedRamMb,
          max: quota.maxRamMb,
          format: formatBytes,
          color: "#00e676",
        },
        {
          label: "CPU",
          used: quota.usedCpuPercent,
          max: quota.maxCpuPercent,
          format: (v: number) => `${v}%`,
          color: "#ffab40",
        },
        {
          label: "Storage",
          used: quota.usedStorageMb,
          max: quota.maxStorageMb,
          format: formatBytes,
          color: "#ff5252",
        },
      ]
    : [];

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Reseller Quota</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {user.username} — Resource usage
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-6">
        {items.map((item) => {
          const pct =
            item.max > 0 ? Math.min((item.used / item.max) * 100, 100) : 0;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "var(--text-secondary)" }}>
                  {item.label}
                </span>
                <span style={{ color: item.color }}>
                  {item.format(item.used)} / {item.format(item.max)}
                </span>
              </div>
              <div
                className="h-3 rounded-full"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct > 90
                        ? "#ff5252"
                        : pct > 75
                        ? "#ffab40"
                        : item.color,
                  }}
                />
              </div>
              <div
                className="text-xs mt-1 text-right"
                style={{ color: "var(--text-muted)" }}
              >
                {pct.toFixed(1)}% used
              </div>
            </div>
          );
        })}

        {!quota && (
          <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
            No quota configured for this reseller.
          </div>
        )}
      </div>
    </div>
  );
}
