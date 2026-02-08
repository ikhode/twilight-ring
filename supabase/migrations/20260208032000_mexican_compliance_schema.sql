DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_regime') THEN
        CREATE TYPE "tax_regime" AS ENUM ('601', '603', '605', '612', '626');
    END IF;
END $$;

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "rfc" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "legal_name" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "tax_regime" "tax_regime";

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "rfc" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "curp" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "nss" text;

ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "rfc" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "rfc" text;
