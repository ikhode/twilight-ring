import { relations } from "drizzle-orm";
import * as schema from "./schema";

// Define relations for Drizzle queries
export const usersRelations = relations(schema.users, ({ many }) => ({
    userOrganizations: many(schema.userOrganizations),
}));

export const organizationsRelations = relations(schema.organizations, ({ many, one }) => ({
    userOrganizations: many(schema.userOrganizations),
    organizationModules: many(schema.organizationModules),
    aiConfiguration: one(schema.aiConfigurations, {
        fields: [schema.organizations.id],
        references: [schema.aiConfigurations.organizationId],
    }),
    usagePatterns: many(schema.usagePatterns),
    aiInsights: many(schema.aiInsights),
}));

export const userOrganizationsRelations = relations(schema.userOrganizations, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.userOrganizations.userId],
        references: [schema.users.id],
    }),
    organization: one(schema.organizations, {
        fields: [schema.userOrganizations.organizationId],
        references: [schema.organizations.id],
    }),
}));

export const modulesRelations = relations(schema.modules, ({ many }) => ({
    organizationModules: many(schema.organizationModules),
    usagePatterns: many(schema.usagePatterns),
}));

export const organizationModulesRelations = relations(schema.organizationModules, ({ one }) => ({
    organization: one(schema.organizations, {
        fields: [schema.organizationModules.organizationId],
        references: [schema.organizations.id],
    }),
    module: one(schema.modules, {
        fields: [schema.organizationModules.moduleId],
        references: [schema.modules.id],
    }),
}));

export const aiConfigurationsRelations = relations(schema.aiConfigurations, ({ one }) => ({
    organization: one(schema.organizations, {
        fields: [schema.aiConfigurations.organizationId],
        references: [schema.organizations.id],
    }),
}));

export const usagePatternsRelations = relations(schema.usagePatterns, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.usagePatterns.userId],
        references: [schema.users.id],
    }),
    module: one(schema.modules, {
        fields: [schema.usagePatterns.moduleId],
        references: [schema.modules.id],
    }),
}));

export const salesRelations = relations(schema.sales, ({ one }) => ({
    product: one(schema.products, {
        fields: [schema.sales.productId],
        references: [schema.products.id],
    }),
    customer: one(schema.customers, {
        fields: [schema.sales.customerId],
        references: [schema.customers.id],
    }),
}));

export const pieceworkTicketsRelations = relations(schema.pieceworkTickets, ({ one }) => ({
    employee: one(schema.employees, {
        fields: [schema.pieceworkTickets.employeeId],
        references: [schema.employees.id],
    }),
}));
