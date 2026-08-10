export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EditUserForm from "./EditUserForm";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userResult = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!userResult.length) notFound();

  return <EditUserForm user={userResult[0]} />;
}
