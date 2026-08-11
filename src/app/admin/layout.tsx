import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { ensureMigrated } from "@/lib/migrate";
import AppShell from "@/components/AppShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guarantee schema + admin user exist before any admin page loads
  try {
    await ensureMigrated();
    await ensureBootstrapped();
  } catch (err) {
    console.error("[AdminLayout] bootstrap failed:", (err as Error).message);
  }

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return <AppShell role={session.user.role} username={session.user.username}>{children}</AppShell>;
}
