import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log("🌱 Seeding BirdServer database...");

  // Check if admin already exists
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, "admin"))
    .limit(1);

  if (existing.length > 0) {
    console.log("✅ Admin user already exists. Skipping seed.");
    await pool.end();
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash("admin00", 12);
  const adminId = uuidv4();

  await db.insert(schema.users).values({
    id: adminId,
    username: "admin",
    email: "admin@birdserver.local",
    passwordHash,
    role: "ADMIN",
    firstName: "BirdServer",
    lastName: "Admin",
    suspended: false,
  });

  console.log("✅ Admin user created: admin / admin00");

  // Create a default node
  const nodeId = uuidv4();
  await db.insert(schema.nodes).values({
    id: nodeId,
    name: "Node-01 (Local)",
    description: "Default local node",
    fqdn: "localhost",
    port: 8080,
    status: "ONLINE",
    totalRamMb: 16384,
    totalCpuPercent: 800,
    totalStorageMb: 512000,
    usedRamMb: 0,
    usedCpuPercent: 0,
    usedStorageMb: 0,
  });

  console.log("✅ Default node created: Node-01 (Local)");

  // Allocate some ports for the node
  const portValues = [];
  for (let p = 25565; p <= 25600; p++) {
    portValues.push({
      nodeId,
      port: p,
      allocated: false,
    });
  }

  await db.insert(schema.ports).values(portValues);
  console.log("✅ Ports 25565–25600 allocated for Node-01");

  console.log("\n🐦 BirdServer seeded successfully!");
  console.log("   Username: admin");
  console.log("   Password: admin00");
  console.log("   Role: ADMIN");

  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
