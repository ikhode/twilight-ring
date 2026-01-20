import "dotenv/config";
// Allow overriding or fallback to hardcoded local dev DB
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
import { seedModules } from "./seed";
import { db } from "./storage";

async function run() {
    console.log("Starting manual seed...");
    await seedModules();
    console.log("Done.");
    process.exit(0);
}

run();
