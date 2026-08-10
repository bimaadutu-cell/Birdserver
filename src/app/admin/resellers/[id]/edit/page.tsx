export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users, resellerQuotas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EditResellerForm from "./EditResellerForm";

export default async function EditResellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await db.select({ user: users, quota: resellerQuotas })
    .from(users).leftJoin(resellerQuotas, eq(users.id, resellerQuotas.resellerId))
    .where(eq(users.id, id)).limit(1);
  if (!result.length || result[0].user.role !== "RESELLER") notFound();
  return <EditResellerForm user={result[0].user} quota={result[0].quota} />;
}
