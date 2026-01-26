import { db } from "../storage";
import { sql } from "drizzle-orm";

async function clean() {
    console.log("Cleaning database...");

    // List of tables to truncate (order matters if not using CASCADE, but CASCADE handles it)
    const tables = [
        "rca_reports",
        "process_events",
        "process_instances",
        "process_steps",
        "processes",
        "piecework_tickets",
        "production_tasks",
        "inventory_movements",
        "sales",
        "purchases",
        "products",
        "customers",
        "suppliers",
        "fuel_logs",
        "maintenance_logs",
        "route_stops",
        "driver_tokens",
        "routes",
        "terminals",
        "vehicles",
        "work_sessions",
        "payroll_advances",
        "employee_docs",
        "performance_reviews",
        "work_history",
        "employees",
        "ai_insights",
        "business_documents",
        "chat_messages",
        "chat_conversations",
        "whatsapp_messages",
        "whatsapp_conversations",
        "usage_patterns"
    ];

    for (const table of tables) {
        try {
            // Identity restart is good to reset serial IDs if any
            await db.execute(sql.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`));
            console.log(`✔ Truncated ${table}`);
        } catch (e: any) {
            console.warn(`✘ Could not truncate ${table}: ${e.message}`);
        }
    }

    console.log("\nDatabase clean completed Successfully!");
    process.exit(0);
}

clean().catch(err => {
    console.error("Clean script failed:", err);
    process.exit(1);
});
