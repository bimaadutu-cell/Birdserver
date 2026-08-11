/**
 * Makes sure a fresh/legacy Railway database always has the minimum
 * BirdServer records required to use the panel.
 */
import { db } from "@/db";
import { users, nodes, ports } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { v4 as uuidv4 } from "uuid";
import { ensureMigrated } from "./migrate";
import os from "os";

type GlobalState = typeof globalThis & {
  __birdserverBootstrapped?: boolean;
  __birdserverBootstrapPromise?: Promise<void>;
};
const g = globalThis as GlobalState;

async function doBootstrap(): Promise<void> {
  // Authentication depends only on the database schema + admin record.
  // Node/port provisioning is optional and must never prevent login.
  await ensureMigrated();

  const adminUsername = process.env.BIRDSERVER_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.BIRDSERVER_ADMIN_PASSWORD || "admin00";
  const adminEmail = process.env.BIRDSERVER_ADMIN_EMAIL || "admin@birdserver.local";

  const existingAdmin = await db
    .select({ id: users.id, passwordHash: users.passwordHash, role: users.role, suspended: users.suspended })
    .from(users)
    .where(eq(users.username, adminUsername))
    .limit(1);

  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      id: uuidv4(),
      username: adminUsername,
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      firstName: "BirdServer",
      lastName: "Admin",
      suspended: false,
    });
    console.log(`[Bootstrap] Created admin account: ${adminUsername}`);
  } else if (process.env.BIRDSERVER_RESET_ADMIN_PASSWORD === "1") {
    // Opt-in recovery switch for an existing/broken deployment.
    // It is deliberately disabled by default so normal redeploys do not
    // unexpectedly overwrite a changed administrator password.
    await db.update(users).set({
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      suspended: false,
      email: adminEmail,
      updatedAt: new Date(),
    }).where(eq(users.id, existingAdmin[0].id));
    console.log(`[Bootstrap] Admin password reset for ${adminUsername}.`);
  }

  // Everything below is best-effort infrastructure provisioning. A failure
  // here must NOT make /api/auth/login unavailable.
  try {
    const [{ value: nodeCount }] = await db.select({ value: count() }).from(nodes);
    let nodeId: string | undefined;

    if (nodeCount === 0) {
      nodeId = uuidv4();

      const fqdn =
        process.env.BIRDSERVER_NODE_FQDN ||
        process.env.RAILWAY_PUBLIC_DOMAIN ||
        process.env.RENDER_EXTERNAL_HOSTNAME ||
        process.env.VERCEL_URL ||
        "localhost";

      const platform =
        process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT_ID
          ? "railway"
          : process.env.VERCEL
            ? "vercel"
            : process.env.RENDER
              ? "render"
              : "local";

      const totalRamMb = Number(process.env.BIRDSERVER_NODE_RAM_MB || Math.floor(os.totalmem() / 1024 / 1024));
      const totalCpuPercent = Number(process.env.BIRDSERVER_NODE_CPU || os.cpus().length * 100);
      const totalStorageMb = Number(process.env.BIRDSERVER_NODE_STORAGE_MB || 102400);

      await db.insert(nodes).values({
        id: nodeId,
        name: `Node-01 (${platform})`,
        description: `Auto-provisioned on ${platform}`,
        fqdn,
        port: 8080,
        status: "ONLINE",
        totalRamMb,
        totalCpuPercent,
        totalStorageMb,
      });
      console.log(`[Bootstrap] Created ${platform} node.`);
    } else {
      const first = await db.select({ id: nodes.id }).from(nodes).limit(1);
      nodeId = first[0]?.id;
    }

    const [{ value: portCount }] = await db.select({ value: count() }).from(ports);
    if (portCount === 0 && nodeId) {
      const values = [];
      for (let port = 25565; port <= 25620; port++) {
        values.push({ nodeId, port, allocated: false });
      }
      await db.insert(ports).values(values);
      console.log("[Bootstrap] Created ports 25565-25620.");
    }
  } catch (error) {
    console.warn("[Bootstrap] Optional node/port provisioning failed; login remains available:", error);
  }
}

export async function ensureBootstrapped(): Promise<void> {
  if (g.__birdserverBootstrapped) return;

  if (!g.__birdserverBootstrapPromise) {
    g.__birdserverBootstrapPromise = doBootstrap()
      .then(() => {
        g.__birdserverBootstrapped = true;
      })
      .catch((error) => {
        g.__birdserverBootstrapPromise = undefined;
        g.__birdserverBootstrapped = false;
        console.error("[Bootstrap] failed:", error);
        throw error;
      });
  }

  return g.__birdserverBootstrapPromise;
}
