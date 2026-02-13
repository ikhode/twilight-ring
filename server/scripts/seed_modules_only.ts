
import "dotenv/config";
import { seedModules } from "../seed";
import { db } from "../storage";

async function main() {
    console.log("Updating modules...");
    await seedModules();
    console.log("Done.");
    process.exit(0);
}

main().catch(console.error);
