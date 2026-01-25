// @ts-nocheck
import 'dotenv/config';
import { db } from "../storage";
import { sql } from "drizzle-orm";

async function run() {
    console.log("🛠️ Migrating production_tasks schema...");

    try {
        await db.execute(sql`
            ALTER TABLE production_tasks 
            ADD COLUMN IF NOT EXISTS is_recipe boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS recipe_data jsonb DEFAULT '{}'::jsonb;
        `);
        console.log("✅ Schema updated successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Link migration failed:", error);
        process.exit(1);
    }
}

run();
