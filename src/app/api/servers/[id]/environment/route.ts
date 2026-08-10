import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers, serverEnvironment } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess } from "@/lib/api-auth";

async function checkAccess(req: NextRequest, id: string) {
  const auth = await authenticate(req, "servers:environment");
  if (!auth.success) return { ok: false as const, resp: apiError(auth.error!.code, auth.error!.message, auth.statusCode!) };
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return { ok: false as const, resp: apiError("RESOURCE_NOT_FOUND", "Server not found.", 404) };
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return { ok: false as const, resp: apiError("FORBIDDEN", "Access denied.", 403) };
  return { ok: true as const };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await checkAccess(req, id);
  if (!check.ok) return check.resp;

  const envVars = await db.select().from(serverEnvironment).where(eq(serverEnvironment.serverId, id));
  return apiSuccess(envVars.map(e => ({ ...e, value: e.hidden ? "\u2022\u2022\u2022\u2022\u2022\u2022" : e.value })));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await checkAccess(req, id);
  if (!check.ok) return check.resp;

  const { vars } = await req.json();
  await db.delete(serverEnvironment).where(eq(serverEnvironment.serverId, id));

  if (Array.isArray(vars) && vars.length > 0) {
    await db.insert(serverEnvironment).values(
      vars.map((v: { key: string; value: string; hidden?: boolean }) => ({
        serverId: id,
        key: v.key,
        value: v.value,
        hidden: !!v.hidden,
      }))
    );
  }

  return apiSuccess({ count: (vars || []).length });
}
