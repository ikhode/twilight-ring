import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, pgEnum, customType, point } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const industryEnum = pgEnum("industry", [
  "retail",
  "manufacturing",
  "services",
  "healthcare",
  "logistics",
  "hospitality",
  "construction",
  "technology",
  "education",
  "other"
]);

export const roleEnum = pgEnum("role", ["admin", "manager", "user", "viewer", "cashier"]);

export const subscriptionTierEnum = pgEnum("subscription_tier", ["trial", "starter", "professional", "enterprise"]);

// Organizations
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: industryEnum("industry").notNull(),
  subscriptionTier: subscriptionTierEnum("subscription_tier").notNull().default("trial"),
  onboardingStatus: text("onboarding_status").notNull().default("pending"), // "pending", "completed"
  meta: jsonb("meta").default({}), // Stores AI context, raw industry input
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  settings: jsonb("settings").default({}),
});

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // We will use Supabase Auth's user ID
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User-Organization relationship (many-to-many)
export const userOrganizations = pgTable("user_organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull().default("user"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  achievements: jsonb("achievements").default([]), // Array of strings or objects
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Available modules in the system
export const modules = pgTable("modules", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(), // "operations", "finance", "sales", "hr", etc.
  route: text("route").notNull(),
  dependencies: jsonb("dependencies").default([]), // array of module IDs this depends on
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Organization's enabled modules
export const organizationModules = pgTable("organization_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  moduleId: varchar("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  enabledAt: timestamp("enabled_at").notNull().defaultNow(),
  disabledAt: timestamp("disabled_at"),
});

// AI Configuration per organization
export const aiConfigurations = pgTable("ai_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }).unique(),
  guardianEnabled: boolean("guardian_enabled").notNull().default(true),
  guardianSensitivity: integer("guardian_sensitivity").notNull().default(5), // 1-10 scale
  copilotEnabled: boolean("copilot_enabled").notNull().default(true),
  adaptiveUiEnabled: boolean("adaptive_ui_enabled").notNull().default(true),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Usage patterns for adaptive UI
export const usagePatterns = pgTable("usage_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  moduleId: varchar("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  accessCount: integer("access_count").notNull().default(1),
  lastAccessedAt: timestamp("last_accessed_at").notNull().defaultNow(),
  averageSessionDuration: integer("average_session_duration").default(0), // in seconds
});

// AI Insights (predictions, anomalies, suggestions)
export const aiInsights = pgTable("ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "prediction", "anomaly", "suggestion"
  severity: text("severity").notNull(), // "low", "medium", "high", "critical"
  title: text("title").notNull(),
  description: text("description").notNull(),
  data: jsonb("data").default({}),
  acknowledged: boolean("acknowledged").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Processes (Definitions)
export const processes = pgTable("processes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "production", "sales", "logistics"
  isTemplate: boolean("is_template").default(false),
  createdAt: timestamp("created_at").defaultNow(),
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

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactInfo: jsonb("contact_info").default({}),
  category: text("category"), // e.g. "fuel", "parts", "raw_materials"
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers (CRM)
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: text("status").notNull().default("active"), // "active", "inactive", "lead"
  balance: integer("balance").notNull().default(0), // in cents, positive = receivable
  tags: jsonb("tags").default([]),
  lastContact: timestamp("last_contact"),
  createdAt: timestamp("created_at").defaultNow(),
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

// TrustNet (The neural network of companies)
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

// Products
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku").unique(),
  category: text("category").notNull(),
  price: integer("price").notNull(), // in cents
  cost: integer("cost").notNull(), // in cents
  stock: integer("stock").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

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

// Fleet/Logistics
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  plate: text("plate").notNull().unique(),
  model: text("model").notNull(),
  year: integer("year"),
  status: text("status").notNull().default("active"), // "active", "maintenance", "inactive"
  currentMileage: integer("current_mileage").default(0),
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
  sequence: integer("sequence").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "arrived", "completed", "failed"
  locationLat: customType<{ data: number }>({ dataType() { return "real"; } })("location_lat"),
  locationLng: customType<{ data: number }>({ dataType() { return "real"; } })("location_lng"),
  address: text("address"),
  proofSignature: text("proof_signature"),
  proofPhoto: text("proof_photo"),
  proofLocationLat: customType<{ data: number }>({ dataType() { return "real"; } })("proof_location_lat"),
  proofLocationLng: customType<{ data: number }>({ dataType() { return "real"; } })("proof_location_lng"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  date: timestamp("date").defaultNow(),
  type: text("type").notNull(), // "preventive", "corrective"
  description: text("description"),
  cost: integer("cost").notNull(),
  mileageIn: integer("mileage_in"),
  mileageOut: integer("mileage_out"),
  partsUsed: jsonb("parts_used").default([]), // array of { name, quantity, cost }
});

// Sales & Purchases
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  totalPrice: integer("total_price").notNull(),
  status: text("status").notNull().default("paid"), // "draft", "paid", "cancelled"
  driverId: varchar("driver_id").references(() => employees.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
  date: timestamp("date").defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  items: jsonb("items").notNull(), // array of { productId, quantity, cost }
  totalCost: integer("total_cost").notNull(),
  status: text("status").default("received"),
  driverId: varchar("driver_id").references(() => employees.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
  date: timestamp("date").defaultNow(),
});

// Employees & Payroll
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull(), // e.g. "operator", "driver", "admin"
  department: text("department").notNull().default("general"),
  status: text("status").notNull().default("active"), // "active", "inactive", "on_leave"
  salary: integer("salary").default(0), // in cents
  joinDate: timestamp("join_date").defaultNow(),
  // T-CAC Fields
  currentArea: text("current_area"), // Where they are now
  currentStatus: text("current_status").default("offline"), // "active", "break", "lunch", "offline"
  // @ts-ignore
  faceEmbedding: customType<{ data: number[] }>({
    dataType() {
      return "vector(128)"; // Standard for face-api.js descriptors
    },
    toDriver(value: number[]) {
      return `[${value.join(',')}]`;
    },
    fromDriver(value: unknown) {
      if (typeof value !== 'string') return [];
      return value.slice(1, -1).split(',').map(Number);
    }
  })("face_embedding"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workSessions = pgTable("work_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  area: text("area").notNull(), // "Destopado", "Deshuese", "Secado"
  status: text("status").notNull().default("active"), // "active", "completed", "abandoned"
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // in seconds
  efficiencyScore: integer("efficiency_score"), // 0-100
  notes: text("notes"),
});

export const payrollAdvances = pgTable("payroll_advances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // in cents
  status: text("status").notNull().default("pending"), // "pending", "approved", "paid"
  date: timestamp("date").defaultNow(),
});

export const attendanceLogs = pgTable("attendance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  terminalId: varchar("terminal_id").references(() => terminals.id),
  type: text("type").notNull(), // "check_in", "check_out", "break_start", "break_end"
  method: text("method").notNull().default("manual"), // "pin", "card", "face", "manual"
  timestamp: timestamp("timestamp").defaultNow(),
  location: point("location"), // Optional: GPS coordinates if mobile
  notes: text("notes"),
});

