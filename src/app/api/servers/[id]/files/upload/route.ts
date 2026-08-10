import { NextRequest } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, apiError, apiSuccess } from "@/lib/api-auth";
import { uploadFile, extractZip } from "@/lib/filesystem";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req, "servers:files");
  if (!auth.success) return apiError(auth.error!.code, auth.error!.message, auth.statusCode!);

  const { id } = await params;
  const server = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  if (!server.length) return apiError("RESOURCE_NOT_FOUND", "Server not found.", 404);
  const isAdmin = auth.scopes.includes("admin:*") || auth.user?.role === "ADMIN";
  if (!isAdmin && server[0].ownerId !== auth.user?.id) return apiError("FORBIDDEN", "Access denied.", 403);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const dir = (formData.get("path") as string) || "/";
    const shouldExtract = formData.get("extract") === "true";

    if (!file) return apiError("MISSING_FIELDS", "file field required.", 400);

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length > 2 * 1024 * 1024 * 1024) {
      return apiError("FILE_TOO_LARGE", "Maximum upload size is 2 GB.", 413);
    }

    await uploadFile(id, dir, file.name, buffer);

    let extractResult = null;
    if (shouldExtract && file.name.toLowerCase().endsWith(".zip")) {
      const zipPath = dir === "/" ? `/${file.name}` : `${dir}/${file.name}`;
      extractResult = await extractZip(id, zipPath, dir);
    }

    return apiSuccess({
      uploaded: file.name,
      size: buffer.length,
      path: dir,
      extracted: extractResult,
    });
  } catch (err) {
    return apiError("UPLOAD_ERROR", (err as Error).message, 500);
  }
}
