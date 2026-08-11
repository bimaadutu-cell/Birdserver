import "dotenv/config";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const schema = (process.env.BIRDSERVER_DB_SCHEMA || "birdserver").replace(/[^a-zA-Z0-9_]/g, "");
const client = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });

try {
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"; SET search_path TO "${schema}", public;`);
  const result = await client.query("SELECT current_database() AS database, current_user AS user, current_schema() AS schema");
  console.log("Database connection OK:", result.rows[0]);
} catch (error) {
  console.error("Database connection failed:", error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
