import { spawn } from "node:child_process";
import { ensureBootstrapped } from "../src/lib/bootstrap";

async function main() {
  console.log("[BirdServer] Starting runtime bootstrap...");
  try {
    await ensureBootstrapped();
    console.log("[BirdServer] Database bootstrap complete.");
  } catch (error) {
    console.error("[BirdServer] FATAL: database bootstrap failed.");
    console.error(error);
    process.exit(1);
  }

  const nextBin = process.platform === "win32" ? "next.cmd" : "next";
  const child = spawn(nextBin, ["start"], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
