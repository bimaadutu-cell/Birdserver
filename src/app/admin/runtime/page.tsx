import { NODE_VERSIONS } from "@/lib/utils";
import { IconRuntime, IconCheck } from "@/components/Icons";

export default function RuntimePage() {
  const runtimes = NODE_VERSIONS.map(v => ({
    version: v,
    image: `node:${v}-alpine`,
    status: "AVAILABLE",
    size: v === "18" ? "~180 MB" : v === "20" ? "~185 MB" : v === "22" ? "~190 MB" : "~195 MB",
    lts: v === "20" || v === "22",
  }));

  const commands = ["node --version", "npm --version", "npm install", "npm start"];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Runtime</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Available Node.js runtime environments (Docker images)
        </p>
      </div>

      {/* Runtime cards */}
      <div className="space-y-3">
        {runtimes.map(rt => (
          <div key={rt.version} className="glass-card rounded-2xl p-5">
            {/* Header row */}
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,230,118,0.15), rgba(0,200,255,0.1))",
                    border: "1px solid rgba(0,230,118,0.3)",
                  }}
                >
                  <IconRuntime size={22} color="#00e676" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                      Node.js {rt.version}
                    </span>
                    {rt.lts && <span className="badge badge-active text-[10px]">LTS</span>}
                  </div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {rt.image}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Image size</div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{rt.size}</div>
                </div>
                <span className="badge badge-active inline-flex items-center gap-1">
                  <IconCheck size={10} /> AVAILABLE
                </span>
              </div>
            </div>

            {/* Command samples */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {commands.map(cmd => (
                <div
                  key={cmd}
                  className="p-2 rounded-lg text-center"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <code className="text-xs font-mono block truncate" style={{ color: "var(--accent-cyan)" }}>
                    {cmd}
                  </code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Docker configuration */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-primary)" }}>
          Container Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            ["Container Runtime",  "Node.js child_process (VPS: Docker)"],
            ["Container Root",     "/home/container"],
            ["Network Mode",       "Bridge (isolated per server)"],
            ["Max Upload Size",    "2 GB per file"],
            ["Isolation",          "Per-server directory + env"],
            ["Auto-restart",       "OFF / ON_FAILURE / ALWAYS"],
            ["Shared Directory",   "/home/container/system (admin-managed)"],
            ["Startup Shell",      "/bin/sh -c (pterodactyl-compat)"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 py-2 px-3 rounded-lg" style={{ background: "rgba(0,200,255,0.03)", border: "1px solid var(--border-color)" }}>
              <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{k}</span>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
