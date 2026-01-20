import "dotenv/config";
import { db } from "../server/storage";
import { users, organizations, userOrganizations, aiConfigurations, organizationModules } from "../shared/schema";
import { eq } from "drizzle-orm";

async function restoreUser() {
    console.log("🛠️ Restoring user...");

    const userId = "6d1aefa0-2cd5-4d48-9ed7-70d41c313ae5";
    const userEmail = "drakengdl@gmail.com";
    const userName = "David Prado";
    const orgId = "f140dfc8-340c-4ad7-9075-b2b36766cf7d";

    try {
        // 1. Restore Organization
        // Check if exists first
        let org = await db.query.organizations.findFirst({
            where: (o, { eq }) => eq(o.id, orgId)
        });

        if (!org) {
            console.log("Creating Organization...");
            const [newOrg] = await db.insert(organizations).values({
                id: orgId,
                name: "Forzagro",
                industry: "manufacturing", // Based on "Manufactura / Fábrica" from logs
                subscriptionTier: "trial",
                onboardingStatus: "completed"
            }).returning();
            org = newOrg;
        } else {
            console.log("Organization exists.");
        }

        // 2. Restore User
        let user = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.id, userId)
        });

        if (!user) {
            console.log("Creating User...");
            const [newUser] = await db.insert(users).values({
                id: userId,
                email: userEmail,
                name: userName
            }).returning();
            user = newUser;
        } else {
            console.log("User exists.");
        }

        // 3. Link them
        const link = await db.query.userOrganizations.findFirst({
            where: (rel, { and, eq }) => and(eq(rel.userId, userId), eq(rel.organizationId, orgId))
        });

        if (!link) {
            console.log("Linking User to Org...");
            await db.insert(userOrganizations).values({
                userId,
                organizationId: org.id,
                role: "admin"
            });
        }

        // 4. Ensure AI Config
        const aiConfig = await db.query.aiConfigurations.findFirst({
            where: (c, { eq }) => eq(c.organizationId, orgId)
        });

        if (!aiConfig) {
            console.log("Restoring AI Config...");
            await db.insert(aiConfigurations).values({
                organizationId: orgId,
                guardianEnabled: true,
                copilotEnabled: true,
                adaptiveUiEnabled: true
            });
        }

        console.log("✅ User restoration complete!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to restore user:", error);
        process.exit(1);
    }
}

restoreUser();
