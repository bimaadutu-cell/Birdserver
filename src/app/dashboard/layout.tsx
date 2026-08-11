import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { ensureMigrated } from "@/lib/migrate";
import AppShell from "@/components/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await ensureMigrated();
    await ensureBootstrapped();
  } catch (err) {
    console.error("[DashboardLayout] bootstrap failed:", (err as Error).message);
  }
  const session = await getSession();
  if (!session) redirect("/login");
  return <AppShell role={session.user.role} username={session.user.username}>{children}</AppShell>;
}
