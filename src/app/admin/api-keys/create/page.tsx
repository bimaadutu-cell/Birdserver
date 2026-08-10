export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";
import CreateApiKeyForm from "./CreateApiKeyForm";

export default async function CreateApiKeyPage() {
  const allUsers = await db.select({ id: users.id, username: users.username, role: users.role }).from(users).orderBy(sql`${users.username}`);
  return <CreateApiKeyForm users={allUsers} />;
}
