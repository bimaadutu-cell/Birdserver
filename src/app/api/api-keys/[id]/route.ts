import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  const key = await db.select({
    id: apiKeys.id,
    name: apiKeys.name,
    description: apiKeys.description,
    prefix: apiKeys.prefix,
    ownerId: apiKeys.ownerId,
    scopes: apiKeys.scopes,
    status: apiKeys.status,
    rateLimitPerMinute: apiKeys.rateLimitPerMinute,
    createdAt: apiKeys.createdAt,
    expiresAt: apiKeys.expiresAt,
    lastUsedAt: apiKeys.lastUsedAt,
    revokedAt: apiKeys.revokedAt,
    // Never return keyHash
  }).from(apiKeys).where(eq(apiKeys.id, id)).limit(1);

  if (!key.length) return NextResponse.json({ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "API key not found." } }, { status: 404 });

  return NextResponse.json({ success: true, data: key[0] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, description, ownerId, scopes, status, expiresAt, rateLimitPerMinute } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description || null;
  if (ownerId !== undefined) updateData.ownerId = ownerId;
  if (scopes !== undefined) updateData.scopes = scopes;
  if (status !== undefined) updateData.status = status;
  if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (rateLimitPerMinute !== undefined) updateData.rateLimitPerMinute = rateLimitPerMinute;

  const [updated] = await db.update(apiKeys).set(updateData).where(eq(apiKeys.id, id)).returning({
    id: apiKeys.id,
    name: apiKeys.name,
    status: apiKeys.status,
    scopes: apiKeys.scopes,
  });

  if (!updated) return NextResponse.json({ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "API key not found." } }, { status: 404 });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  await db.delete(apiKeys).where(eq(apiKeys.id, id));

  try {
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: "API_KEY_DELETE",
      resource: "api_key",
      resourceId: id,
    });
  } catch {}

  return NextResponse.json({ success: true });
}
