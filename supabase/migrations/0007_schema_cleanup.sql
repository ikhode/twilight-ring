-- Migration: 0007_schema_cleanup
-- Description: Remove legacy product fields and unused TrustNet tables to reduce noise ("Zero Ruido").

-- 1. Remove legacy columns from 'products' table
ALTER TABLE "products" DROP COLUMN IF EXISTS "product_type";
ALTER TABLE "products" DROP COLUMN IF EXISTS "category";
ALTER TABLE "products" DROP COLUMN IF EXISTS "unit";

-- 2. Drop unused TrustNet tables
DROP TABLE IF EXISTS "trust_participants";
DROP TABLE IF EXISTS "shared_insights";
