// @ts-nocheck
import 'dotenv/config';
import { db } from "../storage";
import { organizationModules } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
    console.log("🔧 Enabling 'piecework' module for all organizations...");

    try {
        const orgs = await db.query.organizations.findMany();

        for (const org of orgs) {
            // Manual check instead of upsert to avoid constraint issues if unique index is missing in ORM
            const existing = await db.query.organizationModules.findFirst({
                where: (om, { and, eq }) => and(
                    eq(om.organizationId, org.id),
                    eq(om.moduleId, 'piecework')
                )
            });

            if (existing) {
                await db.update(organizationModules)
                    .set({ enabled: true })
                    .where(eq(organizationModules.id, existing.id));
                console.log(`✅ Updated piecework for org: ${org.name}`);
            } else {
                await db.insert(organizationModules).values({
                    organizationId: org.id,
                    moduleId: 'piecework',
                    enabled: true
                });
                console.log(`✅ Inserted piecework for org: ${org.name}`);
            }
        }
        console.log("Done.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error enabling module:", error);
        process.exit(1);
    }
}

run();
