/**
 * BirdServer database bootstrap/migration.
 *
 * Railway can keep a PostgreSQL database between deployments. The old
 * implementation swallowed migration errors, then the login query ran against
 * a stale schema and exposed the raw PostgreSQL error to the browser.
 *
 * This version:
 *   - requires a real DATABASE_URL;
 *   - creates the enums/tables when they do not exist;
 *   - adds missing columns to legacy tables;
 *   - backfills safe values;
 *   - verifies the critical users/sessions schema before login continues;
 *   - NEVER hides a database/migration failure from the caller.
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";

const REQUIRED: Record<string, Record<string, string>> = {
  users: {
    id: `"id" text`,
    username: `"username" varchar(64)`,
    email: `"email" varchar(255)`,
    password_hash: `"password_hash" text`,
    role: `"role" "role" DEFAULT 'USER'`,
    first_name: `"first_name" varchar(100)`,
    last_name: `"last_name" varchar(100)`,
    reseller_id: `"reseller_id" text`,
    suspended: `"suspended" boolean DEFAULT false`,
    created_at: `"created_at" timestamp DEFAULT now()`,
    updated_at: `"updated_at" timestamp DEFAULT now()`,
  },
  sessions: {
    id: `"id" text`,
    user_id: `"user_id" text`,
    expires_at: `"expires_at" timestamp`,
    created_at: `"created_at" timestamp DEFAULT now()`,
    ip_address: `"ip_address" text`,
    user_agent: `"user_agent" text`,
  },
  nodes: {
    id: `"id" text`,
    name: `"name" varchar(100)`,
    description: `"description" text`,
    fqdn: `"fqdn" varchar(255)`,
    port: `"port" integer DEFAULT 8080`,
    status: `"status" "node_status" DEFAULT 'ONLINE'`,
    total_ram_mb: `"total_ram_mb" integer DEFAULT 8192`,
    total_cpu_percent: `"total_cpu_percent" integer DEFAULT 400`,
    total_storage_mb: `"total_storage_mb" integer DEFAULT 102400`,
    used_ram_mb: `"used_ram_mb" integer DEFAULT 0`,
    used_cpu_percent: `"used_cpu_percent" integer DEFAULT 0`,
    used_storage_mb: `"used_storage_mb" integer DEFAULT 0`,
    docker_socket: `"docker_socket" text DEFAULT '/var/run/docker.sock'`,
    auth_token: `"auth_token" text`,
    created_at: `"created_at" timestamp DEFAULT now()`,
    updated_at: `"updated_at" timestamp DEFAULT now()`,
  },
  ports: {
    id: `"id" serial`,
    node_id: `"node_id" text`,
    port: `"port" integer`,
    server_id: `"server_id" text`,
    allocated: `"allocated" boolean DEFAULT false`,
    created_at: `"created_at" timestamp DEFAULT now()`,
  },
  servers: {
    id: `"id" text`,
    name: `"name" varchar(100)`,
    description: `"description" text`,
    owner_id: `"owner_id" text`,
    node_id: `"node_id" text`,
    status: `"status" "server_status" DEFAULT 'STOPPED'`,
    container_id: `"container_id" text`,
    docker_image: `"docker_image" text DEFAULT 'node:20-alpine'`,
    node_version: `"node_version" varchar(10) DEFAULT '20'`,
    startup_command: `"startup_command" text DEFAULT ''`,
    ram_mb: `"ram_mb" integer DEFAULT 1024`,
    cpu_percent: `"cpu_percent" integer DEFAULT 100`,
    storage_mb: `"storage_mb" integer DEFAULT 5120`,
    allocated_port: `"allocated_port" integer`,
    restart_policy: `"restart_policy" "restart_policy" DEFAULT 'OFF'`,
    max_restarts: `"max_restarts" integer DEFAULT 3`,
    restart_delay: `"restart_delay" integer DEFAULT 5`,
    suspended: `"suspended" boolean DEFAULT false`,
    created_at: `"created_at" timestamp DEFAULT now()`,
    updated_at: `"updated_at" timestamp DEFAULT now()`,
  },
  server_environment: {
    id: `"id" serial`,
    server_id: `"server_id" text`,
    key: `"key" varchar(255)`,
    value: `"value" text`,
    hidden: `"hidden" boolean DEFAULT false`,
    created_at: `"created_at" timestamp DEFAULT now()`,
  },
  server_logs: {
    id: `"id" serial`,
    server_id: `"server_id" text`,
    level: `"level" varchar(20) DEFAULT 'info'`,
    message: `"message" text`,
    created_at: `"created_at" timestamp DEFAULT now()`,
  },
  backups: {
    id: `"id" text`,
    server_id: `"server_id" text`,
    name: `"name" varchar(255)`,
    size_mb: `"size_mb" integer DEFAULT 0`,
    completed: `"completed" boolean DEFAULT false`,
    created_at: `"created_at" timestamp DEFAULT now()`,
  },
  reseller_quotas: {
    id: `"id" serial`,
    reseller_id: `"reseller_id" text`,
    max_users: `"max_users" integer DEFAULT 10`,
    max_servers: `"max_servers" integer DEFAULT 20`,
    max_ram_mb: `"max_ram_mb" integer DEFAULT 10240`,
    max_cpu_percent: `"max_cpu_percent" integer DEFAULT 200`,
    max_storage_mb: `"max_storage_mb" integer DEFAULT 51200`,
    used_users: `"used_users" integer DEFAULT 0`,
    used_servers: `"used_servers" integer DEFAULT 0`,
    used_ram_mb: `"used_ram_mb" integer DEFAULT 0`,
    used_cpu_percent: `"used_cpu_percent" integer DEFAULT 0`,
    used_storage_mb: `"used_storage_mb" integer DEFAULT 0`,
  },
  api_keys: {
    id: `"id" text`,
    name: `"name" varchar(255)`,
    description: `"description" text`,
    prefix: `"prefix" varchar(20)`,
    key_hash: `"key_hash" text`,
    owner_id: `"owner_id" text`,
    scopes: `"scopes" jsonb DEFAULT '[]'::jsonb`,
    status: `"status" "api_key_status" DEFAULT 'ACTIVE'`,
    rate_limit_per_minute: `"rate_limit_per_minute" integer DEFAULT 60`,
    created_at: `"created_at" timestamp DEFAULT now()`,
    expires_at: `"expires_at" timestamp`,
    last_used_at: `"last_used_at" timestamp`,
    revoked_at: `"revoked_at" timestamp`,
  },
  api_key_usage: {
    id: `"id" serial`,
    api_key_id: `"api_key_id" text`,
    requests: `"requests" integer DEFAULT 0`,
    window_start: `"window_start" timestamp DEFAULT now()`,
  },
  audit_logs: {
    id: `"id" serial`,
    user_id: `"user_id" text`,
    api_key_id: `"api_key_id" text`,
    action: `"action" text`,
    resource: `"resource" text`,
    resource_id: `"resource_id" text`,
    endpoint: `"endpoint" text`,
    method: `"method" varchar(10)`,
    status_code: `"status_code" integer`,
    ip_address: `"ip_address" text`,
    user_agent: `"user_agent" text`,
    metadata: `"metadata" jsonb`,
    created_at: `"created_at" timestamp DEFAULT now()`,
  },
};

const PK: Record<string, string> = {
  users: "id",
  sessions: "id",
  nodes: "id",
  servers: "id",
  backups: "id",
};

async function run(statement: string): Promise<void> {
  await db.execute(sql.raw(statement));
}

async function columns(table: string): Promise<Set<string>> {
  const result = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = ${table}
  `);
  const rows = (result as unknown as { rows?: Array<{ column_name: string }> }).rows
    ?? (result as unknown as Array<{ column_name: string }>);
  return new Set(rows.map((r) => r.column_name));
}

async function enumType(name: string, values: string[]) {
  const valuesSql = values.map((v) => `'${v.replaceAll("'", "''")}'`).join(", ");
  await run(
    `DO $$ BEGIN CREATE TYPE "${name}" AS ENUM (${valuesSql}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  );

  // Older databases may have the enum but not newer values.
  for (const value of values) {
    await run(`ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS '${value.replaceAll("'", "''")}';`);
  }
}

async function createTable(name: string, defs: Record<string, string>) {
  const pk = PK[name] ? `, PRIMARY KEY ("${PK[name]}")` : "";
  const definition = Object.values(defs).join(", ");
  await run(`CREATE TABLE IF NOT EXISTS "${name}" (${definition}${pk});`);
}

async function addMissingColumns(name: string) {
  const existing = await columns(name);
  for (const [column, definition] of Object.entries(REQUIRED[name])) {
    if (existing.has(column)) continue;

    // Existing legacy rows make NOT NULL additions unsafe, so columns are
    // initially nullable. The users table is backfilled below.
    const safeDefinition = definition
      .replace(/\s+PRIMARY KEY/gi, "")
      .replace(/\s+NOT NULL/gi, "")
      .replace(/\s+DEFAULT\s+[^,]+$/i, "");

    await run(`ALTER TABLE "${name}" ADD COLUMN IF NOT EXISTS ${safeDefinition};`);
    console.log(`[Migrate] added ${name}.${column}`);
  }
}

async function ensureIndexes() {
  // Indexes are useful but must never prevent a legacy database from booting.
  for (const statement of [
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");`,
    `CREATE INDEX IF NOT EXISTS "server_logs_server_id_idx" ON "server_logs" ("server_id");`,
    `CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");`,
  ]) {
    try {
      await run(statement);
    } catch (error) {
      console.warn("[Migrate] index warning:", error instanceof Error ? error.message : error);
    }
  }
}

async function backfillUsers() {
  // Only backfill nullable/default fields. Do not rewrite legacy primary keys:
  // the dedicated BirdServer schema means old public data is never touched.
  await run(`UPDATE "users" SET "username" = 'admin' WHERE "username" IS NULL OR "username" = '';`);
  await run(`UPDATE "users" SET "email" = ("username" || '@birdserver.local') WHERE "email" IS NULL OR "email" = '';`);
  await run(`UPDATE "users" SET "role" = 'USER' WHERE "role" IS NULL;`);
  await run(`UPDATE "users" SET "suspended" = false WHERE "suspended" IS NULL;`);
  await run(`UPDATE "users" SET "created_at" = now() WHERE "created_at" IS NULL;`);
  await run(`UPDATE "users" SET "updated_at" = now() WHERE "updated_at" IS NULL;`);
}

async function verifyCriticalSchema() {
  const userColumns = await columns("users");
  const sessionColumns = await columns("sessions");
  const missingUsers = Object.keys(REQUIRED.users).filter((c) => !userColumns.has(c));
  const missingSessions = Object.keys(REQUIRED.sessions).filter((c) => !sessionColumns.has(c));

  if (missingUsers.length || missingSessions.length) {
    throw new Error(
      `Database schema is incomplete. Missing users=[${missingUsers.join(", ")}] sessions=[${missingSessions.join(", ")}].`
    );
  }
}

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. In Railway, connect a PostgreSQL database to this service and expose its DATABASE_URL variable."
    );
  }

  // Use a dedicated schema. This prevents legacy/public tables with incompatible
  // column types from breaking a fresh BirdServer deployment.
  const schemaName = (process.env.BIRDSERVER_DB_SCHEMA || "birdserver").replace(/[^a-zA-Z0-9_]/g, "");
  await run(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
  await run(`SET search_path TO "${schemaName}", public;`);

  // Verify connectivity before touching the application schema.
  await run("SELECT 1");

  await enumType("role", ["USER", "RESELLER", "ADMIN"]);
  await enumType("server_status", ["STARTING", "RUNNING", "STOPPING", "STOPPED", "CRASHED", "ERROR", "SUSPENDED"]);
  await enumType("node_status", ["ONLINE", "OFFLINE", "MAINTENANCE"]);
  await enumType("api_key_status", ["ACTIVE", "REVOKED", "EXPIRED"]);
  await enumType("restart_policy", ["OFF", "ON_FAILURE", "ALWAYS"]);

  for (const [name, defs] of Object.entries(REQUIRED)) {
    await createTable(name, defs);
  }

  for (const name of Object.keys(REQUIRED)) {
    await addMissingColumns(name);
  }

  await backfillUsers();
  await ensureIndexes();
  await verifyCriticalSchema();

  console.log("[Migrate] Database is ready.");
}

type GlobalState = typeof globalThis & {
  __birdserverMigratePromise?: Promise<void>;
  __birdserverMigrateDone?: boolean;
};
const g = globalThis as GlobalState;

export async function ensureMigrated(force = false): Promise<void> {
  if (force) {
    g.__birdserverMigrateDone = false;
    g.__birdserverMigratePromise = undefined;
  }

  if (g.__birdserverMigrateDone) return;

  if (!g.__birdserverMigratePromise) {
    g.__birdserverMigratePromise = migrate()
      .then(() => {
        g.__birdserverMigrateDone = true;
      })
      .catch((error) => {
        g.__birdserverMigratePromise = undefined;
        g.__birdserverMigrateDone = false;
        throw error;
      });
  }

  return g.__birdserverMigratePromise;
}

function errorText(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;

  for (let i = 0; i < 5 && current; i++) {
    if (current instanceof Error) {
      messages.push(current.message);
      current = (current as { cause?: unknown }).cause;
    } else if (typeof current === "object") {
      const obj = current as { message?: string; code?: string; detail?: string; cause?: unknown };
      if (obj.message) messages.push(obj.message);
      if (obj.code) messages.push(`code:${obj.code}`);
      if (obj.detail) messages.push(obj.detail);
      current = obj.cause;
    } else {
      break;
    }
  }

  return messages.join(" | ");
}

const SCHEMA_ERROR = /(does not exist|undefined column|undefined table|undefined object|relation .* does not exist|column .* does not exist|type .* does not exist|42P01|42703|42704)/i;

export async function withSchemaSafety<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!SCHEMA_ERROR.test(errorText(error))) throw error;
    await ensureMigrated(true);
    return fn();
  }
}
