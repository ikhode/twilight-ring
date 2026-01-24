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

            // 4. Verification Logic
            // If no config exists, is it enabled by default? 
            // Current schema says: `enabled: boolean("enabled").notNull().default(true)`
            // BUT if the row doesn't exist in `organizationModules`, we treat it as DISABLED or ENABLED depending on policy.
            // Usually, if it's not in the table, the user hasn't installed/activated it.

            // Strict Mode: Must exist AND be enabled.
            if (!config || !config.enabled) {
                return res.status(403).json({
                    message: `Module '${targetModule.name}' is disabled for this organization.`,
                    code: "MODULE_DISABLED"
                });
            }

            // 5. Pass
            next();

        } catch (error) {
            console.error("[ModuleGuard] Error checking module status:", error);
            res.status(500).json({ message: "Internal Server Error during module verification" });
        }
    };
}
