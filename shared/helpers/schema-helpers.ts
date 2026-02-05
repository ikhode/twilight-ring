import { text, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

/**
 * Common location fields for entities (Organizations, Suppliers, Customers, Employees)
 */
export const locationFields = {
    address: text("address"),
    latitude: text("latitude"),
    longitude: text("longitude"),
};

/**
 * Common audit and soft-delete fields
 */
export const auditFields = {
    isArchived: boolean("is_archived").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
};
