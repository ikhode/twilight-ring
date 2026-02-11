import { pgTable, text, varchar, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";

export const flowStatusEnum = pgEnum("flow_status", ["draft", "active", "archived"]);
export const flowNodeTypeEnum = pgEnum("flow_node_type", ["trigger", "action", "condition", "ai", "webhook"]);
export const flowExecutionStatusEnum = pgEnum("flow_execution_status", ["running", "completed", "failed", "simulated"]);

export const flowDefinitions = pgTable("flow_definitions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    version: text("version").notNull().default("1.0.0"),
    status: flowStatusEnum("status").notNull().default("draft"),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const flowNodes = pgTable("flow_nodes", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    flowId: varchar("flow_id").notNull().references(() => flowDefinitions.id, { onDelete: "cascade" }),
    type: flowNodeTypeEnum("type").notNull(),
    config: jsonb("config").notNull().default({}),
    position: jsonb("position").notNull().default({ x: 0, y: 0 }),
    metadata: jsonb("metadata").default({}),
});

export const flowEdges = pgTable("flow_edges", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    flowId: varchar("flow_id").notNull().references(() => flowDefinitions.id, { onDelete: "cascade" }),
    sourceNodeId: varchar("source_node_id").notNull().references(() => flowNodes.id, { onDelete: "cascade" }),
    targetNodeId: varchar("target_node_id").notNull().references(() => flowNodes.id, { onDelete: "cascade" }),
    conditionLabel: text("condition_label"),
});

export const flowExecutions = pgTable("flow_executions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    flowId: varchar("flow_id").notNull().references(() => flowDefinitions.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    status: flowExecutionStatusEnum("status").notNull().default("running"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    logs: jsonb("logs").notNull().default([]),
    context: jsonb("context").notNull().default({}), // Runtime variables
});

// Relations
export const flowDefinitionsRelations = relations(flowDefinitions, ({ many }) => ({
    nodes: many(flowNodes),
    edges: many(flowEdges),
    executions: many(flowExecutions),
}));

export const flowNodesRelations = relations(flowNodes, ({ one }) => ({
    flow: one(flowDefinitions, {
        fields: [flowNodes.flowId],
        references: [flowDefinitions.id],
    }),
}));

export const flowEdgesRelations = relations(flowEdges, ({ one }) => ({
    flow: one(flowDefinitions, {
        fields: [flowEdges.flowId],
        references: [flowDefinitions.id],
    }),
    source: one(flowNodes, {
        fields: [flowEdges.sourceNodeId],
        references: [flowNodes.id],
    }),
    target: one(flowNodes, {
        fields: [flowEdges.targetNodeId],
        references: [flowNodes.id],
    }),
}));

export const flowExecutionsRelations = relations(flowExecutions, ({ one }) => ({
    flow: one(flowDefinitions, {
        fields: [flowExecutions.flowId],
        references: [flowDefinitions.id],
    }),
}));

// Zod Schemas
export const insertFlowDefinitionSchema = createInsertSchema(flowDefinitions);
export const insertFlowNodeSchema = createInsertSchema(flowNodes);
export const insertFlowEdgeSchema = createInsertSchema(flowEdges);
export const insertFlowExecutionSchema = createInsertSchema(flowExecutions);

// Types
export type FlowDefinition = typeof flowDefinitions.$inferSelect;
export type FlowNode = typeof flowNodes.$inferSelect;
export type FlowEdge = typeof flowEdges.$inferSelect;
export type FlowExecution = typeof flowExecutions.$inferSelect;
