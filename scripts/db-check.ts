import "dotenv/config";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const client = new Client({ connectionString: url, connectionTimeoutMillis: 10000 });

try {
  await client.connect();
  const result = await client.query("SELECT current_database() AS database, current_user AS user");
  console.log("Database connection OK:", result.rows[0]);
} catch (error) {
  console.error("Database connection failed:", error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
