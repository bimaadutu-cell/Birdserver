import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";

export default async function RootPage() {
  await ensureBootstrapped();
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
