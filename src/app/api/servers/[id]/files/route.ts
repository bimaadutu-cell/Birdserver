import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess } from "@/lib/api-auth";
import { listDir, readFileContents, writeFileContents, createFolder, deletePath, renamePath } from "@/lib/filesystem";

async function checkAccess(req: NextRequest, id: string) {
  const auth = await authenticate(req, "servers:files");
  if (!auth.success) return { ok: false, resp: apiError(auth.error!.code, auth.error!.message, auth.statusCode!) };
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return { ok: false, resp: apiError("RESOURCE_NOT_FOUND", "Server not found.", 404) };
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return { ok: false, resp: apiError("FORBIDDEN", "Access denied.", 403) };
  return { ok: true as const, server: server[0] };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await checkAccess(req, id);
  if (!check.ok) return check.resp;

  const url = new URL(req.url);
  const p = url.searchParams.get("path") || "/";
  const action = url.searchParams.get("action");

  try {
    if (action === "read") {
      const content = await readFileContents(id, p);
      return apiSuccess({ path: p, content });
    }
    const files = await listDir(id, p);
    return apiSuccess({ path: p, files });
  } catch (err) {
    return apiError("FS_ERROR", (err as Error).message, 400);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await checkAccess(req, id);
  if (!check.ok) return check.resp;

  const body = await req.json();
  const { action, path: p, content, from, to, name } = body;

  try {
    if (action === "write") {
      if (!p) return apiError("MISSING_FIELDS", "path required.", 400);
      await writeFileContents(id, p, content || "");
      return apiSuccess({ path: p });
    }
    if (action === "mkdir") {
      if (!p) return apiError("MISSING_FIELDS", "path required.", 400);
      await createFolder(id, p);
      return apiSuccess({ path: p });
    }
    if (action === "rename") {
      if (!from || !to) return apiError("MISSING_FIELDS", "from and to required.", 400);
      await renamePath(id, from, to);
      return apiSuccess({ from, to });
    }
    return apiError("INVALID_ACTION", "Unknown action.", 400);
  } catch (err) {
    return apiError("FS_ERROR", (err as Error).message, 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await checkAccess(req, id);
  if (!check.ok) return check.resp;

  const url = new URL(req.url);
  const p = url.searchParams.get("path");
  if (!p) return apiError("MISSING_FIELDS", "path required.", 400);

  try {
    await deletePath(id, p);
    return apiSuccess({ deleted: p });
  } catch (err) {
    return apiError("FS_ERROR", (err as Error).message, 400);
  }
}
