"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconFolder, IconFile, IconUpload, IconTrash, IconEdit, IconDownload, IconMove, IconClose, IconCheck, IconArchive, IconExtract,
} from "@/components/Icons";

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
}

interface BrowseTarget { id: string; name: string; }

export default function FileManager({ serverId }: { serverId: string }) {
  const [currentPath, setCurrentPath] = useState("/");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ path: string; content: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newItem, setNewItem] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async (p: string) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/servers/${serverId}/files?path=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.data.files);
        setCurrentPath(data.data.path);
        setSelected(new Set());
      } else setError(data.error?.message || "Failed to load");
    } catch { setError("Network error"); }
    setLoading(false);
  }, [serverId]);

  useEffect(() => { loadFiles(currentPath); }, [loadFiles, currentPath]);

  const goUp = () => {
    if (currentPath === "/" || currentPath === "") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

  const openItem = (f: FileInfo) => {
    if (f.isDirectory) setCurrentPath(f.path);
    else editFile(f.path);
  };

  const editFile = async (p: string) => {
    try {
      const res = await fetch(`/api/servers/${serverId}/files?action=read&path=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (data.success) setEditing({ path: p, content: data.data.content });
      else setError(data.error?.message || "Cannot open file");
    } catch { setError("Failed to open file"); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", path: editing.path, content: editing.content }),
      });
      const data = await res.json();
      if (data.success) { setEditing(null); loadFiles(currentPath); }
      else setError(data.error?.message || "Save failed");
    } catch { setError("Save failed"); }
    setEditSaving(false);
  };

  const deleteItem = async (p: string) => {
    if (!confirm(`Delete "${p}"?`)) return;
    try {
      await fetch(`/api/servers/${serverId}/files?path=${encodeURIComponent(p)}`, { method: "DELETE" });
      loadFiles(currentPath);
    } catch {}
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} item(s)?`)) return;
    for (const p of selected) {
      try { await fetch(`/api/servers/${serverId}/files?path=${encodeURIComponent(p)}`, { method: "DELETE" }); } catch {}
    }
    loadFiles(currentPath);
  };

  const uploadFiles = async (fs: FileList) => {
    setUploading(true); setUploadProgress(0);
    for (let i = 0; i < fs.length; i++) {
      const file = fs[i];
      const form = new FormData();
      form.append("file", file);
      form.append("path", currentPath);
      if (file.name.toLowerCase().endsWith(".zip")) form.append("extract", "true");
      try { await fetch(`/api/servers/${serverId}/files/upload`, { method: "POST", body: form }); } catch {}
      setUploadProgress(Math.round(((i + 1) / fs.length) * 100));
    }
    setUploading(false); setUploadProgress(0);
    loadFiles(currentPath);
  };

  const createItem = async () => {
    if (!newItemName) return;
    const p = currentPath === "/" ? `/${newItemName}` : `${currentPath}/${newItemName}`;
    try {
      await fetch(`/api/servers/${serverId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem === "folder" ? { action: "mkdir", path: p } : { action: "write", path: p, content: "" }),
      });
      setNewItem(null); setNewItemName("");
      loadFiles(currentPath);
    } catch {}
  };

  const downloadFile = (p: string) => {
    window.open(`/api/servers/${serverId}/files/download?path=${encodeURIComponent(p)}`, "_blank");
  };

  const [extracting, setExtracting] = useState<string | null>(null);
  const extractZip = async (p: string) => {
    if (!confirm(`Extract "${p}" into the current directory?`)) return;
    setExtracting(p);
    try {
      const res = await fetch(`/api/servers/${serverId}/files/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: p, to: currentPath }),
      });
      const d = await res.json();
      if (d.success) {
        loadFiles(currentPath);
      } else {
        setError(d.error?.message || "Extract failed");
      }
    } catch (e) {
      setError("Extract failed: " + (e as Error).message);
    }
    setExtracting(null);
  };
  const isArchive = (name: string) => /\.(zip|tar|tgz|tar\.gz)$/i.test(name);

  const toggleSelect = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map(f => f.path)));
  };

  const formatSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  if (editing) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <IconEdit size={14} color="var(--accent-cyan)" />
            <span className="text-xs font-mono truncate" style={{ color: "var(--accent-cyan)" }}>{editing.path}</span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setEditing(null)} className="btn-secondary py-1.5 px-3 text-xs rounded-lg">Cancel</button>
            <button onClick={saveEdit} disabled={editSaving} className="btn-primary py-1.5 px-3 text-xs rounded-lg">
              {editSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        <textarea
          value={editing.content}
          onChange={e => setEditing({ ...editing, content: e.target.value })}
          className="w-full h-[500px] p-4 font-mono text-sm outline-none resize-none"
          style={{ background: "#0a0a10", color: "#c8e6ff", border: "none" }}
          spellCheck={false}
        />
      </div>
    );
  }

  const pathParts = currentPath.split("/").filter(Boolean);
  const breadcrumbPaths: string[] = [];
  let acc = "";
  for (const part of pathParts) { acc += "/" + part; breadcrumbPaths.push(acc); }

  return (
    <>
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-1 text-sm font-mono flex-wrap min-w-0">
            <button onClick={() => setCurrentPath("/")} className="px-2 py-1 rounded hover:bg-white/5" style={{ color: "var(--accent-cyan)" }}>/</button>
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <span style={{ color: "var(--text-muted)" }}>/</span>
                <button onClick={() => setCurrentPath(breadcrumbPaths[i])} className="px-2 py-1 rounded hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>{part}</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setNewItem("folder")} className="btn-secondary text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-1">
              <IconFolder size={12} /> New
            </button>
            <button onClick={() => setNewItem("file")} className="btn-secondary text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-1">
              <IconFile size={12} /> File
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-primary text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-1">
              <IconUpload size={12} /> {uploading ? `${uploadProgress}%` : "Upload"}
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} />
          </div>
        </div>

        {/* Selection bar */}
        {selected.size > 0 && (
          <div className="px-4 py-2 border-b flex items-center justify-between" style={{
            borderColor: "var(--border-color)",
            background: "linear-gradient(90deg, rgba(0,200,255,0.06), transparent)",
          }}>
            <div className="text-xs" style={{ color: "var(--accent-cyan)" }}>
              {selected.size} selected
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMoveOpen(true)} className="btn-secondary text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-1">
                <IconMove size={12} /> Move
              </button>
              <button onClick={deleteSelected} className="btn-danger text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-1">
                <IconTrash size={12} /> Delete
              </button>
              <button onClick={() => setSelected(new Set())} className="btn-secondary text-xs py-1.5 px-3 rounded-lg">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* New item bar */}
        {newItem && (
          <div className="p-3 border-b flex gap-2 items-center" style={{ borderColor: "var(--border-color)", background: "rgba(0,200,255,0.03)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>New {newItem}:</span>
            <input
              autoFocus type="text" value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createItem(); if (e.key === "Escape") setNewItem(null); }}
              className="input-field flex-1 text-sm font-mono"
              placeholder={newItem === "folder" ? "folder-name" : "file-name.js"}
            />
            <button onClick={createItem} className="btn-primary text-xs py-1.5 px-3 rounded-lg">Create</button>
            <button onClick={() => { setNewItem(null); setNewItemName(""); }} className="btn-secondary text-xs py-1.5 px-3 rounded-lg">
              <IconClose size={12} />
            </button>
          </div>
        )}

        {error && <div className="p-3 text-xs" style={{ background: "rgba(255,82,82,0.1)", color: "#ff5252" }}>{error}</div>}

        {/* File list */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "24px" }}>
                  <input
                    type="checkbox"
                    checked={files.length > 0 && selected.size === files.length}
                    onChange={selectAll}
                  />
                </th>
                <th>Name</th>
                <th>Size</th>
                <th>Modified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPath !== "/" && (
                <tr onClick={goUp} className="cursor-pointer">
                  <td />
                  <td colSpan={4} style={{ color: "var(--accent-cyan)", fontFamily: "monospace" }}>&larr; ..</td>
                </tr>
              )}
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8" style={{ color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : files.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8" style={{ color: "var(--text-muted)" }}>Empty directory</td></tr>
              ) : files.map(f => (
                <tr key={f.path}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(f.path)}
                      onChange={() => toggleSelect(f.path)}
                    />
                  </td>
                  <td>
                    <button onClick={() => openItem(f)} className="text-left inline-flex items-center gap-2 font-mono text-sm hover:underline" style={{ color: f.isDirectory ? "var(--accent-cyan)" : "var(--text-primary)" }}>
                      {f.isDirectory
                        ? <IconFolder size={14} color="var(--accent-cyan)" />
                        : isArchive(f.name)
                          ? <IconArchive size={14} color="#ffab40" />
                          : <IconFile size={14} color="var(--text-secondary)" />}
                      {f.name}
                    </button>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{f.isDirectory ? "-" : formatSize(f.size)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{new Date(f.modified).toLocaleString()}</td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {!f.isDirectory && isArchive(f.name) && (
                        <button
                          onClick={() => extractZip(f.path)}
                          disabled={extracting === f.path}
                          className="btn-warning text-xs py-1 px-2 rounded inline-flex items-center gap-1"
                          title="Extract archive"
                        >
                          <IconExtract size={11} /> {extracting === f.path ? "..." : "Extract"}
                        </button>
                      )}
                      {!f.isDirectory && !isArchive(f.name) && (
                        <button onClick={() => editFile(f.path)} className="btn-secondary text-xs py-1 px-2 rounded inline-flex items-center gap-1" title="Edit"><IconEdit size={11} /></button>
                      )}
                      {!f.isDirectory && (
                        <button onClick={() => downloadFile(f.path)} className="btn-secondary text-xs py-1 px-2 rounded inline-flex items-center gap-1" title="Download"><IconDownload size={11} /></button>
                      )}
                      <button onClick={() => { setSelected(new Set([f.path])); setMoveOpen(true); }} className="btn-secondary text-xs py-1 px-2 rounded inline-flex items-center gap-1" title="Move"><IconMove size={11} /></button>
                      <button onClick={() => deleteItem(f.path)} className="btn-danger text-xs py-1 px-2 rounded inline-flex items-center gap-1" title="Delete"><IconTrash size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {moveOpen && (
        <MoveDialog
          serverId={serverId}
          selected={Array.from(selected)}
          onClose={() => setMoveOpen(false)}
          onDone={() => { setMoveOpen(false); loadFiles(currentPath); }}
        />
      )}
    </>
  );
}

