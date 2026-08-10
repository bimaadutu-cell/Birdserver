import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSession } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { ensureMigrated, withSchemaSafety } from "@/lib/migrate";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    // Guarantee schema + admin user exist BEFORE any query
    await ensureMigrated();
    await ensureBootstrapped();

    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Username and password are required." } },
        { status: 400 }
      );
    }

    // Wrap the query so if the schema is still stale we auto-migrate + retry
    const userResult = await withSchemaSafety(() =>
      db.select().from(users).where(eq(users.username, username)).limit(1)
    );

    if (!userResult.length) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password." } },
        { status: 401 }
      );
    }

    const user = userResult[0];

    if (user.suspended) {
      return NextResponse.json(
        { success: false, error: { code: "ACCOUNT_SUSPENDED", message: "Your account has been suspended." } },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password." } },
        { status: 401 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const ua = req.headers.get("user-agent") || "";

    const { sessionId, expiresAt } = await createSession(user.id, ip, ua);

    try {
      await db.insert(auditLogs).values({
        userId: user.id,
        action: "LOGIN",
        ipAddress: ip,
        userAgent: ua,
        metadata: { username: user.username },
      });
    } catch { /* ignore */ }

    const cookieStore = await cookies();
    cookieStore.set("birdserver_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    });
  } catch (err) {
    // Never expose raw PostgreSQL/Drizzle SQL to the browser.
    console.error("[Login] failed:", err);

    const message = err instanceof Error ? err.message : "";
    const databaseProblem =
      /DATABASE_URL|postgres|database|relation|column|schema|connect|ECONNREFUSED|ENOTFOUND/i.test(message);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: databaseProblem ? "DATABASE_NOT_READY" : "LOGIN_FAILED",
          message: databaseProblem
            ? "Database belum siap. Pastikan PostgreSQL Railway terhubung dan DATABASE_URL tersedia, lalu tunggu deployment selesai."
            : "Login gagal karena kesalahan server. Silakan coba lagi.",
        },
      },
      { status: 500 }
    );
  }
}
