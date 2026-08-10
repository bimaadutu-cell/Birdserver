import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess, logAudit } from "@/lib/api-auth";
import { isRunning, killServer } from "@/lib/process-manager";
import { deletePath } from "@/lib/filesystem";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:read");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return apiError("FORBIDDEN", "Access denied.", 403);

  return apiSuccess({ ...server[0], running: isRunning(id) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:update");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return apiError("FORBIDDEN", "Access denied.", 403);

  const body = await req.json();
  const allowed = ["name", "description", "startupCommand", "nodeVersion", "dockerImage", "restartPolicy"];
  const adminOnly = ["ramMb", "cpuPercent", "storageMb", "ownerId", "nodeId", "suspended"];

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) if (key in body) updateData[key] = body[key];
  if (isAdmin) for (const key of adminOnly) if (key in body) updateData[key] = body[key];

  const [updated] = await db.update(servers).set(updateData).where(eq(servers.id, id)).returning();

  await logAudit({
    userId: auth.user?.id,
    apiKeyId: auth.apiKey?.id,
    action: "UPDATE",
    resource: "server",
    resourceId: id,
    endpoint: `/api/servers/${id}`,
    method: "PATCH",
    statusCode: 200,
  });

  return apiSuccess(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:delete");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return apiError("FORBIDDEN", "Access denied.", 403);

  // Stop process if running
  if (isRunning(id)) {
    try { await killServer(id); } catch {}
  }

  await db.delete(servers).where(eq(servers.id, id));

  // Clean up files (best effort)
  try { await deletePath(id, "/"); } catch {}

  await logAudit({
    userId: auth.user?.id,
    apiKeyId: auth.apiKey?.id,
    action: "DELETE",
    resource: "server",
    resourceId: id,
    endpoint: `/api/servers/${id}`,
    method: "DELETE",
    statusCode: 200,
  });

  return apiSuccess({ deleted: true });
}
