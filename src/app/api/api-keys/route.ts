import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, users, auditLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession, generateApiKey } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      description: apiKeys.description,
      prefix: apiKeys.prefix,
      status: apiKeys.status,
      scopes: apiKeys.scopes,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      ownerUsername: users.username,
    })
    .from(apiKeys)
    .leftJoin(users, eq(apiKeys.ownerId, users.id))
    .orderBy(sql`${apiKeys.createdAt} DESC`);

  return NextResponse.json({ success: true, data: keys });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const body = await req.json();
  const { name, description, ownerId, scopes, expiresAt, rateLimitPerMinute } = body;

  if (!name || !ownerId || !scopes || !Array.isArray(scopes)) {
    return NextResponse.json({ success: false, error: { code: "MISSING_FIELDS", message: "name, ownerId, and scopes are required." } }, { status: 400 });
  }

  // Verify owner exists
  const owner = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
  if (!owner.length) {
    return NextResponse.json({ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "Owner not found." } }, { status: 404 });
  }

  // Prevent non-admin from getting admin:* scope
  if (owner[0].role !== "ADMIN" && scopes.includes("admin:*")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "admin:* scope can only be assigned to ADMIN users." } }, { status: 403 });
  }

  const { key, prefix, hash } = await generateApiKey();
  const id = uuidv4();

  await db.insert(apiKeys).values({
    id,
    name,
    description: description || null,
    prefix,
    keyHash: hash,
    ownerId,
    scopes,
    status: "ACTIVE",
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    rateLimitPerMinute: rateLimitPerMinute || 60,
  });

  // Audit log
  try {
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: "API_KEY_CREATE",
      resource: "api_key",
      resourceId: id,
      metadata: { name, ownerId, scopes },
    });
  } catch {}

  return NextResponse.json({
    success: true,
    data: {
      id,
      name,
      prefix,
      key, // Only returned once!
      scopes,
    },
  }, { status: 201 });
}
