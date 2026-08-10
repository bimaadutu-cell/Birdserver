/**
 * POST /api/servers/:id/files/move
 * Body: { from: string[], to: string, toServerId?: string }
 *
 * Moves one or more files/folders. If `toServerId` is provided (and different
 * from the source server), the files are relocated across container roots.
 * `from` paths are relative to the source server; `to` is relative to the
 * destination server (or same server if `toServerId` omitted).
 *
 * Special value: `to = "system"` or `toServerId = "system"` moves into the
 * shared BirdServer system directory (accessible by all servers via /system).
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs/promises";
import * as path from "path";
import { authenticate, apiError, apiSuccess } from "@/lib/api-auth";
import { getServerRoot, ensureServerDir, CONTAINERS_ROOT } from "@/lib/process-manager";
import { safePath } from "@/lib/filesystem";

const SYSTEM_ROOT = path.join(CONTAINERS_ROOT, "__system__");

async function ensureSystemDir(): Promise<string> {
  await fs.mkdir(SYSTEM_ROOT, { recursive: true });
  return SYSTEM_ROOT;
}

// Resolves either a real server ID or the special "system" identifier to a directory.
async function resolveRoot(id: string): Promise<string> {
  if (id === "system" || id === "__system__") return await ensureSystemDir();
  return await ensureServerDir(id);
}

function safeInRoot(root: string, rel: string): string {
  const target = path.resolve(root, rel.replace(/^\/+/, ""));
  if (!target.startsWith(root)) throw new Error("Path traversal denied");
  return target;
}

async function moveOne(srcAbs: string, dstAbs: string) {
  await fs.mkdir(path.dirname(dstAbs), { recursive: true });
  try {
    await fs.rename(srcAbs, dstAbs);
  } catch (err) {
    // Cross-device: fall back to copy + remove
    const errCode = (err as NodeJS.ErrnoException).code;
    if (errCode === "EXDEV") {
      await fs.cp(srcAbs, dstAbs, { recursive: true, force: true });
      await fs.rm(srcAbs, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:files");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);

  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) {
    return apiError("FORBIDDEN", "Access denied.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const fromList = Array.isArray(body.from) ? body.from as string[] : (body.from ? [String(body.from)] : []);
  const to = String(body.to || "/").trim();
  const toServerId = body.toServerId ? String(body.toServerId).trim() : id;

  if (fromList.length === 0) return apiError("MISSING_FIELDS", "'from' (path or paths) is required.", 400);

  // Non-admin cannot cross into another server or into the system dir
  if (!isAdmin && toServerId !== id) {
    return apiError("FORBIDDEN", "Only ADMIN may move files between servers or into the system directory.", 403);
  }

  // Verify destination server exists (if not system)
  if (toServerId !== "system" && toServerId !== id) {
    const dstSrv = await db.select({ id: servers.id }).from(servers).where(eq(servers.id, toServerId)).limit(1);
    if (!dstSrv.length) return apiError("RESOURCE_NOT_FOUND", "Destination server not found.", 404);
  }

  const srcRoot = await resolveRoot(id);
  const dstRoot = await resolveRoot(toServerId);

  const results: { from: string; to: string; ok: boolean; error?: string }[] = [];

  for (const rawFrom of fromList) {
    try {
      const srcAbs = safeInRoot(srcRoot, rawFrom);
      const basename = path.basename(rawFrom);
      // If `to` ends with `/` or the last component doesn't include the source basename,
      // append the source basename to preserve original name.
      let dstRel = to;
      if (dstRel === "" || dstRel === "/" || dstRel.endsWith("/")) {
        dstRel = path.posix.join(dstRel || "/", basename);
      } else {
        // If moving multiple items into a specific path, treat `to` as directory.
        if (fromList.length > 1) dstRel = path.posix.join(dstRel, basename);
      }
      const dstAbs = safeInRoot(dstRoot, dstRel);

      // Prevent moving into itself
      if (srcAbs === dstAbs) {
        results.push({ from: rawFrom, to: dstRel, ok: false, error: "source and destination are identical" });
        continue;
      }
      // Prevent moving parent into child (would create infinite loop)
      if (dstAbs.startsWith(srcAbs + path.sep)) {
        results.push({ from: rawFrom, to: dstRel, ok: false, error: "cannot move a directory into itself" });
        continue;
      }

      await moveOne(srcAbs, dstAbs);
      results.push({ from: rawFrom, to: dstRel, ok: true });
    } catch (err) {
      results.push({ from: rawFrom, to, ok: false, error: (err as Error).message });
    }
  }

  const okCount = results.filter(r => r.ok).length;
  return apiSuccess({
    moved: okCount,
    total: results.length,
    destination: { serverId: toServerId, path: to },
    results,
  });
}
