import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, customType } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";
import { employees } from "../hr/schema";
import { vehicles } from "../logistics/schema"; // Dependent on Logistics

// Suppliers
export const suppliers = pgTable("suppliers", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactInfo: jsonb("contact_info").default({}),
    category: text("category"), // e.g. "fuel", "parts", "raw_materials"
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Customers (CRM)
export const customers = pgTable("customers", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    status: text("status").notNull().default("active"), // "active", "inactive", "lead"
    balance: integer("balance").notNull().default(0), // in cents, positive = receivable
    tags: jsonb("tags").default([]),
    lastContact: timestamp("last_contact"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Products
export const products = pgTable("products", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").unique(),
    category: text("category").notNull(), // e.g. "parts", "labor", "oil", "accessories"
    productType: text("product_type").notNull().default("both"), // "sale", "purchase", "service" or "both"
    unit: text("unit").notNull().default("pza"), // "kg", "lt", "pza", etc.
    price: integer("price").notNull().default(0), // in cents
    cost: integer("cost").notNull().default(0), // in cents
    stock: integer("stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryMovements = pgTable("inventory_movements", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    productId: varchar("product_id").notNull().references(() => products.id),
    userId: varchar("user_id").references(() => users.id), // Who performed this movement
    quantity: integer("quantity").notNull(), // positive = in, negative = out
    type: text("type").notNull(), // "sale", "purchase", "production", "adjustment"
    referenceId: varchar("reference_id"), // Can be saleId, purchaseId, etc.
    beforeStock: integer("before_stock"),
    afterStock: integer("after_stock"),
    date: timestamp("date").defaultNow(),
    notes: text("notes"),
});

// Sales & Purchases
export const sales = pgTable("sales", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    productId: varchar("product_id").notNull().references(() => products.id),
    customerId: varchar("customer_id").references(() => customers.id),
    quantity: integer("quantity").notNull(),
    totalPrice: integer("total_price").notNull(),
    paymentStatus: text("payment_status").notNull().default("pending"), // "pending", "paid", "partially_paid", "refunded"
    paymentMethod: text("payment_method"), // "cash", "transfer", "credit"
    bankAccountId: varchar("bank_account_id"), // link to bank account if transfer
    deliveryStatus: text("delivery_status").notNull().default("pending"), // "pending", "shipped", "delivered", "returned"
    driverId: varchar("driver_id").references(() => employees.id),
    vehicleId: varchar("vehicle_id").references(() => vehicles.id),
    date: timestamp("date").defaultNow(),
});

export const purchases = pgTable("purchases", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id").references(() => suppliers.id),
    productId: varchar("product_id").references(() => products.id),
    quantity: integer("quantity").notNull().default(1),
    totalAmount: integer("total_amount").notNull(), // in cents
    batchId: varchar("batch_id"), // Group items from same order
    paymentStatus: text("payment_status").notNull().default("pending"), // "pending", "paid", "refunded"
    paymentMethod: text("payment_method"), // "cash", "transfer", "credit"
    deliveryStatus: text("delivery_status").notNull().default("pending"), // "pending", "received", "partial", "returned", "cancelled"
    logisticsMethod: text("logistics_method").notNull().default("delivery"), // "delivery", "pickup"
    driverId: varchar("driver_id").references(() => employees.id),
    vehicleId: varchar("vehicle_id").references(() => vehicles.id),
    freightCost: integer("freight_cost").default(0), // in cents
    isApproved: boolean("is_approved").notNull().default(true), // Default true for now, can be restricted
    approvedBy: varchar("approved_by").references(() => users.id),
    date: timestamp("date").defaultNow(),
    receivedAt: timestamp("received_at"),
    paidAt: timestamp("paid_at"),
    notes: text("notes"),
});

// Types
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export const insertSupplierSchema = createInsertSchema(suppliers);
export const insertCustomerSchema = createInsertSchema(customers);
export const insertProductSchema = createInsertSchema(products);
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements);
export const insertSaleSchema = createInsertSchema(sales);
export const insertPurchaseSchema = createInsertSchema(purchases);

// End of File
