import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, customType, AnyPgColumn } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";
import { suppliers } from "../commerce/schema"; // Import Suppliers

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
    category: text("category"), // e.g. "capital", "operational", "loan"
    date: timestamp("date").defaultNow(),
});

// ============================================================================
// CASH MANAGEMENT SYSTEM (Caja Chica)
// ============================================================================

export const cashRegisters = pgTable("cash_registers", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "Main Register", "Petty Cash HQ"
    balance: integer("balance").notNull().default(0), // in cents
    status: text("status").notNull().default("closed"), // "open", "closed"
    currentSessionId: varchar("current_session_id"), // link to active session
    createdAt: timestamp("created_at").defaultNow(),
});

export const cashSessions = pgTable("cash_sessions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    registerId: varchar("register_id").notNull().references(() => cashRegisters.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    openedBy: varchar("opened_by").notNull().references(() => users.id),
    closedBy: varchar("closed_by").references(() => users.id),

    startTime: timestamp("start_time").defaultNow(),
    endTime: timestamp("end_time"),

    startAmount: integer("start_amount").notNull(), // in cents
    expectedEndAmount: integer("expected_end_amount"), // calculated
    actualEndAmount: integer("actual_end_amount"), // declared
    difference: integer("difference"), // actual - expected

    status: text("status").notNull().default("open"), // "open", "closed"
    notes: text("notes"),
});

export const cashTransactions = pgTable("cash_transactions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    registerId: varchar("register_id").notNull().references(() => cashRegisters.id),
    sessionId: varchar("session_id").notNull().references(() => cashSessions.id),

    amount: integer("amount").notNull(), // in cents (always positive)
    type: text("type").notNull(), // "in", "out"
    category: text("category").notNull(), // "sales", "supplier", "payroll", "funding", "withdrawal"
    description: text("description"),

    performedBy: varchar("performed_by").notNull().references(() => users.id),
    referenceId: varchar("reference_id"), // link to other entities

    timestamp: timestamp("timestamp").defaultNow(),
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

// TrustNet tables removed for clutter reduction (Zero Ruido)

export const budgets = pgTable("budgets", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    amount: integer("amount").notNull(), // in cents
    period: text("period").notNull(), // "monthly", "yearly"
    year: integer("year").notNull(),
    month: integer("month"), // 1-12, null if yearly
    spent: integer("spent").default(0), // Track spending against budget
    createdAt: timestamp("created_at").defaultNow(),
});

export const bankReconciliations = pgTable("bank_reconciliations", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    accountName: text("account_name").notNull(),
    statementDate: timestamp("statement_date").notNull(),
    statementBalance: integer("statement_balance").notNull(), // in cents
    bookBalance: integer("book_balance").notNull(), // in cents
    difference: integer("difference").generatedAlwaysAs(sql`statement_balance - book_balance`),
    status: text("status").notNull().default("draft"), // "draft", "reconciled"
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const bankAccounts = pgTable("bank_accounts", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Banorte Nomina", "Santander Operativa"
    bankName: text("bank_name"),
    accountNumber: text("account_number"),
    currency: text("currency").notNull().default("MXN"),
    balance: integer("balance").notNull().default(0), // in cents
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});



// Accounting Accounts (Chart of Accounts)
export const accountingAccounts = pgTable("accounting_accounts", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    code: varchar("code").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(), // "asset", "liability", "equity", "revenue", "expense"
    parentId: varchar("parent_id").references((): AnyPgColumn => accountingAccounts.id),
    level: integer("level").notNull().default(1),
    isSelectable: boolean("is_selectable").notNull().default(true),
    balance: integer("balance").notNull().default(0),
    currency: varchar("currency").notNull().default("MXN"),
    satGroupingCode: varchar("sat_grouping_code"), // Mapping to SAT codes (e.g. 101.01)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Journal Entries
export const journalEntries = pgTable("journal_entries", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull().defaultNow(),
    reference: varchar("reference"),
    description: text("description"),
    status: text("status").notNull().default("draft"), // "draft", "posted", "cancelled"
    type: text("type").notNull().default("manual"), // "manual", "sale", "purchase", "expense", "depreciation"
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
});

