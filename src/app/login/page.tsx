"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error?.message || "Invalid credentials.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-grid">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #00d4ff, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #b04dff, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #7c9bff, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="w-full max-w-md mx-4 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(176,77,255,0.2))",
                border: "1px solid rgba(0,212,255,0.4)",
                boxShadow: "0 0 40px rgba(0,212,255,0.3), 0 0 20px rgba(176,77,255,0.25), inset 0 0 20px rgba(0,212,255,0.1)",
                backdropFilter: "blur(20px)",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bgrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="50%" stopColor="#7c9bff" />
                    <stop offset="100%" stopColor="#b04dff" />
                  </linearGradient>
                  <filter id="bglow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M32 8c-8 0-14 5-15 12l-8 4c-1 1-1 3 1 3l7 0c-1 3-2 6-2 10 0 10 8 18 18 18 8 0 15-6 17-13 6-1 10-6 10-13 0-8-7-14-15-14-1 0-2 0-3 1-2-5-6-8-10-8z"
                  fill="url(#bgrad)"
                  filter="url(#bglow)"
                />
                <circle cx="26" cy="26" r="2.2" fill="#05010f" />
              </svg>
            </div>
          </div>
          <h1
            className="text-4xl font-bold tracking-tight gradient-text glow-cyan-text"
          >
            BIRDSERVER
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Powerful Server Hosting, Made Simple.
          </p>
        </div>

        {/* Login card */}
        <div
          className="glass-card rounded-2xl p-8"
          style={{ boxShadow: "0 0 40px rgba(0,200,255,0.1)" }}
        >
          <h2
            className="text-lg font-semibold mb-6 text-center"
            style={{ color: "var(--text-primary)" }}
          >
            Administrator Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                className="block text-xs font-medium mb-2 uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="input-field"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-2 uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? "" : ""}
                </button>
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center py-3 rounded-xl font-semibold text-base"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Authenticating...
                </span>
              ) : (
                "LOGIN"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: "var(--border-color)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
               Access restricted to authorized personnel only
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            BirdServer v1.0 — by BimzOfficial
          </p>
        </div>
      </div>
    </div>
  );
}
