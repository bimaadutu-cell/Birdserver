import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess } from "@/lib/api-auth";
import { extractZip } from "@/lib/filesystem";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:files");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return apiError("FORBIDDEN", "Access denied.", 403);

  const { path: zipPath, to } = await req.json();
  if (!zipPath) return apiError("MISSING_FIELDS", "path (zip) required.", 400);

  try {
    const result = await extractZip(id, zipPath, to || "/");
    return apiSuccess(result);
  } catch (err) {
    return apiError("EXTRACT_ERROR", (err as Error).message, 400);
  }
}
