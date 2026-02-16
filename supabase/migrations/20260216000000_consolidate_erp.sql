-- Migration: Consolidate ERP Modules (Loyalty, Restaurant, Mobile POS)
-- Date: 2026-02-16

-- 1. Add Loyalty Fields to Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_card_code TEXT;
ALTER TABLE customers ADD CONSTRAINT customers_loyalty_card_code_unique UNIQUE (loyalty_card_code);

-- 2. Add Restaurant & Mobile POS Fields to Sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'takeout';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS kitchen_status TEXT DEFAULT 'pending';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS pax INTEGER DEFAULT 1;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_offline_sync BOOLEAN DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS modifiers JSONB DEFAULT '[]'::jsonb;

-- 3. Create Indexes for new fields (Optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_sales_kitchen_status ON sales(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_sales_order_type ON sales(order_type);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_card ON customers(loyalty_card_code);
