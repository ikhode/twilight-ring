
import "dotenv/config";
import { db } from "../storage";
import { processes } from "../../shared/schema";
import { ne, eq } from "drizzle-orm";

async function main() {
    console.log("🧹 Deep Cleaning Processes...");

    const masterName = "Procesamiento Integral de Coco";

    // Check if master exists
    const master = await db.query.processes.findFirst({
        where: eq(processes.name, masterName)
    });

    if (!master) {
        console.error("❌ Master process not found! Aborting to avoid total data loss.");
        process.exit(1);
    }

    console.log(`🛡️ Preserving Master Process: ${master.name} (${master.id})`);

    // Delete everything else
    const result = await db.delete(processes)
        .where(ne(processes.id, master.id))
        .returning();

    console.log(`🗑️ Deleted ${result.length} residual processes.`);
    process.exit(0);
}

main().catch(console.error);
