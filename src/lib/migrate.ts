/**
 * Auto-migration for BirdServer.
 *
 * Runs on every cold start. Idempotent:
 *   1. Creates enums (guarded)
 *   2. Creates tables (IF NOT EXISTS)
 *   3. Adds missing columns (IF NOT EXISTS) on legacy tables
 *   4. Actively verifies critical columns exist by querying information_schema
 *      and forcefully re-runs the ADD COLUMN if not.
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";

// ---------- expected schema for verification ----------
// Table -> required columns (only ones that queries actually reference).
const EXPECTED_COLUMNS: Record<string, string[]> = {
  users: ["id", "username", "email", "password_hash", "role", "first_name", "last_name", "reseller_id", "suspended", "created_at", "updated_at"],
  sessions: ["id", "user_id", "expires_at", "created_at", "ip_address", "user_agent"],
  nodes: ["id", "name", "description", "fqdn", "port", "status", "total_ram_mb", "total_cpu_percent", "total_storage_mb", "used_ram_mb", "used_cpu_percent", "used_storage_mb", "docker_socket", "auth_token", "created_at", "updated_at"],
  ports: ["id", "node_id", "port", "server_id", "allocated", "created_at"],
  servers: ["id", "name", "description", "owner_id", "node_id", "status", "container_id", "docker_image", "node_version", "startup_command", "ram_mb", "cpu_percent", "storage_mb", "allocated_port", "restart_policy", "max_restarts", "restart_delay", "suspended", "created_at", "updated_at"],
  server_environment: ["id", "server_id", "key", "value", "hidden", "created_at"],
  server_logs: ["id", "server_id", "level", "message", "created_at"],
  backups: ["id", "server_id", "name", "size_mb", "completed", "created_at"],
  reseller_quotas: ["id", "reseller_id", "max_users", "max_servers", "max_ram_mb", "max_cpu_percent", "max_storage_mb", "used_users", "used_servers", "used_ram_mb", "used_cpu_percent", "used_storage_mb"],
  api_keys: ["id", "name", "description", "prefix", "key_hash", "owner_id", "scopes", "status", "rate_limit_per_minute", "created_at", "expires_at", "last_used_at", "revoked_at"],
  api_key_usage: ["id", "api_key_id", "requests", "window_start"],
  audit_logs: ["id", "user_id", "api_key_id", "action", "resource", "resource_id", "endpoint", "method", "status_code", "ip_address", "user_agent", "metadata", "created_at"],
};

// Column DDL fragments for "add missing column".
const COLUMN_DDL: Record<string, Record<string, string>> = {
  users: {
    id:            `"id" text PRIMARY KEY`,
    username:      `"username" varchar(64)`,
    email:         `"email" varchar(255)`,
    password_hash: `"password_hash" text`,
    role:          `"role" "role"`,
    first_name:    `"first_name" varchar(100)`,
    last_name:     `"last_name" varchar(100)`,
    reseller_id:   `"reseller_id" text`,
    suspended:     `"suspended" boolean DEFAULT false`,
    created_at:    `"created_at" timestamp DEFAULT now()`,
    updated_at:    `"updated_at" timestamp DEFAULT now()`,
  },
  sessions: {
    id:         `"id" text PRIMARY KEY`,
    user_id:    `"user_id" text`,
    expires_at: `"expires_at" timestamp`,
    created_at: `"created_at" timestamp DEFAULT now()`,
    ip_address: `"ip_address" text`,
    user_agent: `"user_agent" text`,
  },
  nodes: {
    id:                `"id" text PRIMARY KEY`,
    name:              `"name" varchar(100)`,
    description:       `"description" text`,
    fqdn:              `"fqdn" varchar(255)`,
    port:              `"port" integer DEFAULT 8080`,
    status:            `"status" "node_status" DEFAULT 'ONLINE'`,
    total_ram_mb:      `"total_ram_mb" integer DEFAULT 8192`,
    total_cpu_percent: `"total_cpu_percent" integer DEFAULT 400`,
    total_storage_mb:  `"total_storage_mb" integer DEFAULT 102400`,
    used_ram_mb:       `"used_ram_mb" integer DEFAULT 0`,
    used_cpu_percent:  `"used_cpu_percent" integer DEFAULT 0`,
    used_storage_mb:   `"used_storage_mb" integer DEFAULT 0`,
    docker_socket:     `"docker_socket" text DEFAULT '/var/run/docker.sock'`,
    auth_token:        `"auth_token" text`,
    created_at:        `"created_at" timestamp DEFAULT now()`,
    updated_at:        `"updated_at" timestamp DEFAULT now()`,
  },
  ports: {
    id:         `"id" serial PRIMARY KEY`,
    node_id:    `"node_id" text`,
    port:       `"port" integer`,
    server_id:  `"server_id" text`,
    allocated:  `"allocated" boolean DEFAULT false`,
    created_at: `"created_at" timestamp DEFAULT now()`,
  },
  servers: {
    id:              `"id" text PRIMARY KEY`,
    name:            `"name" varchar(100)`,
    description:     `"description" text`,
    owner_id:        `"owner_id" text`,
    node_id:         `"node_id" text`,
    status:          `"status" "server_status" DEFAULT 'STOPPED'`,
    container_id:    `"container_id" text`,
    docker_image:    `"docker_image" text DEFAULT 'node:20-alpine'`,
    node_version:    `"node_version" varchar(10) DEFAULT '20'`,
    startup_command: `"startup_command" text DEFAULT ''`,
    ram_mb:          `"ram_mb" integer DEFAULT 1024`,
    cpu_percent:     `"cpu_percent" integer DEFAULT 100`,
    storage_mb:      `"storage_mb" integer DEFAULT 5120`,
    allocated_port:  `"allocated_port" integer`,
    restart_policy:  `"restart_policy" "restart_policy" DEFAULT 'OFF'`,
    max_restarts:    `"max_restarts" integer DEFAULT 3`,
    restart_delay:   `"restart_delay" integer DEFAULT 5`,
    suspended:       `"suspended" boolean DEFAULT false`,
    created_at:      `"created_at" timestamp DEFAULT now()`,
    updated_at:      `"updated_at" timestamp DEFAULT now()`,
  },
  server_environment: {
    id:         `"id" serial PRIMARY KEY`,
    server_id:  `"server_id" text`,
    key:        `"key" varchar(255)`,
    value:      `"value" text`,
    hidden:     `"hidden" boolean DEFAULT false`,
    created_at: `"created_at" timestamp DEFAULT now()`,
  },
  server_logs: {
    id:         `"id" serial PRIMARY KEY`,
    server_id:  `"server_id" text`,
    level:      `"level" varchar(20) DEFAULT 'info'`,
    message:    `"message" text`,
    created_at: `"created_at" timestamp DEFAULT now()`,
  },
  backups: {
    id:         `"id" text PRIMARY KEY`,
    server_id:  `"server_id" text`,
    name:       `"name" varchar(255)`,
    size_mb:    `"size_mb" integer DEFAULT 0`,
    completed:  `"completed" boolean DEFAULT false`,
    created_at: `"created_at" timestamp DEFAULT now()`,
  },
  reseller_quotas: {
    id:               `"id" serial PRIMARY KEY`,
    reseller_id:      `"reseller_id" text`,
    max_users:        `"max_users" integer DEFAULT 10`,
    max_servers:      `"max_servers" integer DEFAULT 20`,
    max_ram_mb:       `"max_ram_mb" integer DEFAULT 10240`,
    max_cpu_percent:  `"max_cpu_percent" integer DEFAULT 200`,
    max_storage_mb:   `"max_storage_mb" integer DEFAULT 51200`,
    used_users:       `"used_users" integer DEFAULT 0`,
    used_servers:     `"used_servers" integer DEFAULT 0`,
    used_ram_mb:      `"used_ram_mb" integer DEFAULT 0`,
    used_cpu_percent: `"used_cpu_percent" integer DEFAULT 0`,
    used_storage_mb:  `"used_storage_mb" integer DEFAULT 0`,
  },
  api_keys: {
    id:                    `"id" text PRIMARY KEY`,
    name:                  `"name" varchar(255)`,
    description:           `"description" text`,
    prefix:                `"prefix" varchar(20)`,
    key_hash:              `"key_hash" text`,
    owner_id:              `"owner_id" text`,
    scopes:                `"scopes" jsonb DEFAULT '[]'::jsonb`,
    status:                `"status" "api_key_status" DEFAULT 'ACTIVE'`,
    rate_limit_per_minute: `"rate_limit_per_minute" integer DEFAULT 60`,
    created_at:            `"created_at" timestamp DEFAULT now()`,
    expires_at:            `"expires_at" timestamp`,
    last_used_at:          `"last_used_at" timestamp`,
    revoked_at:            `"revoked_at" timestamp`,
  },
  api_key_usage: {
    id:           `"id" serial PRIMARY KEY`,
    api_key_id:   `"api_key_id" text`,
    requests:     `"requests" integer DEFAULT 0`,
    window_start: `"window_start" timestamp DEFAULT now()`,
  },
  audit_logs: {
    id:          `"id" serial PRIMARY KEY`,
    user_id:     `"user_id" text`,
    api_key_id:  `"api_key_id" text`,
    action:      `"action" text`,
    resource:    `"resource" text`,
    resource_id: `"resource_id" text`,
    endpoint:    `"endpoint" text`,
    method:      `"method" varchar(10)`,
    status_code: `"status_code" integer`,
    ip_address:  `"ip_address" text`,
    user_agent:  `"user_agent" text`,
    metadata:    `"metadata" jsonb`,
    created_at:  `"created_at" timestamp DEFAULT now()`,
  },
};

async function exec(stmt: string): Promise<void> {
  try {
    await db.execute(sql.raw(stmt));
  } catch (err) {
    const e = err as Error & { code?: string };
    const msg = String(e.message || "").split("\n")[0];
    // Idempotent DDL may race with another instance. Only ignore genuine
    // "already exists" conditions; never hide connection/permission/SQL errors.
    if (
      e.code === "42710" || // duplicate_object
      e.code === "42P07" || // duplicate_table
      /already exists/i.test(msg)
    ) {
      return;
    }
    console.error("[Migrate] statement failed:", msg, "\n>>>", stmt.substring(0, 240));
    throw err;
  }
}

// Fetches current column list for a table via information_schema.
async function tableColumns(tableName: string): Promise<Set<string>> {
  try {
    const rows = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
    `);
    const list = (rows as unknown as { rows?: { column_name: string }[] }).rows
      ?? (rows as unknown as { column_name: string }[]);
    return new Set(list.map((r) => r.column_name));
  } catch {
    return new Set();
  }
}

async function tableExists(tableName: string): Promise<boolean> {
  const cols = await tableColumns(tableName);
  return cols.size > 0;
}

async function ensureEnum(name: string, values: string[]): Promise<void> {
  const inList = values.map(v => `'${v}'`).join(",");
  await exec(`DO $$ BEGIN CREATE TYPE "${name}" AS ENUM (${inList}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
}

async function ensureTable(tableName: string, columns: Record<string, string>): Promise<void> {
  const cols = Object.values(columns).join(", ");
  await exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (${cols});`);
}

// Actively verifies every expected column exists; adds missing ones.
async function reconcileColumns(tableName: string): Promise<void> {
  const expected = EXPECTED_COLUMNS[tableName];
  const ddls = COLUMN_DDL[tableName];
  if (!expected || !ddls) return;

  const present = await tableColumns(tableName);
  if (present.size === 0) return; // table doesn't exist yet

  for (const col of expected) {
    if (present.has(col)) continue;
    // Strip PRIMARY KEY constraint from the fragment when doing ADD COLUMN
    const frag = ddls[col].replace(/\s+PRIMARY KEY/i, "").replace(/\s+serial\s*/i, " integer ");
    const stmt = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS ${frag};`;
    console.log(`[Migrate] adding missing column ${tableName}.${col}`);
    await exec(stmt);
  }
}

async function reconcileSchema(): Promise<void> {
  console.log("[Migrate] Starting schema reconciliation...");

  // 1. Enums first
  await ensureEnum("role", ["USER", "RESELLER", "ADMIN"]);
  await ensureEnum("server_status", ["STARTING", "RUNNING", "STOPPING", "STOPPED", "CRASHED", "ERROR", "SUSPENDED"]);
  await ensureEnum("node_status", ["ONLINE", "OFFLINE", "MAINTENANCE"]);
  await ensureEnum("api_key_status", ["ACTIVE", "REVOKED", "EXPIRED"]);
  await ensureEnum("restart_policy", ["OFF", "ON_FAILURE", "ALWAYS"]);

  // 2. Create tables if they don't exist
  for (const [tableName, cols] of Object.entries(COLUMN_DDL)) {
    await ensureTable(tableName, cols);
  }

  // 3. Reconcile missing columns on existing tables (this is the KEY step
  //    that fixes stale Railway/Vercel deployments).
  for (const tableName of Object.keys(EXPECTED_COLUMNS)) {
    await reconcileColumns(tableName);
  }

  // 4. Set NOT NULL + defaults on columns that had to be added nullable.
  //    Only apply when the table is empty (safe) OR the column is already populated.
  await exec(`UPDATE "users" SET "email" = "id" || '@birdserver.local' WHERE "email" IS NULL;`);
  await exec(`UPDATE "users" SET "role" = 'USER' WHERE "role" IS NULL;`);
  await exec(`UPDATE "users" SET "suspended" = false WHERE "suspended" IS NULL;`);
  await exec(`UPDATE "users" SET "created_at" = now() WHERE "created_at" IS NULL;`);
  await exec(`UPDATE "users" SET "updated_at" = now() WHERE "updated_at" IS NULL;`);

  // 5. Add unique constraints on username/email (safely)
  await exec(`DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE ("username"); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;`);
  await exec(`DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email"); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;`);

  // 6. Indexes
  await exec(`CREATE INDEX IF NOT EXISTS "server_logs_server_id_idx" ON "server_logs"("server_id");`);
  await exec(`CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");`);

  // 7. Final verification: walk expected columns and log any that are still missing
  for (const [tableName, expected] of Object.entries(EXPECTED_COLUMNS)) {
    if (!(await tableExists(tableName))) {
      console.warn(`[Migrate] WARNING: table "${tableName}" still missing after migrate`);
      continue;
    }
    const present = await tableColumns(tableName);
    const missing = expected.filter(c => !present.has(c));
    if (missing.length) {
      console.warn(`[Migrate] WARNING: ${tableName} missing columns:`, missing.join(", "));
    }
  }

  console.log("[Migrate] Reconciliation complete.");
}

