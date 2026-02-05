import { sql } from "drizzle-orm";

export async function up(db: any) {
    // Add 'attributes' JSONB column to core entities for ECS Architecture

    // 1. Employees (HR)
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb`);

    // 2. Products (Commerce/Inventory)
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb`);

    // 3. Customers (CRM)
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb`);

    // 4. Suppliers (Commerce)
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb`);

    // 5. Piecework Tickets (Production)
    await db.execute(sql`ALTER TABLE piecework_tickets ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb`);

    // 6. Production Tasks (Recipes/Definitions)
    await db.execute(sql`ALTER TABLE production_tasks ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb`);
}

export async function down(db: any) {
    await db.execute(sql`ALTER TABLE employees DROP COLUMN IF EXISTS attributes`);
    await db.execute(sql`ALTER TABLE products DROP COLUMN IF EXISTS attributes`);
    await db.execute(sql`ALTER TABLE customers DROP COLUMN IF EXISTS attributes`);
    await db.execute(sql`ALTER TABLE suppliers DROP COLUMN IF EXISTS attributes`);
    await db.execute(sql`ALTER TABLE piecework_tickets DROP COLUMN IF EXISTS attributes`);
    await db.execute(sql`ALTER TABLE production_tasks DROP COLUMN IF EXISTS attributes`);
}
