import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers, serverLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticate, apiError, apiSuccess } from "@/lib/api-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "logs:read");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);

  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) {
    return apiError("FORBIDDEN", "Access denied.", 403);
  }

  const logs = await db.select().from(serverLogs).where(eq(serverLogs.serverId, id))
    .orderBy(sql`${serverLogs.createdAt} DESC`).limit(200);

  return apiSuccess(logs);
}
