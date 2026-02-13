import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, numeric } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations } from "../../core/schema";
import { customers } from "../commerce/schema";

export const loanApplications = pgTable("loan_applications", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id").notNull().references(() => customers.id),
    requestedAmount: integer("requested_amount").notNull(), // in cents
    requestedTermMonths: integer("requested_term_months").notNull(),
    interestRateOffered: numeric("interest_rate_offered", { precision: 5, scale: 2 }),
    status: text("status").default("pending"), // 'pending', 'active', 'completed', 'defaulted', 'rejected'
    riskScore: integer("risk_score").default(0),
    aiAssessment: jsonb("ai_assessment").default({}),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const loans = pgTable("loans", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id").notNull().references(() => customers.id),
    applicationId: varchar("application_id").references(() => loanApplications.id),
    amount: integer("amount").notNull(), // in cents
    interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull(),
    termMonths: integer("term_months").notNull(),
    status: text("status").default("active"), // 'pending', 'active', 'completed', 'defaulted', 'rejected'
    type: text("type").default("personal"), // 'personal', 'business', 'collateralized', 'other'
    startDate: timestamp("start_date").default(sql`CURRENT_DATE`),
    endDate: timestamp("end_date"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const repaymentSchedules = pgTable("repayment_schedules", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    loanId: varchar("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    dueDate: timestamp("due_date").notNull(),
    amountDue: integer("amount_due").notNull(), // in cents
    principalDue: integer("principal_due").notNull(),
    interestDue: integer("interest_due").notNull(),
    penaltyAmount: integer("penalty_amount").default(0),
    lateFees: integer("late_fees").default(0),
    status: text("status").default("pending"), // 'pending', 'paid', 'overdue', 'cancelled'
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const loanCases = pgTable("loan_cases", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    loanId: varchar("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
    agentId: varchar("agent_id"), // references public.users(id)
    status: text("status").default("pending"), // 'pending', 'active', 'recovered', 'escalated'
    agingBucket: text("aging_bucket").default("0-30"), // '0-30', '31-60', '61-90', '90+'
    lastInteractionAt: timestamp("last_interaction_at"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const collectionAlerts = pgTable("collection_alerts", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    loan_id: varchar("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
    scheduleId: varchar("schedule_id").references(() => repaymentSchedules.id),
    type: text("type").notNull(), // 'reminder', 'overdue', 'escalation'
    sentAt: timestamp("sent_at").defaultNow(),
    status: text("status").default("sent"),
    contactMethod: text("contact_method"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Original tables (restored for consistency)
export const loanPayments = pgTable("loan_payments", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    loanId: varchar("loan_id").notNull().references(() => loans.id),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    repaymentScheduleId: varchar("repayment_schedule_id").references(() => repaymentSchedules.id),
    amountPaid: integer("amount_paid").notNull(),
    paymentDate: timestamp("payment_date").defaultNow(),
    transactionId: varchar("transaction_id"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const loanCollateral = pgTable("loan_collateral", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    loanId: varchar("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    estimatedValue: integer("estimated_value").notNull(),
    status: text("status").default("active"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
});

export const loanDocuments = pgTable("loan_documents", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: varchar("application_id").references(() => loanApplications.id, { onDelete: "cascade" }),
    loanId: varchar("loan_id").references(() => loans.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    url: text("url").notNull(),
    status: text("status").default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations extensions
export const loanApplicationsRelations = relations(loanApplications, ({ many, one }) => ({
    customer: one(customers, {
        fields: [loanApplications.customerId],
        references: [customers.id],
    }),
    documents: many(loanDocuments),
    loan: one(loans, {
        fields: [loanApplications.id],
        references: [loans.applicationId],
    }),
}));

export const loansRelations = relations(loans, ({ many, one }) => ({
    customer: one(customers, {
        fields: [loans.customerId],
        references: [customers.id],
    }),
    application: one(loanApplications, {
        fields: [loans.applicationId],
        references: [loanApplications.id],
    }),
    repaymentSchedules: many(repaymentSchedules),
    payments: many(loanPayments),
    collaterals: many(loanCollateral),
    documents: many(loanDocuments),
}));

export const repaymentSchedulesRelations = relations(repaymentSchedules, ({ one }) => ({
    loan: one(loans, {
        fields: [repaymentSchedules.loanId],
        references: [loans.id],
    }),
}));

export const loanPaymentsRelations = relations(loanPayments, ({ one }) => ({
    loan: one(loans, {
        fields: [loanPayments.loanId],
        references: [loans.id],
    }),
    schedule: one(repaymentSchedules, {
        fields: [loanPayments.repaymentScheduleId],
        references: [repaymentSchedules.id],
    }),
}));

export const loanCollateralRelations = relations(loanCollateral, ({ one }) => ({
    loan: one(loans, {
        fields: [loanCollateral.loanId],
        references: [loans.id],
    }),
}));

export const loanDocumentsRelations = relations(loanDocuments, ({ one }) => ({
    application: one(loanApplications, {
        fields: [loanDocuments.applicationId],
        references: [loanApplications.id],
    }),
    loan: one(loans, {
        fields: [loanDocuments.loanId],
        references: [loans.id],
    }),
}));

export const loanCasesRelations = relations(loanCases, ({ one }) => ({
    loan: one(loans, {
        fields: [loanCases.loanId],
        references: [loans.id],
    }),
}));

export const collectionAlertsRelations = relations(collectionAlerts, ({ one }) => ({
    loan: one(loans, {
        fields: [collectionAlerts.loan_id],
        references: [loans.id],
    }),
    schedule: one(repaymentSchedules, {
        fields: [collectionAlerts.scheduleId],
        references: [repaymentSchedules.id],
    }),
}));

// Schemas & Types updates
export const insertLoanApplicationSchema = createInsertSchema(loanApplications);
export const insertLoanSchema = createInsertSchema(loans);
export const insertRepaymentScheduleSchema = createInsertSchema(repaymentSchedules);
export const insertLoanPaymentSchema = createInsertSchema(loanPayments);
export const insertLoanCollateralSchema = createInsertSchema(loanCollateral);
export const insertLoanDocumentSchema = createInsertSchema(loanDocuments);
export const insertLoanCaseSchema = createInsertSchema(loanCases);
export const insertCollectionAlertSchema = createInsertSchema(collectionAlerts);

export type LoanApplication = typeof loanApplications.$inferSelect;
export type InsertLoanApplication = z.infer<typeof insertLoanApplicationSchema>;
export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type RepaymentSchedule = typeof repaymentSchedules.$inferSelect;
export type InsertRepaymentSchedule = z.infer<typeof insertRepaymentScheduleSchema>;
export type LoanPayment = typeof loanPayments.$inferSelect;
export type LoanCollateral = typeof loanCollateral.$inferSelect;
export type LoanDocument = typeof loanDocuments.$inferSelect;
export type LoanCase = typeof loanCases.$inferSelect;
export type CollectionAlert = typeof collectionAlerts.$inferSelect;
