CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" VARCHAR NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
    "action" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP DEFAULT NOW()
);

-- Index for faster querying by Org and Resource
CREATE INDEX IF NOT EXISTS "audit_logs_org_idx" ON "audit_logs" ("organization_id");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource_id");
