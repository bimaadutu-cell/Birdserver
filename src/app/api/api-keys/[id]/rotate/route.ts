import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, generateApiKey } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;

  // Get the old key metadata
  const oldKey = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (!oldKey.length) return NextResponse.json({ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "API key not found." } }, { status: 404 });

  // Revoke old key
  await db.update(apiKeys).set({ status: "REVOKED", revokedAt: new Date() }).where(eq(apiKeys.id, id));

  // Generate new key with same settings
  const { key, prefix, hash } = await generateApiKey();
  const newId = uuidv4();

  await db.insert(apiKeys).values({
    id: newId,
    name: oldKey[0].name,
    description: oldKey[0].description,
    prefix,
    keyHash: hash,
    ownerId: oldKey[0].ownerId,
    scopes: oldKey[0].scopes as string[],
    status: "ACTIVE",
    expiresAt: oldKey[0].expiresAt,
    rateLimitPerMinute: oldKey[0].rateLimitPerMinute,
  });

  try {
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: "API_KEY_ROTATE",
      resource: "api_key",
      resourceId: id,
      metadata: { newKeyId: newId },
    });
  } catch {}

  return NextResponse.json({
    success: true,
    data: {
      oldKeyId: id,
      newKeyId: newId,
      key, // Only shown once!
      prefix,
    },
  });
}
