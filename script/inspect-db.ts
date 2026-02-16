import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log("--- Tables ---");
        const tablesRes = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log(tablesRes.rows.map(r => r.tablename).join(", "));

        console.log("\n--- Enums ---");
        const enumsRes = await client.query("SELECT t.typname FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid GROUP BY t.typname");
        console.log(enumsRes.rows.map(r => r.typname).join(", "));

        console.log("\n--- Deals Columns ---");
        try {
            const columnsRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'deals'");
            console.log(columnsRes.rows.map(r => `${r.column_name} (${r.data_type})`).join(", "));
        } catch (e) {
            console.log("Deals table query failed: " + e.message);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
