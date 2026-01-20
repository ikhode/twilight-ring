-- Enable RLS on core tables
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "terminals" ENABLE ROW LEVEL SECURITY;

-- Create helper function to get current user's orgs
CREATE OR REPLACE FUNCTION get_auth_org_ids()
RETURNS TABLE (organization_id varchar) 
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT organization_id FROM user_organizations WHERE user_id = auth.uid();
$$;

-- Create helper function to check if user belongs to org
CREATE OR REPLACE FUNCTION is_org_member(org_id varchar)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id
  );
$$;

-- POLICIES

-- Users: Users can view their own profile
CREATE POLICY "Users can view self" ON "users"
FOR SELECT USING (id = auth.uid());

-- User Organizations: Users can see their own memberships
CREATE POLICY "Users can view own memberships" ON "user_organizations"
FOR SELECT USING (user_id = auth.uid());

-- Organizations: Users can view organizations they belong to
CREATE POLICY "Users can view their organizations" ON "organizations"
FOR SELECT USING (id IN (SELECT get_auth_org_ids()));

-- Organizations: Only admins can update (logic handled by app, but good to have)
-- Simplified for now: Members can view.

-- Employees: Users can view/edit employees of their orgs
CREATE POLICY "Org members can view employees" ON "employees"
FOR SELECT USING (organization_id IN (SELECT get_auth_org_ids()));

CREATE POLICY "Org admins can manage employees" ON "employees"
FOR ALL USING (organization_id IN (SELECT get_auth_org_ids()));

-- Terminals: Org members can view terminals
CREATE POLICY "Org members can view terminals" ON "terminals"
FOR SELECT USING (organization_id IN (SELECT get_auth_org_ids()));

-- Allow insert/update for org members (simplified)
CREATE POLICY "Org members can manage terminals" ON "terminals"
FOR ALL USING (organization_id IN (SELECT get_auth_org_ids()));

-- Storage/Kiosk Isolation
-- We need to ensure that when Kiosks access data (via server using Service Role typically, but if using Anon key...)
-- The server uses `postgres` or `service_role` which bypasses RLS. 
-- BUT if we use Supabase Client on frontend, RLS applies.
