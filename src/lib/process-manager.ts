/**
 * Real per-server process runtime (Pterodactyl-style).
 *
 * Each server gets a persistent working directory. We attempt to bind-mount /home/container
 * or create a symlink so scripts using the /home/container/... paths (like the Pterodactyl
 * egg startup) work verbatim. When that is not possible (Vercel/serverless), we translate
 * the /home/container prefix to the server-specific directory.
 */

import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";
import { existsSync } from "fs";
import pidusage from "pidusage";
import { db } from "@/db";
import { servers, serverLogs, serverEnvironment } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface RunningProcess {
  serverId: string;
  process: ChildProcess;
  startedAt: Date;
  logs: LogEntry[];
  listeners: Set<(entry: LogEntry) => void>;
  restartCount: number;
  autoRestart: boolean;
  manualStop: boolean;
  seq: number;
}

export interface LogEntry {
  seq: number;
  ts: number;
  stream: "stdout" | "stderr" | "system";
  data: string;
}

type G = typeof globalThis & {
  __birdserverProcesses?: Map<string, RunningProcess>;
  __birdserverLocks?: Map<string, Promise<unknown>>;
};
const g = globalThis as G;
if (!g.__birdserverProcesses) g.__birdserverProcesses = new Map();
if (!g.__birdserverLocks) g.__birdserverLocks = new Map();
export const processes: Map<string, RunningProcess> = g.__birdserverProcesses;
const locks: Map<string, Promise<unknown>> = g.__birdserverLocks;

// Root directory that stores per-server files. On serverless platforms the writable
// path is /tmp; on VPS you can override with BIRDSERVER_CONTAINERS_ROOT.
export const CONTAINERS_ROOT =
  process.env.BIRDSERVER_CONTAINERS_ROOT ||
  (process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "birdserver-containers")
    : "/tmp/birdserver-containers");

export function getServerRoot(serverId: string): string {
  return path.join(CONTAINERS_ROOT, serverId);
}

export async function ensureServerDir(serverId: string): Promise<string> {
  const dir = getServerRoot(serverId);
  await fs.mkdir(dir, { recursive: true });
  // Ensure the shared system dir exists and symlink it into this container as /system
  try {
    const systemRoot = path.join(CONTAINERS_ROOT, "__system__");
    await fs.mkdir(systemRoot, { recursive: true });
    const linkPath = path.join(dir, "system");
    try {
      const stat = await fs.lstat(linkPath);
      if (!stat.isSymbolicLink()) {
        // Not a symlink - leave user's own "system" folder alone
      }
    } catch {
      // Doesn't exist yet - create the symlink
      await fs.symlink(systemRoot, linkPath, "dir").catch(() => {});
    }
  } catch { /* best effort */ }
  return dir;
}

// Convert /home/container/xxx paths in a command to the actual server dir.
function translatePaths(cmd: string, serverDir: string): string {
  return cmd.replace(/\/home\/container(?=\/|\s|$)/g, serverDir);
}

// Pterodactyl-style default startup used for every new server.
export const DEFAULT_STARTUP_COMMAND =
  'if [ -d .git ] && [ "${AUTO_UPDATE}" = "1" ]; then git pull; fi; ' +
  'if [ -n "${NODE_PACKAGES}" ]; then npm install ${NODE_PACKAGES}; fi; ' +
  'if [ -n "${UNNODE_PACKAGES}" ]; then npm uninstall ${UNNODE_PACKAGES}; fi; ' +
  'if [ -f /home/container/package.json ]; then npm install --no-audit --no-fund; fi; ' +
  'node /home/container/${MAIN_FILE}';

// Simple per-server async mutex
async function withLock<T>(serverId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(serverId) || Promise.resolve();
  let resolveNext: () => void;
  const next = new Promise<void>(r => { resolveNext = r; });
  locks.set(serverId, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    resolveNext!();
    if (locks.get(serverId) === prev.then(() => next)) locks.delete(serverId);
  }
}

async function persistLog(serverId: string, level: string, message: string) {
  try {
    const msg = message.length > 2000 ? message.substring(0, 2000) + "...[truncated]" : message;
    await db.insert(serverLogs).values({ serverId, level, message: msg });
  } catch {}
}

function pushLog(rp: RunningProcess, stream: LogEntry["stream"], data: string) {
  const lines = data.split(/\r?\n/).filter(l => l.length > 0);
  for (const line of lines) {
    rp.seq++;
    const entry: LogEntry = { seq: rp.seq, ts: Date.now(), stream, data: line };
    rp.logs.push(entry);
    if (rp.logs.length > 2000) rp.logs.splice(0, rp.logs.length - 2000);
    for (const listener of rp.listeners) {
      try { listener(entry); } catch {}
    }
    if (stream === "system" || stream === "stderr") {
      persistLog(rp.serverId, stream === "stderr" ? "error" : "info", line);
    }
  }
}

export function isRunning(serverId: string): boolean {
  const rp = processes.get(serverId);
  return !!(rp && rp.process && !rp.process.killed && rp.process.exitCode === null);
}