// Journal Items
export const journalItems = pgTable("journal_items", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    entryId: varchar("entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: varchar("account_id").notNull().references(() => accountingAccounts.id),
    debit: integer("debit").notNull().default(0),
    credit: integer("credit").notNull().default(0),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Taxes
export const taxes = pgTable("taxes", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rate: integer("rate").notNull(), // percentage * 100
    type: text("type").notNull(), // "sales", "purchase"
    satTaxType: text("sat_tax_type"), // 002 (IVA), 001 (ISR), 003 (IEPS)
    accountId: varchar("account_id").references(() => accountingAccounts.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
});

// Fixed Assets
export const fixedAssets = pgTable("fixed_assets", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    purchaseDate: timestamp("purchase_date").notNull(),
    purchaseValue: integer("purchase_value").notNull(),
    salvageValue: integer("salvage_value").notNull().default(0),
    usefulLifeMonths: integer("useful_life_months").notNull(),
    depreciationMethod: text("depreciation_method").notNull().default("straight_line"),
    assetAccountId: varchar("asset_account_id").references(() => accountingAccounts.id),
    depExpenseAccountId: varchar("dep_expense_account_id").references(() => accountingAccounts.id),
    accumDepAccountId: varchar("accum_dep_account_id").references(() => accountingAccounts.id),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Relationships
export const accountingAccountsRelations = relations(accountingAccounts, ({ one, many }) => ({
    parent: one(accountingAccounts, {
        fields: [accountingAccounts.parentId],
        references: [accountingAccounts.id],
        relationName: "parentChild",
    }),
    children: many(accountingAccounts, {
        relationName: "parentChild",
    }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
    items: many(journalItems),
}));

export const journalItemsRelations = relations(journalItems, ({ one }) => ({
    entry: one(journalEntries, {
        fields: [journalItems.entryId],
        references: [journalEntries.id],
    }),
    account: one(accountingAccounts, {
        fields: [journalItems.accountId],
        references: [accountingAccounts.id],
    }),
}));

// Types
export type CashRegister = typeof cashRegisters.$inferSelect;
export type CashSession = typeof cashSessions.$inferSelect;
export type CashTransaction = typeof cashTransactions.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type AccountingAccount = typeof accountingAccounts.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalItem = typeof journalItems.$inferSelect;
export type Tax = typeof taxes.$inferSelect;
export type FixedAsset = typeof fixedAssets.$inferSelect;

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;
export type MetricModel = typeof metricModels.$inferSelect;
export type InsertMetricModel = z.infer<typeof insertMetricModelSchema>;
export type Budget = typeof budgets.$inferSelect;
export type BankReconciliation = typeof bankReconciliations.$inferSelect;

export const insertCashRegisterSchema = createInsertSchema(cashRegisters);
export const insertCashSessionSchema = createInsertSchema(cashSessions);
export const insertCashTransactionSchema = createInsertSchema(cashTransactions);
export const insertExpenseSchema = createInsertSchema(expenses);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertBankAccountSchema = createInsertSchema(bankAccounts);
export const insertAccountingAccountSchema = createInsertSchema(accountingAccounts);
export const insertJournalEntrySchema = createInsertSchema(journalEntries);
export const insertJournalItemSchema = createInsertSchema(journalItems);
export const insertTaxSchema = createInsertSchema(taxes);
export const insertFixedAssetSchema = createInsertSchema(fixedAssets);

export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics);
export const insertMetricModelSchema = createInsertSchema(metricModels);
export const insertBudgetSchema = createInsertSchema(budgets);
export const insertBankReconciliationSchema = createInsertSchema(bankReconciliations);

export type InsertCashRegister = z.infer<typeof insertCashRegisterSchema>;
export type InsertCashSession = z.infer<typeof insertCashSessionSchema>;
export type InsertCashTransaction = z.infer<typeof insertCashTransactionSchema>;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type InsertBankReconciliation = z.infer<typeof insertBankReconciliationSchema>;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type InsertAccountingAccount = z.infer<typeof insertAccountingAccountSchema>;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type InsertJournalItem = z.infer<typeof insertJournalItemSchema>;
export type InsertTax = z.infer<typeof insertTaxSchema>;
export type InsertFixedAsset = z.infer<typeof insertFixedAssetSchema>;
