import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { authenticate, apiError, apiSuccess, logAudit } from "@/lib/api-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "users:read");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user.length) return apiError("RESOURCE_NOT_FOUND", "User not found.", 404);
  const { passwordHash, ...safe } = user[0];
  return apiSuccess(safe);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "users:update");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const body = await req.json();
  const { username, email, password, firstName, lastName, role, suspended } = body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (username !== undefined) updateData.username = username;
  if (email !== undefined) updateData.email = email;
  if (firstName !== undefined) updateData.firstName = firstName || null;
  if (lastName !== undefined) updateData.lastName = lastName || null;
  if (role !== undefined) {
    if (!auth.scopes.includes("admin:*") && auth.user?.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Only ADMIN can change roles.", 403);
    }
    updateData.role = role;
  }
  if (suspended !== undefined) updateData.suspended = suspended;
  if (password) updateData.passwordHash = await hashPassword(password);

  const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
  if (!updated) return apiError("RESOURCE_NOT_FOUND", "User not found.", 404);

  await logAudit({
    userId: auth.user?.id,
    apiKeyId: auth.apiKey?.id,
    action: "UPDATE",
    resource: "user",
    resourceId: id,
    endpoint: `/api/users/${id}`,
    method: "PATCH",
    statusCode: 200,
  });

  const { passwordHash, ...safe } = updated;
  return apiSuccess(safe);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "users:delete");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  if (auth.user && id === auth.user.id) {
    return apiError("FORBIDDEN", "Cannot delete your own account.", 403);
  }

  await db.delete(users).where(eq(users.id, id));
  await logAudit({
    userId: auth.user?.id,
    apiKeyId: auth.apiKey?.id,
    action: "DELETE",
    resource: "user",
    resourceId: id,
    endpoint: `/api/users/${id}`,
    method: "DELETE",
    statusCode: 200,
  });
  return apiSuccess({ deleted: true });
}
