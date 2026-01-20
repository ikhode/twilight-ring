import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/cognitive_erp",
});

async function run() {
    try {
        console.log("Enabling vector extension...");
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log("Vector extension enabled.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();
