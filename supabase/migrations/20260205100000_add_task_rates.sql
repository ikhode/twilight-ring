-- Add min_rate and max_rate columns to production_tasks
ALTER TABLE "public"."production_tasks" 
ADD COLUMN IF NOT EXISTS "min_rate" integer,
ADD COLUMN IF NOT EXISTS "max_rate" integer;

-- Add Audit Logging if not exists (optional, keeping it simple as per request context)
COMMENT ON COLUMN "public"."production_tasks"."min_rate" IS 'Minimum allowed rate in cents';
COMMENT ON COLUMN "public"."production_tasks"."max_rate" IS 'Maximum allowed rate in cents';
