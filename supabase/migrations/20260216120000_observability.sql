-- System logs table for observability
CREATE TABLE IF NOT EXISTS "system_logs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "timestamp" timestamp DEFAULT now(),
  "level" text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  "service" text NOT NULL CHECK (service IN ('api', 'db', 'auth', 'realtime')),
  "event" text NOT NULL,
  "metadata" jsonb DEFAULT '{}',
  "error" jsonb DEFAULT '{}',
  "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "organization_id" varchar REFERENCES "organizations"("id") ON DELETE CASCADE,
  "trace_id" varchar,
  "created_at" timestamp DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON "system_logs"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON "system_logs"("level");
CREATE INDEX IF NOT EXISTS idx_system_logs_org ON "system_logs"("organization_id");
CREATE INDEX IF NOT EXISTS idx_system_logs_trace ON "system_logs"("trace_id");
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON "system_logs"("service");

-- Partial index for errors only (more efficient)
CREATE INDEX IF NOT EXISTS idx_system_logs_errors ON "system_logs"("timestamp" DESC) 
  WHERE level IN ('error', 'critical');

-- Performance metrics table
CREATE TABLE IF NOT EXISTS "performance_metrics" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "timestamp" timestamp DEFAULT now(),
  "metric_name" text NOT NULL,
  "value" numeric NOT NULL,
  "metadata" jsonb DEFAULT '{}',
  "url" text,
  "session_id" varchar,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON "performance_metrics"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON "performance_metrics"("metric_name");
CREATE INDEX IF NOT EXISTS idx_perf_metrics_session ON "performance_metrics"("session_id");

-- Frontend logs table (separate from system logs)
CREATE TABLE IF NOT EXISTS "frontend_logs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "timestamp" timestamp DEFAULT now(),
  "level" text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  "event" text NOT NULL,
  "metadata" jsonb DEFAULT '{}',
  "user_agent" text,
  "url" text,
  "session_id" varchar,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frontend_logs_timestamp ON "frontend_logs"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_frontend_logs_level ON "frontend_logs"("level");
CREATE INDEX IF NOT EXISTS idx_frontend_logs_session ON "frontend_logs"("session_id");

-- RLS policies for system_logs (admin only)
ALTER TABLE "system_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all system logs" ON "system_logs"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- RLS policies for performance_metrics (admin only)
ALTER TABLE "performance_metrics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all performance metrics" ON "performance_metrics"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- RLS policies for frontend_logs (admin only)
ALTER TABLE "frontend_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all frontend logs" ON "frontend_logs"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Auto-cleanup old logs (keep last 30 days)
-- This can be run as a cron job or scheduled function
CREATE OR REPLACE FUNCTION cleanup_old_logs() RETURNS void AS $$
BEGIN
  DELETE FROM system_logs WHERE timestamp < NOW() - INTERVAL '30 days';
  DELETE FROM performance_metrics WHERE timestamp < NOW() - INTERVAL '30 days';
  DELETE FROM frontend_logs WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
