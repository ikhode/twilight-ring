import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, numeric } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";
import { products } from "../commerce/schema";
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


// --- Manufacturing Complexity Extension ---

// 1. Work Centers (Physical locations/machines)
export const workCenters = pgTable("work_centers", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull(), // 'machine', 'manual', 'assembly_line'
    capacityPerHour: integer("capacity_per_hour"), // In units per hour
    status: text("status").default("active"), // 'active', 'maintenance', 'inactive'
    attributes: jsonb("attributes").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Bill of Materials (BOM) Header
export const billOfMaterials = pgTable("bill_of_materials", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    productId: varchar("product_id").notNull().references(() => products.id),
    name: text("name").notNull(),
    description: text("description"),
    version: varchar("version").default("1.0.0"),
    isActive: boolean("is_active").default(true),
    isDefault: boolean("is_default").default(false),
    attributes: jsonb("attributes").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. BOM Items (Components)
export const bomItems = pgTable("bom_items", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    bomId: varchar("bom_id").notNull().references(() => billOfMaterials.id, { onDelete: "cascade" }),
    itemId: varchar("item_id").notNull().references(() => products.id), // Raw material or sub-assembly
    quantity: numeric("quantity").notNull(), // Quantity needed for 1 unit of output
    scrapFactor: numeric("scrap_factor").default("0"), // Factor for expected waste (e.g. 0.05 for 5%)
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
});

// 4. Manufacturing Routings (Process Steps)
export const manufacturingRoutings = pgTable("manufacturing_routings", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    bomId: varchar("bom_id").notNull().references(() => billOfMaterials.id, { onDelete: "cascade" }),
    stepName: text("step_name").notNull(),
    workCenterId: varchar("work_center_id").references(() => workCenters.id),
    orderIndex: integer("order_index").notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes"), // Expected time in center
    instructions: text("instructions"),
    requiredSkills: jsonb("required_skills").default([]),
    createdAt: timestamp("created_at").defaultNow(),
});

// 5. Production Orders
export const productionOrders = pgTable("production_orders", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    bomId: varchar("bom_id").notNull().references(() => billOfMaterials.id),
    productId: varchar("product_id").notNull().references(() => products.id), // Resulting product
    quantityRequested: integer("quantity_requested").notNull(),
    quantityProduced: integer("quantity_produced").default(0),
    status: text("status").default("draft"), // 'draft', 'scheduled', 'in_progress', 'qc_pending', 'completed', 'cancelled'
    priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    totalCost: integer("total_cost").default(0), // Accumulated cost in cents
    metadata: jsonb("metadata").default({}),
    salesOrderId: varchar("sales_order_id"), // Optional link to Sales
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. Production Order Logs (Execution steps)
export const productionOrderLogs = pgTable("production_order_logs", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: varchar("order_id").notNull().references(() => productionOrders.id, { onDelete: "cascade" }),
    routingStepId: varchar("routing_step_id").references(() => manufacturingRoutings.id),
    operatorId: varchar("operator_id").references(() => employees.id),
    workCenterId: varchar("work_center_id").references(() => workCenters.id),
    status: text("status").notNull(), // 'started', 'completed', 'paused', 'failed'
    quantityCompleted: integer("quantity_completed").default(0),
    startedAt: timestamp("started_at").defaultNow(),
    endedAt: timestamp("ended_at"),
    notes: text("notes"),
    metadata: jsonb("metadata").default({}),
});

// 7. Quality Inspections
export const qualityInspections = pgTable("quality_inspections", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    orderId: varchar("order_id").notNull().references(() => productionOrders.id, { onDelete: "cascade" }),
    logId: varchar("log_id").references(() => productionOrderLogs.id),
    inspectorId: varchar("inspector_id").references(() => users.id),
    status: text("status").notNull(), // 'passed', 'failed', 'rework'
    findings: jsonb("findings").default([]),
    notes: text("notes"),
    inspectedAt: timestamp("inspected_at").defaultNow(),
});

// 8. MRP Recommendations (Material Requirements Planning)
export const mrpRecommendations = pgTable("mrp_recommendations", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    productId: varchar("product_id").notNull().references(() => products.id),
    orderId: varchar("order_id").references(() => productionOrders.id),
    requiredQuantity: numeric("required_quantity").notNull(),
    currentStock: numeric("current_stock").notNull(),
    suggestedPurchaseQuantity: numeric("suggested_purchase_quantity").notNull(),
    status: text("status").default("pending"), // 'pending', 'converted_to_po', 'dismissed'
    linkedPoId: varchar("linked_po_id"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const billOfMaterialsRelations = relations(billOfMaterials, ({ many, one }) => ({
    items: many(bomItems),
    routings: many(manufacturingRoutings),
    product: one(products, {
        fields: [billOfMaterials.productId],
        references: [products.id],
    }),
}));

export const productionOrdersRelations = relations(productionOrders, ({ many, one }) => ({
    logs: many(productionOrderLogs),
    qc: many(qualityInspections),
    bom: one(billOfMaterials, {
        fields: [productionOrders.bomId],
        references: [billOfMaterials.id],
    }),
    product: one(products, {
        fields: [productionOrders.productId],
        references: [products.id],
    }),
}));

export const insertProcessSchema = createInsertSchema(processes);
export const insertProcessStepSchema = createInsertSchema(processSteps);
export const insertProcessInstanceSchema = createInsertSchema(processInstances);
export const insertProcessEventSchema = createInsertSchema(processEvents);
export const insertRcaReportSchema = createInsertSchema(rcaReports);
export const insertProductionTaskSchema = createInsertSchema(productionTasks);
export const insertPieceworkTicketSchema = createInsertSchema(pieceworkTickets);
export const insertWorkCenterSchema = createInsertSchema(workCenters);
export const insertBOMSchema = createInsertSchema(billOfMaterials);
export const insertBOMItemSchema = createInsertSchema(bomItems);
export const insertRoutingSchema = createInsertSchema(manufacturingRoutings);
export const insertProductionOrderSchema = createInsertSchema(productionOrders);
export const insertProductionOrderLogSchema = createInsertSchema(productionOrderLogs);
export const insertQualityInspectionSchema = createInsertSchema(qualityInspections);
export const insertMrpRecommendationSchema = createInsertSchema(mrpRecommendations);

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
    creatorId: varchar("creator_id").references(() => users.id), // Link to supervisor/creator

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

