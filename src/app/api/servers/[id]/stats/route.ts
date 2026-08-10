import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess } from "@/lib/api-auth";
import { getStats, isRunning } from "@/lib/process-manager";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:read");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return apiError("FORBIDDEN", "Access denied.", 403);

  const stats = await getStats(id);
  const running = isRunning(id);
  const currentStatus = running ? "RUNNING" : server[0].status === "STARTING" ? "STARTING" : "STOPPED";

  // Sync DB if there's a mismatch
  if (server[0].status === "RUNNING" && !running) {
    try { await db.update(servers).set({ status: "STOPPED", updatedAt: new Date() }).where(eq(servers.id, id)); } catch {}
  }

  return apiSuccess({
    serverId: id,
    status: currentStatus,
    pid: stats.pid,
    running: stats.running,
    cpuPercent: stats.cpuPercent,
    memoryMb: stats.memoryMb,
    uptimeMs: stats.uptimeMs,
    ramLimitMb: server[0].ramMb,
    cpuLimitPercent: server[0].cpuPercent,
    storageLimitMb: server[0].storageMb,
  });
}
