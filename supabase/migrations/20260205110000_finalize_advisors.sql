-- 1. Enable RLS on remaining tables
ALTER TABLE "public"."bank_reconciliations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trust_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."process_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."route_stops" ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies for tables with direct organization_id
CREATE POLICY "Users can view bank_reconciliations for their org" ON "public"."bank_reconciliations"
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view customers for their org" ON "public"."customers"
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view product_categories for their org" ON "public"."product_categories"
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view product_groups for their org" ON "public"."product_groups"
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view trust_events for their org" ON "public"."trust_events"
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

-- 3. Create Policies for nested tables (JOIN requisite)

-- process_events -> process_instances -> organization_id
CREATE POLICY "Users can view process_events for their org" ON "public"."process_events"
FOR ALL USING (
  instance_id IN (
    SELECT id FROM process_instances 
    WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text)
  )
);

-- route_stops -> routes -> organization_id
CREATE POLICY "Users can view route_stops for their org" ON "public"."route_stops"
FOR ALL USING (
  route_id IN (
    SELECT id FROM routes 
    WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text)
  )
);

-- 4. Add Missing Indexes (Performance Advisor)
CREATE INDEX IF NOT EXISTS "idx_products_master_product_id" ON "public"."products" ("master_product_id");
CREATE INDEX IF NOT EXISTS "idx_products_organization_id" ON "public"."products" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_products_unit_id" ON "public"."products" ("unit_id");

-- 5. Drop Unused Indexes (only if they exist and are truly redundant)
DROP INDEX IF EXISTS "public"."idx_product_units_organization_id";
DROP INDEX IF EXISTS "public"."idx_production_tasks_organization_id";
DROP INDEX IF EXISTS "public"."idx_products_category_id";
DROP INDEX IF EXISTS "public"."idx_products_group_id";
