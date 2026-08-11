export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers } from "next/headers";

export default async function ApiDocsPage() {
  const hdrs = await headers();
  const host = hdrs.get("host") || "your-domain.com";
  const proto = hdrs.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  const endpoints = [
    {
      category: "\u25CF Authentication",
      items: [
        { method: "POST", path: "/api/auth/login", desc: "Session login (web UI)", body: '{"username": "admin", "password": "admin00"}' },
        { method: "POST", path: "/api/auth/logout", desc: "Logout current session" },
        { method: "GET",  path: "/api/auth/me",     desc: "Get current authenticated user" },
      ],
    },
    {
      category: "\u25CF Users",
      items: [
        { method: "GET",    path: "/api/users",       desc: "List users (admin sees all, reseller sees own)", scope: "users:read" },
        { method: "POST",   path: "/api/users",       desc: "Create a user. Returns credentials once.", scope: "users:create",
          body: '{\n  "username": "newuser",\n  "email": "user@example.com",\n  "password": "SecurePass123",\n  "role": "USER"\n}' },
        { method: "GET",    path: "/api/users/:id",   desc: "Fetch user metadata",  scope: "users:read" },
        { method: "PATCH",  path: "/api/users/:id",   desc: "Update user fields",   scope: "users:update" },
        { method: "DELETE", path: "/api/users/:id",   desc: "Delete a user",        scope: "users:delete" },
      ],
    },
    {
      category: "\u25CF Servers",
      items: [
        { method: "GET",    path: "/api/servers",              desc: "List servers",  scope: "servers:read" },
        { method: "POST",   path: "/api/servers",              desc: "Create a server. Accepts ownerUsername for convenience.", scope: "servers:create",
          body: '{\n  "name": "user-bot-01",\n  "ownerUsername": "newuser",\n  "nodeVersion": "20",\n  "startupCommand": "npm install && npm start",\n  "ramMb": 1024,\n  "cpuPercent": 100,\n  "storageMb": 5120,\n  "restartPolicy": "ON_FAILURE"\n}' },
        { method: "GET",    path: "/api/servers/:id",          desc: "Get server details", scope: "servers:read" },
        { method: "PATCH",  path: "/api/servers/:id",          desc: "Update server",      scope: "servers:update" },
        { method: "DELETE", path: "/api/servers/:id",          desc: "Delete server + files", scope: "servers:delete" },
      ],
    },
    {
      category: "\u25B6 Server Control",
      items: [
        { method: "POST", path: "/api/servers/:id/start",   desc: "Start server (spawns real Node.js process)", scope: "servers:start" },
        { method: "POST", path: "/api/servers/:id/stop",    desc: "Graceful stop (SIGTERM)",   scope: "servers:stop" },
        { method: "POST", path: "/api/servers/:id/restart", desc: "Restart server", scope: "servers:restart" },
        { method: "POST", path: "/api/servers/:id/kill",    desc: "Force kill (SIGKILL)", scope: "servers:kill" },
        { method: "GET",  path: "/api/servers/:id/stats",   desc: "Live PID, CPU, memory, uptime", scope: "servers:read" },
      ],
    },
    {
      category: "\u25CF Console + Logs",
      items: [
        { method: "GET",  path: "/api/servers/:id/console",          desc: "Get buffered log lines", scope: "servers:console" },
        { method: "GET",  path: "/api/servers/:id/console?stream=1", desc: "Live SSE stream of stdout/stderr", scope: "servers:console" },
        { method: "POST", path: "/api/servers/:id/console",          desc: "Send input to stdin. Body: { input: string }", scope: "servers:console" },
        { method: "GET",  path: "/api/servers/:id/logs",             desc: "Get persisted server logs", scope: "logs:read" },
      ],
    },
    {
      category: "\u25A0 Files",
      items: [
        { method: "GET",    path: "/api/servers/:id/files?path=/",                       desc: "List directory contents", scope: "servers:files" },
        { method: "GET",    path: "/api/servers/:id/files?action=read&path=/index.js",   desc: "Read file contents (text)", scope: "servers:files" },
        { method: "POST",   path: "/api/servers/:id/files",                              desc: "action=write|mkdir|rename", scope: "servers:files" },
        { method: "DELETE", path: "/api/servers/:id/files?path=/name",                   desc: "Delete file or directory", scope: "servers:files" },
        { method: "POST",   path: "/api/servers/:id/files/upload",                       desc: "multipart/form-data upload (max 2GB). Auto-extracts .zip if extract=true", scope: "servers:files" },
        { method: "POST",   path: "/api/servers/:id/files/extract",                      desc: "Extract an existing zip on disk", scope: "servers:files" },
        { method: "GET",    path: "/api/servers/:id/files/download?path=/index.js",      desc: "Download raw file", scope: "servers:files" },
      ],
    },
    {
      category: "\u25CF Environment",
      items: [
        { method: "GET", path: "/api/servers/:id/environment", desc: "Get env vars (secrets masked)", scope: "servers:environment" },
        { method: "PUT", path: "/api/servers/:id/environment", desc: "Replace env vars. Body: { vars: [{key,value,hidden}] }", scope: "servers:environment" },
      ],
    },
    {
      category: "\u2726 Resellers",
      items: [
        { method: "GET",    path: "/api/resellers",     desc: "List resellers", scope: "resellers:read" },
        { method: "POST",   path: "/api/resellers",     desc: "Create reseller + quota", scope: "resellers:create" },
        { method: "GET",    path: "/api/resellers/:id", desc: "Get reseller with quota", scope: "resellers:read" },
        { method: "PATCH",  path: "/api/resellers/:id", desc: "Update reseller / quota", scope: "resellers:update" },
        { method: "DELETE", path: "/api/resellers/:id", desc: "Delete reseller", scope: "resellers:delete" },
      ],
    },
    {
      category: "\u2605 API Keys (Admin only)",
      items: [
        { method: "GET",    path: "/api/api-keys",            desc: "List API keys metadata", scope: "api_keys:read" },
        { method: "POST",   path: "/api/api-keys",            desc: "Create API key", scope: "api_keys:create" },
        { method: "GET",    path: "/api/api-keys/:id",        desc: "Get metadata (no secret)", scope: "api_keys:read" },
        { method: "PATCH",  path: "/api/api-keys/:id",        desc: "Update name, scopes, status", scope: "api_keys:read" },
        { method: "POST",   path: "/api/api-keys/:id/revoke", desc: "Revoke API key", scope: "api_keys:revoke" },
        { method: "POST",   path: "/api/api-keys/:id/rotate", desc: "Rotate: new secret, old revoked", scope: "api_keys:rotate" },
        { method: "DELETE", path: "/api/api-keys/:id",        desc: "Permanently delete", scope: "api_keys:revoke" },
      ],
    },
  ];

  const errors = [
    { code: "INVALID_API_KEY",      status: 401, desc: "Missing, malformed, or unknown API key." },
    { code: "EXPIRED_API_KEY",      status: 401, desc: "API key past its expiration." },
    { code: "REVOKED_API_KEY",      status: 401, desc: "API key has been revoked." },
    { code: "UNAUTHORIZED",         status: 401, desc: "No session cookie or Bearer token." },
    { code: "INSUFFICIENT_SCOPE",   status: 403, desc: "API key lacks required scope." },
    { code: "FORBIDDEN",            status: 403, desc: "Authenticated but not allowed." },
    { code: "RESOURCE_NOT_FOUND",   status: 404, desc: "Target resource does not exist." },
    { code: "RATE_LIMITED",         status: 429, desc: "API key exceeded its rate limit." },
    { code: "MISSING_FIELDS",       status: 400, desc: "Required body fields missing." },
    { code: "VALIDATION_ERROR",     status: 400, desc: "Field value did not pass validation." },
    { code: "USERNAME_TAKEN",       status: 409, desc: "Username already exists." },
    { code: "EMAIL_TAKEN",          status: 409, desc: "Email already registered." },
  ];

  const methodColor = (m: string) => ({
    GET: "#00e676",
    POST: "#00c8ff",
    PATCH: "#ffab40",
    PUT: "#ffab40",
    DELETE: "#ff5252",
  }[m as "GET"] || "#6b8cad");

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      {/* ==================== HEADER ==================== */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl" style={{ color: "var(--accent-cyan)" }}>&#9776;</span>
          <h1 className="text-3xl font-bold gradient-text">API Documentation</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          BirdServer REST API &middot; v1.0 &middot; built for auto-order bots (WhatsApp / Telegram)
        </p>
      </div>

      {/* ==================== BASE URL + AUTH ==================== */}
      <div className="glass-card rounded-2xl p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>&#9873; Base URL</div>
            <code className="text-sm font-mono block p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.4)", color: "var(--accent-cyan)", border: "1px solid var(--border-color)" }}>
              {baseUrl}
            </code>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>&#128273; Authorization Header</div>
            <code className="text-sm font-mono block p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.4)", color: "var(--accent-cyan)", border: "1px solid var(--border-color)" }}>
              Authorization: Bearer bsk_live_...
            </code>
          </div>
        </div>
      </div>

      {/* ==================== FEATURED: PROVISION ENDPOINT ==================== */}
      <div className="glass-card rounded-2xl p-6" style={{ borderColor: "rgba(0,230,118,0.5)", background: "linear-gradient(135deg, rgba(0,230,118,0.04), rgba(0,200,255,0.04))", boxShadow: "0 0 30px rgba(0,230,118,0.1)" }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl" style={{ color: "#00e676" }}>&#9733;</span>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#00e676" }}>ONE-CALL PROVISION</h2>
            <div className="text-xs uppercase tracking-widest mt-0.5" style={{ color: "var(--text-muted)" }}>The endpoint you should use in your bot</div>
          </div>
        </div>

        <div className="rounded-xl p-3 my-4" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(0,230,118,0.3)" }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: "rgba(0,200,255,0.2)", color: "#00c8ff", minWidth: 62, textAlign: "center" }}>POST</span>
            <code className="text-base font-mono font-semibold" style={{ color: "#00e676" }}>/api/provision</code>
          </div>
        </div>

        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Creates the account AND (for USER) provisions the server AND optionally auto-starts it &mdash; all in <strong style={{ color: "#00e676" }}>one HTTP call</strong>.
          The role your customer selects in your bot determines what gets built and its permissions on the panel.
        </p>

        {/* Role summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl p-3" style={{ background: "rgba(0,200,255,0.05)", border: "1px solid var(--border-color)" }}>
            <div className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: "#6eb4ff" }}>
              <span>&#9679;</span> role: USER
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Creates USER account + hosting server. Optionally auto-starts. User can only manage their own server.</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,171,64,0.05)", border: "1px solid var(--border-color)" }}>
            <div className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: "#ffab40" }}>
              <span>&#10038;</span> role: RESELLER
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Creates RESELLER account + assigns quota. Reseller can create their own USERs within quota.</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(0,200,255,0.05)", border: "1px solid var(--border-color)" }}>
            <div className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: "#00c8ff" }}>
              <span>&#9733;</span> role: ADMIN
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Full ADMIN. Requires <code>admin:*</code> scope on the API key.</div>
          </div>
        </div>

        {/* Example USER */}
        <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          &#9679; Example  USER + server + auto-start
        </div>
        <div className="rounded-xl p-4 mb-4 overflow-x-auto" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border-color)" }}>
          <pre className="text-xs font-mono" style={{ color: "#00e676" }}>
{`curl -X POST "${baseUrl}/api/provision" \\
  -H "Authorization: Bearer bsk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "role": "USER",
    "username": "customer_001",
    "email":    "cust001@bird.local",
    "password": "AutoPass_9x2K",
    "server": {
      "name":           "customer_001-bot",
      "nodeVersion":    "20",
      "startupCommand": "npm install && npm start",
      "ramMb":          1024,
      "cpuPercent":     100,
      "storageMb":      5120,
      "restartPolicy":  "ON_FAILURE",
      "autoStart":      true
    }
  }'`}
          </pre>
        </div>

        {/* Example RESELLER */}
        <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          &#10038; Example  RESELLER with custom quota
        </div>
        <div className="rounded-xl p-4 mb-4 overflow-x-auto" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border-color)" }}>
          <pre className="text-xs font-mono" style={{ color: "#ffab40" }}>
{`curl -X POST "${baseUrl}/api/provision" \\
  -H "Authorization: Bearer bsk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "role": "RESELLER",
    "username": "reseller_shop_01",
    "email":    "reseller01@bird.local",
    "password": "ResellerPass2024",
    "quota": {
      "maxUsers":      20,
      "maxServers":    50,
      "maxRamMb":      51200,
      "maxCpuPercent": 500,
      "maxStorageMb":  204800
    }
  }'`}
          </pre>
        </div>

        {/* Example ADMIN */}
        <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          &#9733; Example  ADMIN (requires admin:* scope)
        </div>
        <div className="rounded-xl p-4 mb-4 overflow-x-auto" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border-color)" }}>
          <pre className="text-xs font-mono" style={{ color: "#00c8ff" }}>
{`curl -X POST "${baseUrl}/api/provision" \\
  -H "Authorization: Bearer bsk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "role": "ADMIN",
    "username": "new_admin",
    "email":    "admin@bird.local",
    "password": "AdminPass2024"
  }'`}
          </pre>
        </div>

        {/* Response */}
        <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          &#8623; Response 201  deliver credentials via your bot
        </div>
        <div className="rounded-xl p-4 overflow-x-auto" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border-color)" }}>
          <pre className="text-xs font-mono" style={{ color: "#c8e6ff" }}>
{`{
  "success": true,
  "data": {
    "role": "USER",
    "user":  { "id": "...", "username": "customer_001", "role": "USER" },
    "credentials": {
      "username": "customer_001",
      "password": "AutoPass_9x2K",
      "loginUrl": "${baseUrl}/login"
    },
    "server":  { "id": "...", "name": "...", "status": "RUNNING", ... },
    "started": { "pid": 1234, "startedAt": "..." },
    "quota":   null
  }
}`}
          </pre>
        </div>

        {/* Scopes */}
        <div className="mt-5 p-4 rounded-xl" style={{ background: "rgba(0,200,255,0.05)", border: "1px solid var(--border-color)" }}>
          <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>&#9873; Required scopes per role</div>
          <ul className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
            <li>&#9679; USER (with server):  <code style={{ color: "var(--accent-cyan)" }}>users:create + servers:create</code></li>
            <li>&#9679; USER (no server):    <code style={{ color: "var(--accent-cyan)" }}>users:create</code></li>
            <li>&#10038; RESELLER:            <code style={{ color: "var(--accent-cyan)" }}>resellers:create</code></li>
            <li>&#9733; ADMIN:                <code style={{ color: "var(--accent-cyan)" }}>admin:*</code> (mandatory)</li>
          </ul>
          <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
            &#9432; Tip for a single bot key: assign <code style={{ color: "var(--accent-cyan)" }}>admin:*</code> so one key handles every scenario.
          </div>
        </div>
      </div>

      {/* ==================== BOT INTEGRATION SNIPPET ==================== */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          &#9873; Node.js snippet for WhatsApp / Telegram bot
        </h2>
        <div className="rounded-xl p-4 overflow-x-auto" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border-color)" }}>
          <pre className="text-xs font-mono" style={{ color: "#c8e6ff" }}>
{`// bot.js
const BS_URL = "${baseUrl}";
const BS_KEY = process.env.BIRDSERVER_KEY; // never hardcode

async function provisionOrder(order) {
  const res = await fetch(BS_URL + "/api/provision", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + BS_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role:     order.role,               // "USER" | "RESELLER" | "ADMIN"
      username: order.username,
      email:    order.email,
      password: order.password,
      // USER-only:
      server: order.role === "USER" ? {
        name:           order.username + "-bot",
        nodeVersion:    "20",
        startupCommand: "npm install && npm start",
        ramMb:          order.ramMb || 1024,
        autoStart:      true,
      } : undefined,
      // RESELLER-only:
      quota: order.role === "RESELLER" ? {
        maxUsers:   order.maxUsers   || 10,
        maxServers: order.maxServers || 20,
        maxRamMb:   order.maxRamMb   || 10240,
      } : undefined,
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error.code + ": " + data.error.message);
  return data.data;
}

// Usage in your bot command handler:
// const result = await provisionOrder({ role: "USER", username: "...", ... });
// await sendWhatsApp(order.phone, "Panel: " + result.credentials.loginUrl
//   + "\\nUser: " + result.credentials.username
//   + "\\nPass: " + result.credentials.password);`}
          </pre>
        </div>
      </div>

      {/* ==================== ALL ENDPOINTS ==================== */}
      <div>
        <h2 className="text-2xl font-bold mb-4 gradient-text">&#9784; Full endpoint reference</h2>

        {endpoints.map(section => (
          <div key={section.category} className="glass-card rounded-2xl overflow-hidden mb-4">
            <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{section.category}</h3>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(0,200,255,0.05)" }}>
              {section.items.map((endpoint, i) => (
                <div key={i} className="p-5">
                  <div className="flex items-start gap-4">
                    <span
                      className="text-xs font-bold font-mono px-2 py-1 rounded flex-shrink-0"
                      style={{ background: `${methodColor(endpoint.method)}20`, color: methodColor(endpoint.method), minWidth: 62, textAlign: "center" }}
                    >
                      {endpoint.method}
                    </span>
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono break-all" style={{ color: "var(--text-primary)" }}>{endpoint.path}</code>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{endpoint.desc}</p>
                      {"scope" in endpoint && endpoint.scope && (
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded font-mono" style={{ background: "rgba(0,128,255,0.1)", color: "#6eb4ff" }}>
                          scope: {endpoint.scope}
                        </span>
                      )}
                      {"body" in endpoint && endpoint.body && (
                        <div className="mt-3 rounded-lg p-3 overflow-x-auto" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border-color)" }}>
                          <pre className="text-xs font-mono" style={{ color: "#00e676" }}>{endpoint.body}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ==================== RESPONSE FORMAT ==================== */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>&#8623; Response Format</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: "#00e676" }}>&#10003; Success</div>
            <pre className="text-xs font-mono p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.4)", color: "#00e676", border: "1px solid var(--border-color)" }}>
{`{
  "success": true,
  "data": { ... }
}`}
            </pre>
          </div>
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: "#ff5252" }}>&#10007; Error</div>
            <pre className="text-xs font-mono p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.4)", color: "#ff5252", border: "1px solid var(--border-color)" }}>
{`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human message"
  }
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* ==================== ERRORS ==================== */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>&#9888; Error Codes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Code</th><th>HTTP</th><th>Description</th></tr>
            </thead>
            <tbody>
              {errors.map(e => (
                <tr key={e.code}>
                  <td><code className="text-xs font-mono" style={{ color: "#ff5252" }}>{e.code}</code></td>
                  <td style={{ color: e.status >= 500 ? "#ff5252" : e.status >= 400 ? "#ffab40" : "#00e676" }}>{e.status}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== DEPLOYMENT NOTES ==================== */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>&#8853; Deployment (Vercel / Railway)</h2>
        <div className="text-sm space-y-3" style={{ color: "var(--text-secondary)" }}>
          <p>On first request, BirdServer auto-provisions:</p>
          <ul className="list-disc pl-6 space-y-1 text-xs">
            <li>The default admin (<code style={{ color: "var(--accent-cyan)" }}>admin / admin00</code>) if no users exist.</li>
            <li>A default node using <code style={{ color: "var(--accent-cyan)" }}>RAILWAY_PUBLIC_DOMAIN</code> or <code style={{ color: "var(--accent-cyan)" }}>VERCEL_URL</code> as FQDN.</li>
            <li>A pool of 55 allocatable ports (25565&ndash;25620).</li>
          </ul>
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            &#9432; Required env variable: <code style={{ color: "var(--accent-cyan)" }}>DATABASE_URL</code> (PostgreSQL).
            Optional overrides: <code style={{ color: "var(--accent-cyan)" }}>BIRDSERVER_NODE_FQDN</code>,
            <code style={{ color: "var(--accent-cyan)" }}>BIRDSERVER_NODE_RAM_MB</code>,
            <code style={{ color: "var(--accent-cyan)" }}>BIRDSERVER_NODE_CPU</code>,
            <code style={{ color: "var(--accent-cyan)" }}>BIRDSERVER_NODE_STORAGE_MB</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
