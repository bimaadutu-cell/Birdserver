import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { authenticate, apiError, apiSuccess, logAudit } from "@/lib/api-auth";
import { ensureMigrated, withSchemaSafety } from "@/lib/migrate";
import { ensureBootstrapped } from "@/lib/bootstrap";

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    await ensureBootstrapped();

    const auth = await authenticate(req, "users:read");
    if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

    const isReseller = auth.user?.role === "RESELLER" && !auth.scopes.includes("admin:*");
    const query = isReseller
      ? db.select({
          id: users.id, username: users.username, email: users.email, role: users.role,
          firstName: users.firstName, lastName: users.lastName, suspended: users.suspended, createdAt: users.createdAt,
        }).from(users).where(eq(users.resellerId, auth.user!.id)).orderBy(sql`${users.createdAt} DESC`)
      : db.select({
          id: users.id, username: users.username, email: users.email, role: users.role,
          firstName: users.firstName, lastName: users.lastName, suspended: users.suspended, createdAt: users.createdAt,
        }).from(users).orderBy(sql`${users.createdAt} DESC`);

    const allUsers = await withSchemaSafety(() => query);
    return apiSuccess(allUsers);
  } catch (err) {
    console.error("[GET /api/users] fatal:", err);
    return apiError("SERVER_ERROR", `Failed to list users: ${(err as Error).message.substring(0, 200)}`, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureMigrated();
    await ensureBootstrapped();

    const auth = await authenticate(req, "users:create");
    if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return apiError("INVALID_JSON", "Request body must be valid JSON.", 400); }

    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const firstName = body.firstName ? String(body.firstName) : "";
    const lastName = body.lastName ? String(body.lastName) : "";
    const role = String(body.role || "USER").toUpperCase();

    if (!username || !email || !password) {
      return apiError("MISSING_FIELDS", "username, email, and password are required.", 400);
    }
    if (password.length < 6) {
      return apiError("VALIDATION_ERROR", "Password must be at least 6 characters.", 400);
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return apiError("VALIDATION_ERROR", "Username may only contain letters, numbers, dot, underscore and dash.", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError("VALIDATION_ERROR", "Invalid email format.", 400);
    }
    if (!["USER", "RESELLER", "ADMIN"].includes(role)) {
      return apiError("VALIDATION_ERROR", "role must be USER, RESELLER, or ADMIN.", 400);
    }

    const isFullAdmin = auth.scopes.includes("admin:*");
    if (auth.user?.role === "RESELLER" && role !== "USER") {
      return apiError("FORBIDDEN", "Resellers may only create USER accounts.", 403);
    }
    if (role === "ADMIN" && !isFullAdmin) {
      return apiError("INSUFFICIENT_SCOPE", "Creating an ADMIN requires admin:* scope.", 403);
    }

    // Duplicate checks (with retry on schema drift)
    const existingUsername = await withSchemaSafety(() =>
      db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1)
    );
    if (existingUsername.length) return apiError("USERNAME_TAKEN", `Username '${username}' is already taken.`, 409);

    const existingEmail = await withSchemaSafety(() =>
      db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    );
    if (existingEmail.length) return apiError("EMAIL_TAKEN", `Email '${email}' is already registered.`, 409);

    const passwordHash = await hashPassword(password);
    const id = uuidv4();

    const [newUser] = await withSchemaSafety(() =>
      db.insert(users).values({
        id, username, email, passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role as "USER" | "RESELLER" | "ADMIN",
        resellerId: auth.user?.role === "RESELLER" ? auth.user.id : null,
      }).returning({
        id: users.id, username: users.username, email: users.email, role: users.role,
        firstName: users.firstName, lastName: users.lastName, createdAt: users.createdAt,
      })
    );

    // Best-effort audit
    logAudit({
      userId: auth.user?.id, apiKeyId: auth.apiKey?.id,
      action: "CREATE", resource: "user", resourceId: id,
      endpoint: "/api/users", method: "POST", statusCode: 201,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      metadata: { username, role },
    }).catch(() => {});

    return apiSuccess({
      ...newUser,
      credentials: {
        username, password,
        loginUrl: `${req.nextUrl.origin}/login`,
      },
    }, 201);
  } catch (err) {
    console.error("[POST /api/users] fatal:", err);
    return apiError("SERVER_ERROR", `Failed to create user: ${(err as Error).message.substring(0, 200)}`, 500);
  }
}
