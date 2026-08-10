import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess, logAudit } from "@/lib/api-auth";
import { killServer } from "@/lib/process-manager";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:kill");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);

  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) {
    return apiError("FORBIDDEN", "Access denied.", 403);
  }

  await killServer(id);
  await db.update(servers).set({ status: "STOPPED", updatedAt: new Date() }).where(eq(servers.id, id));

  await logAudit({
    userId: auth.user?.id,
    apiKeyId: auth.apiKey?.id,
    action: "KILL",
    resource: "server",
    resourceId: id,
    endpoint: `/api/servers/${id}/kill`,
    method: "POST",
    statusCode: 200,
  });

  return apiSuccess({ status: "STOPPED" });
}