export function attachListener(serverId: string, listener: (entry: LogEntry) => void): () => void {
  const rp = processes.get(serverId);
  if (!rp) return () => {};
  rp.listeners.add(listener);
  return () => { rp.listeners.delete(listener); };
}

export function getLogs(serverId: string, limit = 500, sinceSeq?: number): LogEntry[] {
  const rp = processes.get(serverId);
  if (!rp) return [];
  let arr = rp.logs;
  if (typeof sinceSeq === "number") arr = arr.filter(l => l.seq > sinceSeq);
  return arr.slice(-limit);
}

// Auto-detect main file from package.json / common entry points.
async function detectMainFile(serverDir: string): Promise<string> {
  try {
    const pkgPath = path.join(serverDir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
      if (typeof pkg.main === "string" && existsSync(path.join(serverDir, pkg.main))) return pkg.main;
    }
  } catch {}
  const candidates = ["index.js", "bot.js", "main.js", "app.js", "server.js", "start.js"];
  for (const c of candidates) {
    if (existsSync(path.join(serverDir, c))) return c;
  }
  return "index.js";
}

async function hasAnyRealFiles(serverDir: string): Promise<boolean> {
  try {
    const files = await fs.readdir(serverDir);
    return files.length > 0;
  } catch {
    return false;
  }
}

export interface StartOptions {
  serverId: string;
  startupCommand?: string;
  nodeVersion?: string;
  autoRestart?: boolean;
}

