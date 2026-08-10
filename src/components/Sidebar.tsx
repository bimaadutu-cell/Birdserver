"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconBird, IconDashboard, IconServer, IconUsers, IconReseller, IconNode,
  IconKey, IconCpu, IconPort, IconLogs, IconAudit, IconRuntime, IconSettings,
  IconLogout, IconMenu, IconClose, IconActivity,
} from "@/components/Icons";

interface SidebarProps { role: string; username: string; }

interface NavItem {
  href?: string;
  label: string;
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
  children?: { href: string; label: string }[];
}

interface NavGroup { label?: string; items: NavItem[]; }

export default function Sidebar({ role, username }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["SERVERS", "USERS", "RESELLERS", "NODES", "API", "SYSTEM", "MANAGEMENT"]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = role === "ADMIN";
  const isReseller = role === "RESELLER";

  const navGroups: NavGroup[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
      ],
    },
    {
      label: "SERVERS",
      items: [
        {
          label: "Servers",
          Icon: IconServer,
          children: [
            { href: isAdmin ? "/admin/servers" : "/servers", label: "All Servers" },
            { href: isAdmin ? "/admin/servers/create" : "/servers/create", label: "Create Server" },
          ],
        },
      ],
    },
    ...(isAdmin ? [{
      label: "USERS",
      items: [
        {
          label: "Users",
          Icon: IconUsers,
          children: [
            { href: "/admin/users", label: "All Users" },
            { href: "/admin/users/create", label: "Create User" },
          ],
        },
      ],
    }] : []),
    ...(isAdmin ? [{
      label: "RESELLERS",
      items: [
        {
          label: "Resellers",
          Icon: IconReseller,
          children: [
            { href: "/admin/resellers", label: "All Resellers" },
            { href: "/admin/resellers/create", label: "Create Reseller" },
          ],
        },
      ],
    }] : []),
    ...(isReseller ? [{
      label: "MANAGEMENT",
      items: [
        {
          label: "My Users",
          Icon: IconUsers,
          children: [
            { href: "/reseller/users", label: "All Users" },
            { href: "/reseller/users/create", label: "Create User" },
          ],
        },
        { href: "/reseller/quota", label: "My Quota", Icon: IconActivity },
      ],
    }] : []),
    ...(isAdmin ? [{
      label: "NODES",
      items: [
        {
          label: "Nodes",
          Icon: IconNode,
          children: [
            { href: "/admin/nodes", label: "All Nodes" },
            { href: "/admin/nodes/create", label: "Create Node" },
          ],
        },
      ],
    }] : []),
    ...(isAdmin ? [{
      label: "API",
      items: [
        {
          label: "API",
          Icon: IconKey,
          children: [
            { href: "/admin/api-keys", label: "API Keys" },
            { href: "/admin/api-keys/create", label: "Create API Key" },
            { href: "/admin/api-docs", label: "Documentation" },
          ],
        },
      ],
    }] : []),
    ...(isAdmin ? [{
      label: "SYSTEM",
      items: [
        { href: "/admin/resources",  label: "Resources",  Icon: IconCpu },
        { href: "/admin/ports",      label: "Ports",      Icon: IconPort },
        { href: "/admin/logs",       label: "Logs",       Icon: IconLogs },
        { href: "/admin/audit-logs", label: "Audit Logs", Icon: IconAudit },
        { href: "/admin/runtime",    label: "Runtime",    Icon: IconRuntime },
        { href: "/admin/settings",   label: "Settings",   Icon: IconSettings },
      ],
    }] : []),
  ];

  const toggleGroup = (label: string) => {
    setExpandedGroups(p => p.includes(label) ? p.filter(g => g !== label) : [...p, label]);
  };
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(0,128,255,0.25), rgba(0,200,255,0.15))",
              border: "1px solid rgba(0,200,255,0.4)",
              boxShadow: "0 0 20px rgba(0,200,255,0.2), inset 0 0 10px rgba(0,200,255,0.08)",
              backdropFilter: "blur(20px)",
            }}
          >
            <IconBird size={24} />
          </div>
          <div>
            <div className="font-bold text-sm gradient-text tracking-wide">BIRDSERVER</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Hosting Panel</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "pt-3" : ""}>
            {group.label && (
              <div
                className="px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase cursor-pointer flex items-center justify-between"
                style={{ color: "var(--text-muted)" }}
                onClick={() => toggleGroup(group.label!)}
              >
                <span>{group.label}</span>
                <span className="text-[10px]">{expandedGroups.includes(group.label) ? "" : ""}</span>
              </div>
            )}
            {(!group.label || expandedGroups.includes(group.label)) && group.items.map((item, ii) => {
              if (item.children) {
                const grpExp = expandedGroups.includes(item.label);
                return (
                  <div key={ii}>
                    <button onClick={() => toggleGroup(item.label)} className="nav-item">
                      {item.Icon && <item.Icon size={16} />}
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{grpExp ? "" : ""}</span>
                    </button>
                    {grpExp && (
                      <div className="ml-6 space-y-0.5 mt-0.5">
                        {item.children.map(child => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`nav-item text-xs py-1.5 ${isActive(child.href) ? "active" : ""}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="opacity-40">&#8226;</span>
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return item.href ? (
                <Link
                  key={ii}
                  href={item.href}
                  className={`nav-item ${isActive(item.href) ? "active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.Icon && <item.Icon size={16} />}
                  {item.label}
                </Link>
              ) : null;
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3 mb-3 px-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0080ff, #00c8ff)" }}
          >
            {username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{username}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{role}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-secondary w-full flex items-center justify-center gap-2 text-xs py-2">
          <IconLogout size={13} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar with hamburger + logo + brand */}
      <header
        className="fixed top-0 left-0 right-0 h-16 z-40 lg:hidden flex items-center justify-between px-4"
        style={{
          background: "rgba(5,10,20,0.9)",
          borderBottom: "1px solid var(--border-color)",
          backdropFilter: "blur(20px)",
        }}
      >
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          {mobileOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
        </button>
        <div className="flex items-center gap-2">
          <IconBird size={22} />
          <span className="text-sm font-bold gradient-text tracking-wide">BIRDSERVER</span>
        </div>
        <div
          className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded"
          style={{ background: "rgba(0,200,255,0.1)", color: "var(--accent-cyan)", border: "1px solid rgba(0,200,255,0.2)" }}
        >
          {role}
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 z-50 transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{
          background: "rgba(5,10,20,0.98)",
          borderRight: "1px solid var(--border-color)",
          backdropFilter: "blur(24px)",
        }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
