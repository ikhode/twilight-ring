import { Request, Response, NextFunction } from "express";
import { db } from "./storage";
import { userOrganizations, terminals, users, employees, User, rolePermissions, permissions } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { supabaseAdmin } from "./supabase";
import { AuthenticatedRequest } from "./types";

/**
 * Gets the organization ID from either Supabase Auth or Terminal Auth.
 */
export async function getOrgIdFromRequest(req: Request | AuthenticatedRequest): Promise<string | null> {
    // 1. Try Terminal Auth (Kiosk Bridge) - Priority for kiosks
    const deviceAuth = req.headers["x-device-auth"] as string;
    if (deviceAuth) {
        const [deviceId] = deviceAuth.split(":");
        const [terminal] = await db.select({ organizationId: terminals.organizationId })
            .from(terminals)
            .where(eq(terminals.deviceId, deviceId))
            .limit(1);
        if (terminal) return terminal.organizationId;
    }

    // 2. Standard Auth
    const user = await getAuthenticatedUser(req);
    if (!user) return null;

    // 3. Organization Context Override
    // Allows the frontend to specify which organization they are acting on behalf of
    const contextOrgId = req.headers["x-organization-id"] as string;
    if (contextOrgId) {
        // Validate user belongs to this org
        const membership = await db.query.userOrganizations.findFirst({
            where: and(
                eq(userOrganizations.userId, user.id),
                eq(userOrganizations.organizationId, contextOrgId)
            )
        });
        if (membership) return contextOrgId;
        // If specified org is invalid for user, fall back to default logic or error?
        // Fallback to default is safer for now to prevent broken states, or we could return null.
        console.warn(`[Auth] User ${user.id} attempted to access invalid org ${contextOrgId}`);
    }

    // Default: Get user's first organization
    const userOrg = await db.query.userOrganizations.findFirst({
        where: eq(userOrganizations.userId, user.id),
    });

    return userOrg ? userOrg.organizationId : null;
}

/**
 * Gets the user ID from the authenticated user.
 * Used for audit logging and consent tracking.
 */
export async function getUserIdFromRequest(req: Request | AuthenticatedRequest): Promise<string | null> {
    const user = await getAuthenticatedUser(req);
    return user?.id ?? null;
}

/**
 * Enhanced authentication bridge that supports both Supabase standard auth
 * and Terminal-based biometric auth for kiosk operations.
 */
export async function getAuthenticatedUser(req: Request) {
    // 1. Try Supabase Auth (Standard)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.replace("Bearer ", "");
            // Retry once for transient network errors
            let result;
            try {
                result = await supabaseAdmin.auth.getUser(token);
            } catch (fetchErr) {
                console.warn("[Auth] Transient fetch error, retrying...", fetchErr);
                result = await supabaseAdmin.auth.getUser(token);
            }

            const { data: { user }, error } = result;

            if (error) {
                console.warn(`[Auth] Token validation failed: ${error.message}`);
                return null;
            }
            if (!user) {
                console.warn("[Auth] No user found for valid token");
                return null;
            }
            return user;
        } catch (e) {
            console.error("[Auth] Supabase token error:", e);
            return null;
        }
    } else {
        // Only log this if it's NOT a kiosk request to avoid noise
        if (!req.headers["x-device-auth"]) {
            // console.debug("[Auth] No Authorization header present");
        }
    }

    // 2. Try Terminal Auth (Kiosk Bridge)
    const deviceAuth = req.headers["x-device-auth"] as string; // format: "deviceId:salt"
    const employeeId = req.headers["x-employee-id"] as string;

    if (deviceAuth && employeeId) {
        try {
            const [deviceId, salt] = deviceAuth.split(":");

            // Verify Terminal Identity
            const [terminal] = await db.select().from(terminals)
                .where(eq(terminals.deviceId, deviceId))
                .limit(1);

            if (terminal) {
                // Security check: If terminal has a salt, it MUST match.
                // If it doesn't have a salt, we allow it (matching heartbeat behavior).
                if (terminal.deviceSalt && terminal.deviceSalt !== salt) {
                    console.error(`[AuthBridge] Security breach: salt mismatch for terminal ${terminal.id}`);
                    return null;
                }

                // Verify Employee belongs to this terminal's organization
                const [employee] = await db.select().from(employees)
                    .where(and(eq(employees.id, employeeId), eq(employees.organizationId, terminal.organizationId)))
                    .limit(1);

                if (employee) {
                    // Map to a system user (admin) for DB audit fields
                    const adminRel = await db.query.userOrganizations.findFirst({
                        where: and(
                            eq(userOrganizations.organizationId, terminal.organizationId),
                            eq(userOrganizations.role, "admin")
                        ),
                        with: { user: true }
                    });

                    if (adminRel?.user) return adminRel.user;

                    // Fallback to any user in the org
                    const anyRel = await db.query.userOrganizations.findFirst({
                        where: eq(userOrganizations.organizationId, terminal.organizationId),
                        with: { user: true }
                    });

                    return anyRel?.user || null;
                }
            }
        } catch (e) {
            console.error("[AuthBridge] Bridge error:", e);
        }
    }

    return null;
}
/**
 * Middleware to protect routes and ensure a valid session exists.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    // Some routes might need bypassing (like health checks), but for now we protect everything.
    const user = await getAuthenticatedUser(req);

    if (!user) {
        console.warn(`[Auth] Access denied for ${req.method} ${req.path} - No valid session`);
        return res.status(401).json({
            message: "No autorizado. Inicie sesión para continuar.",
            code: "UNAUTHENTICATED"
        });
    }

    // Attach user to request for downstream use
    (req as unknown as AuthenticatedRequest).user = user as User;
    next();
}
