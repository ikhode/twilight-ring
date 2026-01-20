import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/cognitive_erp",
});

async function main() {
    try {
        console.log("🔌 Connecting to database...");
        const client = await pool.connect();
        try {
            console.log("🛠️ Attempting to enable 'vector' extension...");
            await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
            console.log("✅ Extension 'vector' enabled successfully!");
        } catch (err: any) {
            console.error("❌ Failed to enable vector extension:", err.message);
            console.log("⚠️ If you are on a standard Postgres install, you may need to install pgvector manually or remove vector columns.");
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("❌ Connection error:", err);
    } finally {
        await pool.end();
    }
}

main();
