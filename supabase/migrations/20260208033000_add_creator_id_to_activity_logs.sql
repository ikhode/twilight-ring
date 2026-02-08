-- Migration to add creator_id to production_activity_logs
ALTER TABLE production_activity_logs ADD COLUMN IF NOT EXISTS creator_id varchar REFERENCES users(id);

-- Note: No action needed for existing rows as it's nullable.