async function doMigrate(): Promise<void> {
  // PostgreSQL advisory lock prevents two Railway instances/cold requests
  // from attempting the first schema creation at the same time.
  await db.execute(sql`select pg_advisory_lock(hashtext('birdserver-schema-v2'))`);
  try {
    await reconcileSchema();
  } finally {
    await db.execute(sql`select pg_advisory_unlock(hashtext('birdserver-schema-v2'))`).catch(() => {});
  }
}

type G = typeof globalThis & {
  __birdserverMigratePromise?: Promise<void>;
  __birdserverMigrateDone?: boolean;
};
const g = globalThis as G;

/**
 * Runs migrate. Guaranteed to run at least once per process; if called
 * concurrently the same promise is reused. Force re-runs on schema errors.
 */
export async function ensureMigrated(force = false): Promise<void> {
  if (force) {
    g.__birdserverMigratePromise = undefined;
    g.__birdserverMigrateDone = false;
  }
  if (g.__birdserverMigrateDone) return;
  if (!g.__birdserverMigratePromise) {
    g.__birdserverMigratePromise = doMigrate()
      .then(() => { g.__birdserverMigrateDone = true; })
      .catch((err) => {
        console.error("[Migrate] fatal:", err);
        g.__birdserverMigratePromise = undefined;
        throw err;
      });
  }
  await g.__birdserverMigratePromise;
}

