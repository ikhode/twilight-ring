CREATE TABLE IF NOT EXISTS production_activity_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    activity_type TEXT NOT NULL, -- 'production', 'break', 'lunch', 'bathroom'
    
    task_id VARCHAR REFERENCES production_tasks(id),
    batch_id VARCHAR,
    
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'pending_verification', 'completed'
    quantity INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup of active logs per organization
CREATE INDEX IF NOT EXISTS idx_production_logs_active ON production_activity_logs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_production_logs_employee ON production_activity_logs(employee_id, created_at DESC);
