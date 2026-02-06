const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres.uinkdtkprapsibkghbup:YQjsCtlNaFfFxpkP@aws-0-us-west-2.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS production_activity_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    activity_type TEXT NOT NULL, 
    
    task_id VARCHAR REFERENCES production_tasks(id),
    batch_id VARCHAR,
    
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    
    status TEXT NOT NULL DEFAULT 'active', 
    quantity INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_logs_active ON production_activity_logs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_production_logs_employee ON production_activity_logs(employee_id, created_at DESC);
`;

async function run() {
    try {
        await client.connect();
        console.log("Connected to DB");
        await client.query(sql);
        console.log("Migration applied successfully!");
    } catch (err) {
        console.error("Error applying migration:", err);
    } finally {
        await client.end();
    }
}

run();
