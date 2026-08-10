import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSession } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    await ensureBootstrapped();
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Username and password are required." } },
        { status: 400 }
      );
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

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
    console.error("Login error:", err);
    const msg = (err as Error)?.message || "unknown";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: `Login failed: ${msg.substring(0, 200)}` } },
      { status: 500 }
    );
  }
}
