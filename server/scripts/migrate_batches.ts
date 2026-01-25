
// @ts-nocheck
import 'dotenv/config';
import { db } from "../storage";
import { sql } from "drizzle-orm";

async function run() {
    console.log("🛠️ Migrating piecework_tickets schema...");

    try {
        await db.execute(sql`
            ALTER TABLE piecework_tickets 
            ADD COLUMN IF NOT EXISTS batch_id varchar;
        `);
        console.log("✅ Schema updated successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Batch migration failed:", error);
        process.exit(1);
    }
}

run();
