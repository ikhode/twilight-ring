import { Router } from "express";
import { getOrgIdFromRequest } from "../auth_util";
import { db } from "../storage";
import { requirePermission } from "../middleware/permission_check";
import { aiConfigurations, organizations, organizationModules, modules, organizationModules as orgModulesTable } from "@shared/schema";
import { eq, inArray, and } from "drizzle-orm";

const router = Router();

// GET /api/config - Aggregate System Configuration
router.get("/", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        // 1. Fetch Organization Details (Industry, Theme/Settings)
        const org = await db.query.organizations.findFirst({
            where: eq(organizations.id, orgId),
        });

        if (!org) return res.status(404).json({ message: "Organization not found" });

        // 2. Fetch Enabled Modules
        const enabledModules = await db.query.organizationModules.findMany({
            where: eq(organizationModules.organizationId, orgId),
            with: { module: true }
        });

        // 3. Fetch AI Config
        let aiConfig = await db.query.aiConfigurations.findFirst({
            where: eq(aiConfigurations.organizationId, orgId),
        });

        if (!aiConfig) {
            [aiConfig] = await db.insert(aiConfigurations).values({
                organizationId: orgId,
                guardianEnabled: true,
                copilotEnabled: true,
            }).returning();
        }

        const settings = (org.settings as any) || {};

        res.json({
            industry: org.industry,
            theme: settings.theme || "glass",
            themeColor: settings.themeColor || "#3b82f6",
            universal: {
                ...(settings.universal || {}),
                productCategories: settings.productCategories || settings.universal?.productCategories || [],
                defaultUnits: settings.defaultUnits || settings.universal?.defaultUnits || [],
                industryName: settings.industryName || settings.universal?.industryName || "",
                cedisAddress: settings.cedisAddress || settings.universal?.cedisAddress || "",
                cedisLat: settings.cedisLat ?? settings.universal?.cedisLat,
                cedisLng: settings.cedisLng ?? settings.universal?.cedisLng
            },
            enabledModules: enabledModules.filter(m => m.enabled).map(m => m.moduleId),
            ai: {
                guardianEnabled: aiConfig?.guardianEnabled,
                guardianSensitivity: aiConfig?.guardianSensitivity,
                copilotEnabled: aiConfig?.copilotEnabled,
                adaptiveUiEnabled: aiConfig?.adaptiveUiEnabled,
            }
        });

    } catch (error) {
        console.error("Get Config Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// PATCH /api/config - Unified Update
router.patch("/", requirePermission("config.write"), async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { industry, theme, themeColor, enabledModules, ai, onboardingStatus } = req.body;

        // 1. Update Organization
        if (industry || theme || themeColor || onboardingStatus || req.body.universal) {
            const currentOrg = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
            const currentSettings = (currentOrg?.settings as any) || {};

            await db.update(organizations).set({
                industry: industry || undefined,
                onboardingStatus: onboardingStatus || undefined,
                settings: {
                    ...currentSettings,
                    theme: theme || currentSettings.theme,
                    themeColor: themeColor || currentSettings.themeColor,
                    universal: req.body.universal ? { ...currentSettings.universal, ...req.body.universal } : currentSettings.universal
                }
            }).where(eq(organizations.id, orgId));
        }

        // 2. Update Modules
        if (Array.isArray(enabledModules)) {
            const existing = await db.query.organizationModules.findMany({ where: eq(organizationModules.organizationId, orgId) });
            const existingIds = existing.map(e => e.moduleId);

            for (const modId of enabledModules) {
                if (existingIds.includes(modId)) {
                    await db.update(organizationModules)
                        .set({ enabled: true, disabledAt: null })
                        .where(and(eq(organizationModules.organizationId, orgId), eq(organizationModules.moduleId, modId)));
                } else {
                    await db.insert(organizationModules).values({
                        organizationId: orgId,
                        moduleId: modId,
                        enabled: true
                    });
                }
            }

            const toDisable = existingIds.filter(id => !enabledModules.includes(id));
            if (toDisable.length > 0) {
                await db.update(organizationModules)
                    .set({ enabled: false, disabledAt: new Date() })
                    .where(and(eq(organizationModules.organizationId, orgId), inArray(organizationModules.moduleId, toDisable)));
            }
        }

        // 3. Update AI Config
        if (ai) {
            await db.update(aiConfigurations).set({
                guardianEnabled: ai.guardianEnabled,
                guardianSensitivity: ai.guardianSensitivity,
                copilotEnabled: ai.copilotEnabled,
                adaptiveUiEnabled: ai.adaptiveUiEnabled
            }).where(eq(aiConfigurations.organizationId, orgId));
        }

        res.json({ message: "Configuration synced successfully" });

    } catch (error) {
        console.error("Update Config Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export const configRoutes = router;
