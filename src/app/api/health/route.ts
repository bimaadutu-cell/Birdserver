import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { ensureMigrated } from "@/lib/migrate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureMigrated();
    await ensureBootstrapped();
    return Response.json({ ok: true, service: "birdserver", version: "1.0.0", ready: true });
  } catch (err) {
    return Response.json(
      { ok: false, service: "birdserver", ready: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
