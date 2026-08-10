import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, resellerQuotas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  const reseller = await db.select({ user: users, quota: resellerQuotas })
    .from(users).leftJoin(resellerQuotas, eq(users.id, resellerQuotas.resellerId))
    .where(eq(users.id, id)).limit(1);

  if (!reseller.length || reseller[0].user.role !== "RESELLER") {
    return NextResponse.json({ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "Reseller not found." } }, { status: 404 });
  }

  const { passwordHash, ...safeUser } = reseller[0].user;
  return NextResponse.json({ success: true, data: { ...safeUser, quota: reseller[0].quota } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { username, email, password, firstName, lastName, suspended, maxUsers, maxServers, maxRamMb, maxCpuPercent, maxStorageMb } = body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (username) updateData.username = username;
  if (email) updateData.email = email;
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (suspended !== undefined) updateData.suspended = suspended;
  if (password) updateData.passwordHash = await hashPassword(password);

  await db.update(users).set(updateData).where(eq(users.id, id));

  // Update quota if provided
  if (maxUsers !== undefined || maxServers !== undefined || maxRamMb !== undefined || maxCpuPercent !== undefined || maxStorageMb !== undefined) {
    const quotaUpdate: Record<string, number> = {};
    if (maxUsers !== undefined) quotaUpdate.maxUsers = maxUsers;
    if (maxServers !== undefined) quotaUpdate.maxServers = maxServers;
    if (maxRamMb !== undefined) quotaUpdate.maxRamMb = maxRamMb;
    if (maxCpuPercent !== undefined) quotaUpdate.maxCpuPercent = maxCpuPercent;
    if (maxStorageMb !== undefined) quotaUpdate.maxStorageMb = maxStorageMb;

    const existing = await db.select().from(resellerQuotas).where(eq(resellerQuotas.resellerId, id)).limit(1);
    if (existing.length) {
      await db.update(resellerQuotas).set(quotaUpdate).where(eq(resellerQuotas.resellerId, id));
    } else {
      await db.insert(resellerQuotas).values({ resellerId: id, ...quotaUpdate });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
