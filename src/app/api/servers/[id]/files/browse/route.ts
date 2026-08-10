/**
 * GET /api/servers/:id/files/browse?target=<serverId|system>&path=<relative>
 *
 * Lists directory contents for another server (or the shared system dir) so the
 * Move dialog can pick a destination. Admin only.
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs/promises";
import * as path from "path";
import { authenticate, apiError, apiSuccess } from "@/lib/api-auth";
import { ensureServerDir, CONTAINERS_ROOT } from "@/lib/process-manager";

const SYSTEM_ROOT = path.join(CONTAINERS_ROOT, "__system__");

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:files");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const src = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!src.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);

  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && src[0].ownerId !== auth.user?.id) {
    return apiError("FORBIDDEN", "Access denied.", 403);
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("target") || id;
  const relPath = url.searchParams.get("path") || "/";

  // Only admin can browse cross-server / system
  if (!isAdmin && target !== id) {
    return apiError("FORBIDDEN", "Only ADMIN may browse other servers.", 403);
  }

  // Resolve root
  let root: string;
  let rootLabel: string;
  if (target === "system" || target === "__system__") {
    await fs.mkdir(SYSTEM_ROOT, { recursive: true });
    root = SYSTEM_ROOT;
    rootLabel = "System (shared)";
  } else {
    const dstSrv = await db.select().from(servers).where(eq(servers.id, target)).limit(1);
    if (!dstSrv.length) return apiError("RESOURCE_NOT_FOUND", "Target not found.", 404);
    root = await ensureServerDir(target);
    rootLabel = dstSrv[0].name;
  }

  const dir = path.resolve(root, relPath.replace(/^\/+/, ""));
  if (!dir.startsWith(root)) return apiError("VALIDATION_ERROR", "Path escapes root.", 400);

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      try {
        const stat = await fs.stat(path.join(dir, entry.name));
        files.push({
          name: entry.name,
          path: path.posix.join(relPath, entry.name).replace(/\\/g, "/"),
          isDirectory: entry.isDirectory(),
          size: stat.size,
          modified: stat.mtimeMs,
        });
      } catch {}
    }
    files.sort((a, b) => (a.isDirectory !== b.isDirectory ? (a.isDirectory ? -1 : 1) : a.name.localeCompare(b.name)));

    // Also list all servers + system for dropdown
    const allServers = isAdmin
      ? await db.select({ id: servers.id, name: servers.name }).from(servers)
      : [{ id, name: src[0].name }];

    return apiSuccess({
      target,
      targetLabel: rootLabel,
      path: relPath,
      files,
      availableTargets: [
        ...(isAdmin ? [{ id: "system", name: "System (shared /system)" }] : []),
        ...allServers,
      ],
    });
  } catch (err) {
    return apiError("FS_ERROR", (err as Error).message, 400);
  }
}
