-- Migration: Advanced Inventory (Phase 7)
-- Description: Adds tables for multi-location inventory, transfer orders, and physical counts.

-- 1. Locations (Sucursales/Bodegas)
CREATE TABLE IF NOT EXISTS "locations" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "type" text NOT NULL DEFAULT 'warehouse', -- 'warehouse', 'store', 'transit'
    "address" text,
    "is_main" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now()
);

-- 2. Product Stocks (Stock per Location)
CREATE TABLE IF NOT EXISTS "product_stocks" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "product_id" varchar NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "location_id" varchar NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
    "quantity" integer NOT NULL DEFAULT 0,
    "min_stock" integer DEFAULT 0,
    "max_stock" integer,
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT product_location_unique UNIQUE("product_id", "location_id")
);

-- 3. Transfer Orders (Movement between Locations)
CREATE TABLE IF NOT EXISTS "transfer_orders" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "source_location_id" varchar REFERENCES "locations"("id"),
    "destination_location_id" varchar REFERENCES "locations"("id"),
    "status" text NOT NULL DEFAULT 'draft', -- 'draft', 'requested', 'in_transit', 'completed', 'cancelled'
    "requested_by" varchar REFERENCES "users"("id"),
    "approved_by" varchar REFERENCES "users"("id"),
    "items" jsonb NOT NULL, -- Array of { productId, quantity, receivedQuantity }
    "notes" text,
    "created_at" timestamp DEFAULT now(),
    "completed_at" timestamp
);

-- 4. Inventory Counts (Physical Audits)
CREATE TABLE IF NOT EXISTS "inventory_counts" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "location_id" varchar REFERENCES "locations"("id"),
    "status" text NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
    "performed_by" varchar REFERENCES "users"("id"),
    "items" jsonb NOT NULL, -- Array of { productId, expected, counted, difference }
    "notes" text,
    "created_at" timestamp DEFAULT now(),
    "finalized_at" timestamp
);

-- Enable RLS (Row Level Security) on new tables
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_stocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transfer_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_counts" ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (Standard Organization Isolation)
CREATE POLICY "Users can view own organization locations" ON "locations"
    FOR SELECT USING (organization_id = current_setting('app.current_organization_id', true)::varchar);

CREATE POLICY "Users can manage own organization locations" ON "locations"
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::varchar);

CREATE POLICY "Users can view own organization stocks" ON "product_stocks"
    FOR SELECT USING (organization_id = current_setting('app.current_organization_id', true)::varchar);

CREATE POLICY "Users can manage own organization stocks" ON "product_stocks"
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::varchar);

CREATE POLICY "Users can view own organization transfers" ON "transfer_orders"
    FOR SELECT USING (organization_id = current_setting('app.current_organization_id', true)::varchar);

CREATE POLICY "Users can manage own organization transfers" ON "transfer_orders"
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::varchar);

CREATE POLICY "Users can view own organization counts" ON "inventory_counts"
    FOR SELECT USING (organization_id = current_setting('app.current_organization_id', true)::varchar);

CREATE POLICY "Users can manage own organization counts" ON "inventory_counts"
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::varchar);
