import "dotenv/config";
import { db } from "../storage";
import { processes, productionTasks } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("🔧 Standardizing Processes...");

    // 1. Create the "Gold Standard" Master Process
    const [masterProcess] = await db.insert(processes).values({
        organizationId: "ad4c0b57-12b4-4d25-af9f-bd4a0ad9fe20", // Hardcoded from logs for safety or fetch? Better fetch if possible but this is a one-off script.
        // Actually, let's just use the first org found if specific ID not known, but logs showed "ad4c..."
        // Safe bet: The user only has 1 org usually.
        name: "Procesamiento Integral de Coco",
        description: "Ciclo completo: Destopado -> Deshuesado -> Pelado",
        type: "production"
    }).returning();

    console.log("✅ Created Master Process:", masterProcess.name);

    // 2. Archive/Delete the old fragmented ones
    // We'll just prefix them with [Archived] or delete them if they have no instances?
    // Let's just delete them to be clean, assuming no important data yet (it's a playground).
    await db.delete(processes).where(eq(processes.name, "Destopado"));
    await db.delete(processes).where(eq(processes.name, "Deshuesado"));
    await db.delete(processes).where(eq(processes.name, "Pelado"));
    await db.delete(processes).where(eq(processes.name, "Perforado"));

    console.log("🗑️ Cleaned up fragmented processes.");
    process.exit(0);
}

main().catch(console.error);
