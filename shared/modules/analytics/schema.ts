import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { organizations } from "../../core/schema";
import { sql } from "drizzle-orm";

// Analytics - Custom Reports
export const customReports = pgTable("custom_reports", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    config: jsonb("config").notNull(), // { metrics: [], filters: {}, chartType: "line" }
    schedule: text("schedule"), // "daily", "weekly", null
    createdAt: timestamp("created_at").defaultNow(),
});

// Analytics - Snapshots (Daily History)
export const analyticsSnapshots = pgTable("analytics_snapshots", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    metrics: jsonb("metrics").notNull(), // { revenue: 100, expenses: 50, ... }
    createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomReportSchema = createInsertSchema(customReports);
export const insertAnalyticsSnapshotSchema = createInsertSchema(analyticsSnapshots);
export const insertAnalyticsMetricSchema = createInsertSchema(analyticsSnapshots); // Fallback if used elsewhere
