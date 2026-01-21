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
    organization: one(schema.organizations, {
        fields: [schema.usagePatterns.organizationId],
        references: [schema.organizations.id],
    }),
    module: one(schema.modules, {
        fields: [schema.usagePatterns.moduleId],
        references: [schema.modules.id],
    }),
}));

export const aiInsightsRelations = relations(schema.aiInsights, ({ one }) => ({
    organization: one(schema.organizations, {
        fields: [schema.aiInsights.organizationId],
        references: [schema.organizations.id],
    }),
}));

// Operational Relations
export const suppliersRelations = relations(schema.suppliers, ({ one, many }) => ({
    organization: one(schema.organizations, {
        fields: [schema.suppliers.organizationId],
        references: [schema.organizations.id],
    }),
    expenses: many(schema.expenses),
    purchases: many(schema.purchases),
}));

export const productsRelations = relations(schema.products, ({ one, many }) => ({
    organization: one(schema.organizations, {
        fields: [schema.products.organizationId],
        references: [schema.organizations.id],
    }),
    sales: many(schema.sales),
}));

export const employeesRelations = relations(schema.employees, ({ one, many }) => ({
    organization: one(schema.organizations, {
        fields: [schema.employees.organizationId],
        references: [schema.organizations.id],
    }),
    payrollAdvances: many(schema.payrollAdvances),
}));

export const payrollAdvancesRelations = relations(schema.payrollAdvances, ({ one }) => ({
    organization: one(schema.organizations, {
        fields: [schema.payrollAdvances.organizationId],
        references: [schema.organizations.id],
    }),
    employee: one(schema.employees, {
        fields: [schema.payrollAdvances.employeeId],
        references: [schema.employees.id],
    }),
}));

export const vehiclesRelations = relations(schema.vehicles, ({ one, many }) => ({
    organization: one(schema.organizations, {
        fields: [schema.vehicles.organizationId],
        references: [schema.organizations.id],
    }),
    maintenanceLogs: many(schema.maintenanceLogs),
    fuelLogs: many(schema.fuelLogs),
}));

export const maintenanceLogsRelations = relations(schema.maintenanceLogs, ({ one }) => ({
    vehicle: one(schema.vehicles, {
        fields: [schema.maintenanceLogs.vehicleId],
        references: [schema.vehicles.id],
    }),
}));

export const fuelLogsRelations = relations(schema.fuelLogs, ({ one }) => ({
    vehicle: one(schema.vehicles, {
        fields: [schema.fuelLogs.vehicleId],
        references: [schema.vehicles.id],
    }),
}));

export const salesRelations = relations(schema.sales, ({ one }) => ({
    product: one(schema.products, {
        fields: [schema.sales.productId],
        references: [schema.products.id],
    }),
}));

export const expensesRelations = relations(schema.expenses, ({ one }) => ({
    supplier: one(schema.suppliers, {
        fields: [schema.expenses.supplierId],
        references: [schema.suppliers.id],
    }),
}));

export const pieceworkTicketsRelations = relations(schema.pieceworkTickets, ({ one }) => ({
    employee: one(schema.employees, {
        fields: [schema.pieceworkTickets.employeeId],
        references: [schema.employees.id],
    }),
    organization: one(schema.organizations, {
        fields: [schema.pieceworkTickets.organizationId],
        references: [schema.organizations.id],
    }),
}));
