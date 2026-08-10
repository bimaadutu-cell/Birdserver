"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ApiKeyActions({ keyId, keyName, status }: { keyId: string; keyName: string; status: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const router = useRouter();

  const handleRevoke = async () => {
    if (!confirm(`Revoke API key "${keyName}"? All requests using this key will return 401.`)) return;
    setLoading("revoke");
    try {
      await fetch(`/api/api-keys/${keyId}/revoke`, { method: "POST" });
      router.refresh();
    } catch {}
    setLoading(null);
  };

  const handleRotate = async () => {
    if (!confirm(`Rotate API key "${keyName}"? A new key will be generated and the old one revoked.`)) return;
    setLoading("rotate");
    try {
      const res = await fetch(`/api/api-keys/${keyId}/rotate`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setRotatedKey(data.data.key);
      }
      router.refresh();
    } catch {}
    setLoading(null);
  };

  const handleDelete = async () => {
    if (!confirm(`Permanently delete API key "${keyName}"?`)) return;
    setLoading("delete");
    try {
      await fetch(`/api/api-keys/${keyId}`, { method: "DELETE" });
      router.refresh();
    } catch {}
    setLoading(null);
  };

  if (rotatedKey) {
    return (
      <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(0,200,255,0.1)", border: "1px solid rgba(0,200,255,0.3)" }}>
        <div className="font-semibold mb-1" style={{ color: "var(--accent-cyan)" }}>New Key Generated!</div>
        <code className="block text-xs break-all mb-2" style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>{rotatedKey}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(rotatedKey); }}
          className="btn-primary py-1 px-3 text-xs rounded"
        >Copy</button>
        <button onClick={() => setRotatedKey(null)} className="btn-secondary py-1 px-3 text-xs rounded ml-2">Done</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/api-keys/${keyId}/edit`} className="btn-secondary py-1.5 px-2 text-xs rounded-lg">
        Edit
      </Link>
      {status === "ACTIVE" && (
        <>
          <button onClick={handleRotate} disabled={loading !== null} className="btn-warning py-1.5 px-2 text-xs rounded-lg" title="Rotate Key">
            {loading === "rotate" ? "..." : "~"}
          </button>
          <button onClick={handleRevoke} disabled={loading !== null} className="btn-danger py-1.5 px-2 text-xs rounded-lg" title="Revoke Key">
            {loading === "revoke" ? "..." : "-"}
          </button>
        </>
      )}
      <button onClick={handleDelete} disabled={loading !== null} className="btn-danger py-1.5 px-2 text-xs rounded-lg" title="Delete Key">
        {loading === "delete" ? "..." : "[x]"}
      </button>
    </div>
  );
}
