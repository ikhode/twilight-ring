-- Migration: 0008_price_thresholds
-- Description: Add min/max rate columns to production_tasks for payment granular control.

ALTER TABLE "production_tasks" 
ADD COLUMN IF NOT EXISTS "min_rate" integer,
ADD COLUMN IF NOT EXISTS "max_rate" integer;
