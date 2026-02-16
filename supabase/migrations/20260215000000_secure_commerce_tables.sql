-- Enable RLS on remaining commerce tables
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_units" ENABLE ROW LEVEL SECURITY;

-- Create isolation policies for Customers
DROP POLICY IF EXISTS "Users can access customers for their organization" ON "public"."customers";
CREATE POLICY "Users can access customers for their organization" ON "public"."customers" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

-- Create isolation policies for Suppliers
DROP POLICY IF EXISTS "Users can access suppliers for their organization" ON "public"."suppliers";
CREATE POLICY "Users can access suppliers for their organization" ON "public"."suppliers" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

-- Create isolation policies for Product Categories
DROP POLICY IF EXISTS "Users can access product_categories for their organization" ON "public"."product_categories";
CREATE POLICY "Users can access product_categories for their organization" ON "public"."product_categories" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

-- Create isolation policies for Product Groups
DROP POLICY IF EXISTS "Users can access product_groups for their organization" ON "public"."product_groups";
CREATE POLICY "Users can access product_groups for their organization" ON "public"."product_groups" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

-- Create isolation policies for Product Units
DROP POLICY IF EXISTS "Users can access product_units for their organization" ON "public"."product_units";
CREATE POLICY "Users can access product_units for their organization" ON "public"."product_units" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));
