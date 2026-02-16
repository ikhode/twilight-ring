-- Create Deal Status Enum
DO $$ BEGIN
    CREATE TYPE deal_status AS ENUM (
        'lead',
        'qualified',
        'proposal',
        'negotiation',
        'closed_won',
        'closed_lost'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Deals Table
CREATE TABLE IF NOT EXISTS "public"."deals" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" varchar NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "customer_id" varchar NOT NULL REFERENCES "public"."customers"("id"),
    "name" text NOT NULL,
    "description" text,
    "status" deal_status NOT NULL DEFAULT 'lead',
    "value" integer NOT NULL DEFAULT 0,
    "probability" integer NOT NULL DEFAULT 0,
    "expected_close_date" timestamp,
    "assigned_to" varchar REFERENCES "public"."users"("id"),
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."deals" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Users can view deals for their organization" ON "public"."deals";
CREATE POLICY "Users can view deals for their organization" ON "public"."deals" 
FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

-- Create Indexes
CREATE INDEX IF NOT EXISTS "idx_deals_organization_id" ON "public"."deals" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_deals_customer_id" ON "public"."deals" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_deals_assigned_to" ON "public"."deals" ("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_deals_status" ON "public"."deals" ("status");
