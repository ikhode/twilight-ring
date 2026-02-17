-- Add PIN to employees
ALTER TABLE "employees" ADD COLUMN "pin_code" text;

-- Add Seller ID to sales
ALTER TABLE "sales" ADD COLUMN "seller_id" varchar REFERENCES "employees"("id");

-- Create Modifiers Table
CREATE TABLE "modifiers" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "options" jsonb NOT NULL,
    "allow_multiple" boolean DEFAULT true,
    "is_required" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now()
);

-- Create Discounts Table
CREATE TABLE "discounts" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "value" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now()
);
