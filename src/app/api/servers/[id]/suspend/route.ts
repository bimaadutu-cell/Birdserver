import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servers, serverLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await params;
  await db.update(servers).set({ suspended: true, status: "STOPPED", updatedAt: new Date() }).where(eq(servers.id, id));
  await db.insert(serverLogs).values({ serverId: id, level: "warn", message: `[BirdServer] Server suspended by ${session.user.username}.` });
  return NextResponse.json({ success: true });
}
