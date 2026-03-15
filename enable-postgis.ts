import "dotenv/config";
import { Pool } from "pg";

async function enablePostGIS() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🛠️  Enabling PostGIS extension...");
    await pool.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    console.log("✅ PostGIS enabled!");
  } catch (error) {
    console.error("❌ Failed to enable PostGIS:", error);
  } finally {
    await pool.end();
  }
}

enablePostGIS();
