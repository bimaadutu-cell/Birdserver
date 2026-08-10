"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResellerCreateUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "USER" }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/reseller/users");
      } else {
        setError(data.error?.message || "Failed to create user.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/reseller/users"
          className="btn-secondary py-2 px-3 text-sm rounded-lg"
        >&larr; Back
        </Link>
        <h1 className="text-2xl font-bold gradient-text">Create User</h1>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium mb-1 uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                First Name
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                className="input-field"
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1 uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Last Name
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1 uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Username *
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              className="input-field"
              required
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1 uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="input-field"
              required
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1 uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Password *
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              className="input-field"
              required
              minLength={8}
            />
          </div>
          {error && (
            <div
              className="rounded-lg p-3 text-sm"
              style={{
                background: "rgba(255,82,82,0.1)",
                border: "1px solid rgba(255,82,82,0.3)",
                color: "#ff5252",
              }}
            >
              [!] {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-2.5 px-6 rounded-xl"
            >
              {loading ? "Creating..." : "Create User"}
            </button>
            <Link
              href="/reseller/users"
              className="btn-secondary py-2.5 px-6 rounded-xl"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
