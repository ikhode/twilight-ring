import type { Express, Request, Response } from "express";
import { db } from "../storage";
import { modules, organizationModules } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { supabaseAdmin } from "../supabase";
import { getOrgIdFromRequest } from "../auth_util";
import { MODULE_REGISTRY, getModuleById, getModulesByCategory, getCategoriesWithCounts, searchModules } from "../data/module-registry";

/**
 * Module Marketplace Routes
 * API endpoints for browsing and managing modules
 */
export function registerModuleMarketplaceRoutes(app: Express) {

    // Middleware to get organization
    async function getOrganization(req: Request, res: Response, next: Function) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            (req as any).user = user;
            (req as any).organizationId = organizationId;

            next();
        } catch (error) {
            console.error("Auth middleware error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    // Get complete module catalog
    app.get("/api/modules/catalog", getOrganization, async (req: Request, res: Response) => {
        try {
            const organizationId = (req as any).organizationId;
            const { category, search } = req.query;

            let modulesData = MODULE_REGISTRY;

            // Filter by category
            if (category && typeof category === "string") {
                modulesData = getModulesByCategory(category as any);
            }

            // Search
            if (search && typeof search === "string") {
                modulesData = searchModules(search);
            }

            // Get active modules for this organization
            const activeModules = await db.query.organizationModules.findMany({
                where: and(
                    eq(organizationModules.organizationId, organizationId),
                    eq(organizationModules.enabled, true)
                )
            });

            const activeModuleIds = new Set(activeModules.map(m => m.moduleId));

            // Enrich with activation status
            const enrichedModules = modulesData.map(module => ({
                ...module,
                isActive: activeModuleIds.has(module.id),
                activatedAt: activeModules.find(m => m.moduleId === module.id)?.enabledAt
            }));

            res.json({ modules: enrichedModules });
        } catch (error) {
            console.error("Get catalog error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get active modules for organization
    app.get("/api/modules/active", getOrganization, async (req: Request, res: Response) => {
        try {
            const organizationId = (req as any).organizationId;

            const activeModules = await db.query.organizationModules.findMany({
                where: and(
                    eq(organizationModules.organizationId, organizationId),
                    eq(organizationModules.enabled, true)
                )
            });

            const activeModuleIds = activeModules.map(m => m.moduleId);
            const modulesData = MODULE_REGISTRY.filter(m => activeModuleIds.includes(m.id));

            res.json({ modules: modulesData });
        } catch (error) {
            console.error("Get active modules error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get module details
    app.get("/api/modules/:id", getOrganization, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const organizationId = (req as any).organizationId;

            const module = getModuleById(id);
            if (!module) {
                return res.status(404).json({ message: "Module not found" });
            }

            // Check if active
            const activeModule = await db.query.organizationModules.findFirst({
                where: and(
                    eq(organizationModules.organizationId, organizationId),
                    eq(organizationModules.moduleId, id),
                    eq(organizationModules.enabled, true)
                )
            });

            res.json({
                ...module,
                isActive: !!activeModule,
                activatedAt: activeModule?.enabledAt
            });
        } catch (error) {
            console.error("Get module error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Activate module
    app.post("/api/modules/:id/activate", getOrganization, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const organizationId = (req as any).organizationId;

            const module = getModuleById(id);
            if (!module) {
                return res.status(404).json({ message: "Module not found" });
            }

            // Check dependencies
            if (module.dependencies.length > 0) {
                const activeModules = await db.query.organizationModules.findMany({
                    where: and(
                        eq(organizationModules.organizationId, organizationId),
                        eq(organizationModules.enabled, true)
                    )
                });

                const activeModuleIds = new Set(activeModules.map(m => m.moduleId));
                const missingDeps = module.dependencies.filter(dep => !activeModuleIds.has(dep));

                if (missingDeps.length > 0) {
                    const missingNames = missingDeps.map(dep => getModuleById(dep)?.name || dep);
                    return res.status(400).json({
                        message: `Debes activar primero: ${missingNames.join(", ")}`
                    });
                }
            }

            // Check if already active
            const existing = await db.query.organizationModules.findFirst({
                where: and(
                    eq(organizationModules.organizationId, organizationId),
                    eq(organizationModules.moduleId, id)
                )
            });

            if (existing) {
                if (existing.enabled) {
                    return res.status(400).json({ message: "Module already active" });
                }

                // Reactivate
                await db.update(organizationModules)
                    .set({
                        enabled: true,
                        enabledAt: new Date(),
                        disabledAt: null
                    })
                    .where(eq(organizationModules.id, existing.id));
            } else {
                // Create new activation
                await db.insert(organizationModules).values({
                    organizationId,
                    moduleId: id,
                    enabled: true,
                    enabledAt: new Date()
                });
            }

            res.json({ message: "Module activated successfully" });
        } catch (error) {
            console.error("Activate module error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Deactivate module
    app.post("/api/modules/:id/deactivate", getOrganization, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const organizationId = (req as any).organizationId;

            const module = getModuleById(id);
            if (!module) {
                return res.status(404).json({ message: "Module not found" });
            }

            // Check if any active modules depend on this one
            const activeModules = await db.query.organizationModules.findMany({
                where: and(
                    eq(organizationModules.organizationId, organizationId),
                    eq(organizationModules.enabled, true)
                )
            });

            const activeModuleIds = activeModules.map(m => m.moduleId);
            const dependentModules = MODULE_REGISTRY.filter(m =>
                activeModuleIds.includes(m.id) && m.dependencies.includes(id)
            );

            if (dependentModules.length > 0) {
                const dependentNames = dependentModules.map(m => m.name);
                return res.status(400).json({
                    message: `No puedes desactivar este módulo porque dependen de él: ${dependentNames.join(", ")}`
                });
            }

            // Deactivate
            const existing = await db.query.organizationModules.findFirst({
                where: and(
                    eq(organizationModules.organizationId, organizationId),
                    eq(organizationModules.moduleId, id)
                )
            });

            if (!existing || !existing.enabled) {
                return res.status(400).json({ message: "Module is not active" });
            }

            await db.update(organizationModules)
                .set({
                    enabled: false,
                    disabledAt: new Date()
                })
                .where(eq(organizationModules.id, existing.id));

            res.json({ message: "Module deactivated successfully" });
        } catch (error) {
            console.error("Deactivate module error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get categories with counts
    app.get("/api/modules/categories", getOrganization, async (req: Request, res: Response) => {
        try {
            const categories = getCategoriesWithCounts();
            res.json({ categories });
        } catch (error) {
            console.error("Get categories error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
