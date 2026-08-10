"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ServerActionButtons({
  serverId,
  status,
  suspended,
}: {
  serverId: string;
  status: string;
  suspended: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const action = async (act: string) => {
    setLoading(act);
    try {
      await fetch(`/api/servers/${serverId}/${act}`, { method: "POST" });
      router.refresh();
    } catch {}
    setLoading(null);
  };

  return (
    <div className="flex items-center gap-1">
      {status !== "RUNNING" && !suspended && (
        <button onClick={() => action("start")} disabled={loading !== null} className="btn-success py-1 px-2 text-xs rounded">
          {loading === "start" ? "..." : ">"}
        </button>
      )}
      {status === "RUNNING" && (
        <>
          <button onClick={() => action("restart")} disabled={loading !== null} className="btn-warning py-1 px-2 text-xs rounded">
            {loading === "restart" ? "..." : "~"}
          </button>
          <button onClick={() => action("stop")} disabled={loading !== null} className="btn-danger py-1 px-2 text-xs rounded">
            {loading === "stop" ? "..." : "#"}
          </button>
        </>
      )}
      <button
        onClick={() => action(suspended ? "unsuspend" : "suspend")}
        disabled={loading !== null}
        className="btn-secondary py-1 px-2 text-xs rounded"
        title={suspended ? "Unsuspend" : "Suspend"}
      >
        {suspended ? "[OK]" : "-"}
      </button>
    </div>
  );
}
