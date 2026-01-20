import type { Express, Request, Response } from "express";
import { db } from "../storage";
import { modules, organizationModules, userOrganizations } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { industryTemplates } from "../seed";
import { supabaseAdmin } from "../supabase";

async function getOrgIdFromRequest(req: Request): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.replace("Bearer ", "");

    // Validate token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
        console.error("Auth error:", error);
        return null;
    }

    // Get user's organization
    const userOrg = await db.query.userOrganizations.findFirst({
        where: eq(userOrganizations.userId, user.id),
    });

    return userOrg ? userOrg.organizationId : null;
}

/**
 * Register module management routes
 */
export function registerModuleRoutes(app: Express) {

    // Get all available modules
    app.get("/api/modules", async (req: Request, res: Response) => {
        try {
            const allModules = await db.query.modules.findMany({
                orderBy: (modules, { asc }) => [asc(modules.category), asc(modules.name)],
            });

            res.json({ modules: allModules });
        } catch (error) {
            console.error("Get modules error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get organization's active modules
    app.get("/api/modules/active", async (req: Request, res: Response) => {
        try {
            const organizationId = await getOrgIdFromRequest(req);

            if (!organizationId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const activeModules = await db.query.organizationModules.findMany({
                where: and(
                    eq(organizationModules.organizationId, organizationId),
                    eq(organizationModules.enabled, true)
                ),
                with: {
                    module: true,
                },
            });

            res.json({
                modules: activeModules.map(om => om.module),
            });
        } catch (error) {
            console.error("Get active modules error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Enable a module
    app.post("/api/modules/:id/enable", async (req: Request, res: Response) => {
        try {
            const { id: moduleId } = req.params;
            const organizationId = await getOrgIdFromRequest(req);

            if (!organizationId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            // Check if module exists
            const module = await db.query.modules.findFirst({
                where: eq(modules.id, moduleId),
            });

            if (!module) {
                return res.status(404).json({ message: "Module not found" });
            }

            // Check if already enabled
            const existing = await db.query.organizationModules.findFirst({
                where: and(
                    eq(organizationModules.organizationId, organizationId),
                    eq(organizationModules.moduleId, moduleId)
                ),
            });

            if (existing) {
                if (existing.enabled) {
                    return res.json({ message: "Module already enabled" });
                }
                // Re-enable
                await db.update(organizationModules)
                    .set({ enabled: true, enabledAt: new Date() })
                    .where(eq(organizationModules.id, existing.id));
            } else {
                // Create new
                await db.insert(organizationModules).values({
                    organizationId,
                    moduleId,
                    enabled: true,
                });
            }

            res.json({ message: "Module enabled successfully", module });
        } catch (error) {
            console.error("Enable module error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Disable a module
    app.post("/api/modules/:id/disable", async (req: Request, res: Response) => {
        try {
            const { id: moduleId } = req.params;
            const organizationId = await getOrgIdFromRequest(req);

            if (!organizationId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            // Core modules cannot be disabled
            const coreModules = ["dashboard", "settings"];
            if (coreModules.includes(moduleId)) {
                return res.status(400).json({ message: "Core modules cannot be disabled" });
            }

            const existing = await db.query.organizationModules.findFirst({
                where: and(
                    eq(organizationModules.organizationId, organizationId),
                    eq(organizationModules.moduleId, moduleId)
                ),
            });

            if (!existing || !existing.enabled) {
                return res.status(400).json({ message: "Module is not enabled" });
            }

            await db.update(organizationModules)
                .set({ enabled: false, disabledAt: new Date() })
                .where(eq(organizationModules.id, existing.id));

            res.json({ message: "Module disabled successfully" });
        } catch (error) {
            console.error("Disable module error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get industry template
    app.get("/api/modules/templates/:industry", async (req: Request, res: Response) => {
        try {
            const { industry } = req.params;
            const template = industryTemplates[industry as keyof typeof industryTemplates];

            if (!template) {
                return res.status(404).json({ message: "Industry template not found" });
            }

            // Get module details
            const moduleDetails = await db.query.modules.findMany({
                where: (modules, { inArray }) => inArray(modules.id, template),
            });

            res.json({
                industry,
                modules: moduleDetails,
            });
        } catch (error) {
            console.error("Get template error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}

