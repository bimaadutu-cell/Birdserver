/**
 * Auto-bootstrap: runs on cold-start and ensures the panel has
 *   1. Admin user (admin/admin00)
 *   2. At least one node registered (so servers can be provisioned)
 *   3. A pool of allocatable ports for that node
 *
 * Safe to call on every request  it short-circuits after the first success.
 */

import { db } from "./../db";
import { users, nodes, ports } from "./../db/schema";
import { eq, count } from "drizzle-orm";
import { hashPassword } from "./auth";
import { v4 as uuidv4 } from "uuid";

type G = typeof globalThis & { __birdserverBootstrapped?: boolean; __birdserverBootstrapPromise?: Promise<void> };
const g = globalThis as G;

async function doBootstrap(): Promise<void> {
  try {
    // 1. Admin
    const [{ value: userCount }] = await db.select({ value: count() }).from(users);
    if (userCount === 0) {
      const passwordHash = await hashPassword("admin00");
      await db.insert(users).values({
        id: uuidv4(),
        username: "admin",
        email: "admin@birdserver.local",
        passwordHash,
        role: "ADMIN",
        firstName: "BirdServer",
        lastName: "Admin",
      });
      console.log("[Bootstrap] Created default admin user (admin/admin00)");
    }

    // 2. At least one node
    const [{ value: nodeCount }] = await db.select({ value: count() }).from(nodes);
    let defaultNodeId: string | null = null;
    if (nodeCount === 0) {
      defaultNodeId = uuidv4();
      // Detect deployment platform for FQDN
      const fqdn =
        process.env.BIRDSERVER_NODE_FQDN ||
        process.env.RAILWAY_PUBLIC_DOMAIN ||
        process.env.RENDER_EXTERNAL_HOSTNAME ||
        process.env.FLY_APP_NAME ||
        (process.env.VERCEL_URL ? process.env.VERCEL_URL : null) ||
        "localhost";
      const platform =
        process.env.RAILWAY_PROJECT_ID ? "railway" :
        process.env.VERCEL ? "vercel" :
        process.env.RENDER ? "render" :
        process.env.FLY_APP_NAME ? "fly" :
        "local";
      // Auto-detect resource envelope from OS
      const os = await import("os");
      const totalRamMb = Number(process.env.BIRDSERVER_NODE_RAM_MB || Math.floor(os.totalmem() / 1024 / 1024));
      const cpuCount = os.cpus().length;
      const totalCpuPercent = Number(process.env.BIRDSERVER_NODE_CPU || cpuCount * 100);
      const totalStorageMb = Number(process.env.BIRDSERVER_NODE_STORAGE_MB || 102400);

      await db.insert(nodes).values({
        id: defaultNodeId,
        name: `Node-01 (${platform})`,
        description: `Auto-provisioned on ${platform} - ${cpuCount} CPU / ${(totalRamMb / 1024).toFixed(1)} GB RAM`,
        fqdn,
        port: 8080,
        status: "ONLINE",
        totalRamMb,
        totalCpuPercent,
        totalStorageMb,
      });
      console.log(`[Bootstrap] Created node: ${platform} @ ${fqdn} (${cpuCount} CPU, ${totalRamMb}MB RAM)`);
    }

    // 3. Ports (only if we just created the node and there are none)
    const [{ value: portCount }] = await db.select({ value: count() }).from(ports);
    if (portCount === 0) {
      const targetNodeId = defaultNodeId
        || (await db.select({ id: nodes.id }).from(nodes).limit(1))[0]?.id;
      if (targetNodeId) {
        const portValues: { nodeId: string; port: number; allocated: boolean }[] = [];
        for (let p = 25565; p <= 25620; p++) {
          portValues.push({ nodeId: targetNodeId, port: p, allocated: false });
        }
        await db.insert(ports).values(portValues);
        console.log(`[Bootstrap] Allocated ports 25565-25620`);
      }
    }
  } catch (err) {
    console.error("[Bootstrap] Failed:", (err as Error).message);
    // reset so we can retry next request
    g.__birdserverBootstrapped = false;
    g.__birdserverBootstrapPromise = undefined;
    throw err;
  }
}

export async function ensureBootstrapped(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (g.__birdserverBootstrapped) return;

  if (!g.__birdserverBootstrapPromise) {
    g.__birdserverBootstrapPromise = doBootstrap().then(() => {
      g.__birdserverBootstrapped = true;
    });
  }

  await g.__birdserverBootstrapPromise;
}
