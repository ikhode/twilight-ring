import "dotenv/config";
import { db } from "../storage";
import { sql } from "drizzle-orm";
import { supabaseAdmin } from "../supabase";

async function clean() {
    console.log("🚀 Cleaning database and Auth users...");

    // 1. Delete Supabase Auth Users
    try {
        const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        console.log(`Found ${authUsers.length} auth users to remove.`);

        for (const user of authUsers) {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
            if (deleteError) {
                console.warn(`✘ Could not delete auth user ${user.id}: ${deleteError.message}`);
            } else {
                console.log(`✔ Deleted auth user: ${user.email}`);
            }
        }
    } catch (e: any) {
        console.error("✘ Error cleaning Auth users:", e.message);
    }

    // 2. Truncate Tables
    const tables = [
        "users", // Added users table too
        "organizations", // Added organizations
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
            await db.execute(sql.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`));
            console.log(`✔ Truncated ${table}`);
        } catch (e: any) {
            console.warn(`✘ Could not truncate ${table}: ${e.message}`);
        }
    }

    console.log("\n✨ System is now completely clean!");
    process.exit(0);
}

clean().catch(err => {
    console.error("Clean script failed:", err);
    process.exit(1);
});
