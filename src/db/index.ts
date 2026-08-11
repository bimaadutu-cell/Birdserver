import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import * as schema from "./schema";

/**
 * Database connection.
 * Auto-detects SSL requirements for Railway / Render / Fly / Vercel / etc.
 * Configuration priority:
 *   1. DATABASE_URL              (primary connection string)
 *   2. POSTGRES_URL              (Vercel Postgres compatibility)
 *   3. PGHOST + PGUSER + ...    (individual vars, fallback)
 */

function resolveConnectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (url && url.length > 0) return url;

  // Fallback: build from individual vars
  const host = process.env.PGHOST;
  const port = process.env.PGPORT || "5432";
  const user = process.env.PGUSER || "postgres";
  const pass = process.env.PGPASSWORD || "";
  const dbn  = process.env.PGDATABASE || "postgres";

  if (host) {
    return `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${dbn}`;
  }

  // Local dev default
  return "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
}

function needsSsl(url: string): boolean {
  // Respect an explicit sslmode value from the connection string.
  const sslMode = url.match(/[?&]sslmode=([^&]+)/i)?.[1]?.toLowerCase();
  if (sslMode === "disable") return false;
  if (sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full") return true;
  // Force SSL on common managed providers
  const managedHosts = [
    "railway.app", "rlwy.net", "supabase.co", "neon.tech", "aivencloud.com",
    "render.com", "fly.dev", "cockroachlabs.cloud", "amazonaws.com",
    "digitalocean.com", "azure.com", "clever-cloud.com",
  ];
  if (managedHosts.some((h) => url.includes(h))) return true;
  // Any host outside localhost/private ranges - assume SSL
  const isLocal = /(127\.0\.0\.1|localhost|::1|host\.docker\.internal)/.test(url);
  return !isLocal && process.env.NODE_ENV === "production";
}

const connectionString = resolveConnectionString();
const useSsl = needsSsl(connectionString);

const poolConfig: PoolConfig = {
  connectionString,
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
};

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("[pg] pool error:", (err as Error).message);
});

if (process.env.NODE_ENV !== "test") {
  const masked = connectionString.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
  console.log(`[pg] connecting to ${masked}${useSsl ? " (SSL)" : ""}`);
}

export const db = drizzle(pool, { schema });
export const rawPool = pool;
export type DB = typeof db;
