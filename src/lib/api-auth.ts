import { NextRequest } from "next/server";
import { db } from "@/db";
import { apiKeys, users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashApiKey, getSession } from "./auth";
import { ensureBootstrapped } from "./bootstrap";

export interface AuthContext {
  success: boolean;
  via: "session" | "api_key" | null;
  user?: typeof users.$inferSelect;
  apiKey?: typeof apiKeys.$inferSelect;
  scopes: string[];
  error?: { code: string; message: string };
  statusCode?: number;
}

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Scope sets granted implicitly to session users based on their role.
// Note: session-based access is additionally checked by ownership in each route.
export const ROLE_SCOPES: Record<string, string[]> = {
  ADMIN: ["admin:*"],
  RESELLER: [
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    "servers:read",
    "servers:create",
    "servers:update",
    "servers:delete",
    "servers:start",
    "servers:stop",
    "servers:restart",
    "servers:kill",
    "servers:console",
    "servers:files",
    "servers:environment",
    "resources:read",
    "logs:read",
  ],
  USER: [
    "servers:read",
    "servers:start",
    "servers:stop",
    "servers:restart",
    "servers:kill",
    "servers:console",
    "servers:files",
    "servers:environment",
    "logs:read",
  ],
};

export function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes("admin:*") || scopes.includes(required)) return true;
  const [resource] = required.split(":");
  return scopes.includes(`${resource}:*`);
}

/**
 * Unified authenticator. Accepts either an active session cookie
 * or an Authorization: Bearer <api_key> header.
 */
export async function authenticate(req: NextRequest, requiredScope?: string): Promise<AuthContext> {
  await ensureBootstrapped();
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");

  // ---- API key auth ----
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (!token.startsWith("bsk_live_")) {
      return { success: false, via: null, scopes: [], error: { code: "INVALID_API_KEY", message: "Invalid API key format." }, statusCode: 401 };
    }

    const keyHash = hashApiKey(token);
    const keyResult = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);

    if (!keyResult.length) {
      return { success: false, via: null, scopes: [], error: { code: "INVALID_API_KEY", message: "API key not found." }, statusCode: 401 };
    }

    const key = keyResult[0];

    if (key.status === "REVOKED") {
      return { success: false, via: null, scopes: [], error: { code: "REVOKED_API_KEY", message: "This API key has been revoked." }, statusCode: 401 };
    }

    if (key.status === "EXPIRED" || (key.expiresAt && new Date(key.expiresAt) < new Date())) {
      if (key.status !== "EXPIRED") {
        try { await db.update(apiKeys).set({ status: "EXPIRED" }).where(eq(apiKeys.id, key.id)); } catch {}
      }
      return { success: false, via: null, scopes: [], error: { code: "EXPIRED_API_KEY", message: "This API key has expired." }, statusCode: 401 };
    }

    // Rate limit
    const now = Date.now();
    const window = 60 * 1000;
    const existing = rateLimitStore.get(key.id);
    if (existing && now - existing.windowStart < window) {
      if (existing.count >= key.rateLimitPerMinute) {
        return { success: false, via: null, scopes: [], error: { code: "RATE_LIMITED", message: `Rate limit exceeded (max ${key.rateLimitPerMinute} req/min).` }, statusCode: 429 };
      }
      existing.count++;
    } else {
      rateLimitStore.set(key.id, { count: 1, windowStart: now });
    }

    const scopes = (key.scopes as string[]) || [];
    if (requiredScope && !hasScope(scopes, requiredScope)) {
      return { success: false, via: null, scopes, error: { code: "INSUFFICIENT_SCOPE", message: `Missing required scope: ${requiredScope}` }, statusCode: 403 };
    }

    db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id)).catch(() => {});

    const owner = await db.select().from(users).where(eq(users.id, key.ownerId)).limit(1);

    return { success: true, via: "api_key", apiKey: key, user: owner[0], scopes };
  }

  // ---- Session auth ----
  const session = await getSession();
  if (!session) {
    return { success: false, via: null, scopes: [], error: { code: "UNAUTHORIZED", message: "Authentication required." }, statusCode: 401 };
  }

  const scopes = ROLE_SCOPES[session.user.role] || [];

  if (requiredScope && !hasScope(scopes, requiredScope)) {
    return {
      success: false,
      via: "session",
      user: session.user,
      scopes,
      error: { code: "FORBIDDEN", message: `Your role (${session.user.role}) does not have permission: ${requiredScope}` },
      statusCode: 403,
    };
  }

  return { success: true, via: "session", user: session.user, scopes };
}

export function apiError(code: string, message: string, statusCode = 400) {
  return Response.json({ success: false, error: { code, message } }, { status: statusCode });
}

export function apiSuccess<T>(data: T, statusCode = 200) {
  return Response.json({ success: true, data }, { status: statusCode });
}

export async function logAudit(params: {
  userId?: string;
  apiKeyId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      apiKeyId: params.apiKeyId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      ipAddress: params.ipAddress,
      metadata: params.metadata as Record<string, unknown>,
    });
  } catch {}
}
