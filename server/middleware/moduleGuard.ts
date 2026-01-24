import { Request, Response, NextFunction } from "express";
import { db } from "../storage";
import { modules, organizationModules } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Middleware to ensure the requested module is enabled for the current organization.
 * @param moduleRoute The 'route' identifier of the module (e.g., 'production', 'finance')
 */
export function requireModule(moduleRoute: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // 1. Skip check if no user/org context (should rely on auth middleware being first)
        // Assuming auth middleware populates req.user
        const user = (req as any).user;
        if (!user || !user.organizationId) {
            return res.status(401).json({ message: "Unauthorized: No organization context" });
        }

        try {
            // 2. Find the module ID by its route
            const [targetModule] = await db
                .select()
                .from(modules)
                .where(eq(modules.route, moduleRoute))
                .limit(1);

            if (!targetModule) {
                console.warn(`[ModuleGuard] Module not found for route: ${moduleRoute}`);
                // If module definition doesn't exist, we might choose to block or allow.
                // Safer to block given this is a security guard.
                return res.status(404).json({ message: `Module definition not found for: ${moduleRoute}` });
            }

            // 3. Check if enabled for org
            const [config] = await db
                .select()
                .from(organizationModules)
                .where(
                    and(
                        eq(organizationModules.organizationId, user.organizationId),
                        eq(organizationModules.moduleId, targetModule.id)
                    )
                )
                .limit(1);

            if (!config || !config.enabled) {
                return res.status(403).json({
                    message: `Module '${targetModule.name}' is disabled for this organization.`,
                    code: "MODULE_DISABLED"
                });
            }

            // 4. Check Dependencies
            if (targetModule.dependencies && Array.isArray(targetModule.dependencies) && targetModule.dependencies.length > 0) {
                // Find IDs for dependency routes (assuming dependencies are stored as route names e.g. "inventory")
                // We need to check if THESE modules are enabled for the org.

                // This is a bit complex efficiently. Let's process one by one or batch.
                // Assuming dependencies is string[] of routes.
                const deps = targetModule.dependencies as string[];

                for (const depRoute of deps) {
                    // Find module ID
                    const [depModule] = await db.select().from(modules).where(eq(modules.route, depRoute)).limit(1);
                    if (depModule) {
                        const [depConfig] = await db
                            .select()
                            .from(organizationModules)
                            .where(
                                and(
                                    eq(organizationModules.organizationId, user.organizationId),
                                    eq(organizationModules.moduleId, depModule.id),
                                    eq(organizationModules.enabled, true)
                                )
                            )
                            .limit(1);

                        if (!depConfig) {
                            return res.status(424).json({
                                message: `Module '${targetModule.name}' requires '${depModule.name}' to be enabled.`,
                                code: "DEPENDENCY_MISSING",
                                dependency: depRoute
                            });
                        }
                    }
                }
            }

            // 5. Pass
            next();

        } catch (error) {
            console.error("[ModuleGuard] Error checking module status:", error);
            res.status(500).json({ message: "Internal Server Error during module verification" });
        }
    };
}
