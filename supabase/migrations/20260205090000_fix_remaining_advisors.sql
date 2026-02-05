-- 1. Enable RLS on remaining public tables
ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."piecework_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."terminals" ENABLE ROW LEVEL SECURITY;

-- 2. Add Organization Policies linked to user_organizations
DROP POLICY IF EXISTS "Users can view data for their organization" ON "public"."bank_accounts";
CREATE POLICY "Users can view data for their organization" ON "public"."bank_accounts" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can view data for their organization" ON "public"."piecework_tickets";
CREATE POLICY "Users can view data for their organization" ON "public"."piecework_tickets" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can view data for their organization" ON "public"."product_units";
CREATE POLICY "Users can view data for their organization" ON "public"."product_units" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can view data for their organization" ON "public"."routes";
CREATE POLICY "Users can view data for their organization" ON "public"."routes" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can view data for their organization" ON "public"."suppliers";
CREATE POLICY "Users can view data for their organization" ON "public"."suppliers" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can view data for their organization" ON "public"."terminals";
CREATE POLICY "Users can view data for their organization" ON "public"."terminals" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

-- 3. Move Vector extension to separate schema (Best Practice / Warning Fix)
CREATE SCHEMA IF NOT EXISTS "extensions";
ALTER EXTENSION "vector" SET SCHEMA "extensions";

-- 4. Re-Add FK Indexes (Advisor loop fix: Unused -> Dropped -> Unindexed FK -> Add back)
-- We prioritize Structural Correctness (Indexed FKs) over "Unused" stats for low-traffic tables.
CREATE INDEX IF NOT EXISTS "idx_purchases_driver_id_fix" ON "public"."purchases" USING btree ("driver_id");
CREATE INDEX IF NOT EXISTS "idx_purchases_organization_id_fix" ON "public"."purchases" USING btree ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_purchases_product_id_fix" ON "public"."purchases" USING btree ("product_id");
CREATE INDEX IF NOT EXISTS "idx_purchases_supplier_id_fix" ON "public"."purchases" USING btree ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_purchases_vehicle_id_fix" ON "public"."purchases" USING btree ("vehicle_id");

-- 5. Drop genuinely unused indexes flagged in Round 2
DROP INDEX IF EXISTS "public"."idx_products_master_product_id";
DROP INDEX IF EXISTS "public"."idx_products_organization_id";
DROP INDEX IF EXISTS "public"."idx_products_unit_id";
DROP INDEX IF EXISTS "public"."idx_purchases_approved_by";
