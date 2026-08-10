import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError } from "@/lib/api-auth";
import { readRaw, pathStat } from "@/lib/filesystem";
import * as path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:files");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return apiError("FORBIDDEN", "Access denied.", 403);

  const url = new URL(req.url);
  const p = url.searchParams.get("path");
  if (!p) return apiError("MISSING_FIELDS", "path required.", 400);

  try {
    const stat = await pathStat(id, p);
    if (stat.isDirectory) return apiError("INVALID_TYPE", "Cannot download a directory.", 400);
    const buf = await readRaw(id, p);
    const filename = path.basename(p);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (err) {
    return apiError("FS_ERROR", (err as Error).message, 400);
  }
}
