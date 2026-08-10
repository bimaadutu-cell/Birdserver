import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  const node = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1);
  if (!node.length) return NextResponse.json({ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "Node not found." } }, { status: 404 });

  return NextResponse.json({ success: true, data: node[0] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  const allowed = ["name", "description", "fqdn", "port", "status", "totalRamMb", "totalCpuPercent", "totalStorageMb", "dockerSocket"];
  for (const key of allowed) {
    if (key in body) updateData[key] = body[key];
  }

  const [updated] = await db.update(nodes).set(updateData).where(eq(nodes.id, id)).returning();
  if (!updated) return NextResponse.json({ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "Node not found." } }, { status: 404 });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  await db.delete(nodes).where(eq(nodes.id, id));
  return NextResponse.json({ success: true });
}
