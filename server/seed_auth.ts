import { db } from "./storage";
import { users, organizations, userOrganizations, aiConfigurations, organizationModules } from "../shared/schema";
import { supabaseAdmin } from "./supabase";
import { industryTemplates } from "./seed";

export async function seedAuth() {
    console.log("🌱 Seeding Auth...");
    const email = "admin@nexus.com";
    const password = "password123";
    const name = "Admin Nexus";
    const orgName = "Nexus Manufacturing Corp";
    const industry = "manufacturing";

    try {
        // 1. Check if user already exists in DB to avoid duplicates
        const existingUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email),
        });

        if (existingUser) {
            console.log("ℹ️ Admin user already exists, skipping auth seed.");
            return;
        }

        // 2. Create User in Supabase Auth
        // Note: In local dev, we use autoConfirm: true
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name }
        });

        if (authError) {
            console.error("❌ Error creating Supabase Auth user:", authError.message);
            return;
        }

        if (!authData.user) {
            console.error("❌ Failed to create Supabase user (no data returned)");
            return;
        }

        const userId = authData.user.id;

        // 3. Create Organization (or get if exists)
        let orgId: string;
        const existingOrg = await db.query.organizations.findFirst({
            where: (orgs, { eq }) => eq(orgs.name, orgName),
        });

        if (existingOrg) {
            orgId = existingOrg.id;
        } else {
            const [newOrg] = await db.insert(organizations).values({
                name: orgName,
                industry,
                subscriptionTier: "enterprise",
            }).returning();
            orgId = newOrg.id;
        }

        // 4. Create Public User
        const [user] = await db.insert(users).values({
            id: userId,
            email,
            name,
        }).returning();

        // 5. Link User to Org
        await db.insert(userOrganizations).values({
            userId: user.id,
            organizationId: orgId,
            role: "admin",
        });

        // 6. Setup AI Config if not exists
        await db.insert(aiConfigurations).values({
            organizationId: orgId,
            guardianEnabled: true,
            guardianSensitivity: 8,
            copilotEnabled: true,
            adaptiveUiEnabled: true,
        }).onConflictDoNothing();

        // 7. Enable Modules
        const moduleIds = industryTemplates[industry as keyof typeof industryTemplates];
        for (const moduleId of moduleIds) {
            await db.insert(organizationModules).values({
                organizationId: orgId,
                moduleId,
                enabled: true,
            }).onConflictDoNothing();
        }

        console.log("✅ Admin user seeded successfully");
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);

    } catch (error) {
        console.error("❌ Error running seedAuth:", error);
    }
}
