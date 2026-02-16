import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function fix() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to DB. Creating deals table...");

        // Create Enum
        try {
            await client.query(`CREATE TYPE deal_status AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')`);
            console.log("✅ Enum 'deal_status' created.");
        } catch (e) {
            if (e.message.includes("already exists")) {
                console.log("ℹ️ Enum 'deal_status' already exists.");
            } else {
                throw e;
            }
        }

        // Create Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS deals (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                customer_id VARCHAR NOT NULL REFERENCES customers(id),
                name TEXT NOT NULL,
                description TEXT,
                status deal_status NOT NULL DEFAULT 'lead',
                value INTEGER NOT NULL DEFAULT 0,
                probability INTEGER NOT NULL DEFAULT 0,
                expected_close_date TIMESTAMP,
                assigned_to VARCHAR REFERENCES users(id),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);
        console.log("✅ Table 'deals' created.");

        // Add indices for performance
        await client.query(`CREATE INDEX IF NOT EXISTS idx_deals_org ON deals(organization_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_id)`);
        console.log("✅ Indices created.");

    } catch (err) {
        console.error("❌ Fix failed:", err.message);
    } finally {
        await client.end();
        process.exit(0);
    }
}

fix();