// Zod schemas for validation
export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  industry: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
});

export const updateAiConfigSchema = createInsertSchema(aiConfigurations).pick({
  guardianEnabled: true,
  guardianSensitivity: true,
  copilotEnabled: true,
  adaptiveUiEnabled: true,
  settings: true,
}).partial();

export const insertProcessEventSchema = createInsertSchema(processEvents);
export const insertProcessSchema = createInsertSchema(processes);
export const insertRcaReportSchema = createInsertSchema(rcaReports);

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Module = typeof modules.$inferSelect;
export type OrganizationModule = typeof organizationModules.$inferSelect;
export type AiConfiguration = typeof aiConfigurations.$inferSelect;
export type UsagePattern = typeof usagePatterns.$inferSelect;
export type AiInsight = typeof aiInsights.$inferSelect;
export type Process = typeof processes.$inferSelect;
export type ProcessStep = typeof processSteps.$inferSelect;
export type ProcessInstance = typeof processInstances.$inferSelect;
export type ProcessEvent = typeof processEvents.$inferSelect;
export type RcaReport = typeof rcaReports.$inferSelect;

export type InsertProcessEvent = z.infer<typeof insertProcessEventSchema>;
export type InsertRcaReport = z.infer<typeof insertRcaReportSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Expense = typeof expenses.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type RouteStop = typeof routeStops.$inferSelect;
export type FuelLog = typeof fuelLogs.$inferSelect;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type PayrollAdvance = typeof payrollAdvances.$inferSelect;
export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;
export type MetricModel = typeof metricModels.$inferSelect;
export type InsertMetricModel = z.infer<typeof insertMetricModelSchema>;

