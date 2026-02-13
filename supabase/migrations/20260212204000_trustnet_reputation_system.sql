-- Trust Profiles
CREATE TABLE IF NOT EXISTS "trust_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"trust_score" integer NOT NULL DEFAULT 0,
	"trust_level" text NOT NULL DEFAULT 'bronze',
	"last_score_update" timestamp DEFAULT now(),
	"calculation_method" text DEFAULT 'Cognitive Risk v1',
	"verification_status" text NOT NULL DEFAULT 'unverified',
	"marketplace_active" boolean DEFAULT false,
	"industry" text,
	"founded_year" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Trust Privacy Settings (Consolidating marketplace_consents)
DROP TABLE IF EXISTS "marketplace_consents" CASCADE;
CREATE TABLE "trust_privacy_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"permission_type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"granted_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"scope" text,
	"created_at" timestamp DEFAULT now()
);

-- Trust Metrics (Expanded for cognitive scoring)
DROP TABLE IF EXISTS "trust_metrics" CASCADE;
CREATE TABLE "trust_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"metric_name" text NOT NULL,
	"metric_value" integer NOT NULL DEFAULT 0,
	"metric_weight" integer DEFAULT 10,
	"data_source" text,
	"verification_status" text DEFAULT 'unverified',
	"verified_at" timestamp,
	"verified_by" varchar REFERENCES "users"("id"),
	"timestamp" timestamp DEFAULT now()
);

-- Marketplace Listings (B2B Products)
DROP TABLE IF EXISTS "marketplace_listings" CASCADE;
CREATE TABLE "marketplace_listings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"seller_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"product_id" varchar,
	"product_name" text NOT NULL,
	"description" text,
	"category" text,
	"price" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"quantity_available" integer DEFAULT 0,
	"unit_type" text,
	"images" jsonb DEFAULT '[]',
	"seller_trust_score" integer,
	"min_order_qty" integer DEFAULT 1,
	"delivery_time_days" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Marketplace Offers (RFQ & Negotiation)
DROP TABLE IF EXISTS "marketplace_negotiations" CASCADE;
CREATE TABLE IF NOT EXISTS "marketplace_offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"listing_id" varchar NOT NULL REFERENCES "marketplace_listings"("id") ON DELETE CASCADE,
	"buyer_id" varchar NOT NULL REFERENCES "organizations"("id"),
	"seller_id" varchar NOT NULL REFERENCES "organizations"("id"),
	"qty_requested" integer NOT NULL,
	"price_per_unit" integer NOT NULL,
	"total_price" integer NOT NULL,
	"delivery_location" text,
	"required_date" timestamp,
	"status" text NOT NULL DEFAULT 'pending',
	"terms" jsonb,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);

-- Trust Transactions (Verified Deal Completion)
DROP TABLE IF EXISTS "marketplace_transactions" CASCADE;
CREATE TABLE "trust_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"offer_id" varchar REFERENCES "marketplace_offers"("id"),
	"buyer_id" varchar NOT NULL REFERENCES "organizations"("id"),
	"seller_id" varchar NOT NULL REFERENCES "organizations"("id"),
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"status" text NOT NULL DEFAULT 'initiated',
	"delivery_status" text,
	"delivery_proof" text,
	"payment_method" text,
	"payment_verified_at" timestamp,
	"delivery_verified_at" timestamp,
	"transaction_hash" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);

-- Trust Reviews (Peer validation)
CREATE TABLE IF NOT EXISTS "trust_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"transaction_id" varchar REFERENCES "trust_transactions"("id"),
	"reviewer_id" varchar NOT NULL REFERENCES "organizations"("id"),
	"reviewed_id" varchar NOT NULL REFERENCES "organizations"("id"),
	"rating" integer NOT NULL,
	"review_text" text,
	"categories_rating" jsonb,
	"verified_purchase" boolean DEFAULT true,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);

-- Benchmark Data (Anonymized averages)
CREATE TABLE IF NOT EXISTS "benchmark_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"industry" text NOT NULL,
	"country" text NOT NULL DEFAULT 'MX',
	"metric_name" text NOT NULL,
	"average_value" integer,
	"median_value" integer,
	"percentile_25" integer,
	"percentile_75" integer,
	"total_companies" integer,
	"data_points_count" integer,
	"calculation_date" timestamp DEFAULT now()
);

-- External Verifications
CREATE TABLE IF NOT EXISTS "external_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"verification_type" text NOT NULL,
	"external_entity" text,
	"status" text NOT NULL DEFAULT 'pending',
	"result" jsonb,
	"score_impact" integer DEFAULT 0,
	"verified_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

-- Trust Appeals
DROP TABLE IF EXISTS "trust_appeals" CASCADE;
CREATE TABLE "trust_appeals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"appeal_type" text NOT NULL,
	"reason" text,
	"supporting_docs" jsonb DEFAULT '[]',
	"status" text NOT NULL DEFAULT 'submitted',
	"reviewer_id" varchar REFERENCES "users"("id"),
	"reviewer_notes" text,
	"resolution_date" timestamp,
	"appeal_impact" jsonb,
	"created_at" timestamp DEFAULT now()
);

-- Trust Score History
DROP TABLE IF EXISTS "trust_score_history" CASCADE;
CREATE TABLE "trust_score_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" varchar NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"previous_score" integer,
	"new_score" integer NOT NULL,
	"reason" text,
	"metrics_used" jsonb,
	"changed_at" timestamp DEFAULT now()
);
