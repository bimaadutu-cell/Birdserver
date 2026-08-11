import "dotenv/config";
import { spawn } from "node:child_process";
import { ensureBootstrapped } from "../src/lib/bootstrap";

async function main() {
  console.log("[BirdServer] Starting runtime bootstrap...");
  try {
    await ensureBootstrapped();
    console.log("[BirdServer] Database/schema bootstrap completed.");
  } catch (error) {
    // Do not crash the Railway container merely because DB bootstrap failed.
    // The HTTP server remains available and /api/health reports the real state.
    console.error("[BirdServer] Bootstrap warning:", error);
  }

  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start"], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error("[BirdServer] Startup failed:", error);
  process.exit(1);
});
