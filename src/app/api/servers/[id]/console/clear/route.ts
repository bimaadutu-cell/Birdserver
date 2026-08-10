import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers, serverLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess, logAudit } from "@/lib/api-auth";
import { processes } from "@/lib/process-manager";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:console");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);

  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) {
    return apiError("FORBIDDEN", "Access denied.", 403);
  }

  // Clear in-memory log buffer of the running process
  const rp = processes.get(id);
  let clearedMemory = 0;
  if (rp) {
    clearedMemory = rp.logs.length;
    rp.logs = [];
    // Notify all listeners so they refresh their view
    const marker = { seq: rp.seq + 1, ts: Date.now(), stream: "system" as const, data: "[BirdServer] Console cleared." };
    rp.seq = marker.seq;
    rp.logs.push(marker);
    for (const l of rp.listeners) { try { l(marker); } catch {} }
  }

  // Also clear the persisted server_logs in the database
  await db.delete(serverLogs).where(eq(serverLogs.serverId, id));

  await logAudit({
    userId: auth.user?.id,
    apiKeyId: auth.apiKey?.id,
    action: "UPDATE",
    resource: "console",
    resourceId: id,
    endpoint: `/api/servers/${id}/console/clear`,
    method: "POST",
    statusCode: 200,
    metadata: { clearedMemoryLines: clearedMemory },
  });

  return apiSuccess({ cleared: true, memoryLines: clearedMemory });
}
