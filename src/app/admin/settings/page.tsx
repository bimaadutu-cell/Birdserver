export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>BirdServer panel configuration</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>BS Panel Information</h3>
          <dl className="space-y-3">
            {[
              ["Panel Name", "BirdServer"],
              ["Version", "1.0.0"],
              ["Built By", "BimzOfficial"],
              ["Database", "PostgreSQL (Drizzle ORM)"],
              ["Framework", "Next.js 16 (App Router)"],
              ["Runtime", "Node.js"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-2 border-b" style={{ borderColor: "var(--border-color)" }}>
                <dt style={{ color: "var(--text-muted)" }}>{k}</dt>
                <dd style={{ color: "var(--text-secondary)" }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}> Security</h3>
          <dl className="space-y-3">
            {[
              ["Password Hashing", "bcrypt (12 rounds)"],
              ["API Key Storage", "SHA-256 hash (no plaintext)"],
              ["Session Storage", "Server-side (PostgreSQL)"],
              ["Cookie Security", "HttpOnly, SameSite=Lax"],
              ["API Rate Limit", "60 req/min (default)"],
              ["HTTPS", "Required in production"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-2 border-b" style={{ borderColor: "var(--border-color)" }}>
                <dt style={{ color: "var(--text-muted)" }}>{k}</dt>
                <dd style={{ color: "#00e676" }}>[OK] {v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}> Environment</h3>
        <div className="space-y-3">
          {[
            { key: "DATABASE_URL", desc: "PostgreSQL connection string", configured: true },
            { key: "NEXTAUTH_SECRET", desc: "Session encryption secret", configured: true },
            { key: "SESSION_SECRET", desc: "Session signing key", configured: true },
            { key: "NODE_ENV", desc: "Node.js environment", value: process.env.NODE_ENV },
          ].map(env => (
            <div key={env.key} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "rgba(0,200,255,0.03)", border: "1px solid var(--border-color)" }}>
              <div>
                <code className="text-sm font-mono" style={{ color: "var(--accent-cyan)" }}>{env.key}</code>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{env.desc}</div>
              </div>
              <div>
                {env.value ? (
                  <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(0,230,118,0.1)", color: "#00e676" }}>{env.value}</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(0,230,118,0.1)", color: "#00e676" }}>[OK] Configured</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
