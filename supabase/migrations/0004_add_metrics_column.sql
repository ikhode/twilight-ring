-- Add missing columns to existing tables
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "department" text DEFAULT 'general' NOT NULL;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "salary" integer DEFAULT 0;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "join_date" timestamp DEFAULT now();
ALTER TABLE "process_steps" ADD COLUMN IF NOT EXISTS "metrics" jsonb DEFAULT '{}'::jsonb;