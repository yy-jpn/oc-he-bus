import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = "krweoqgeefravenhtsnr";
const PASSWORD = "igY9q?QnM$*zuHd";

// Try multiple connection formats
const connectionConfigs = [
  {
    name: "Pooler (session mode, ap-northeast-1)",
    host: `aws-0-ap-northeast-1.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
  },
  {
    name: "Pooler (transaction mode, ap-northeast-1)",
    host: `aws-0-ap-northeast-1.pooler.supabase.com`,
    port: 6543,
    user: `postgres.${PROJECT_REF}`,
  },
  {
    name: "Pooler (session mode, us-east-1)",
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
  },
  {
    name: "Direct connection",
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    user: "postgres",
  },
];

let client;
for (const config of connectionConfigs) {
  console.log(`Trying: ${config.name} (${config.host}:${config.port})...`);
  const c = new pg.Client({
    host: config.host,
    port: config.port,
    database: "postgres",
    user: config.user,
    password: PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await c.connect();
    console.log(`Connected via: ${config.name}`);
    client = c;
    break;
  } catch (err) {
    console.log(`  Failed: ${err.message}`);
  }
}

if (!client) {
  console.error("\nAll connection attempts failed.");
  console.error("Please check your Supabase Dashboard > Settings > Database for the correct connection string.");
  process.exit(1);
}

const migrations = [
  "00001_create_tables.sql",
  "00002_rls_policies.sql",
  "00003_auth_trigger.sql",
  "00004_seed_dev_data.sql",
];

for (const file of migrations) {
  console.log(`\n=== Executing: ${file} ===`);
  const sql = readFileSync(
    join(__dirname, "..", "supabase", "migrations", file),
    "utf-8"
  );

  try {
    await client.query(sql);
    console.log(`  OK`);
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    // Continue on "already exists" errors
    if (
      err.message.includes("already exists") ||
      err.message.includes("duplicate key")
    ) {
      console.log("  (Skipping - already exists)");
    } else {
      await client.end();
      process.exit(1);
    }
  }
}

await client.end();
console.log("\n=== All migrations completed successfully ===");
