export const dynamic = "force-dynamic";

import { db } from "@/db";
import { servers, users, nodes, serverEnvironment, serverLogs, backups } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ServerControlPanel from "@/app/admin/servers/[id]/ServerControlPanel";

export default async function UserServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

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

  const { server, ownerUsername, ownerEmail, nodeName, nodeFqdn } =
    serverResult[0];

  // Users can only see their own servers
  if (
    session.user.role !== "ADMIN" &&
    server.ownerId !== session.user.id
  ) {
    redirect("/servers");
  }

  const envVars = await db
    .select()
    .from(serverEnvironment)
    .where(eq(serverEnvironment.serverId, id));

  const recentLogs = await db
    .select()
    .from(serverLogs)
    .where(eq(serverLogs.serverId, id))
    .orderBy(sql`${serverLogs.createdAt} DESC`)
    .limit(50);

  const serverBackups = await db
    .select()
    .from(backups)
    .where(eq(backups.serverId, id))
    .orderBy(sql`${backups.createdAt} DESC`)
    .limit(10);

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
      allUsers={[]}
      allNodes={[]}
      isAdmin={session.user.role === "ADMIN"}
    />
  );
}
