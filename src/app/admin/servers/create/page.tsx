export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users, nodes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import CreateServerForm from "./CreateServerForm";

export default async function CreateServerPage() {
  const allUsers = await db.select({ id: users.id, username: users.username, email: users.email }).from(users).orderBy(sql`${users.username}`);
  const allNodes = await db.select({ id: nodes.id, name: nodes.name, fqdn: nodes.fqdn, status: nodes.status }).from(nodes);

  return <CreateServerForm users={allUsers} nodes={allNodes} />;
}