export const insertSupplierSchema = createInsertSchema(suppliers);
export const insertCustomerSchema = createInsertSchema(customers);
export const insertProductSchema = createInsertSchema(products);
export const insertExpenseSchema = createInsertSchema(expenses);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertVehicleSchema = createInsertSchema(vehicles);
export const insertRouteSchema = createInsertSchema(routes);
export const insertRouteStopSchema = createInsertSchema(routeStops);
export const insertFuelLogSchema = createInsertSchema(fuelLogs);
export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs);
export const insertSaleSchema = createInsertSchema(sales);
export const insertPurchaseSchema = createInsertSchema(purchases);
export const insertEmployeeSchema = createInsertSchema(employees);
export const insertPayrollAdvanceSchema = createInsertSchema(payrollAdvances);
export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics);
export const insertMetricModelSchema = createInsertSchema(metricModels);

// Vector Storage
export const embeddings = pgTable("embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // "product", "process_step", "log"
  entityId: varchar("entity_id").notNull(),
  content: text("content").notNull(), // The text representation
  // @ts-ignore - Drizzle Kit will handle the vector type even if type definitions are strict
  vector: customType<{ data: number[] }>({
    dataType() {
      return "vector(1536)";
    },
    toDriver(value: number[]) {
      return `[${value.join(',')}]`;
    },
    fromDriver(value: unknown) {
      if (typeof value !== 'string') return [];
      return value.slice(1, -1).split(',').map(Number);
    }
  })("vector"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Embedding = typeof embeddings.$inferSelect;
export const insertEmbeddingSchema = createInsertSchema(embeddings);

// WhatsApp Integration
export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  phoneNumber: text("phone_number").notNull().unique(),
  status: text("status").notNull().default("active"), // "active", "archived", "blocked"
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => whatsappConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user", "assistant", "system"
  content: text("content").notNull(),
  intent: text("intent"),
  rawMetadata: jsonb("raw_metadata"),
  sentimentScore: integer("sentiment_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type WhatsAppConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsAppConversation = z.infer<typeof insertWhatsAppConversationSchema>;
export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessage = z.infer<typeof insertWhatsAppMessageSchema>;

export const insertWhatsAppConversationSchema = createInsertSchema(whatsappConversations);
export const insertWhatsAppMessageSchema = createInsertSchema(whatsappMessages);

// Piecework (Destajo)
export const pieceworkTickets = pgTable("piecework_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id), // The operator
  taskName: text("task_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // in cents
  totalAmount: integer("total_amount").notNull(), // in cents (quantity * unitPrice)
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "paid"
  approvedBy: varchar("approved_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PieceworkTicket = typeof pieceworkTickets.$inferSelect;
export const insertPieceworkTicketSchema = createInsertSchema(pieceworkTickets);

export const terminals = pgTable("terminals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location"),
  type: text("type").notNull().default("standard"), // "access", "pos", "info"
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

export type Terminal = typeof terminals.$inferSelect;
export const insertTerminalSchema = createInsertSchema(terminals);

export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export const insertAttendanceLogSchema = createInsertSchema(attendanceLogs);

// ============================================================================
// AI DOCUMENTATION SYSTEM - Knowledge Base & Chat Agents
// ============================================================================

// Knowledge Base - Documentación del ERP
export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // "graphql", "process", "module", "tutorial", "faq"
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").default([]),
  accessRoles: jsonb("access_roles").default(["admin", "manager", "user", "viewer"]), // Roles que pueden acceder
  metadata: jsonb("metadata").default({}), // Información adicional (ejemplos, enlaces, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Chat Agents - Agentes separados por rol
export const aiChatAgents = pgTable("ai_chat_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: roleEnum("role").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  knowledgeScope: jsonb("knowledge_scope").default([]), // Categorías de KB permitidas
  capabilities: jsonb("capabilities").default([]), // Lista de capacidades del agente
  settings: jsonb("settings").default({}), // Configuración adicional (temperatura, max_tokens, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Conversations - Conversaciones por usuario
export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").notNull().references(() => aiChatAgents.id),
  title: text("title"),
  status: text("status").notNull().default("active"), // "active", "archived"
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
});

// Chat Messages - Mensajes de conversación
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user", "assistant", "system"
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}), // Puede incluir: sources, confidence, tokens_used, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Types for new tables
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type AiChatAgent = typeof aiChatAgents.$inferSelect;
export type InsertAiChatAgent = z.infer<typeof insertAiChatAgentSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Zod schemas for validation
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase);
export const insertAiChatAgentSchema = createInsertSchema(aiChatAgents);
export const insertChatConversationSchema = createInsertSchema(chatConversations);
export const insertChatMessageSchema = createInsertSchema(chatMessages);

