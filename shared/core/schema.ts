import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, pgEnum, customType } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
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
    "peladero",
    "motorcycle_workshop",
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
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    onboardingStatus: text("onboarding_status").notNull().default("pending"), // "pending", "completed"
    meta: jsonb("meta").default({}), // Stores AI context, raw industry input
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    settings: jsonb("settings").default({}),
    subscriptionExpiresAt: timestamp("subscription_expires_at"),
    subscriptionInterval: text("subscription_interval"), // 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime'
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

// Business Documents (OCR/Storage)
export const businessDocuments = pgTable("business_documents", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // "invoice", "contract", "receipt", "other"
    status: text("status").notNull().default("processing"), // "processing", "analyzed", "verified", "archived"
    extractedData: jsonb("extracted_data").default({}), // Structured data from "OCR"
    confidence: integer("confidence").default(0), // 0-100
    fileUrl: text("file_url"),
    uploadedBy: varchar("uploaded_by").references(() => users.id),
    // Entity Linking (The "Dossier" feature)
    relatedEntityId: varchar("related_entity_id"),
    relatedEntityType: text("related_entity_type"), // "employee", "supplier", "customer", "transaction"
    // Processing Metadata
    processingError: text("processing_error"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertBusinessDocumentSchema = createInsertSchema(businessDocuments);

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
export type BusinessDocument = typeof businessDocuments.$inferSelect;
export type InsertBusinessDocument = z.infer<typeof insertBusinessDocumentSchema>;

// Vector Storage
export const embeddings = pgTable("embeddings", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    entityType: text("entity_type").notNull(), // "product", "process_step", "log"
    entityId: varchar("entity_id").notNull(),
    content: text("content").notNull(), // The text representation
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

// Knowledge Base & AI Chat
export const knowledgeBase = pgTable("knowledge_base", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    category: text("category").notNull(), // "graphql", "process", "module", "tutorial", "faq"
    title: text("title").notNull(),
    content: text("content").notNull(),
    tags: jsonb("tags").default([]),
    accessRoles: jsonb("access_roles").default(["admin", "manager", "user", "viewer"]),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiChatAgents = pgTable("ai_chat_agents", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    role: roleEnum("role").notNull().unique(), // Note: Depends on Role Enum
    name: text("name").notNull(),
    description: text("description").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    knowledgeScope: jsonb("knowledge_scope").default([]),
    capabilities: jsonb("capabilities").default([]),
    settings: jsonb("settings").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const chatMessages = pgTable("chat_messages", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user", "assistant", "system"
    content: text("content").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
});

// Types for AI
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type AiChatAgent = typeof aiChatAgents.$inferSelect;
export type InsertAiChatAgent = z.infer<typeof insertAiChatAgentSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Zod schemas
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase);
export const insertAiChatAgentSchema = createInsertSchema(aiChatAgents);
export const insertChatConversationSchema = createInsertSchema(chatConversations);
export const insertChatMessageSchema = createInsertSchema(chatMessages);

// WhatsApp
export const whatsappConversations = pgTable("whatsapp_conversations", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    phoneNumber: text("phone_number").notNull().unique(),
    status: text("status").notNull().default("active"),
    lastMessageAt: timestamp("last_message_at").defaultNow(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id").notNull().references(() => whatsappConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
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

