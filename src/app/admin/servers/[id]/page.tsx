export const dynamic = "force-dynamic";

import { db } from "@/db";
import { servers, users, nodes, serverEnvironment, serverLogs, backups } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import ServerControlPanel from "./ServerControlPanel";

export default async function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const serverResult = await db
    .select({
      server: servers,
      ownerUsername: users.username,
      ownerEmail: users.email,
      nodeName: nodes.name,
      nodeFqdn: nodes.fqdn,
    })
    .from(servers)
    .leftJoin(users, eq(servers.ownerId, users.id))
    .leftJoin(nodes, eq(servers.nodeId, nodes.id))
    .where(eq(servers.id, id))
    .limit(1);

  if (!serverResult.length) notFound();

  const { server, ownerUsername, ownerEmail, nodeName, nodeFqdn } = serverResult[0];

  const envVars = await db.select().from(serverEnvironment).where(eq(serverEnvironment.serverId, id));
  const recentLogs = await db.select().from(serverLogs).where(eq(serverLogs.serverId, id))
    .orderBy(sql`${serverLogs.createdAt} DESC`).limit(50);
  const serverBackups = await db.select().from(backups).where(eq(backups.serverId, id))
    .orderBy(sql`${backups.createdAt} DESC`).limit(10);

  const allUsers = await db.select({ id: users.id, username: users.username }).from(users).orderBy(sql`${users.username}`);
  const allNodes = await db.select({ id: nodes.id, name: nodes.name }).from(nodes);

  return (
    <ServerControlPanel
      server={server}
      ownerUsername={ownerUsername || ""}
      ownerEmail={ownerEmail || ""}
      nodeName={nodeName || ""}
      nodeFqdn={nodeFqdn || ""}
      envVars={envVars}
      recentLogs={recentLogs}
      backups={serverBackups}
      allUsers={allUsers}
      allNodes={allNodes}
      isAdmin={true}
    />
  );
}
