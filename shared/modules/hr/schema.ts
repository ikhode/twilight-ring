import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";

// Employees & Payroll
export const employees = pgTable("employees", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    role: text("role").notNull(), // e.g. "operator", "driver", "admin"
    department: text("department").notNull().default("general"),
    status: text("status").notNull().default("active"), // "active", "inactive", "on_leave"
    salary: integer("salary").default(0), // in cents
    balance: integer("balance").notNull().default(0), // in cents: positive = company owes employee, negative = employee owes company
    joinDate: timestamp("join_date").defaultNow(),
    // T-CAC Fields
    currentArea: text("current_area"), // Where they are now
    currentStatus: text("current_status").default("offline"), // "active", "break", "lunch", "offline"
    // @ts-expect-error - Vector type handled by customType
    faceEmbedding: customType<{ data: number[] }>({
        dataType() {
            return "vector(128)"; // Standard for face-api.js descriptors
        },
        toDriver(value: number[]) {
            return `[${value.join(',')}]`;
        },
        fromDriver(value: unknown) {
            if (typeof value !== 'string') return [];
            return value.slice(1, -1).split(',').map(Number);
        }
    })("face_embedding"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const workSessions = pgTable("work_sessions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    area: text("area").notNull(), // "Destopado", "Deshuese", "Secado"
    status: text("status").notNull().default("active"), // "active", "completed", "abandoned"
    startedAt: timestamp("started_at").defaultNow(),
    endedAt: timestamp("ended_at"),
    duration: integer("duration"), // in seconds
    efficiencyScore: integer("efficiency_score"), // 0-100
    notes: text("notes"),
});

export const payrollAdvances = pgTable("payroll_advances", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // in cents
    status: text("status").notNull().default("pending"), // "pending", "approved", "paid"
    date: timestamp("date").defaultNow(),
});

// Types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type PayrollAdvance = typeof payrollAdvances.$inferSelect;

export const insertEmployeeSchema = createInsertSchema(employees);
export const insertPayrollAdvanceSchema = createInsertSchema(payrollAdvances);
