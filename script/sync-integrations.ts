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
        console.log("Connected to DB. Creating integration tables...");

        // API Keys Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                key_hash TEXT NOT NULL UNIQUE,
                key_prefix TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'viewer',
                permissions JSONB DEFAULT '[]',
                last_used_at TIMESTAMP,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                revoked_at TIMESTAMP
            )
        `);
        console.log("✅ Table 'api_keys' created.");

        // Webhooks Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS webhooks (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                name TEXT NOT NULL,
                secret TEXT NOT NULL,
                events JSONB NOT NULL DEFAULT '[]',
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                last_triggered_at TIMESTAMP,
                last_failure_reason TEXT
            )
        `);
        console.log("✅ Table 'webhooks' created.");

        // Indices
        await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organization_id)`);
        console.log("✅ Indices created.");

    } catch (err) {
        console.error("❌ Sync failed:", err.message);
    } finally {
        await client.end();
        process.exit(0);
    }
}

sync();
