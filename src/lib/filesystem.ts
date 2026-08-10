import * as fs from "fs/promises";
import * as path from "path";
import { createWriteStream } from "fs";
import AdmZip from "adm-zip";
import { getServerRoot, ensureServerDir } from "./process-manager";

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
}

// Sanitize path to prevent path traversal outside server root
export function safePath(serverId: string, relative: string): string {
  const root = getServerRoot(serverId);
  const target = path.resolve(root, relative.replace(/^\/+/, ""));
  if (!target.startsWith(root)) {
    throw new Error("Path traversal denied");
  }
  return target;
}

export async function listDir(serverId: string, relative = "/"): Promise<FileInfo[]> {
  await ensureServerDir(serverId);
  const dir = safePath(serverId, relative);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: FileInfo[] = [];
  for (const entry of entries) {
    try {
      const full = path.join(dir, entry.name);
      // Follow symlinks so /system (which is a symlink to the shared dir) shows as a folder.
      const stat = await fs.stat(full);
      result.push({
        name: entry.name,
        path: path.posix.join(relative, entry.name).replace(/\\/g, "/"),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        modified: stat.mtimeMs,
      });
    } catch { /* skip broken symlinks */ }
  }
  result.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return result;
}

export async function readFileContents(serverId: string, relative: string): Promise<string> {
  const p = safePath(serverId, relative);
  const stat = await fs.stat(p);
  if (stat.size > 5 * 1024 * 1024) throw new Error("File too large to edit (>5MB)");
  return fs.readFile(p, "utf8");
}

export async function writeFileContents(serverId: string, relative: string, content: string): Promise<void> {
  await ensureServerDir(serverId);
  const p = safePath(serverId, relative);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, "utf8");
}

export async function createFolder(serverId: string, relative: string): Promise<void> {
  const p = safePath(serverId, relative);
  await fs.mkdir(p, { recursive: true });
}

export async function deletePath(serverId: string, relative: string): Promise<void> {
  const p = safePath(serverId, relative);
  await fs.rm(p, { recursive: true, force: true });
}

export async function renamePath(serverId: string, from: string, to: string): Promise<void> {
  const src = safePath(serverId, from);
  const dst = safePath(serverId, to);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.rename(src, dst);
}

export async function uploadFile(serverId: string, relativeDir: string, filename: string, buffer: Buffer): Promise<void> {
  await ensureServerDir(serverId);
  const targetDir = safePath(serverId, relativeDir);
  await fs.mkdir(targetDir, { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9._\-]/g, "_");
  await fs.writeFile(path.join(targetDir, safeName), buffer);
}

export async function extractZip(serverId: string, relativeZip: string, extractTo = "/"): Promise<{ files: number }> {
  const zipPath = safePath(serverId, relativeZip);
  const target = safePath(serverId, extractTo);
  await fs.mkdir(target, { recursive: true });
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  // Safely extract each entry
  for (const entry of entries) {
    const entryName = entry.entryName;
    // Reject entries that escape the target
    const resolved = path.resolve(target, entryName);
    if (!resolved.startsWith(target)) continue;
    if (entry.isDirectory) {
      await fs.mkdir(resolved, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, entry.getData());
    }
  }
  return { files: entries.length };
}

export async function pathStat(serverId: string, relative: string) {
  const p = safePath(serverId, relative);
  const stat = await fs.stat(p);
  return {
    isDirectory: stat.isDirectory(),
    size: stat.size,
    modified: stat.mtimeMs,
  };
}

export async function readRaw(serverId: string, relative: string): Promise<Buffer> {
  const p = safePath(serverId, relative);
  return fs.readFile(p);
}
