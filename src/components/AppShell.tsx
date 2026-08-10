import Sidebar from "@/components/Sidebar";

export default function AppShell({
  role,
  username,
  children,
}: {
  role: string;
  username: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar role={role} username={username} />
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Mobile top-bar spacer so content never sits under the hamburger button */}
        <div className="h-16 lg:hidden flex-shrink-0" aria-hidden />
        <div className="p-4 sm:p-6 lg:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
