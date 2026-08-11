/**
 * GET /api/debug
 * Diagnostic endpoint for troubleshooting deploys (Railway, Vercel, etc.).
 * Public - only reveals safe metadata. NO secrets, NO password hashes.
 */

import { db, rawPool } from "@/db";
import { sql } from "drizzle-orm";
import { ensureMigrated } from "@/lib/migrate";
import { ensureBootstrapped } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

type StepResult = { step: string; ok: boolean; detail?: string; ms?: number };

async function timed<T>(step: string, fn: () => Promise<T>): Promise<StepResult> {
  const t0 = Date.now();
  try {
    await fn();
    return { step, ok: true, ms: Date.now() - t0 };
  } catch (err) {
    const e = err as Error;
    const cause = (err as { cause?: Error }).cause;
    return {
      step,
      ok: false,
      detail: `${e.message}${cause ? ` | cause: ${cause.message}` : ""}`.substring(0, 500),
      ms: Date.now() - t0,
    };
  }
}

export async function GET() {
  const steps: StepResult[] = [];

  // 1. Env check
  const hasUrl = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  steps.push({
    step: "env",
    ok: hasUrl,
    detail: hasUrl ? "DATABASE_URL is set" : "DATABASE_URL missing! Set it in Railway/Vercel env",
  });

  // 2. TCP ping
  steps.push(await timed("db-ping", async () => {
    await db.execute(sql`select 1 as ok`);
  }));

  // 3. Run migrate
  steps.push(await timed("migrate", async () => {
    await ensureMigrated(true);
  }));

  // 4. Check tables exist
  let tableList: string[] = [];
  const tableCheck = await timed("tables", async () => {
    const res = await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const rows = (res as unknown as { rows?: { table_name: string }[] }).rows
      ?? (res as unknown as { table_name: string }[]);
    tableList = rows.map((r) => r.table_name);
  });
  steps.push(tableCheck);

  // 5. Check users table columns specifically
  let userColumns: string[] = [];
  const userCheck = await timed("users-columns", async () => {
    const res = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    const rows = (res as unknown as { rows?: { column_name: string }[] }).rows
      ?? (res as unknown as { column_name: string }[]);
    userColumns = rows.map((r) => r.column_name);
  });
  steps.push(userCheck);

  // 6. Bootstrap (creates admin + node if missing)
  steps.push(await timed("bootstrap", async () => {
    await ensureBootstrapped();
  }));

  // 7. Try selecting admin
  let adminExists = false;
  const adminCheck = await timed("admin-select", async () => {
    const res = await db.execute(sql`SELECT username, email, role FROM users WHERE username = 'admin' LIMIT 1`);
    const rows = (res as unknown as { rows?: unknown[] }).rows ?? (res as unknown as unknown[]);
    adminExists = rows.length > 0;
  });
  steps.push(adminCheck);

  const allOk = steps.every((s) => s.ok);

  return Response.json({
    ok: allOk,
    service: "birdserver",
    version: "1.0.1",
    node: process.version,
    platform:
      process.env.RAILWAY_PROJECT_ID ? "railway" :
      process.env.VERCEL ? "vercel" :
      process.env.RENDER ? "render" :
      process.env.FLY_APP_NAME ? "fly" :
      "local",
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_present: !!process.env.DATABASE_URL,
      POSTGRES_URL_present: !!process.env.POSTGRES_URL,
    },
    pool: {
      totalCount: rawPool.totalCount,
      idleCount: rawPool.idleCount,
      waitingCount: rawPool.waitingCount,
    },
    tables: tableList,
    tablesCount: tableList.length,
    usersColumns: userColumns,
    adminExists,
    steps,
    hints: allOk
      ? ["All systems operational. Login with admin/admin00."]
      : [
          "Some checks failed. Check the 'steps' array above for details.",
          "Most common Railway issue: DATABASE_URL missing or wrong SSL setting.",
          "Fix: In Railway → Variables → make sure DATABASE_URL is set to the Postgres plugin's connection string.",
          "If tables missing after migrate: check that the DB user has CREATE TABLE permission.",
        ],
  }, { status: allOk ? 200 : 500 });
}
