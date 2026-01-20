CREATE TABLE "analytics_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"metric_key" text NOT NULL,
	"value" integer NOT NULL,
	"date" timestamp DEFAULT now(),
	"predicted_value" integer,
	"confidence" integer,
	"tags" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "metric_models" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'training' NOT NULL,
	"accuracy" integer DEFAULT 0,
	"last_trained_at" timestamp DEFAULT now(),
	"next_training_at" timestamp,
	"meta" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "analytics_metrics" ADD CONSTRAINT "analytics_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_models" ADD CONSTRAINT "metric_models_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;