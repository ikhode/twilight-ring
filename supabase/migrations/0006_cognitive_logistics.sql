CREATE TABLE "routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"driver_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"estimated_duration" integer,
	"total_distance" real,
	"current_location_lat" real,
	"current_location_lng" real,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "route_stops" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" varchar NOT NULL,
	"order_id" varchar,
	"sequence" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"location_lat" real,
	"location_lng" real,
	"address" text,
	"proof_signature" text,
	"proof_photo" text,
	"proof_location_lat" real,
	"proof_location_lng" real,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

ALTER TABLE "routes" ADD CONSTRAINT "routes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "routes" ADD CONSTRAINT "routes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "routes" ADD CONSTRAINT "routes_driver_id_employees_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_order_id_sales_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;
