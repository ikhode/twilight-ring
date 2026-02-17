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

// TrustNet - Organization Participation
export const trustParticipants = pgTable("trust_participants", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }).unique(),
    trustScore: integer("trust_score").notNull().default(100),
    contributionCount: integer("contribution_count").notNull().default(0),
    multiplier: integer("multiplier").notNull().default(100),
    status: text("status").notNull().default("observation"), // "observation", "verified", "peer", "guardian"
    joinedAt: timestamp("joined_at").defaultNow(),
    lastActiveAt: timestamp("last_active_at").defaultNow(),
});

// TrustNet - Shared Industry Metics
export const sharedInsights = pgTable("shared_insights", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sourceOrgId: varchar("source_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    industry: text("industry").notNull(),
    metricKey: text("metric_key").notNull(),
    value: integer("value").notNull(),
    anonymizedContext: jsonb("anonymized_context").default({}),
    verificationScore: integer("verification_score").default(100),
    createdAt: timestamp("created_at").defaultNow(),
});

export type TrustParticipant = typeof trustParticipants.$inferSelect;
export type SharedInsight = typeof sharedInsights.$inferSelect;
export const insertTrustParticipantSchema = createInsertSchema(trustParticipants);
export const insertSharedInsightSchema = createInsertSchema(sharedInsights);

// Analytics - Raw Events (Feature Adoption)
export const analyticsEvents = pgTable("analytics_events", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id"), // Nullable for anonymous events (if any)
    eventType: text("event_type").notNull(), // 'page_view', 'feature_used', 'error'
    eventName: text("event_name").notNull(), // '/dashboard', 'create_sale_click'
    properties: jsonb("properties").default({}),
    userAgent: text("user_agent"),
    path: text("path"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents);
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
