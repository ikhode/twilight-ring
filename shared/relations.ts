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
    creator: one(schema.users, {
        fields: [schema.pieceworkTickets.creatorId],
        references: [schema.users.id],
    }),
    approver: one(schema.users, {
        fields: [schema.pieceworkTickets.approvedBy],
        references: [schema.users.id],
    }),
}));

// Cash Management Relations
export const cashRegistersRelations = relations(schema.cashRegisters, ({ one, many }) => ({
    organization: one(schema.organizations, {
        fields: [schema.cashRegisters.organizationId],
        references: [schema.organizations.id],
    }),
    currentSession: one(schema.cashSessions, {
        fields: [schema.cashRegisters.currentSessionId],
        references: [schema.cashSessions.id],
    }),
    sessions: many(schema.cashSessions),
    transactions: many(schema.cashTransactions),
}));

export const cashSessionsRelations = relations(schema.cashSessions, ({ one, many }) => ({
    register: one(schema.cashRegisters, {
        fields: [schema.cashSessions.registerId],
        references: [schema.cashRegisters.id],
    }),
    opener: one(schema.users, {
        fields: [schema.cashSessions.openedBy],
        references: [schema.users.id],
    }),
    closer: one(schema.users, {
        fields: [schema.cashSessions.closedBy],
        references: [schema.users.id],
    }),
    transactions: many(schema.cashTransactions),
}));

export const cashTransactionsRelations = relations(schema.cashTransactions, ({ one }) => ({
    register: one(schema.cashRegisters, {
        fields: [schema.cashTransactions.registerId],
        references: [schema.cashRegisters.id],
    }),
    session: one(schema.cashSessions, {
        fields: [schema.cashTransactions.sessionId],
        references: [schema.cashSessions.id],
    }),
    performer: one(schema.users, {
        fields: [schema.cashTransactions.performedBy],
        references: [schema.users.id],
    }),
}));

export const purchaseRelations = relations(schema.purchases, ({ one }) => ({
    product: one(schema.products, {
        fields: [schema.purchases.productId],
        references: [schema.products.id],
    }),
    supplier: one(schema.suppliers, {
        fields: [schema.purchases.supplierId],
        references: [schema.suppliers.id],
    }),
    driver: one(schema.employees, {
        fields: [schema.purchases.driverId],
        references: [schema.employees.id],
    }),
    vehicle: one(schema.vehicles, {
        fields: [schema.purchases.vehicleId],
        references: [schema.vehicles.id],
    }),
}));

export const expensesRelations = relations(schema.expenses, ({ one }) => ({
    supplier: one(schema.suppliers, {
        fields: [schema.expenses.supplierId],
        references: [schema.suppliers.id],
    }),
}));
export const routesRelations = relations(schema.routes, ({ one, many }) => ({
    vehicle: one(schema.vehicles, {
        fields: [schema.routes.vehicleId],
        references: [schema.vehicles.id],
    }),
    driver: one(schema.employees, {
        fields: [schema.routes.driverId],
        references: [schema.employees.id],
    }),
    stops: many(schema.routeStops),
}));

export const routeStopsRelations = relations(schema.routeStops, ({ one }) => ({
    route: one(schema.routes, {
        fields: [schema.routeStops.routeId],
        references: [schema.routes.id],
    }),
    order: one(schema.sales, {
        fields: [schema.routeStops.orderId],
        references: [schema.sales.id],
    }),
    purchase: one(schema.purchases, {
        fields: [schema.routeStops.purchaseId],
        references: [schema.purchases.id],
    }),
}));

// AI Chat Relations
export const aiChatAgentsRelations = relations(schema.aiChatAgents, ({ many }) => ({
    conversations: many(schema.chatConversations),
}));

export const chatConversationsRelations = relations(schema.chatConversations, ({ one, many }) => ({
    user: one(schema.users, {
        fields: [schema.chatConversations.userId],
        references: [schema.users.id],
    }),
    organization: one(schema.organizations, {
        fields: [schema.chatConversations.organizationId],
        references: [schema.organizations.id],
    }),
    agent: one(schema.aiChatAgents, {
        fields: [schema.chatConversations.agentId],
        references: [schema.aiChatAgents.id],
    }),
    messages: many(schema.chatMessages),
}));

export const chatMessagesRelations = relations(schema.chatMessages, ({ one }) => ({
    conversation: one(schema.chatConversations, {
        fields: [schema.chatMessages.conversationId],
        references: [schema.chatConversations.id],
    }),
}));

// HR Relations
export const employeesRelations = relations(schema.employees, ({ many }) => ({
    workSessions: many(schema.workSessions),
    payrollAdvances: many(schema.payrollAdvances),
    documents: many(schema.employeeDocs),
    reviews: many(schema.performanceReviews),
    history: many(schema.workHistory),
}));

export const workSessionsRelations = relations(schema.workSessions, ({ one }) => ({
    employee: one(schema.employees, {
        fields: [schema.workSessions.employeeId],
        references: [schema.employees.id],
    }),
}));

export const payrollAdvancesRelations = relations(schema.payrollAdvances, ({ one }) => ({
    employee: one(schema.employees, {
        fields: [schema.payrollAdvances.employeeId],
        references: [schema.employees.id],
    }),
}));

export const employeeDocsRelations = relations(schema.employeeDocs, ({ one }) => ({
    employee: one(schema.employees, {
        fields: [schema.employeeDocs.employeeId],
        references: [schema.employees.id],
    }),
}));

export const performanceReviewsRelations = relations(schema.performanceReviews, ({ one }) => ({
    employee: one(schema.employees, {
        fields: [schema.performanceReviews.employeeId],
        references: [schema.employees.id],
    }),
}));

export const workHistoryRelations = relations(schema.workHistory, ({ one }) => ({
    employee: one(schema.employees, {
        fields: [schema.workHistory.employeeId],
        references: [schema.employees.id],
    }),
}));

// Production Relations
export const processesRelations = relations(schema.processes, ({ many }) => ({
    steps: many(schema.processSteps),
    instances: many(schema.processInstances),
}));

export const processInstancesRelations = relations(schema.processInstances, ({ one, many }) => ({
    process: one(schema.processes, {
        fields: [schema.processInstances.processId],
        references: [schema.processes.id],
    }),
    events: many(schema.processEvents),
}));

export const processEventsRelations = relations(schema.processEvents, ({ one }) => ({
    instance: one(schema.processInstances, {
        fields: [schema.processEvents.instanceId],
        references: [schema.processInstances.id],
    }),
}));
