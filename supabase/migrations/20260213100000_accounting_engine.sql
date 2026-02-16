-- Migration: Accounting Engine (High Complexity Finance)
-- Author: Antigravity AI
-- Date: 2026-02-13

-- 1. Accounting Accounts (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounting_accounts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR NOT NULL, -- e.g. "1.1.01"
    name VARCHAR NOT NULL,
    type VARCHAR NOT NULL, -- "asset", "liability", "equity", "revenue", "expense"
    parent_id VARCHAR REFERENCES accounting_accounts(id),
    level INTEGER NOT NULL DEFAULT 1,
    is_selectable BOOLEAN NOT NULL DEFAULT true, -- If false, it's just a grouping account
    balance INTEGER NOT NULL DEFAULT 0, -- Current balance in cents
    currency VARCHAR NOT NULL DEFAULT 'MXN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- 2. Journal Entries (Headers)
CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reference VARCHAR, -- e.g. "INV-123", "PUR-456"
    description TEXT,
    status VARCHAR NOT NULL DEFAULT 'draft', -- "draft", "posted", "cancelled"
    type VARCHAR NOT NULL DEFAULT 'manual', -- "manual", "sale", "purchase", "expense", "depreciation"
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Journal Items (Details - Double Entry)
CREATE TABLE IF NOT EXISTS journal_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entry_id VARCHAR NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id VARCHAR NOT NULL REFERENCES accounting_accounts(id),
    debit INTEGER NOT NULL DEFAULT 0, -- in cents
    credit INTEGER NOT NULL DEFAULT 0, -- in cents
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure debit and credit are not both set or both zero in a weird way
    CONSTRAINT debit_credit_check CHECK ((debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0) OR (debit = 0 AND credit = 0))
);

-- 4. Taxes
CREATE TABLE IF NOT EXISTS taxes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL, -- e.g. "IVA 16%"
    rate INTEGER NOT NULL, -- in percentage points * 100 (e.g. 1600 for 16%)
    type VARCHAR NOT NULL, -- "sales", "purchase"
    account_id VARCHAR REFERENCES accounting_accounts(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Fixed Assets (Depreciation)
CREATE TABLE IF NOT EXISTS fixed_assets (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    description TEXT,
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
    purchase_value INTEGER NOT NULL, -- in cents
    salvage_value INTEGER NOT NULL DEFAULT 0, -- Valor de desecho
    useful_life_months INTEGER NOT NULL,
    depreciation_method VARCHAR NOT NULL DEFAULT 'straight_line',
    asset_account_id VARCHAR REFERENCES accounting_accounts(id),
    dep_expense_account_id VARCHAR REFERENCES accounting_accounts(id),
    accum_dep_account_id VARCHAR REFERENCES accounting_accounts(id),
    status VARCHAR NOT NULL DEFAULT 'active', -- "active", "disposed", "fully_depreciated"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Trigger to update parent account balances (Recursive) - Advanced Feature
-- For now, we will handle balance aggregation in queries to avoid trigger complexity,
-- but we define the indexes for performance.
CREATE INDEX idx_journal_items_account_id ON journal_items(account_id);
CREATE INDEX idx_journal_entries_org_date ON journal_entries(organization_id, date);

-- 7. Add RLS Policies
ALTER TABLE accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

-- 8. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE accounting_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE journal_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE journal_items;
ALTER PUBLICATION supabase_realtime ADD TABLE fixed_assets;
