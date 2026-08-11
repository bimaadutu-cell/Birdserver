import "dotenv/config";
import { ensureMigrated } from "../src/lib/migrate";

async function main() {
  await ensureMigrated(true);
  console.log("[Migrate] Database is ready.");
}

main().catch((err) => {
  console.error("[Migrate] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
