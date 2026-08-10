/**
 * Auto-migration for BirdServer.
 *
 * Runs raw idempotent DDL statements on cold start so the app can be deployed
 * to Vercel/Railway/Render with just a DATABASE_URL and nothing else.
 *
 * The DDL below is generated from src/db/schema.ts. Every statement uses
 * IF NOT EXISTS / DO $$ ... EXCEPTION guards so it is safe to re-run.
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";

const STATEMENTS: string[] = [
  // ============== ENUMS ==============
  `DO $$ BEGIN
     CREATE TYPE "role" AS ENUM ('USER','RESELLER','ADMIN');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN
     CREATE TYPE "server_status" AS ENUM ('STARTING','RUNNING','STOPPING','STOPPED','CRASHED','ERROR','SUSPENDED');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN
     CREATE TYPE "node_status" AS ENUM ('ONLINE','OFFLINE','MAINTENANCE');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN
     CREATE TYPE "api_key_status" AS ENUM ('ACTIVE','REVOKED','EXPIRED');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN
     CREATE TYPE "restart_policy" AS ENUM ('OFF','ON_FAILURE','ALWAYS');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN
     CREATE TYPE "audit_action" AS ENUM ('LOGIN','LOGOUT','CREATE','UPDATE','DELETE','START','STOP','RESTART','KILL','SUSPEND','UNSUSPEND','API_REQUEST','API_KEY_CREATE','API_KEY_REVOKE','API_KEY_ROTATE','API_KEY_DELETE');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  // ============== USERS ==============
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "username" varchar(64) NOT NULL UNIQUE,
    "email" varchar(255) NOT NULL UNIQUE,
    "password_hash" text NOT NULL,
    "role" "role" NOT NULL DEFAULT 'USER',
    "first_name" varchar(100),
    "last_name" varchar(100),
    "reseller_id" text,
    "suspended" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  );`,

  // Migration guards: add missing columns to legacy `users` tables
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(64);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar(255);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" varchar(100);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" varchar(100);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reseller_id" text;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended" boolean NOT NULL DEFAULT false;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "role" NOT NULL DEFAULT 'USER';`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();`,

  // ============== SESSIONS ==============
  `CREATE TABLE IF NOT EXISTS "sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "ip_address" text,
    "user_agent" text
  );`,

  // ============== NODES ==============
  `CREATE TABLE IF NOT EXISTS "nodes" (
    "id" text PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "description" text,
    "fqdn" varchar(255) NOT NULL,
    "port" integer NOT NULL DEFAULT 8080,
    "status" "node_status" NOT NULL DEFAULT 'ONLINE',
    "total_ram_mb" integer NOT NULL DEFAULT 8192,
    "total_cpu_percent" integer NOT NULL DEFAULT 400,
    "total_storage_mb" integer NOT NULL DEFAULT 102400,
    "used_ram_mb" integer NOT NULL DEFAULT 0,
    "used_cpu_percent" integer NOT NULL DEFAULT 0,
    "used_storage_mb" integer NOT NULL DEFAULT 0,
    "docker_socket" text DEFAULT '/var/run/docker.sock',
    "auth_token" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  );`,

  // ============== PORTS ==============
  `CREATE TABLE IF NOT EXISTS "ports" (
    "id" serial PRIMARY KEY NOT NULL,
    "node_id" text NOT NULL REFERENCES "nodes"("id") ON DELETE CASCADE,
    "port" integer NOT NULL,
    "server_id" text,
    "allocated" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now()
  );`,

  // ============== SERVERS ==============
  `CREATE TABLE IF NOT EXISTS "servers" (
    "id" text PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "description" text,
    "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "node_id" text NOT NULL REFERENCES "nodes"("id"),
    "status" "server_status" NOT NULL DEFAULT 'STOPPED',
    "container_id" text,
    "docker_image" text NOT NULL DEFAULT 'node:20-alpine',
    "node_version" varchar(10) NOT NULL DEFAULT '20',
    "startup_command" text NOT NULL DEFAULT 'if [ -d .git ] && [ "\${AUTO_UPDATE}" = "1" ]; then git pull; fi; if [ -n "\${NODE_PACKAGES}" ]; then /usr/local/bin/npm install \${NODE_PACKAGES}; fi; if [ -n "\${UNNODE_PACKAGES}" ]; then /usr/local/bin/npm uninstall \${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/node /home/container/\${MAIN_FILE}',
    "ram_mb" integer NOT NULL DEFAULT 1024,
    "cpu_percent" integer NOT NULL DEFAULT 100,
    "storage_mb" integer NOT NULL DEFAULT 5120,
    "allocated_port" integer,
    "restart_policy" "restart_policy" NOT NULL DEFAULT 'OFF',
    "max_restarts" integer NOT NULL DEFAULT 3,
    "restart_delay" integer NOT NULL DEFAULT 5,
    "suspended" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  );`,

  // ============== SERVER ENVIRONMENT ==============
  `CREATE TABLE IF NOT EXISTS "server_environment" (
    "id" serial PRIMARY KEY NOT NULL,
    "server_id" text NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
    "key" varchar(255) NOT NULL,
    "value" text NOT NULL,
    "hidden" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now()
  );`,

  // ============== SERVER LOGS ==============
  `CREATE TABLE IF NOT EXISTS "server_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "server_id" text NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
    "level" varchar(20) NOT NULL DEFAULT 'info',
    "message" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
  );`,
  `CREATE INDEX IF NOT EXISTS "server_logs_server_id_idx" ON "server_logs"("server_id");`,

  // ============== BACKUPS ==============
  `CREATE TABLE IF NOT EXISTS "backups" (
    "id" text PRIMARY KEY NOT NULL,
    "server_id" text NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "size_mb" integer NOT NULL DEFAULT 0,
    "completed" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now()
  );`,

  // ============== RESELLER QUOTAS ==============
  `CREATE TABLE IF NOT EXISTS "reseller_quotas" (
    "id" serial PRIMARY KEY NOT NULL,
    "reseller_id" text NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "max_users" integer NOT NULL DEFAULT 10,
    "max_servers" integer NOT NULL DEFAULT 20,
    "max_ram_mb" integer NOT NULL DEFAULT 10240,
    "max_cpu_percent" integer NOT NULL DEFAULT 200,
    "max_storage_mb" integer NOT NULL DEFAULT 51200,
    "used_users" integer NOT NULL DEFAULT 0,
    "used_servers" integer NOT NULL DEFAULT 0,
    "used_ram_mb" integer NOT NULL DEFAULT 0,
    "used_cpu_percent" integer NOT NULL DEFAULT 0,
    "used_storage_mb" integer NOT NULL DEFAULT 0
  );`,

  // ============== API KEYS ==============
  `CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" text PRIMARY KEY NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "prefix" varchar(20) NOT NULL,
    "key_hash" text NOT NULL,
    "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "status" "api_key_status" NOT NULL DEFAULT 'ACTIVE',
    "rate_limit_per_minute" integer NOT NULL DEFAULT 60,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "expires_at" timestamp,
    "last_used_at" timestamp,
    "revoked_at" timestamp
  );`,

  // ============== API KEY USAGE ==============
  `CREATE TABLE IF NOT EXISTS "api_key_usage" (
    "id" serial PRIMARY KEY NOT NULL,
    "api_key_id" text NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
    "requests" integer NOT NULL DEFAULT 0,
    "window_start" timestamp NOT NULL DEFAULT now()
  );`,

  // ============== AUDIT LOGS ==============
  `CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" text,
    "api_key_id" text,
    "action" text NOT NULL,
    "resource" text,
    "resource_id" text,
    "endpoint" text,
    "method" varchar(10),
    "status_code" integer,
    "ip_address" text,
    "user_agent" text,
    "metadata" jsonb,
    "created_at" timestamp NOT NULL DEFAULT now()
  );`,
  `CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");`,
];

type G = typeof globalThis & { __birdserverMigrated?: boolean; __birdserverMigratePromise?: Promise<void> };
const g = globalThis as G;

async function doMigrate(): Promise<void> {
  console.log("[Migrate] Applying schema (idempotent)...");
  for (const stmt of STATEMENTS) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err) {
      console.warn("[Migrate] statement failed (continuing):", (err as Error).message.split("\n")[0]);
    }
  }
  console.log("[Migrate] Done.");
}

export async function ensureMigrated(): Promise<void> {
  if (g.__birdserverMigrated) return;
  if (!g.__birdserverMigratePromise) {
    g.__birdserverMigratePromise = doMigrate()
      .then(() => { g.__birdserverMigrated = true; })
      .catch((e) => {
        console.error("[Migrate] fatal:", e);
        g.__birdserverMigratePromise = undefined;
        throw e;
      });
  }
  try { await g.__birdserverMigratePromise; } catch { /* let next request retry */ }
}
