import { pgTable, text, varchar, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "../../core/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const apiKeys = pgTable("api_keys", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(), // SHA-256 hash of the API key
    keyPrefix: text("key_prefix").notNull(), // nexus_live_...
    role: text("role").notNull().default("viewer"), // Linked to RBAC roles
    permissions: jsonb("permissions").default([]), // Optional granular scopes
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    revokedAt: timestamp("revoked_at"),
});

export const webhooks = pgTable("webhooks", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    name: text("name").notNull(),
    secret: text("secret").notNull(), // Webhook signing secret
    events: jsonb("events").notNull().default([]), // Array of SystemEvent types
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    lastTriggeredAt: timestamp("last_triggered_at"),
    lastFailureReason: text("last_failure_reason"),
});

export const insertApiKeySchema = createInsertSchema(apiKeys);
export const insertWebhookSchema = createInsertSchema(webhooks);

export type ApiKey = typeof apiKeys.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
