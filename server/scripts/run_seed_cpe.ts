
import "dotenv/config";
import { seedCPE } from "../seed_cpe";
import { db } from "../storage";

async function main() {
    console.log("Running manual CPE seed...");
    try {
        const instanceId = await seedCPE();
        console.log("Manual seed complete. Instance ID:", instanceId);
    } catch (error) {
        console.error("Seed failed:", error);
    }
    process.exit(0);
}

main();
