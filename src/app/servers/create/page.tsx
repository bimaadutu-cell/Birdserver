export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function UserCreateServerPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Only admin/reseller can create servers
  if (session.user.role === "USER") {
    redirect("/servers");
  }

  redirect("/admin/servers/create");
}
