export const dynamic = "force-dynamic";

import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EditNodeForm from "./EditNodeForm";

export default async function EditNodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const node = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1);
  if (!node.length) notFound();
  return <EditNodeForm node={node[0]} />;
}
