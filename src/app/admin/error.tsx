"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin error]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="glass-card rounded-2xl p-8 max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: "rgba(255,59,122,0.12)", border: "1px solid rgba(255,59,122,0.35)" }}>
          <span style={{ fontSize: 32, color: "#ff3b7a" }}>!</span>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Something went wrong
        </h2>
        <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
          {error.message.substring(0, 200) || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>
            Ref: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={reset} className="btn-primary py-2 px-5 rounded-xl text-sm">
            Try again
          </button>
          <Link href="/dashboard" className="btn-secondary py-2 px-5 rounded-xl text-sm">
            Go to dashboard
          </Link>
        </div>
        <div className="mt-6 pt-4 border-t text-xs" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
          If this keeps happening, check <a href="/api/debug" target="_blank" rel="noopener" className="underline" style={{ color: "var(--accent-cyan)" }}>/api/debug</a> for database diagnostics.
        </div>
      </div>
    </div>
  );
}
