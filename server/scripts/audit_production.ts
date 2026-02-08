import "dotenv/config";
import { db } from "../storage";
import { products, processes } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function audit() {
    console.log("🔍 Auditing Production Configuration...");

    const allProducts = await db.select().from(products);
    const allProcesses = await db.select().from(processes);

    console.log(`\n📦 Found ${allProducts.length} Products:`);
    allProducts.forEach(p => {
        console.log(` - [${p.category || 'No Cat'}] ${p.name} (${p.id})`);
    });

    console.log(`\n⚙️ Found ${allProcesses.length} Processes:`);
    for (const p of allProcesses) {
        console.log(`\n🔹 Process: ${p.name} (${p.id})`);

        const inputId = (p.workflowData as any)?.inputProductId;
        const input = allProducts.find(prod => prod.id === inputId);
        if (inputId) {
            console.log(`   📥 Input: ${input ? input.name : '❌ Missing Product'} (${inputId})`);
        } else {
            console.log(`   📥 Input: -- None --`);
        }

        const outputIds = (p.workflowData as any)?.outputProductIds || [];
        if (outputIds.length > 0) {
            outputIds.forEach((oid: string) => {
                const out = allProducts.find(prod => prod.id === oid);
                console.log(`   📤 Output: ${out ? out.name : '❌ Missing Product'} (${oid})`);
            });
        } else {
            console.log(`   📤 Output: -- None --`);
        }
    }
    process.exit(0);
}

audit().catch(console.error);
