import { pgTable, text, timestamp, uuid, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations } from "../../core/schema";

export const shieldlineLines = pgTable("shieldline_lines", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
    phoneNumber: text("phone_number").notNull().unique(), // DID
    didProvider: text("did_provider").default("shieldline_core"),
    status: text("status").default("active"), // active, pending, suspended
    type: text("type").default("mexico_did"),
    ivrConfig: jsonb("ivr_config").default({}), // Welcome message, routing
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shieldlineExtensions = pgTable("shieldline_extensions", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
    lineId: uuid("line_id").references(() => shieldlineLines.id),
    extensionNumber: text("extension_number").notNull(), // 1001, 1002...
    displayName: text("display_name").notNull(),
    userId: uuid("user_id"), // Optional ERP user mapping
    deviceType: text("device_type").default("webrtc"), // webrtc, mobile_app, physical
    status: text("status").default("offline"),
    settings: jsonb("settings").default({
        recordCalls: false,
        doNotDisturb: false,
        forwardTo: null
    }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shieldlineFirewallRules = pgTable("shieldline_firewall_rules", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(), // whitelist, blacklist, spam_filter
    pattern: text("pattern").notNull(), // Phone number or regex
    action: text("action").default("block"), // allow, block, ivr_challenge
    priority: integer("priority").default(0),
    enabled: boolean("enabled").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shieldlineCalls = pgTable("shieldline_calls", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
    lineId: uuid("line_id").references(() => shieldlineLines.id).notNull(),
    extensionId: uuid("extension_id").references(() => shieldlineExtensions.id),
    fromNumber: text("from_number").notNull(),
    toNumber: text("to_number").notNull(),
    direction: text("direction").notNull(), // inbound, outbound, internal
    status: text("status").notNull(), // completed, missed, blocked, busy
    duration: integer("duration").default(0), // in seconds
    recordingUrl: text("recording_url"),
    firewallMatch: uuid("firewall_match").references(() => shieldlineFirewallRules.id),
    cost: integer("cost").default(0), // milli-cents
    metadata: jsonb("metadata").default({}),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
});

export const insertShieldlineLineSchema = createInsertSchema(shieldlineLines);
export const insertShieldlineExtensionSchema = createInsertSchema(shieldlineExtensions);
export const insertShieldlineFirewallRuleSchema = createInsertSchema(shieldlineFirewallRules);
export const insertShieldlineCallSchema = createInsertSchema(shieldlineCalls);

export type ShieldlineLine = typeof shieldlineLines.$inferSelect;
export type ShieldlineExtension = typeof shieldlineExtensions.$inferSelect;
export type ShieldlineFirewallRule = typeof shieldlineFirewallRules.$inferSelect;
export type ShieldlineCall = typeof shieldlineCalls.$inferSelect;
