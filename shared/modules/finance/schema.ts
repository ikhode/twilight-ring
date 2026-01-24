import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";
import { suppliers } from "../commerce/schema"; // Import Suppliers

// Finance: Expenses & Payments
export const expenses = pgTable("expenses", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    supplierId: varchar("supplier_id").references(() => suppliers.id),
    date: timestamp("date").defaultNow(),
});

export const payments = pgTable("payments", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    type: text("type").notNull(), // "income", "expense"
    method: text("method"), // "cash", "transfer", "check"
    referenceId: varchar("reference_id"), // link to expense or sale
    date: timestamp("date").defaultNow(),
});

// ============================================================================
// CASH MANAGEMENT SYSTEM (Caja Chica)
// ============================================================================

export const cashRegisters = pgTable("cash_registers", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "Main Register", "Petty Cash HQ"
    balance: integer("balance").notNull().default(0), // in cents
    status: text("status").notNull().default("closed"), // "open", "closed"
    currentSessionId: varchar("current_session_id"), // link to active session
    createdAt: timestamp("created_at").defaultNow(),
});

export const cashSessions = pgTable("cash_sessions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    registerId: varchar("register_id").notNull().references(() => cashRegisters.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    openedBy: varchar("opened_by").notNull().references(() => users.id),
    closedBy: varchar("closed_by").references(() => users.id),

    startTime: timestamp("start_time").defaultNow(),
    endTime: timestamp("end_time"),

    startAmount: integer("start_amount").notNull(), // in cents
    expectedEndAmount: integer("expected_end_amount"), // calculated
    actualEndAmount: integer("actual_end_amount"), // declared
    difference: integer("difference"), // actual - expected

    status: text("status").notNull().default("open"), // "open", "closed"
    notes: text("notes"),
});

export const cashTransactions = pgTable("cash_transactions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    registerId: varchar("register_id").notNull().references(() => cashRegisters.id),
    sessionId: varchar("session_id").notNull().references(() => cashSessions.id),

    amount: integer("amount").notNull(), // in cents (always positive)
    type: text("type").notNull(), // "in", "out"
    category: text("category").notNull(), // "sales", "supplier", "payroll", "funding", "withdrawal"
    description: text("description"),

    performedBy: varchar("performed_by").notNull().references(() => users.id),
    referenceId: varchar("reference_id"), // link to other entities

    timestamp: timestamp("timestamp").defaultNow(),
});

// Analytics & AI Models
export const analyticsMetrics = pgTable("analytics_metrics", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    metricKey: text("metric_key").notNull(), // e.g., "daily_revenue", "production_efficiency"
    value: integer("value").notNull(), // stored in cents or base units
    date: timestamp("date").defaultNow(),
    predictedValue: integer("predicted_value"),
    confidence: integer("confidence"), // 0-100
    tags: jsonb("tags").default({}),
});

export const metricModels = pgTable("metric_models", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "sales_forecast", "inventory_optimization"
    status: text("status").notNull().default("training"), // "training", "active", "calibrating"
    accuracy: integer("accuracy").default(0),
    lastTrainedAt: timestamp("last_trained_at").defaultNow(),
    nextTrainingAt: timestamp("next_training_at"),
    meta: jsonb("meta").default({}), // Hyperparameters or specific config
});

// TrustNet
export const trustParticipants = pgTable("trust_participants", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }).unique(),
    trustScore: integer("trust_score").notNull().default(0), // 0-1000
    joinedAt: timestamp("joined_at").defaultNow(),
    lastActiveAt: timestamp("last_active_at").defaultNow(),
    contributionCount: integer("contribution_count").default(0),
    multiplier: integer("multiplier").default(100), // 1.00 = 100
    status: text("status").default("observation"), // "observation", "verified", "peer", "guardian"
});

export const sharedInsights = pgTable("shared_insights", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sourceOrgId: varchar("source_org_id").notNull().references(() => organizations.id),
    industry: text("industry").notNull(),
    metricKey: text("metric_key").notNull(),
    value: integer("value").notNull(),
    anonymizedContext: jsonb("anonymized_context").default({}),
    verificationScore: integer("verification_score").default(0),
    createdAt: timestamp("created_at").defaultNow(),
});


// Types
export type CashRegister = typeof cashRegisters.$inferSelect;
export type CashSession = typeof cashSessions.$inferSelect;
export type CashTransaction = typeof cashTransactions.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Payment = typeof payments.$inferSelect;

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;
export type MetricModel = typeof metricModels.$inferSelect;
export type InsertMetricModel = z.infer<typeof insertMetricModelSchema>;


export const insertCashRegisterSchema = createInsertSchema(cashRegisters);
export const insertCashSessionSchema = createInsertSchema(cashSessions);
export const insertCashTransactionSchema = createInsertSchema(cashTransactions);
export const insertExpenseSchema = createInsertSchema(expenses);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics);
export const insertMetricModelSchema = createInsertSchema(metricModels);


export type InsertCashRegister = z.infer<typeof insertCashRegisterSchema>;
export type InsertCashSession = z.infer<typeof insertCashSessionSchema>;
export type InsertCashTransaction = z.infer<typeof insertCashTransactionSchema>;
