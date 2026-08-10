import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  const [updated] = await db.update(apiKeys)
    .set({ status: "REVOKED", revokedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning({ id: apiKeys.id });

  if (!updated) return NextResponse.json({ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "API key not found." } }, { status: 404 });

  try {
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: "API_KEY_REVOKE",
      resource: "api_key",
      resourceId: id,
    });
  } catch {}

  return NextResponse.json({ success: true });
}
