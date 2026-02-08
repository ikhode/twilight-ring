import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";
import { employees } from "../hr/schema"; // Import HR for piecework

// Processes (Definitions)
export const processes = pgTable("processes", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull(), // "production", "hr_onboarding", "sales_pipeline", "logistics_route", "finance_approval"
    isTemplate: boolean("is_template").default(false),
    workflowData: jsonb("workflow_data").default({}), // Stores React Flow nodes and edges
    orderIndex: integer("order_index").default(0),
    attributes: jsonb("attributes").default({}), // Universal Extensibility
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Process Steps (Graph-based nodes)
export const processSteps = pgTable("process_steps", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    processId: varchar("process_id").notNull().references(() => processes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // "task", "decision", "milestone"
    order: integer("order").notNull(),
    dependencies: jsonb("dependencies").default([]), // array of step IDs
    expectedDuration: integer("expected_duration"), // in minutes
    criticalKpis: jsonb("critical_kpis").default({}), // e.g. { "temperature": { "max": 100 } }
    metrics: jsonb("metrics").default({}), // For "Optimization Map": { "efficiency": 85, "waste": 7 }
    config: jsonb("config").default({}), // Workflow step logic (e.g., condition rules, action targets)
});

// Process Instances (Executions)
export const processInstances = pgTable("process_instances", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    processId: varchar("process_id").notNull().references(() => processes.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"), // "active", "completed", "halted", "delayed"
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    healthScore: integer("health_score").default(100),
    aiContext: jsonb("ai_context").default({}), // RCA insights
    sourceBatchId: varchar("source_batch_id"), // Link to Purchase Batch (Traceability)
    organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),

    // Physical Traceability
    originLocation: text("origin_location"),
    targetLocation: text("target_location"),
});

// Process Events (Traceability logs)
export const processEvents = pgTable("process_events", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    instanceId: varchar("instance_id").notNull().references(() => processInstances.id, { onDelete: "cascade" }),
    stepId: varchar("step_id").references(() => processSteps.id),
    eventType: text("event_type").notNull(), // "start", "complete", "anomaly", "check"
    data: jsonb("data").default({}),
    userId: varchar("user_id").references(() => users.id),
    timestamp: timestamp("timestamp").defaultNow(),
});

// RCA Reports (Root Cause Analysis)
export const rcaReports = pgTable("rca_reports", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    instanceId: varchar("instance_id").notNull().references(() => processInstances.id, { onDelete: "cascade" }),
    targetEventId: varchar("target_event_id").notNull().references(() => processEvents.id),
    rootCauseEventId: varchar("root_cause_event_id").notNull().references(() => processEvents.id),
    confidence: integer("confidence").default(0), // 0-100
    analysis: text("analysis").notNull(),
    recommendation: text("recommendation").notNull(),
    status: text("status").notNull().default("draft"), // "draft", "reviewed", "implemented"
    createdAt: timestamp("created_at").defaultNow(),
});

// Piecework (Destajo)
export const productionTasks = pgTable("production_tasks", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    unitPrice: integer("unit_price").notNull(), // in cents
    minRate: integer("min_rate"), // Lowest allowed pay per unit
    maxRate: integer("max_rate"), // Highest allowed pay per unit
    unit: text("unit").notNull().default("pza"), // "pza", "par", "kg"
    active: boolean("active").notNull().default(true),
    // Recipe Fields
    isRecipe: boolean("is_recipe").default(false),
    // Structure: { inputs: [{ itemId: string, quantity: number }], outputs: [{ itemId: string, quantity: number }] }
    recipeData: jsonb("recipe_data").default({}),
    attributes: jsonb("attributes").default({}), // Universal Extensibility
    createdAt: timestamp("created_at").defaultNow(),
});

export const pieceworkTickets = pgTable("piecework_tickets", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: varchar("employee_id").notNull().references(() => employees.id), // The operator
    creatorId: varchar("creator_id").references(() => users.id), // Who recorded it
    taskName: text("task_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(), // in cents
    totalAmount: integer("total_amount").notNull(), // in cents (quantity * unitPrice)
    batchId: varchar("batch_id"), // Optional link to specific production batch
    status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "paid"
    attributes: jsonb("attributes").default({}), // Universal Extensibility
    approvedBy: varchar("approved_by").references(() => users.id),
    sourceLocation: text("source_location"), // Where product was taken from
    destinationLocation: text("destination_location"), // Where product was sent
    notes: text("notes"),
    ticketNumber: integer("ticket_number").notNull().default(sql`floor(random() * 900000 + 100000)::int`), // Simple 6-digit number
    signatureUrl: text("signature_url"), // Proof of recipient signature
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas
export const insertProcessEventSchema = createInsertSchema(processEvents);
export const insertProcessSchema = createInsertSchema(processes);
export const insertRcaReportSchema = createInsertSchema(rcaReports);
export const insertPieceworkTicketSchema = createInsertSchema(pieceworkTickets);
export const insertProductionTaskSchema = createInsertSchema(productionTasks).extend({
    minRate: z.number().optional(),
    maxRate: z.number().optional()
});

// Logs for Kiosk Activity (Granular Tracking)
export const productionActivityLogs = pgTable("production_activity_logs", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),

    // Type of activity
    activityType: text("activity_type").notNull(), // 'production', 'break', 'lunch', 'bathroom', 'other'

    // Link to context (only for production type)
    taskId: varchar("task_id").references(() => productionTasks.id),
    batchId: varchar("batch_id"), // Optional: if they are working on a specific batch

    // Timeline
    startedAt: timestamp("started_at").defaultNow(),
    endedAt: timestamp("ended_at"),

    // Outcome
    status: text("status").notNull().default("active"), // 'active', 'pending_verification', 'completed', 'abandoned'
    quantity: integer("quantity").default(0), // Self-reported quantity (if allowed) or verified quantity

    // Metadata
    metadata: jsonb("metadata").default({}),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductionActivityLogSchema = createInsertSchema(productionActivityLogs);
export type ProductionActivityLog = typeof productionActivityLogs.$inferSelect;
export type InsertProductionActivityLog = z.infer<typeof insertProductionActivityLogSchema>;

// Types
export type Process = typeof processes.$inferSelect;
export type ProcessStep = typeof processSteps.$inferSelect;
export type ProcessInstance = typeof processInstances.$inferSelect;
export type ProcessEvent = typeof processEvents.$inferSelect;
export type RcaReport = typeof rcaReports.$inferSelect;
export type PieceworkTicket = typeof pieceworkTickets.$inferSelect;

export type InsertProcessEvent = z.infer<typeof insertProcessEventSchema>;
export type InsertRcaReport = z.infer<typeof insertRcaReportSchema>;
export type InsertProductionTask = z.infer<typeof insertProductionTaskSchema>;

