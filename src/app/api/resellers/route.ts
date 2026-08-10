import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, resellerQuotas } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession, hashPassword } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const resellers = await db
    .select({ user: users, quota: resellerQuotas })
    .from(users)
    .leftJoin(resellerQuotas, eq(users.id, resellerQuotas.resellerId))
    .where(eq(users.role, "RESELLER"));

  return NextResponse.json({ success: true, data: resellers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const body = await req.json();
  const { username, email, password, firstName, lastName, maxUsers, maxServers, maxRamMb, maxCpuPercent, maxStorageMb } = body;

  if (!username || !email || !password) {
    return NextResponse.json({ success: false, error: { code: "MISSING_FIELDS", message: "username, email, password are required." } }, { status: 400 });
  }

  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing.length) {
    return NextResponse.json({ success: false, error: { code: "USERNAME_TAKEN", message: "Username already taken." } }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const id = uuidv4();

  await db.insert(users).values({
    id,
    username,
    email,
    passwordHash,
    role: "RESELLER",
    firstName: firstName || null,
    lastName: lastName || null,
  });

  await db.insert(resellerQuotas).values({
    resellerId: id,
    maxUsers: maxUsers || 10,
    maxServers: maxServers || 20,
    maxRamMb: maxRamMb || 10240,
    maxCpuPercent: maxCpuPercent || 200,
    maxStorageMb: maxStorageMb || 51200,
  });

  return NextResponse.json({ success: true, data: { id, username, email, role: "RESELLER" } }, { status: 201 });
}
