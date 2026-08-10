"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FileManager from "@/components/FileManager";
import { formatDate } from "@/lib/utils";
import { IconArrow } from "@/components/Icons";

type Server = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  nodeId: string;
  status: string;
  nodeVersion: string;
  startupCommand: string;
  ramMb: number;
  cpuPercent: number;
  storageMb: number;
  dockerImage: string;
  suspended: boolean;
  restartPolicy: string;
  containerId: string | null;
  allocatedPort: number | null;
  createdAt: Date;
};

type EnvVar = { id: number; key: string; value: string; hidden: boolean; serverId: string; createdAt: Date };
type LogEntry = { id: number; level: string; message: string; createdAt: Date; serverId: string };
type Backup = { id: string; name: string; sizeMb: number; completed: boolean; createdAt: Date; serverId: string };

interface Props {
  server: Server;
  ownerUsername: string;
  ownerEmail: string;
  nodeName: string;
  nodeFqdn: string;
  envVars: EnvVar[];
  recentLogs: LogEntry[];
  backups: Backup[];
  allUsers: { id: string; username: string }[];
  allNodes: { id: string; name: string }[];
  isAdmin: boolean;
}

type Tab = "console" | "terminal" | "files" | "environment" | "startup" | "settings";

interface StreamLogEntry {
  seq: number;
  ts: number;
  stream: "stdout" | "stderr" | "system";
  data: string;
}

interface Stats {
  status: string;
  pid: number | null;
  running: boolean;
  cpuPercent: number;
  memoryMb: number;
  uptimeMs: number;
  ramLimitMb: number;
  cpuLimitPercent: number;
  storageLimitMb: number;
}

