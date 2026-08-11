import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
const DB_SCHEMA = (process.env.BIRDSERVER_DB_SCHEMA || "birdserver").replace(/[^a-zA-Z0-9_]/g, "");

if (!connectionString) {
  console.warn("[Database] DATABASE_URL is not configured.");
}

const pool = new Pool({
  connectionString: connectionString || undefined,
  // PostgreSQL applies this to every pooled connection before application queries.
  // The schema is created by migrate.ts on first use; a missing schema in search_path
  // is harmless until it is created.
  options: `-c search_path=${DB_SCHEMA},public`,
  max: Math.max(2, Number(process.env.DB_POOL_MAX || 10)),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { pool, DB_SCHEMA };
