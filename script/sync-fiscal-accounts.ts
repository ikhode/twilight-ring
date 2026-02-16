import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function sync() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to DB. Adding sat_grouping_code to accounting_accounts...");

        await client.query(`
            ALTER TABLE accounting_accounts 
            ADD COLUMN IF NOT EXISTS sat_grouping_code VARCHAR;
        `);
        console.log("✅ Column 'sat_grouping_code' added.");

    } catch (err) {
        console.error("❌ Sync failed:", err.message);
    } finally {
        await client.end();
        process.exit(0);
    }
}

sync();