async function doStart(opts: StartOptions): Promise<{ pid: number; startedAt: Date }> {
  if (isRunning(opts.serverId)) {
    const rp = processes.get(opts.serverId)!;
    return { pid: rp.process.pid!, startedAt: rp.startedAt };
  }

  const serverDir = await ensureServerDir(opts.serverId);

  // Load env vars from DB
  const envRows = await db.select().from(serverEnvironment).where(eq(serverEnvironment.serverId, opts.serverId));
  const envMap: Record<string, string> = {
    PATH: process.env.PATH || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    HOME: serverDir,
    NODE_ENV: process.env.NODE_ENV || "production",
    TERM: "xterm-256color",
    // Pterodactyl-compat env
    MAIN_FILE: "index.js",
    AUTO_UPDATE: "0",
    NODE_PACKAGES: "",
    UNNODE_PACKAGES: "",
    P_SERVER_UUID: opts.serverId,
    P_SERVER_LOCATION: "birdserver",
  };
  for (const row of envRows) envMap[row.key] = row.value;

  // Auto-detect MAIN_FILE from the user's uploaded files if not set explicitly
  if (!envRows.find(r => r.key === "MAIN_FILE") || envMap.MAIN_FILE === "index.js") {
    const detected = await detectMainFile(serverDir);
    envMap.MAIN_FILE = detected;
  }

  const hasFiles = await hasAnyRealFiles(serverDir);

  // Command: either the user's custom command or the Pterodactyl-style default
  let cmd = (opts.startupCommand && opts.startupCommand.trim()) || DEFAULT_STARTUP_COMMAND;

  // Translate /home/container references to the real directory
  cmd = translatePaths(cmd, serverDir);

  // If the container is empty, create a friendly placeholder so it doesn't crash immediately
  if (!hasFiles) {
    await fs.writeFile(
      path.join(serverDir, envMap.MAIN_FILE),
      [
        `console.log("[BirdServer] No bot uploaded yet. Upload your files in the Files tab.");`,
        `console.log("[BirdServer] Main file: " + ${JSON.stringify(envMap.MAIN_FILE)});`,
        `console.log("[BirdServer] Working dir: " + process.cwd());`,
        `process.on("SIGTERM", () => { console.log("[BirdServer] shutting down"); process.exit(0); });`,
        `setInterval(() => console.log("[BirdServer] placeholder heartbeat"), 60000);`,
        ``,
      ].join("\n")
    );
  }

  const child: ChildProcess = spawn("/bin/sh", ["-c", cmd], {
    cwd: serverDir,
    env: envMap as NodeJS.ProcessEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const rp: RunningProcess = {
    serverId: opts.serverId,
    process: child,
    startedAt: new Date(),
    logs: [],
    listeners: new Set(),
    restartCount: 0,
    autoRestart: !!opts.autoRestart,
    manualStop: false,
    seq: 0,
  };
  processes.set(opts.serverId, rp);

  pushLog(rp, "system", `[BirdServer] Starting server ${opts.serverId.substring(0, 8)}...`);
  pushLog(rp, "system", `[BirdServer] Runtime: node ${process.version}`);
  pushLog(rp, "system", `[BirdServer] Main file: ${envMap.MAIN_FILE}`);
  pushLog(rp, "system", `[BirdServer] Working dir: ${serverDir}`);
  pushLog(rp, "system", `[BirdServer] Process spawned (pid ${child.pid})`);

  child.stdout?.on("data", (chunk: Buffer) => pushLog(rp, "stdout", chunk.toString("utf8")));
  child.stderr?.on("data", (chunk: Buffer) => pushLog(rp, "stderr", chunk.toString("utf8")));
  child.on("error", (err: Error) => pushLog(rp, "system", `[BirdServer] spawn error: ${err.message}`));

  child.on("exit", async (code: number | null, signal: NodeJS.Signals | null) => {
    pushLog(rp, "system", `[BirdServer] Process exited (code=${code}, signal=${signal ?? "-"})`);
    try {
      await db.update(servers).set({
        status: code === 0 || rp.manualStop ? "STOPPED" : "CRASHED",
        containerId: null,
        updatedAt: new Date(),
      }).where(eq(servers.id, opts.serverId));
    } catch {}

    const isAbnormal = !rp.manualStop && code !== 0 && signal !== "SIGTERM" && signal !== "SIGKILL";
    if (rp.autoRestart && isAbnormal && rp.restartCount < 5) {
      rp.restartCount++;
      const delay = Math.min(2000 * rp.restartCount, 15000);
      pushLog(rp, "system", `[BirdServer] Auto-restart ${rp.restartCount}/5 in ${delay}ms...`);
      setTimeout(async () => {
        try {
          processes.delete(opts.serverId);
          await doStart(opts);
        } catch (e) {
          pushLog(rp, "system", `[BirdServer] Auto-restart failed: ${(e as Error).message}`);
        }
      }, delay);
    } else {
      setTimeout(() => {
        const cur = processes.get(opts.serverId);
        if (cur === rp) processes.delete(opts.serverId);
      }, 30_000);
    }
  });

  await db.update(servers).set({
    status: "RUNNING",
    containerId: String(child.pid),
    updatedAt: new Date(),
  }).where(eq(servers.id, opts.serverId));

  return { pid: child.pid!, startedAt: rp.startedAt };
}

export async function startServer(opts: StartOptions) {
  return withLock(opts.serverId, () => doStart(opts));
}

async function doStop(serverId: string, signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
  const rp = processes.get(serverId);
  if (!rp) return;
  rp.autoRestart = false;
  rp.manualStop = true;
  pushLog(rp, "system", `[BirdServer] Stopping (${signal})...`);
  try { rp.process.kill(signal); } catch {}
  setTimeout(() => {
    const still = processes.get(serverId);
    if (still && still === rp && !still.process.killed && still.process.exitCode === null) {
      pushLog(rp, "system", `[BirdServer] Force killing (SIGKILL)...`);
      try { still.process.kill("SIGKILL"); } catch {}
    }
  }, 8000);
}

export async function stopServer(serverId: string, signal: NodeJS.Signals = "SIGTERM") {
  return withLock(serverId, () => doStop(serverId, signal));
}

export async function killServer(serverId: string) {
  return withLock(serverId, async () => {
    const rp = processes.get(serverId);
    if (!rp) return;
    rp.autoRestart = false;
    rp.manualStop = true;
    pushLog(rp, "system", `[BirdServer] Killing (SIGKILL)...`);
    try { rp.process.kill("SIGKILL"); } catch {}
  });
}

export async function restartServer(opts: StartOptions) {
  return withLock(opts.serverId, async () => {
    if (isRunning(opts.serverId)) {
      await doStop(opts.serverId, "SIGTERM");
      for (let i = 0; i < 120; i++) {
        if (!isRunning(opts.serverId)) break;
        await new Promise(r => setTimeout(r, 100));
      }
    }
    processes.delete(opts.serverId);
    return doStart(opts);
  });
}

export function writeStdin(serverId: string, data: string): boolean {
  const rp = processes.get(serverId);
  if (!rp || !rp.process.stdin || rp.process.stdin.destroyed) return false;
  try {
    rp.process.stdin.write(data.endsWith("\n") ? data : data + "\n");
    pushLog(rp, "system", `> ${data}`);
    return true;
  } catch { return false; }
}

export interface ProcStats {
  pid: number | null;
  running: boolean;
  cpuPercent: number;
  memoryMb: number;
  uptimeMs: number;
}

export async function getStats(serverId: string): Promise<ProcStats> {
  const rp = processes.get(serverId);
  if (!rp || !rp.process.pid || !isRunning(serverId)) {
    return { pid: null, running: false, cpuPercent: 0, memoryMb: 0, uptimeMs: 0 };
  }
  try {
    const usage = await pidusage(rp.process.pid);
    return {
      pid: rp.process.pid,
      running: true,
      cpuPercent: Number(usage.cpu.toFixed(1)),
      memoryMb: Number((usage.memory / 1024 / 1024).toFixed(1)),
      uptimeMs: Date.now() - rp.startedAt.getTime(),
    };
  } catch {
    return {
      pid: rp.process.pid,
      running: !rp.process.killed && rp.process.exitCode === null,
      cpuPercent: 0,
      memoryMb: 0,
      uptimeMs: Date.now() - rp.startedAt.getTime(),
    };
  }
}
