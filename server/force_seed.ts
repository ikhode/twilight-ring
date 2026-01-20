import 'dotenv/config';
import { seedModules } from "./seed";
import { seedAuth } from "./seed_auth";
import { seedCPE } from "./seed_cpe";
import { seedOperations } from "./seed_operations";

async function runCpeSeed() {
    console.log("🌱 Force Seeding Database...");
    try {
        await seedModules();
        await seedAuth();
        await seedCPE();
        await seedOperations();
        console.log("✅ Database seeded successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
}

runCpeSeed();
