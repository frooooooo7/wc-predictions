import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, "..", "supabase", "schema.sql"), "utf8");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Brak DATABASE_URL w .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Połączono z bazą. Uruchamiam schema.sql...");
  await client.query(schema);
  console.log("✓ Schema zastosowana pomyślnie.");
} catch (err) {
  console.error("✗ Błąd:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
