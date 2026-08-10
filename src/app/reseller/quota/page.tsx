export const dynamic = "force-dynamic";

import { db } from "@/db";
import { resellerQuotas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatBytes } from "@/lib/utils";

export default async function ResellerQuotaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const quota = await db
    .select()
    .from(resellerQuotas)
    .where(eq(resellerQuotas.resellerId, session.user.id))
    .limit(1);

  const q = quota[0];

  const items = q
    ? [
        {
          label: "Users",
          used: q.usedUsers,
          max: q.maxUsers,
          format: (v: number) => String(v),
          color: "#00c8ff",
          icon: "",
        },
        {
          label: "Servers",
          used: q.usedServers,
          max: q.maxServers,
          format: (v: number) => String(v),
          color: "#0080ff",
          icon: "",
        },
        {
          label: "RAM",
          used: q.usedRamMb,
          max: q.maxRamMb,
          format: formatBytes,
          color: "#00e676",
          icon: "",
        },
        {
          label: "CPU",
          used: q.usedCpuPercent,
          max: q.maxCpuPercent,
          format: (v: number) => `${v}%`,
          color: "#ffab40",
          icon: "",
        },
        {
          label: "Storage",
          used: q.usedStorageMb,
          max: q.maxStorageMb,
          format: formatBytes,
          color: "#ff5252",
          icon: "",
        },
      ]
    : [];

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">My Quota</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Your reseller resource allocation
        </p>
      </div>

      {!q ? (
        <div
          className="glass-card rounded-2xl p-12 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          No quota assigned. Contact your administrator.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const pct =
              item.max > 0
                ? Math.min((item.used / item.max) * 100, 100)
                : 0;
            return (
              <div key={item.label} className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="ml-auto text-sm font-medium"
                    style={{ color: item.color }}
                  >
                    {item.format(item.used)} / {item.format(item.max)}
                  </span>
                </div>
                <div
                  className="h-3 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="h-full rounded-full"
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
        </div>
      )}
    </div>
  );
}
