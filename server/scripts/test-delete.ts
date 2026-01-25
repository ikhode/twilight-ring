
import "dotenv/config";
import { db } from "../storage";
import { processes } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("🔍 Diagnosing Process Deletion...");

    // 1. Check if "Destopado" still exists
    const targetName = "Destopado";
    const found = await db.query.processes.findFirst({
        where: eq(processes.name, targetName)
    });

    if (!found) {
        console.log(`✅ Process '${targetName}' not found (already deleted?)`);
        // Check finding ANY process
        const all = await db.query.processes.findMany();
        console.log(`📊 Total processes found: ${all.length}`);
        all.forEach(p => console.log(` - ${p.name} (${p.id})`));
        process.exit(0);
    }

    console.log(`⚠️ Process '${targetName}' found: ${found.id}`);

    // 2. Try to delete it explicitly
    try {
        console.log("🗑️ Attempting delete...");
        const result = await db.delete(processes)
            .where(eq(processes.id, found.id))
            .returning();

        if (result.length > 0) {
            console.log("✅ Successfully deleted via script.");
        } else {
            console.error("❌ Delete returned empty array (not found during delete?)");
        }
    } catch (error) {
        console.error("❌ Delete FAILED:", error);
    }

    process.exit(0);
}

main().catch(console.error);
