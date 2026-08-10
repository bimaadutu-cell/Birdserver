import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers, nodes, users, serverLogs, serverEnvironment } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticate, apiError, apiSuccess, logAudit } from "@/lib/api-auth";
import { ensureServerDir, DEFAULT_STARTUP_COMMAND } from "@/lib/process-manager";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, "servers:read");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  // Non-admin: only own servers
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  const query = isAdmin
    ? db.select().from(servers).orderBy(sql`${servers.createdAt} DESC`)
    : db.select().from(servers).where(eq(servers.ownerId, auth.user!.id)).orderBy(sql`${servers.createdAt} DESC`);

  const allServers = await query;
  return apiSuccess(allServers);
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req, "servers:create");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const body = await req.json();
  let { name, description, ownerId, ownerUsername, nodeId, nodeVersion, startupCommand, ramMb, cpuPercent, storageMb, dockerImage, restartPolicy } = body;

  if (!name) return apiError("MISSING_FIELDS", "Field 'name' is required.", 400);

  // Resolve owner: allow ownerUsername for convenience (bot integration)
  if (!ownerId && ownerUsername) {
    const owner = await db.select({ id: users.id }).from(users).where(eq(users.username, ownerUsername)).limit(1);
    if (!owner.length) return apiError("RESOURCE_NOT_FOUND", `Owner username '${ownerUsername}' not found.`, 404);
    ownerId = owner[0].id;
  }
  if (!ownerId) ownerId = auth.user?.id;
  if (!ownerId) return apiError("MISSING_FIELDS", "ownerId or ownerUsername required.", 400);

  // Resolve node: use first available if not provided
  if (!nodeId) {
    const firstNode = await db.select({ id: nodes.id }).from(nodes).limit(1);
    if (!firstNode.length) return apiError("NO_NODE_AVAILABLE", "No nodes are configured. Create a node first.", 400);
    nodeId = firstNode[0].id;
  }

  const nodeResult = await db.select().from(nodes).where(eq(nodes.id, nodeId)).limit(1);
  if (!nodeResult.length) return apiError("RESOURCE_NOT_FOUND", "Node not found.", 404);

  const id = uuidv4();
  const ver = String(nodeVersion || "20");

  const [newServer] = await db.insert(servers).values({
    id,
    name,
    description: description || null,
    ownerId,
    nodeId,
    nodeVersion: ver,
    startupCommand: startupCommand || DEFAULT_STARTUP_COMMAND,
    ramMb: typeof ramMb === "number" ? ramMb : 1024,
    cpuPercent: typeof cpuPercent === "number" ? cpuPercent : 100,
    storageMb: typeof storageMb === "number" ? storageMb : 5120,
    dockerImage: dockerImage || `node:${ver}-alpine`,
    restartPolicy: (restartPolicy || "OFF") as "OFF" | "ON_FAILURE" | "ALWAYS",
    status: "STOPPED",
  }).returning();

  // Provision working directory
  try { await ensureServerDir(id); } catch {}

  // Seed default env vars for the Pterodactyl-style startup command
  await db.insert(serverEnvironment).values([
    { serverId: id, key: "MAIN_FILE",       value: "index.js" },
    { serverId: id, key: "AUTO_UPDATE",     value: "0" },
    { serverId: id, key: "NODE_PACKAGES",   value: "" },
    { serverId: id, key: "UNNODE_PACKAGES", value: "" },
  ]);

  await db.insert(serverLogs).values({
    serverId: id,
    level: "info",
    message: `[BirdServer] Server created by ${auth.user?.username || "API"}`,
  });

  await logAudit({
    userId: auth.user?.id,
    apiKeyId: auth.apiKey?.id,
    action: "CREATE",
    resource: "server",
    resourceId: id,
    endpoint: "/api/servers",
    method: "POST",
    statusCode: 201,
    metadata: { name, ownerId },
  });

  return apiSuccess(newServer, 201);
}
