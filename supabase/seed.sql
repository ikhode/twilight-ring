-- Seed script to create initial user and organization
-- This should be run after db reset to restore basic data

-- Insert test user (matching Supabase Auth user)
INSERT INTO users (id, email, name, created_at, updated_at)
VALUES 
  ('f6b56764-5519-44cf-a7ff-74fd0ac06765', 'test@example.com', 'Test User', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test organization
INSERT INTO organizations (id, name, industry, subscription_tier, onboarding_status, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Test Organization', 'manufacturing', 'trial', 'completed', NOW(), NOW())
ON CONFLICT DO NOTHING
RETURNING id;

-- Link user to organization (you'll need to replace the org ID)
-- Run this after getting the organization ID from above:
-- INSERT INTO user_organizations (user_id, organization_id, role, created_at)
-- VALUES ('f6b56764-5519-44cf-a7ff-74fd0ac06765', '<org-id-from-above>', 'admin', NOW());
