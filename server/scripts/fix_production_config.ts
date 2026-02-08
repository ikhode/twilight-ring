
import "dotenv/config";
import { db } from "../storage";
import { processes, products } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function fix() {
    console.log("🛠️ Fixing Production Configuration...");

    // ID Map from Audit
    const PROD = {
        Coco: '470176af-83ac-4c5e-917b-908d28de1e5b',
        CocoDestapado: 'e821acf6-a82f-458e-a670-99f726159ea3',
        Estopa: '9bccc249-f028-4ef6-a797-b226782c38fd',
        CocoDesecho: '0cd1d4d9-b768-4390-83a5-1a5bdae4c7ce',
        CocoDeshuesado: '7c01d188-6d39-411a-87d4-1c9babc108ec',
        Huesillo: '581ae0e9-abba-42bf-ab2a-0f20769e5d03',
        AguaDeCoco: 'a1c66dd2-e4e1-4a73-bc36-28c9479c4252',
        Pulpa: 'b26a2bc4-3dfe-4161-a252-b4dda5cae0e4',
        Copra: '301b6d19-aca7-4ef5-bdc6-dbe405c3861f'
    };

    const PROCESS = {
        Destopar: 'ec0d07a0-5bf3-4a98-8c05-1c32b1604401',
        Deshuesar: 'c9a72500-57e8-4ebd-b30d-880495b65490',
        Copra: 'ad72f380-2b78-4b98-9079-d6261400aa58', // Process 'Copra'
        Pelar: 'fe492343-2eae-42df-b531-4e722365548a'
    };

    // 1. Destopar: Add Coco Desecho
    console.log("Updating Destopar...");
    await db.update(processes)
        .set({
            workflowData: {
                inputProductId: PROD.Coco,
                outputProductId: PROD.CocoDestapado, // Primary
                outputProductIds: [PROD.CocoDestapado, PROD.Estopa, PROD.CocoDesecho],
                piecework: { enabled: false }
            }
        })
        .where(eq(processes.id, PROCESS.Destopar));

    // 2. Deshuesar: Fix Output to Coco Deshuesado + Huesillo + Agua
    console.log("Updating Deshuesar...");
    await db.update(processes)
        .set({
            workflowData: {
                inputProductId: PROD.CocoDestapado,
                outputProductId: PROD.CocoDeshuesado,
                outputProductIds: [PROD.CocoDeshuesado, PROD.Huesillo, PROD.AguaDeCoco],
                piecework: { enabled: false }
            }
        })
        .where(eq(processes.id, PROCESS.Deshuesar));

    // 3. Copra: Fix Output to Copra
    console.log("Updating Copra...");
    await db.update(processes)
        .set({
            workflowData: {
                inputProductId: PROD.CocoDeshuesado,
                outputProductId: PROD.Copra,
                outputProductIds: [PROD.Copra],
                piecework: { enabled: false }
            }
        })
        .where(eq(processes.id, PROCESS.Copra));

    // 4. Pelar: Ensure it takes Coco Deshuesado -> Pulpa
    console.log("Updating Pelar...");
    await db.update(processes)
        .set({
            workflowData: {
                inputProductId: PROD.CocoDeshuesado,
                outputProductId: PROD.Pulpa,
                outputProductIds: [PROD.Pulpa],
                piecework: { enabled: false }
            }
        })
        .where(eq(processes.id, PROCESS.Pelar));

    console.log("✅ Configuration Updated!");
    process.exit(0);
}

fix().catch(console.error);
