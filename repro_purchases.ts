import "dotenv/config";
import { db } from "./server/storage";
import { purchases } from "./shared/schema";

async function main() {
    try {
        console.log("Querying purchases with relations...");
        const res = await db.query.purchases.findMany({
            with: {
                supplier: true,
                product: true
            },
            limit: 1
        });
        console.log("Success! Purchases:", JSON.stringify(res, null, 2));
        process.exit(0);
    } catch (e) {
        console.error("Error querying purchases:", e);
        process.exit(1);
    }
}

main();
