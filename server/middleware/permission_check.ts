import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { db } from "../storage";
import { rolePermissions, userOrganizations } from "../../shared/schema";
import { and, eq } from "drizzle-orm";

/**
 * Middleware to check if the authenticated user has a specific permission
 * within their current organization.
 */
export function requirePermission(permissionId: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthenticatedRequest;
        const user = authReq.user;
        const orgId = authReq.headers["x-organization-id"] as string || authReq.user?.organizationId;

        if (!user) {
            return res.status(401).json({ message: "No autorizado" });
        }

        try {
            // 1. Get user's role in this organization
            const membership = await db.query.userOrganizations.findFirst({
                where: and(
                    eq(userOrganizations.userId, user.id),
                    eq(userOrganizations.organizationId, orgId)
                )
            });

            if (!membership) {
                return res.status(403).json({ message: "No tiene acceso a esta organización" });
            }

            // 2. Check if the role has the permission
            const hasPermission = await db.query.rolePermissions.findFirst({
                where: and(
                    eq(rolePermissions.role, membership.role),
                    eq(rolePermissions.permissionId, permissionId)
                )
            });

            if (hasPermission) {
                return next();
            }

            // 3. Fallback: Admin bypass (already covered by seeding mapping, but good for safety)
            if (membership.role === "admin") {
                return next();
            }

            // 4. Deny access
            return res.status(403).json({
                message: `Permiso insuficiente: ${permissionId} requerido.`,
                code: "INSUFFICIENT_PERMISSIONS"
            });

        } catch (error) {
            console.error(`[RBAC] Error checking permission ${permissionId}:`, error);
            return res.status(500).json({ message: "Error interno verificando permisos" });
        }
    };
}
