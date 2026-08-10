import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess, logAudit } from "@/lib/api-auth";
import { restartServer } from "@/lib/process-manager";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:restart");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);
  if (server[0].suspended) return apiError("FORBIDDEN", "Server is suspended.", 403);

  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) {
    return apiError("FORBIDDEN", "Access denied.", 403);
  }

  try {
    await db.update(servers).set({ status: "STARTING", updatedAt: new Date() }).where(eq(servers.id, id));
    const result = await restartServer({
      serverId: id,
      startupCommand: server[0].startupCommand,
      nodeVersion: server[0].nodeVersion,
      autoRestart: server[0].restartPolicy !== "OFF",
    });

    await logAudit({
      userId: auth.user?.id,
      apiKeyId: auth.apiKey?.id,
      action: "RESTART",
      resource: "server",
      resourceId: id,
      endpoint: `/api/servers/${id}/restart`,
      method: "POST",
      statusCode: 200,
    });

    return apiSuccess({ status: "RUNNING", pid: result.pid, startedAt: result.startedAt });
  } catch (err) {
    return apiError("RESTART_FAILED", (err as Error).message, 500);
  }
}
