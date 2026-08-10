import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess } from "@/lib/api-auth";
import { getLogs, writeStdin, attachListener, LogEntry } from "@/lib/process-manager";

export const dynamic = "force-dynamic";

async function checkAccess(req: NextRequest, id: string) {
  const auth = await authenticate(req, "servers:console");
  if (!auth.success) return { ok: false, resp: apiError(auth.error!.code, auth.error!.message, auth.statusCode!) };
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return { ok: false, resp: apiError("RESOURCE_NOT_FOUND", "Server not found.", 404) };
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return { ok: false, resp: apiError("FORBIDDEN", "Access denied.", 403) };
  return { ok: true as const };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await checkAccess(req, id);
  if (!check.ok) return check.resp;

  const url = new URL(req.url);
  const stream = url.searchParams.get("stream") === "1";
  const sinceSeq = url.searchParams.get("since") ? Number(url.searchParams.get("since")) : undefined;

  if (!stream) {
    const logs = getLogs(id, 500, sinceSeq);
    return apiSuccess({ logs });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      let lastSeq = sinceSeq ?? -1;
      const send = (entry: LogEntry) => {
        if (entry.seq <= lastSeq) return;
        lastSeq = entry.seq;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
        } catch {}
      };
      // Send buffered logs first (only entries newer than what client already has)
      for (const entry of getLogs(id, 500, sinceSeq)) send(entry);
      const detach = attachListener(id, send);
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { clearInterval(heartbeat); }
      }, 15000);
      const abort = () => {
        clearInterval(heartbeat);
        detach();
        try { controller.close(); } catch {}
      };
      req.signal.addEventListener("abort", abort);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await checkAccess(req, id);
  if (!check.ok) return check.resp;

  const { input } = await req.json();
  if (typeof input !== "string") return apiError("MISSING_FIELDS", "input required.", 400);

  const ok = writeStdin(id, input);
  if (!ok) return apiError("NOT_RUNNING", "Server is not running or stdin unavailable.", 400);

  return apiSuccess({ sent: true });
}
