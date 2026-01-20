import "dotenv/config";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
import { db } from "./storage";
import { modules } from "../shared/schema";
import { sql } from "drizzle-orm";

async function check() {
    try {
        const result = await db.select({ count: sql<number>`count(*)` }).from(modules);
        console.log("Module count:", result[0].count);
    } catch (e) {
        console.error("Check failed:", e);
    }
    process.exit(0);
}

check();
