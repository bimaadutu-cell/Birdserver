/**
 * POST /api/provision
 *
 * Single Pterodactyl-style endpoint for bot integrations (WhatsApp / Telegram
 * auto-order bots). One API key call creates the account for the chosen role
 * and, when applicable, provisions the server + starts it.
 *
 * Auth: Authorization: Bearer bsk_live_xxx
 * Required scopes (any of):
 *   - admin:*  (recommended for bot keys)
 *   - or all of: users:create, servers:create, resellers:create (for USER/RESELLER/ADMIN respectively)
 *
 * Request body:
 * {
 *   "role": "USER" | "RESELLER" | "ADMIN",
 *   "username": "...",
 *   "email":    "...",
 *   "password": "...",
 *   "firstName": "...",   // optional
 *   "lastName":  "...",   // optional
 *
 *   // Only for USER (server auto-provisioning). Omit to skip.
 *   "server": {
 *     "name": "...",
 *     "nodeVersion": "20",
 *     "startupCommand": "npm start",
 *     "ramMb": 1024,
 *     "cpuPercent": 100,
 *     "storageMb": 5120,
 *     "restartPolicy": "ON_FAILURE",
 *     "nodeId": "...",          // optional  first node used if omitted
 *     "autoStart": true          // optional  boot immediately
 *   },
 *
 *   // Only for RESELLER (quota assignment). Omit for defaults.
 *   "quota": {
 *     "maxUsers":       20,
 *     "maxServers":     50,
 *     "maxRamMb":       51200,
 *     "maxCpuPercent":  500,
 *     "maxStorageMb":   204800
 *   }
 * }
 *
 * Response 201:
 * {
 *   "success": true,
 *   "data": {
 *     "role": "USER",
 *     "user": { "id", "username", "email", "role", ... },
 *     "credentials": {
 *       "username": "...",
 *       "password": "...",           // returned only once, deliver via bot
 *       "loginUrl":  "https://.../login"
 *     },
 *     "server":  { ... }              // present when a server was created
 *     "quota":   { ... }              // present for RESELLER
 *   }
 * }
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, servers as serversTable, nodes, resellerQuotas, serverLogs } from "@/db/schema";
// serverEnvironment imported below via schema import
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { authenticate, apiError, apiSuccess, logAudit } from "@/lib/api-auth";
import { ensureServerDir, startServer, DEFAULT_STARTUP_COMMAND } from "@/lib/process-manager";
import { serverEnvironment } from "@/db/schema";

type Role = "USER" | "RESELLER" | "ADMIN";

function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes("admin:*") || scopes.includes(required)) return true;
  const [resource] = required.split(":");
  return scopes.includes(`${resource}:*`);
}

export async function POST(req: NextRequest) {
  // Basic authentication (any valid key)
  const auth = await authenticate(req);
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  // API key must exist (this endpoint is API-only)
  if (auth.via !== "api_key" && auth.user?.role !== "ADMIN") {
    return apiError("FORBIDDEN", "This endpoint requires an API key or ADMIN session.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const {
    role,
    username,
    email,
    password,
    firstName,
    lastName,
    server: serverInput,
    quota: quotaInput,
  } = body as {
    role?: string;
    username?: string;
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    server?: {
      name?: string;
      nodeVersion?: string;
      startupCommand?: string;
      ramMb?: number;
      cpuPercent?: number;
      storageMb?: number;
      restartPolicy?: string;
      nodeId?: string;
      autoStart?: boolean;
    };
    quota?: {
      maxUsers?: number;
      maxServers?: number;
      maxRamMb?: number;
      maxCpuPercent?: number;
      maxStorageMb?: number;
    };
  };

  if (!role || !username || !email || !password) {
    return apiError("MISSING_FIELDS", "role, username, email, and password are required.", 400);
  }
  const normalizedRole = String(role).toUpperCase() as Role;
  if (!["USER", "RESELLER", "ADMIN"].includes(normalizedRole)) {
    return apiError("VALIDATION_ERROR", "role must be USER, RESELLER, or ADMIN.", 400);
  }
  if (password.length < 6) {
    return apiError("VALIDATION_ERROR", "password must be at least 6 characters.", 400);
  }

  // Scope enforcement per requested role
  const scopes = auth.scopes || [];
  if (normalizedRole === "USER"     && !hasScope(scopes, "users:create"))     return apiError("INSUFFICIENT_SCOPE", "Missing scope: users:create.", 403);
  if (normalizedRole === "RESELLER" && !hasScope(scopes, "resellers:create")) return apiError("INSUFFICIENT_SCOPE", "Missing scope: resellers:create.", 403);
  if (normalizedRole === "ADMIN"    && !hasScope(scopes, "users:create"))     return apiError("INSUFFICIENT_SCOPE", "Missing scope: users:create.", 403);
  // Creating an ADMIN requires admin:* (dangerous)
  if (normalizedRole === "ADMIN" && !scopes.includes("admin:*")) {
    return apiError("INSUFFICIENT_SCOPE", "Creating an ADMIN account requires the admin:* scope.", 403);
  }
  if (normalizedRole === "USER" && serverInput && !hasScope(scopes, "servers:create")) {
    return apiError("INSUFFICIENT_SCOPE", "Missing scope: servers:create (needed to auto-provision the server).", 403);
  }

  // Uniqueness checks
  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existingUser.length) return apiError("USERNAME_TAKEN", "Username is already taken.", 409);
  const existingEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingEmail.length) return apiError("EMAIL_TAKEN", "Email is already registered.", 409);

  // Create the account
  const userId = uuidv4();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    id: userId,
    username,
    email,
    passwordHash,
    role: normalizedRole,
    firstName: firstName || null,
    lastName: lastName || null,
  });

  const createdUser = {
    id: userId,
    username,
    email,
    role: normalizedRole,
    firstName: firstName || null,
    lastName: lastName || null,
  };

  let createdServer: typeof serversTable.$inferSelect | null = null;
  let startedInfo: { pid: number; startedAt: Date } | null = null;
  let createdQuota: typeof resellerQuotas.$inferSelect | null = null;

  // Provision server for USER
  if (normalizedRole === "USER" && serverInput) {
    // Pick a node
    let nodeId = serverInput.nodeId;
    if (!nodeId) {
      const firstNode = await db.select({ id: nodes.id }).from(nodes).limit(1);
      if (!firstNode.length) {
        // Roll back user creation - server was requested but no node is available
        await db.delete(users).where(eq(users.id, userId));
        return apiError("NO_NODE_AVAILABLE", "No nodes are configured. Configure a node before provisioning servers.", 400);
      }
      nodeId = firstNode[0].id;
    }

    const nodeExists = await db.select({ id: nodes.id }).from(nodes).where(eq(nodes.id, nodeId)).limit(1);
    if (!nodeExists.length) {
      await db.delete(users).where(eq(users.id, userId));
      return apiError("RESOURCE_NOT_FOUND", "The specified nodeId does not exist.", 404);
    }

    const nodeVersion = String(serverInput.nodeVersion || "20");
    const serverId = uuidv4();
    const serverName = serverInput.name || `${username}-server-01`;

    const [srv] = await db.insert(serversTable).values({
      id: serverId,
      name: serverName,
      description: `Auto-provisioned via API for ${username}`,
      ownerId: userId,
      nodeId,
      nodeVersion,
      startupCommand: serverInput.startupCommand || DEFAULT_STARTUP_COMMAND,
      ramMb: typeof serverInput.ramMb === "number" ? serverInput.ramMb : 1024,
      cpuPercent: typeof serverInput.cpuPercent === "number" ? serverInput.cpuPercent : 100,
      storageMb: typeof serverInput.storageMb === "number" ? serverInput.storageMb : 5120,
      dockerImage: `node:${nodeVersion}-alpine`,
      restartPolicy: (serverInput.restartPolicy || "OFF") as "OFF" | "ON_FAILURE" | "ALWAYS",
      status: "STOPPED",
    }).returning();

    try { await ensureServerDir(serverId); } catch {}
    // Seed the standard Pterodactyl-compat env vars so the default startup command works out of the box.
    await db.insert(serverEnvironment).values([
      { serverId, key: "MAIN_FILE",       value: "index.js" },
      { serverId, key: "AUTO_UPDATE",     value: "0" },
      { serverId, key: "NODE_PACKAGES",   value: "" },
      { serverId, key: "UNNODE_PACKAGES", value: "" },
    ]);
    await db.insert(serverLogs).values({
      serverId,
      level: "info",
      message: `[BirdServer] Auto-provisioned for ${username} via API key.`,
    });
    createdServer = srv;

    // Optional auto-start
    if (serverInput.autoStart) {
      try {
        startedInfo = await startServer({
          serverId,
          startupCommand: srv.startupCommand,
          nodeVersion: srv.nodeVersion,
          autoRestart: srv.restartPolicy !== "OFF",
        });
      } catch (e) {
        await db.insert(serverLogs).values({
          serverId,
          level: "error",
          message: `[BirdServer] Auto-start failed: ${(e as Error).message}`,
        });
      }
    }
  }

  // Assign quota for RESELLER
  if (normalizedRole === "RESELLER") {
    const q = {
      resellerId: userId,
      maxUsers:       quotaInput?.maxUsers       ?? 10,
      maxServers:     quotaInput?.maxServers     ?? 20,
      maxRamMb:       quotaInput?.maxRamMb       ?? 10240,
      maxCpuPercent:  quotaInput?.maxCpuPercent  ?? 200,
      maxStorageMb:   quotaInput?.maxStorageMb   ?? 51200,
    };
    const [inserted] = await db.insert(resellerQuotas).values(q).returning();
    createdQuota = inserted;
  }

  // Audit
  await logAudit({
    userId: auth.user?.id,
    apiKeyId: auth.apiKey?.id,
    action: "CREATE",
    resource: "provision",
    resourceId: userId,
    endpoint: "/api/provision",
    method: "POST",
    statusCode: 201,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
    metadata: {
      role: normalizedRole,
      username,
      serverCreated: !!createdServer,
      quotaAssigned: !!createdQuota,
    },
  });

  return apiSuccess({
    role: normalizedRole,
    user: createdUser,
    credentials: {
      username,
      password, // returned only once - bot should deliver this to the user
      loginUrl: `${req.nextUrl.origin}/login`,
    },
    server: createdServer,
    started: startedInfo,
    quota: createdQuota,
  }, 201);
}
