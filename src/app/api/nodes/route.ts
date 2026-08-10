import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { nodes } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const allNodes = await db.select().from(nodes);
  return NextResponse.json({ success: true, data: allNodes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const body = await req.json();
  const { name, description, fqdn, port, totalRamMb, totalCpuPercent, totalStorageMb, dockerSocket } = body;

  if (!name || !fqdn) {
    return NextResponse.json({ success: false, error: { code: "MISSING_FIELDS", message: "name and fqdn are required." } }, { status: 400 });
  }

  const id = uuidv4();
  const [node] = await db.insert(nodes).values({
    id,
    name,
    description: description || null,
    fqdn,
    port: port || 8080,
    totalRamMb: totalRamMb || 8192,
    totalCpuPercent: totalCpuPercent || 400,
    totalStorageMb: totalStorageMb || 102400,
    dockerSocket: dockerSocket || "/var/run/docker.sock",
  }).returning();

  return NextResponse.json({ success: true, data: node }, { status: 201 });
}
