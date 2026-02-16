import { pgTable, text, varchar, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";
import { customers } from "./schema";

export const dealStatusEnum = pgEnum("deal_status", [
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost"
]);

export const deals = pgTable("deals", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id").notNull().references(() => customers.id),
    name: text("name").notNull(),
    description: text("description"),
    status: dealStatusEnum("status").notNull().default("lead"),
    value: integer("value").notNull().default(0), // in cents
    probability: integer("probability").notNull().default(0), // percentage 0-100
    expectedCloseDate: timestamp("expected_close_date"),
    assignedTo: varchar("assigned_to").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dealsRelations = relations(deals, ({ one }) => ({
    organization: one(organizations, {
        fields: [deals.organizationId],
        references: [organizations.id],
    }),
    customer: one(customers, {
        fields: [deals.customerId],
        references: [customers.id],
    }),
    assignee: one(users, {
        fields: [deals.assignedTo],
        references: [users.id],
    }),
}));

export const insertDealSchema = createInsertSchema(deals);
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