export default function ServerControlPanel({ server, ownerUsername, nodeName, envVars, isAdmin }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("console");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [envList, setEnvList] = useState(envVars);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [newEnvHidden, setNewEnvHidden] = useState(false);
  const [logs, setLogs] = useState<StreamLogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [stdinInput, setStdinInput] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const [storageMb, setStorageMb] = useState(0);

  const statusColor = (status: string) => {
    switch (status) {
      case "RUNNING": return "#00e676";
      case "STARTING": return "#ffab40";
      case "STOPPING": return "#ffab40";
      case "STOPPED": return "#607d8b";
      case "CRASHED": return "#ff5252";
      default: return "#607d8b";
    }
  };

  const currentStatus = optimisticStatus || stats?.status || server.status;

  // Stats polling
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/servers/${server.id}/stats`);
        const data = await res.json();
        if (mounted && data.success) setStats(data.data);
      } catch {}
    };
    poll();
    const int = setInterval(poll, 1000);
    return () => { mounted = false; clearInterval(int); };
  }, [server.id]);

  // Storage size fetch
  useEffect(() => {
    let mounted = true;
    const fetchSize = async () => {
      try {
        const res = await fetch(`/api/servers/${server.id}/files?path=/`);
        const data = await res.json();
        if (mounted && data.success) {
          const sum = (data.data.files as { size: number; isDirectory: boolean }[])
            .filter(f => !f.isDirectory)
            .reduce((a, b) => a + b.size, 0);
          setStorageMb(Number((sum / 1024 / 1024).toFixed(1)));
        }
      } catch {}
    };
    fetchSize();
    const int = setInterval(fetchSize, 15000);
    return () => { mounted = false; clearInterval(int); };
  }, [server.id]);

  // SSE console stream with dedup by seq. `esRef` lets us force-reconnect on start/restart.
  const lastSeqRef = useRef<number>(-1);
  const esRef = useRef<EventSource | null>(null);
  const connectSSE = useCallback((freshStart = false) => {
    try { esRef.current?.close(); } catch {}
    if (freshStart) lastSeqRef.current = -1;
    const url = `/api/servers/${server.id}/console?stream=1${lastSeqRef.current >= 0 ? `&since=${lastSeqRef.current}` : ""}`;
    const es = new EventSource(url);
    esRef.current = es;
    es.onmessage = (evt) => {
      try {
        const entry: StreamLogEntry = JSON.parse(evt.data);
        if (entry.seq <= lastSeqRef.current) return;
        lastSeqRef.current = entry.seq;
        setLogs(prev => {
          const next = [...prev, entry];
          if (next.length > 1000) next.splice(0, next.length - 1000);
          return next;
        });
      } catch {}
    };
    es.onerror = () => {
      try { es.close(); } catch {}
      // Fast reconnect
      setTimeout(() => { if (esRef.current === es) connectSSE(false); }, 400);
    };
  }, [server.id]);

  useEffect(() => {
    setLogs([]);
    lastSeqRef.current = -1;
    connectSSE(true);
    return () => { try { esRef.current?.close(); } catch {} esRef.current = null; };
  }, [connectSSE]);

  // Auto scroll console
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const serverAction = async (action: string) => {
    if (actionLoading) return;
    setActionLoading(action);

    // Optimistic UI update - user sees immediate feedback
    const now = Date.now();
    const injectLog = (msg: string) => {
      const seq = (lastSeqRef.current || 0) + 1;
      lastSeqRef.current = seq;
      setLogs(prev => [...prev, { seq, ts: now, stream: "system", data: msg }]);
    };

    if (action === "start") {
      setLogs([]);
      lastSeqRef.current = -1;
      injectLog("[BirdServer] Start requested  spawning process...");
      setOptimisticStatus("STARTING");
    } else if (action === "restart") {
      setLogs([]);
      lastSeqRef.current = -1;
      injectLog("[BirdServer] Restart requested...");
      setOptimisticStatus("STARTING");
    } else if (action === "stop") {
      injectLog("[BirdServer] Stop requested...");
      setOptimisticStatus("STOPPING");
    } else if (action === "kill") {
      injectLog("[BirdServer] Kill requested (SIGKILL)...");
      setOptimisticStatus("STOPPED");
    }

    try {
      const res = await fetch(`/api/servers/${server.id}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        injectLog(`[BirdServer] ${action} failed: ${data?.error?.message || res.status}`);
        setOptimisticStatus(null);
      } else {
        // Force-reconnect SSE stream so we immediately pick up the new process output
        if (action === "start" || action === "restart") {
          connectSSE(true);
        }
      }
    } catch (e) {
      injectLog(`[BirdServer] network error: ${(e as Error).message}`);
      setOptimisticStatus(null);
    }

    // Clear optimistic status after real stats poll picks up
    setTimeout(() => setOptimisticStatus(null), 3000);
    router.refresh();
    setActionLoading(null);
  };

  const sendStdin = async () => {
    if (!stdinInput.trim()) return;
    try {
      await fetch(`/api/servers/${server.id}/console`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: stdinInput }),
      });
      setStdinInput("");
    } catch {}
  };

  // Frontend-only: wipe visible lines
  const clearConsoleView = () => {
    setLogs([]);
  };

  // Backend + frontend: wipe in-memory buffer AND persisted server_logs table
  const [clearing, setClearing] = useState(false);
  const clearAllConsole = async () => {
    if (clearing) return;
    if (!confirm("Clear the entire console history for this server?\n\nThis will:\n  - Wipe the live in-memory log buffer\n  - Delete all persisted logs from the database\n\nThis cannot be undone.")) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/servers/${server.id}/console/clear`, { method: "POST" });
      if (res.ok) {
        setLogs([]);
        lastSeqRef.current = -1;
      } else {
        const d = await res.json().catch(() => ({}));
        alert("Failed to clear: " + (d?.error?.message || res.status));
      }
    } catch (e) {
      alert("Network error: " + (e as Error).message);
    } finally {
      setClearing(false);
    }
  };

  const addEnvVar = async () => {
    if (!newEnvKey) return;
    const nextList = [...envList, { id: Date.now(), key: newEnvKey, value: newEnvValue, hidden: newEnvHidden, serverId: server.id, createdAt: new Date() }];
    const res = await fetch(`/api/servers/${server.id}/environment`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vars: nextList.map(v => ({ key: v.key, value: v.value, hidden: v.hidden })) }),
    });
    if (res.ok) {
      setEnvList(nextList);
      setNewEnvKey(""); setNewEnvValue(""); setNewEnvHidden(false);
    }
  };

  const removeEnvVar = async (envId: number) => {
    const nextList = envList.filter(e => e.id !== envId);
    const res = await fetch(`/api/servers/${server.id}/environment`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vars: nextList.map(v => ({ key: v.key, value: v.value, hidden: v.hidden })) }),
    });
    if (res.ok) setEnvList(nextList);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "console", label: "Console" },
    { id: "terminal", label: "Terminal" },
    { id: "files", label: "Files" },
    { id: "environment", label: "Environment" },
    { id: "startup", label: "Startup" },
    { id: "settings", label: "Settings" },
  ];

  const backHref = isAdmin ? "/admin/servers" : "/servers";

  const uptimeStr = stats && stats.uptimeMs > 0
    ? stats.uptimeMs > 3600000
      ? `${Math.floor(stats.uptimeMs / 3600000)}h ${Math.floor((stats.uptimeMs % 3600000) / 60000)}m`
      : stats.uptimeMs > 60000
        ? `${Math.floor(stats.uptimeMs / 60000)}m ${Math.floor((stats.uptimeMs % 60000) / 1000)}s`
        : `${Math.floor(stats.uptimeMs / 1000)}s`
    : "--";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        {/* Row 1: back + name + status */}
        <div className="flex items-start gap-3 flex-wrap">
          <Link href={backHref} className="btn-secondary py-2 px-3 text-sm rounded-lg inline-flex items-center gap-1">
            <IconArrow size={14} /> Back
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold truncate" style={{ color: "var(--text-primary)" }}>{server.name}</h1>
              <span className={`badge badge-${(server.suspended ? "suspended" : currentStatus.toLowerCase())}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(currentStatus) }} />
                {server.suspended ? "SUSPENDED" : currentStatus}
              </span>
            </div>
            <div className="text-xs mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
              node-{server.nodeVersion} &middot; owner: {ownerUsername}
              {stats?.pid ? <> &middot; pid: {stats.pid}</> : <> &middot; pid: </>}
            </div>
          </div>
        </div>

        {/* Row 2: control buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentStatus !== "RUNNING" && currentStatus !== "STARTING" && !server.suspended && (
            <button onClick={() => serverAction("start")} disabled={actionLoading !== null} className="btn-success py-2 px-5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 flex-1 sm:flex-initial justify-center">
              {actionLoading === "start" ? "Starting..." : "Start"}
            </button>
          )}
          {(currentStatus === "RUNNING" || currentStatus === "STARTING") && (
            <>
              <button onClick={() => serverAction("restart")} disabled={actionLoading !== null} className="btn-warning py-2 px-4 rounded-xl text-sm font-semibold flex-1 sm:flex-initial">
                {actionLoading === "restart" ? "..." : "Restart"}
              </button>
              <button onClick={() => serverAction("stop")} disabled={actionLoading !== null} className="btn-danger py-2 px-4 rounded-xl text-sm font-semibold flex-1 sm:flex-initial">
                {actionLoading === "stop" ? "..." : "Stop"}
              </button>
              <button onClick={() => serverAction("kill")} disabled={actionLoading !== null} className="btn-danger py-2 px-4 rounded-xl text-sm font-semibold flex-1 sm:flex-initial">
                {actionLoading === "kill" ? "..." : "Kill"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="metric-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>CPU</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{server.cpuPercent === 0 ? "unlimited" : `${server.cpuPercent}%`}</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--accent-cyan)" }}>
            {stats ? `${stats.cpuPercent}%` : "0%"}
          </div>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full" style={{
              width: `${Math.min((stats?.cpuPercent || 0) / (server.cpuPercent || 100) * 100, 100)}%`,
              background: "var(--accent-cyan)",
            }} />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Memory</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{server.ramMb === 0 ? "unlimited" : `${server.ramMb} MB`}</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: "#0080ff" }}>
            {stats ? `${stats.memoryMb} MB` : "0 MB"}
          </div>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full" style={{
              width: `${Math.min((stats?.memoryMb || 0) / (server.ramMb || 1024) * 100, 100)}%`,
              background: "#0080ff",
            }} />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Storage</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{server.storageMb === 0 ? "unlimited" : `${server.storageMb} MB`}</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: "#ffab40" }}>
            {storageMb} MB
          </div>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full" style={{
              width: `${Math.min(storageMb / (server.storageMb || 1024) * 100, 100)}%`,
              background: "#ffab40",
            }} />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Uptime</span>
            <span className="text-xs" style={{ color: currentStatus === "RUNNING" ? "#00e676" : "var(--text-muted)" }}>
              {currentStatus === "RUNNING" ? "live" : "off"}
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: "#00e676" }}>{uptimeStr}</div>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full" style={{
              width: currentStatus === "RUNNING" ? "100%" : "0%",
              background: "#00e676",
              transition: "width 0.3s",
            }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0" style={{ borderColor: "var(--border-color)" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2"
            style={{
              borderColor: tab === t.id ? "var(--accent-cyan)" : "transparent",
              color: tab === t.id ? "var(--accent-cyan)" : "var(--text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Console */}
      {tab === "console" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between gap-3" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full" style={{ background: statusColor(currentStatus) }} />
              <span className="text-xs font-medium" style={{ color: statusColor(currentStatus) }}>{currentStatus}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{logs.length} lines</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
                Auto-scroll
              </label>
              <button
                onClick={clearConsoleView}
                className="btn-secondary text-xs py-1 px-2 rounded"
                title="Hide current lines (does not affect server history)"
              >
                &#10005; Hide
              </button>
              <button
                onClick={clearAllConsole}
                disabled={clearing}
                className="btn-danger text-xs py-1 px-2 rounded"
                title="Permanently clear in-memory buffer AND delete all persisted server logs"
              >
                {clearing ? "..." : "\u2622 Clear All"}
              </button>
            </div>
          </div>
          <div
            ref={consoleRef}
            className="terminal-container p-4 h-[500px] overflow-y-auto"
            style={{ background: "#0a0a10" }}
          >
            {logs.length === 0 ? (
              <div style={{ color: "#607d8b" }}>[waiting for output...]</div>
            ) : (
              logs.map((l, i) => (
                <div key={i} style={{
                  color: l.stream === "stderr" ? "#ff8080" : l.stream === "system" ? "#00c8ff" : "#c8e6ff",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}>{l.data}</div>
              ))
            )}
          </div>
          <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--border-color)" }}>
            <input
              type="text"
              value={stdinInput}
              onChange={e => setStdinInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendStdin(); }}
              placeholder={currentStatus === "RUNNING" ? "Send input to stdin..." : "Server is not running"}
              disabled={currentStatus !== "RUNNING"}
              className="input-field flex-1 font-mono text-sm"
            />
            <button onClick={sendStdin} disabled={currentStatus !== "RUNNING"} className="btn-primary py-2 px-4 rounded-lg text-sm">Send</button>
          </div>
        </div>
      )}

      {tab === "terminal" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-3 border-b" style={{ borderColor: "var(--border-color)" }}>
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>[$] Terminal Instructions</span>
          </div>
          <div className="p-6 text-sm space-y-3" style={{ color: "var(--text-secondary)" }}>
            <p>The <strong style={{ color: "var(--accent-cyan)" }}>Console</strong> tab acts as a full terminal for your running server:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>All process stdout and stderr stream live via SSE.</li>
              <li>Type into the input field and hit Enter to send data to the process stdin.</li>
              <li>Restart, Stop, and Kill buttons control the child process directly.</li>
              <li>Startup commands supported: <code className="text-xs" style={{ color: "var(--accent-cyan)" }}>node index.js</code>, <code className="text-xs" style={{ color: "var(--accent-cyan)" }}>npm start</code>, <code className="text-xs" style={{ color: "var(--accent-cyan)" }}>npm run bot</code>, <code className="text-xs" style={{ color: "var(--accent-cyan)" }}>npm ci &amp;&amp; node index.js</code>.</li>
            </ul>
            <div className="p-3 rounded-lg" style={{ background: "rgba(0,200,255,0.05)", border: "1px solid var(--border-color)" }}>
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>To run your WhatsApp bot:</div>
              <ol className="list-decimal pl-5 text-xs space-y-1">
                <li>Upload your bot.zip in the Files tab and extract it.</li>
                <li>Set the Startup command to <code style={{ color: "var(--accent-cyan)" }}>npm install &amp;&amp; npm start</code> (or your custom script).</li>
                <li>Press Start. Watch the console for QR / pairing code output.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {tab === "files" && (
        <FileManager serverId={server.id} />
      )}

      {tab === "environment" && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>[=] Environment Variables</h3>
          <div className="space-y-2 mb-4">
            {envList.map(env => (
              <div key={env.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(0,200,255,0.03)", border: "1px solid var(--border-color)" }}>
                <span className="font-mono text-sm font-medium" style={{ color: "var(--accent-cyan)", minWidth: 160 }}>{env.key}</span>
                <span className="font-mono text-sm flex-1 break-all" style={{ color: "var(--text-secondary)" }}>
                  {env.hidden ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : env.value}
                </span>
                {env.hidden && <span className="badge badge-expired text-xs">secret</span>}
                <button onClick={() => removeEnvVar(env.id)} className="btn-danger py-1 px-2 text-xs rounded">[x]</button>
              </div>
            ))}
            {envList.length === 0 && (
              <div className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>No environment variables set.</div>
            )}
          </div>
          <div className="border-t pt-4" style={{ borderColor: "var(--border-color)" }}>
            <h4 className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Add Variable</h4>
            <div className="grid grid-cols-5 gap-2">
              <input type="text" value={newEnvKey} onChange={e => setNewEnvKey(e.target.value)} className="input-field col-span-2 font-mono text-sm" placeholder="KEY_NAME" />
              <input type="text" value={newEnvValue} onChange={e => setNewEnvValue(e.target.value)} className="input-field col-span-2 font-mono text-sm" placeholder="value" />
              <button onClick={addEnvVar} className="btn-primary rounded-lg text-sm">[+] Add</button>
            </div>
            <label className="flex items-center gap-2 mt-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
              <input type="checkbox" checked={newEnvHidden} onChange={e => setNewEnvHidden(e.target.checked)} />
              Mark as secret (hidden in UI)
            </label>
          </div>
        </div>
      )}

      {tab === "startup" && <StartupTab server={server} />}

      {tab === "settings" && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>[i] Server Settings</h3>
          <dl className="space-y-3">
            {[
              ["Server ID", server.id],
              ["Name", server.name],
              ["Owner", ownerUsername],
              ["Node", nodeName],
              ["Node.js", `v${server.nodeVersion}`],
              ["Docker Image", server.dockerImage],
              ["Startup", server.startupCommand],
              ["Restart Policy", server.restartPolicy],
              ["Allocated Port", server.allocatedPort || "not assigned"],
              ["Created", formatDate(server.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-2 border-b" style={{ borderColor: "var(--border-color)" }}>
                <dt style={{ color: "var(--text-muted)" }}>{k}</dt>
                <dd className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function StartupTab({ server }: { server: Server }) {
  const [command, setCommand] = useState(server.startupCommand);
  const [nodeVersion, setNodeVersion] = useState(server.nodeVersion);
  const [restartPolicy, setRestartPolicy] = useState(server.restartPolicy);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/servers/${server.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startupCommand: command, nodeVersion, restartPolicy, dockerImage: `node:${nodeVersion}-alpine` }),
    });
    if (res.ok) {
      setSuccess("Startup configuration saved. Restart the server to apply.");
      setTimeout(() => { setSuccess(""); router.refresh(); }, 2500);
    }
    setSaving(false);
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-5">
      <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Startup Configuration</h3>
      <div>
        <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Node.js Version</label>
        <select value={nodeVersion} onChange={e => setNodeVersion(e.target.value)} className="input-field">
          {["18", "20", "22", "24"].map(v => <option key={v} value={v}>Node.js {v} (node:{v}-alpine)</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Startup Command</label>
        <input type="text" value={command} onChange={e => setCommand(e.target.value)} className="input-field font-mono" placeholder="node index.js" />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Examples: <code style={{ color: "var(--accent-cyan)" }}>node index.js</code>, <code style={{ color: "var(--accent-cyan)" }}>npm start</code>, <code style={{ color: "var(--accent-cyan)" }}>npm run bot</code>
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Restart Policy</label>
        <select value={restartPolicy} onChange={e => setRestartPolicy(e.target.value)} className="input-field">
          <option value="OFF">Off</option>
          <option value="ON_FAILURE">On Failure</option>
          <option value="ALWAYS">Always</option>
        </select>
      </div>
      {success && <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)", color: "#00e676" }}>[OK] {success}</div>}
      <button onClick={save} disabled={saving} className="btn-primary py-2.5 px-6 rounded-xl">
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
