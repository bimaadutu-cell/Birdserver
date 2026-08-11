import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function ResellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "RESELLER" && session.user.role !== "ADMIN") redirect("/dashboard");
  return <AppShell role={session.user.role} username={session.user.username}>{children}</AppShell>;
}
