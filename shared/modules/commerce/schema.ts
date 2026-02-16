import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, customType, AnyPgColumn } from "drizzle-orm/pg-core";
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
    legalName: text("legal_name"), // Razon Social
    rfc: text("rfc"),
    website: text("website"),
    phone: text("phone"),
    email: text("email"),
    contactInfo: jsonb("contact_info").default({}),
    category: text("category"), // e.g. "fuel", "parts", "raw_materials"
    status: text("status").notNull().default("active"),
    isArchived: boolean("is_archived").notNull().default(false),
    // Location fields for POI
    address: text("address"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    contactPerson: text("contact_person"),
    taxRegimeId: text("tax_regime_id"),
    fiscalPersonaType: text("fiscal_persona_type").default("moral"),
    zipCode: text("zip_code"),
    paymentTermsDays: integer("payment_terms_days").default(0),
    creditLimit: integer("credit_limit").default(0), // in cents
    bankName: text("bank_name"),
    bankAccountNumber: text("bank_account_number"),
    bankClabe: text("bank_clabe"),
    notes: text("notes"),
    attributes: jsonb("attributes").default({}), // Universal Extensibility
    createdAt: timestamp("created_at").defaultNow(),
});

// Customers (CRM)
export const customers = pgTable("customers", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    legalName: text("legal_name"), // Razon Social
    rfc: text("rfc"),
    taxRegime: text("tax_regime"), // Legacy
    taxRegimeId: varchar("tax_regime_id", { length: 10 }), // CFDI 4.0 Regime
    fiscalPersonaType: text("fiscal_persona_type").default("moral"), // fisica/moral
    zipCode: text("zip_code"),
    email: text("email"),
    phone: text("phone"),
    status: text("status").notNull().default("active"), // "active", "inactive", "lead"
    isArchived: boolean("is_archived").notNull().default(false),
    balance: integer("balance").notNull().default(0), // in cents, positive = receivable
    tags: jsonb("tags").default([]),
    lastContact: timestamp("last_contact"),
    // Location fields for POI
    address: text("address"),
    billingAddress: text("billing_address"),
    birthDate: text("birth_date"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    creditLimit: integer("credit_limit").default(0), // in cents
    preferredPaymentMethod: text("preferred_payment_method"), // "cash", "transfer", "card", "check"
    notes: text("notes"),

    // Loyalty Program
    loyaltyPoints: integer("loyalty_points").default(0),
    loyaltyCardCode: text("loyalty_card_code").unique(),

    attributes: jsonb("attributes").default({}), // Universal Extensibility
    createdAt: timestamp("created_at").defaultNow(),
});

