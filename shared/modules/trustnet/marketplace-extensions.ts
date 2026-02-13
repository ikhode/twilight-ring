import { pgTable, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "../../core/schema";
import { marketplaceListings, marketplaceTransactions } from "./schema";

// Marketplace Chat
export const marketplaceChat = pgTable("marketplace_chat", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    transactionId: varchar("transaction_id").references(() => marketplaceTransactions.id, { onDelete: "cascade" }),
    senderOrgId: varchar("sender_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    readAt: timestamp("read_at"),
});

// Price Negotiations
export const marketplaceNegotiations = pgTable("marketplace_negotiations", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    listingId: varchar("listing_id").references(() => marketplaceListings.id, { onDelete: "cascade" }),
    buyerOrgId: varchar("buyer_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    sellerOrgId: varchar("seller_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    proposedPrice: integer("proposed_price").notNull(), // in cents
    quantity: integer("quantity").notNull(),
    status: text("status").notNull().default("pending"), // pending, accepted, rejected, countered
    counterPrice: integer("counter_price"), // seller's counter offer
    message: text("message"),
    createdAt: timestamp("created_at").defaultNow(),
    respondedAt: timestamp("responded_at"),
});

// Recurring Orders
export const marketplaceRecurringOrders = pgTable("marketplace_recurring_orders", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    listingId: varchar("listing_id").references(() => marketplaceListings.id, { onDelete: "cascade" }),
    buyerOrgId: varchar("buyer_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    sellerOrgId: varchar("seller_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    price: integer("price").notNull(), // in cents
    frequency: text("frequency").notNull(), // daily, weekly, monthly
    nextOrderDate: timestamp("next_order_date").notNull(),
    status: text("status").notNull().default("active"), // active, paused, cancelled
    createdAt: timestamp("created_at").defaultNow(),
    lastOrderAt: timestamp("last_order_at"),
});

export type MarketplaceChat = typeof marketplaceChat.$inferSelect;
export type MarketplaceNegotiation = typeof marketplaceNegotiations.$inferSelect;
export type MarketplaceRecurringOrder = typeof marketplaceRecurringOrders.$inferSelect;
