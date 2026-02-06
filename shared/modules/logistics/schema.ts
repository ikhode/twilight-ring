import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";
import { employees } from "../hr/schema";
import { sales, purchases } from "../commerce/schema"; // Dependent on Commerce

// Fleet/Logistics
export const vehicles = pgTable("vehicles", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    plate: text("plate").notNull().unique(),
    model: text("model").notNull(),
    year: integer("year"),
    status: text("status").notNull().default("active"), // "active", "maintenance", "inactive"
    currentMileage: integer("current_mileage").default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

export const fuelLogs = pgTable("fuel_logs", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    date: timestamp("date").defaultNow(),
    liters: integer("liters").notNull(),
    cost: integer("cost").notNull(),
    mileage: integer("mileage").notNull(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    date: timestamp("date").defaultNow(),
    type: text("type").notNull(), // "preventive", "corrective"
    description: text("description"),
    cost: integer("cost").notNull(),
    mileageIn: integer("mileage_in"),
    mileageOut: integer("mileage_out"),
    partsUsed: jsonb("parts_used").default([]), // array of { name, quantity, cost }
});

export const routes = pgTable("routes", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    driverId: varchar("driver_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // "pending", "active", "completed", "incident"
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    estimatedDuration: integer("estimated_duration"), // minutes
    totalDistance: customType<{ data: number }>({ dataType() { return "real"; } })("total_distance"),
    currentLocationLat: customType<{ data: number }>({ dataType() { return "real"; } })("current_location_lat"),
    currentLocationLng: customType<{ data: number }>({ dataType() { return "real"; } })("current_location_lng"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const routeStops = pgTable("route_stops", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    routeId: varchar("route_id").notNull().references(() => routes.id, { onDelete: "cascade" }),
    orderId: varchar("order_id").references(() => sales.id, { onDelete: "cascade" }), // Link to delivery
    purchaseId: varchar("purchase_id").references(() => purchases.id, { onDelete: "cascade" }), // Link to collection
    stopType: text("stop_type").notNull().default("delivery"), // "delivery", "collection"
    sequence: integer("sequence").notNull(),
    status: text("status").notNull().default("pending"), // "pending", "arrived", "completed", "failed"
    locationLat: customType<{ data: number }>({ dataType() { return "real"; } })("location_lat"),
    locationLng: customType<{ data: number }>({ dataType() { return "real"; } })("location_lng"),
    address: text("address"),
    proofSignature: text("proof_signature"),
    proofPhoto: text("proof_photo"),
    proofLocationLat: customType<{ data: number }>({ dataType() { return "real"; } })("proof_location_lat"),
    proofLocationLng: customType<{ data: number }>({ dataType() { return "real"; } })("proof_location_lng"),
    // Payment/Cash Collection
    isPaid: boolean("is_paid").default(false),
    paymentAmount: integer("payment_amount"),
    paymentMethod: text("payment_method"), // "cash", "transfer", "credit"
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const terminals = pgTable("terminals", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location"),
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]), // ["attendance", "production", "sales", "info"]
    status: text("status").notNull().default("active"), // "active", "offline", "maintenance"
    deviceId: text("device_id").unique(), // Hardware identifier
    ipAddress: text("ip_address"),
    lastActiveAt: timestamp("last_active_at"),
    // Driver Kiosk Specific
    driverId: varchar("driver_id").references(() => employees.id),
    vehicleId: varchar("vehicle_id").references(() => vehicles.id),
    linkedDeviceId: text("linked_device_id"), // The PWA's local generated key
    deviceSalt: text("device_salt"), // High-entropy salt for hardware binding
    provisioningToken: text("provisioning_token"), // One-time use token for linking
    provisioningExpiresAt: timestamp("provisioning_expires_at"),
    // Session Behavior
    sessionPersistence: boolean("session_persistence").notNull().default(false),
    // Real-time GPS Tracking
    lastLatitude: customType<{ data: number }>({ dataType() { return "real"; } })("last_latitude"),
    lastLongitude: customType<{ data: number }>({ dataType() { return "real"; } })("last_longitude"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const driverTokens = pgTable("driver_tokens", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(), // Short code or UUID
    status: text("status").notNull().default("active"), // "active", "used", "expired"
    driverId: varchar("driver_id").references(() => employees.id), // Optional pre-bind
    vehicleId: varchar("vehicle_id").references(() => vehicles.id), // Optional pre-bind
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

// Types
export type Vehicle = typeof vehicles.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type RouteStop = typeof routeStops.$inferSelect;
export type FuelLog = typeof fuelLogs.$inferSelect;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type Terminal = typeof terminals.$inferSelect;

export const insertVehicleSchema = createInsertSchema(vehicles);
export const insertRouteSchema = createInsertSchema(routes);
export const insertRouteStopSchema = createInsertSchema(routeStops);
export const insertFuelLogSchema = createInsertSchema(fuelLogs);
export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs);
export const insertTerminalSchema = createInsertSchema(terminals);

// End of File