// Product Categories (User Managed)
export const productCategories = pgTable("product_categories", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Product Groups (For grouping multiple variations like "Coco kg", "Coco pza")
export const productGroups = pgTable("product_groups", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Product Units (User Managed)
export const productUnits = pgTable("product_units", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Kilos", "Piezas", "Bulto 50kg"
    abbreviation: text("abbreviation"), // e.g. "kg", "pza", "b50"
    createdAt: timestamp("created_at").defaultNow(),
});

// Products
export const products = pgTable("products", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").unique(),

    // Categorization
    categoryId: varchar("category_id").references(() => productCategories.id),
    groupId: varchar("group_id").references(() => productGroups.id),

    // Master/Variant Logic (Yield Analysis)
    masterProductId: varchar("master_product_id").references((): AnyPgColumn => products.id), // Self-reference for Master
    expectedYield: integer("expected_yield"), // Estimated units per this item (e.g. 50 coconuts per sack)


    // Operation Logic Flags
    isSellable: boolean("is_sellable").notNull().default(true),
    isPurchasable: boolean("is_purchasable").notNull().default(true),
    isProductionInput: boolean("is_production_input").notNull().default(false), // Consumable in process
    isProductionOutput: boolean("is_production_output").notNull().default(false), // Producible in process

    unitId: varchar("unit_id").references(() => productUnits.id), // New references
    price: integer("price").notNull().default(0), // in cents
    cost: integer("cost").notNull().default(0), // in cents

    // Configurable Price Ranges for Business Logic
    attributes: jsonb("attributes").default({}), // Universal Extensibility
    minPurchasePrice: integer("min_purchase_price"), // in cents
    maxPurchasePrice: integer("max_purchase_price"), // in cents

    // AI / Inventory Intelligence
    demandVariability: text("demand_variability").default("stable"),
    reorderPointDays: integer("reorder_point_days").default(7),
    criticalityLevel: text("criticality_level").default("medium"),

    stock: integer("stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isArchived: boolean("is_archived").notNull().default(false),

    // Visual Identity (TensorFlow)
    visualEmbedding: customType<{ data: number[] }>({
        dataType() {
            return "vector(1024)";
        },
        toDriver(value: number[]) {
            return `[${value.join(',')}]`;
        },
        fromDriver(value: unknown) {
            if (typeof value !== 'string') return [];
            return value.slice(1, -1).split(',').map(Number);
        }
    })("visual_embedding"),

    // Legacy fields (Deprecated but needed for read access)
    category: text("category"),
    unit: text("unit"),
    productType: text("product_type"),

    // Audit for Secure Deletion
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by"),

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
    // Location context
    location: text("location"),
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

    // Explicit Location Data (Snapshot)
    deliveryAddress: text("delivery_address"),
    locationLat: customType<{ data: number }>({ dataType() { return "double precision"; } })("location_lat"),
    locationLng: customType<{ data: number }>({ dataType() { return "double precision"; } })("location_lng"),

    // Restaurant & Mobile POS Features
    orderType: text("order_type").default("takeout"), // "dine_in", "takeout", "delivery", "platform"
    tableNumber: text("table_number"),
    kitchenStatus: text("kitchen_status").default("pending"), // "pending", "cooking", "ready", "delivered"
    pax: integer("pax").default(1),
    isOfflineSync: boolean("is_offline_sync").default(false),
    modifiers: jsonb("modifiers").default([]), // For item customizations

    // CFDI 4.0 Metadata
    fiscalUuid: varchar("fiscal_uuid", { length: 36 }),
    cfdiUsage: varchar("cfdi_usage", { length: 10 }),
    paymentForm: varchar("payment_form", { length: 2 }),
    fiscalPaymentMethod: varchar("fiscal_payment_method", { length: 3 }),
    fiscalStatus: text("fiscal_status").default("draft"),
    billingZipCode: text("billing_zip_code"),

    // Secure Deletion & Archiving
    isArchived: boolean("is_archived").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by"),
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
    bankAccountId: varchar("bank_account_id"), // link to bank account if transfer
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

    // Explicit Location Data (Snapshot)
    pickupAddress: text("pickup_address"),
    locationLat: customType<{ data: number }>({ dataType() { return "double precision"; } })("location_lat"),
    locationLng: customType<{ data: number }>({ dataType() { return "double precision"; } })("location_lng"),

    // CFDI 4.0 Metadata
    fiscalUuid: varchar("fiscal_uuid", { length: 36 }),
    cfdiUsage: varchar("cfdi_usage", { length: 10 }),
    paymentForm: varchar("payment_form", { length: 2 }),
    fiscalPaymentMethod: varchar("fiscal_payment_method", { length: 3 }),
    fiscalStatus: text("fiscal_status").default("draft"),

    // Secure Deletion & Archiving
    isArchived: boolean("is_archived").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by"),
});

// Types
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductGroup = typeof productGroups.$inferSelect;
export type InsertProductGroup = z.infer<typeof insertProductGroupSchema>;
export type ProductUnit = typeof productUnits.$inferSelect;
export type InsertProductUnit = z.infer<typeof insertProductUnitSchema>;
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
export const insertProductCategorySchema = createInsertSchema(productCategories);
export const insertProductGroupSchema = createInsertSchema(productGroups);
export const insertProductUnitSchema = createInsertSchema(productUnits);
export const insertProductSchema = createInsertSchema(products).extend({
    isSellable: z.boolean().optional(),
    isPurchasable: z.boolean().optional(),
    isProductionInput: z.boolean().optional(),
    isProductionOutput: z.boolean().optional(),
    masterProductId: z.string().optional(),
    expectedYield: z.number().optional(),
    demandVariability: z.enum(["stable", "variable", "seasonal"]).optional(),
    reorderPointDays: z.number().optional(),
    criticalityLevel: z.enum(["low", "medium", "high", "critical"]).optional()
});
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements);
export const insertSaleSchema = createInsertSchema(sales);
export const insertPurchaseSchema = createInsertSchema(purchases);


// End of File
// End of File
export * from "./deals";

// --- ADVANCED INVENTORY (PHASE 7) ---

export const locations = pgTable("locations", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("warehouse"), // "warehouse", "store", "transit"
    address: text("address"),
    isMain: boolean("is_main").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
});

export const productStocks = pgTable("product_stocks", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    minStock: integer("min_stock").default(0),
    maxStock: integer("max_stock"),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const transferOrders = pgTable("transfer_orders", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    sourceLocationId: varchar("source_location_id").references(() => locations.id),
    destinationLocationId: varchar("destination_location_id").references(() => locations.id),
    status: text("status").notNull().default("draft"), // "draft", "requested", "in_transit", "completed", "cancelled"
    requestedBy: varchar("requested_by").references(() => users.id),
    approvedBy: varchar("approved_by").references(() => users.id),
    items: jsonb("items").$type<Array<{ productId: string, quantity: number, receivedQuantity?: number }>>().notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
});

export const inventoryCounts = pgTable("inventory_counts", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    locationId: varchar("location_id").references(() => locations.id),
    status: text("status").notNull().default("in_progress"), // "in_progress", "completed", "cancelled"
    performedBy: varchar("performed_by").references(() => users.id),
    items: jsonb("items").$type<Array<{ productId: string, expected: number, counted: number, difference: number }>>().notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    finalizedAt: timestamp("finalized_at"),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type TransferOrder = typeof transferOrders.$inferSelect;
export type InsertTransferOrder = z.infer<typeof insertTransferOrderSchema>;

export const insertLocationSchema = createInsertSchema(locations);
export const insertTransferOrderSchema = createInsertSchema(transferOrders);
