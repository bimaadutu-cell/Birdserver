import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { ensureMigrated } from "@/lib/migrate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return Response.json(
        { ok: false, service: "birdserver", ready: false, code: "DATABASE_URL_MISSING" },
        { status: 503 }
      );
    }

    await db.execute(sql`SELECT 1`);
    await ensureMigrated();
    await ensureBootstrapped();

    const admin = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`"username" = ${process.env.BIRDSERVER_ADMIN_USERNAME || "admin"}`)
      .limit(1);

    return Response.json({
      ok: true,
      service: "birdserver",
      version: "1.0.0",
      ready: true,
      database: "connected",
      admin: admin.length > 0,
    });
  } catch (error) {
    console.error("[Health] failed:", error);
    return Response.json(
      {
        ok: false,
        service: "birdserver",
        ready: false,
        code: "NOT_READY",
        message: "Database/schema belum siap.",
      },
      { status: 503 }
    );
  }
}
