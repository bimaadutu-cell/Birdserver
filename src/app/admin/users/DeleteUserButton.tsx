"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteUserButton({ userId, username }: { userId: string; username: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error?.message || "Failed to delete user.");
      }
    } catch {
      alert("Failed to delete user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDelete} disabled={loading} className="btn-danger py-1.5 px-3 text-xs rounded-lg">
      {loading ? "..." : "Delete"}
    </button>
  );
}
