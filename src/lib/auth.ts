import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return { sessionId, expiresAt };
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("birdserver_session")?.value;

  if (!sessionId) return null;

  const session = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session.length) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session[0].userId))
    .limit(1);

  if (!user.length) return null;

  return { session: session[0], user: user[0] };
}

export async function deleteSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function generateApiKey(): Promise<{ key: string; prefix: string; hash: string }> {
  const randomPart = randomBytes(32).toString("hex");
  const key = `bsk_live_${randomPart}`;
  const prefix = `bsk_live_${randomPart.substring(0, 8)}`;
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