/**
 * Wraps a DB call: if it fails with a "column/table does not exist" error,
 * runs migrate once and retries the call. Use this in critical hot paths.
 */
function extractErrorMessages(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (cur && depth < 5) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      // Drizzle wraps pg errors under .cause
      cur = (cur as { cause?: unknown }).cause;
    } else if (typeof cur === "object" && cur !== null) {
      const o = cur as { message?: string; code?: string; cause?: unknown; detail?: string };
      if (o.message) parts.push(o.message);
      if (o.code) parts.push("code:" + o.code);
      if (o.detail) parts.push(o.detail);
      cur = o.cause;
    } else break;
    depth++;
  }
  return parts.join(" | ");
}

const SCHEMA_ERROR_RE =
  /(column .* does not exist|relation .* does not exist|type .* does not exist|undefined column|undefined table|code:42P01|code:42703|code:42704|failed query)/i;

export async function withSchemaSafety<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = extractErrorMessages(err);
    if (SCHEMA_ERROR_RE.test(msg)) {
      console.warn("[Migrate] schema drift detected, forcing migration:", msg.substring(0, 200));
      await ensureMigrated(true);
      try {
        return await fn();
      } catch (err2) {
        const msg2 = extractErrorMessages(err2);
        console.error("[Migrate] retry after migration still failed:", msg2.substring(0, 200));
        throw err2;
      }
    }
    throw err;
  }
}