function MoveDialog({ serverId, selected, onClose, onDone }: {
  serverId: string;
  selected: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [target, setTarget] = useState(serverId);
  const [browsePath, setBrowsePath] = useState("/");
  const [browseData, setBrowseData] = useState<{ files: FileInfo[]; availableTargets: BrowseTarget[]; targetLabel: string } | null>(null);
  const [customPath, setCustomPath] = useState("/");
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/servers/${serverId}/files/browse?target=${encodeURIComponent(target)}&path=${encodeURIComponent(browsePath)}`);
      const d = await res.json();
      if (d.success) setBrowseData(d.data);
      else setError(d.error?.message || "Failed to browse");
    } catch { setError("Network error"); }
  }, [serverId, target, browsePath]);

  useEffect(() => { load(); }, [load]);

  const goUp = () => {
    if (browsePath === "/") return;
    const parts = browsePath.split("/").filter(Boolean);
    parts.pop();
    const newPath = "/" + parts.join("/");
    setBrowsePath(newPath);
    setCustomPath(newPath);
  };

  const move = async () => {
    setMoving(true); setError("");
    try {
      const res = await fetch(`/api/servers/${serverId}/files/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: selected,
          to: customPath || browsePath || "/",
          toServerId: target,
        }),
      });
      const d = await res.json();
      if (d.success) {
        if (d.data.moved === d.data.total) onDone();
        else setError(`Only ${d.data.moved} of ${d.data.total} moved. First error: ${d.data.results.find((r: {ok:boolean;error?:string}) => !r.ok)?.error || "unknown"}`);
      } else setError(d.error?.message || "Move failed");
    } catch (e) { setError("Network error: " + (e as Error).message); }
    setMoving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="glass-card rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <IconMove size={18} color="var(--accent-cyan)" />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Move {selected.length} item(s)</h3>
          </div>
          <button onClick={onClose} className="btn-secondary p-1.5 rounded-lg"><IconClose size={14} /></button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Selected items preview */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>From</div>
            <div className="rounded-lg p-2 text-xs font-mono max-h-24 overflow-y-auto" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)" }}>
              {selected.map(s => (
                <div key={s} style={{ color: "var(--text-secondary)" }}>{s}</div>
              ))}
            </div>
          </div>

          {/* Target picker */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Destination</div>
            <select value={target} onChange={e => { setTarget(e.target.value); setBrowsePath("/"); setCustomPath("/"); }} className="input-field mb-2">
              {browseData?.availableTargets.map(t => (
                <option key={t.id} value={t.id}>
                  {t.id === serverId ? "This server" : t.id === "system" ? "SYSTEM (shared /system/)" : t.name} ({t.id.substring(0, 8)})
                </option>
              ))}
            </select>
          </div>

          {/* Browse target */}
          {browseData && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
                <span>Browse: {browseData.targetLabel}</span>
                {browsePath !== "/" && <button onClick={goUp} className="text-xs" style={{ color: "var(--accent-cyan)" }}>&larr; up</button>}
              </div>
              <div className="rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)" }}>
                <div className="px-3 py-2 text-xs font-mono" style={{ background: "rgba(0,200,255,0.05)", color: "var(--accent-cyan)" }}>
                  {browsePath}
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {browseData.files.length === 0 ? (
                    <div className="p-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>Empty</div>
                  ) : browseData.files.filter(f => f.isDirectory).map(f => (
                    <button
                      key={f.path}
                      onClick={() => { setBrowsePath(f.path); setCustomPath(f.path); }}
                      className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-white/5 text-xs font-mono"
                      style={{ color: "var(--accent-cyan)" }}
                    >
                      <IconFolder size={12} /> {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Custom target path */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Move to path</div>
            <input
              type="text"
              value={customPath}
              onChange={e => setCustomPath(e.target.value)}
              className="input-field font-mono text-sm"
              placeholder="/some/directory/"
            />
            <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              End with <code>/</code> to preserve original filenames. To move outside sandbox use ADMIN + &quot;SYSTEM&quot; target.
            </div>
          </div>

          {error && (
            <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", color: "#ff5252" }}>
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2 justify-end" style={{ borderColor: "var(--border-color)" }}>
          <button onClick={onClose} className="btn-secondary py-2 px-4 rounded-lg text-sm">Cancel</button>
          <button onClick={move} disabled={moving || selected.length === 0} className="btn-primary py-2 px-4 rounded-lg text-sm inline-flex items-center gap-2">
            <IconMove size={14} /> {moving ? "Moving..." : "Move here"}
          </button>
        </div>
      </div>
    </div>
  );
}
