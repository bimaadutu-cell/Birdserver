import "dotenv/config";
import { spawn } from "node:child_process";
import { ensureBootstrapped } from "../src/lib/bootstrap";

async function main() {
  console.log("[BirdServer] Starting Next.js server...");

  // Start HTTP immediately. Database bootstrap runs in the background so a
  // slow/misconfigured PostgreSQL connection cannot make Railway report the
  // entire web service as unavailable.
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start"], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });

  try {
    await ensureBootstrapped();
    console.log("[BirdServer] Database/schema bootstrap completed.");
  } catch (error) {
    console.error("[BirdServer] Bootstrap warning:", error);
    console.error("[BirdServer] Check DATABASE_URL and open /api/health.");
  }
}

main().catch((error) => {
  console.error("[BirdServer] Startup failed:", error);
  process.exit(1);
});
