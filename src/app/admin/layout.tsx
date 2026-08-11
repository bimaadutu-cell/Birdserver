import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";

// Admin pages use cookies and live PostgreSQL data.
// Keep the entire admin route tree out of `next build` prerendering.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Database migration/bootstrap are intentionally NOT run here.
  // Railway runs migration before `next start`, and /api/health bootstraps
  // the application before the service is considered healthy.
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <AppShell role={session.user.role} username={session.user.username}>
      {children}
    </AppShell>
  );
}
