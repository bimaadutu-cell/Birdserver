export const dynamic = "force-dynamic";

import { db } from "@/db";
import { apiKeys, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import EditApiKeyForm from "./EditApiKeyForm";

export default async function EditApiKeyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keyResult = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (!keyResult.length) notFound();

  const allUsers = await db.select({ id: users.id, username: users.username, role: users.role }).from(users).orderBy(sql`${users.username}`);

  return <EditApiKeyForm apiKey={keyResult[0]} users={allUsers} />;
}
