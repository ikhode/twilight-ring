import { Router } from "express";
import { db } from "../storage";
import { organizations, userOrganizations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

const router = Router();

// POST /api/organization - Create New Organization
router.post("/", async (req, res) => {
    try {
        const { name, industry } = req.body;
        const orgId = await getOrgIdFromRequest(req); // Use this to get USER ID eventually, but for now we look up user from token

        // We need the USER ID, not the current Org ID, but getOrgIdFromRequest doesn't return User ID easily...
        // Let's rely on the helper or fix it. Wait, getOrgIdFromRequest validates token.
        // We need a way to get the UserID from the request to link the new org.

        // Re-implement basic auth check to get User ID
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
        const token = authHeader.replace("Bearer ", "");
        const { supabaseAdmin } = await import("../supabase");
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) return res.status(401).json({ message: "Invalid token" });

        if (!name || !industry) return res.status(400).json({ message: "Name and Industry are required" });

        // Create Org
        const [newOrg] = await db.insert(organizations).values({
            name,
            industry,
            subscriptionTier: "trial"
        }).returning();

        // Link User
        await db.insert(userOrganizations).values({
            userId: user.id,
            organizationId: newOrg.id,
            role: "admin"
        });

        // Initialize Defaults (AI, Modules) - Similar to Signup
        const { aiConfigurations, organizationModules } = await import("../../shared/schema");
        const { industryTemplates } = await import("../seed");

        await db.insert(aiConfigurations).values({
            organizationId: newOrg.id,
            guardianEnabled: true,
            copilotEnabled: true,
        });

        const moduleIds = industryTemplates[industry as keyof typeof industryTemplates] || industryTemplates.other;
        for (const moduleId of moduleIds) {
            await db.insert(organizationModules).values({
                organizationId: newOrg.id,
                moduleId,
                enabled: true,
            });
        }

        res.status(201).json(newOrg);
    } catch (error) {
        console.error("Create Org Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// PATCH /api/organization - Update Organization Details
router.patch("/", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { name, industry, settings } = req.body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (industry) updateData.industry = industry;
        if (settings) updateData.settings = settings;

        if (Object.keys(updateData).length === 0) return res.status(400).json({ message: "Nothing to update" });

        await db.update(organizations)
            .set(updateData)
            .where(eq(organizations.id, orgId));

        res.json({ message: "Organization updated successfully" });
    } catch (error) {
        console.error("Update Organization Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export const organizationRoutes = router;
