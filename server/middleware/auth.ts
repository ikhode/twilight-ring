import { Request, Response, NextFunction } from 'express';
import { createSupabaseServerClient } from '../supabase';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                role?: string;
            };
        }
    }
}

/**
 * Middleware to authenticate users via Supabase JWT in cookies
 * Validates the session and injects req.user
 */
export async function authenticateUser(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const supabase = createSupabaseServerClient(req, res);

        // Validate JWT from cookies using getClaims (recommended by Supabase for server-side)
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
            return res.status(401).json({ message: 'Unauthorized - Invalid or missing session' });
        }

        // Inject user into request
        req.user = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
        };

        next();
    } catch (error) {
        console.error('[Auth Middleware] Error:', error);
        res.status(401).json({ message: 'Unauthorized' });
    }
}

/**
 * Optional auth middleware - doesn't fail if no user
 * Useful for endpoints that work with or without authentication
 */
export async function optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const supabase = createSupabaseServerClient(req, res);
        const { data } = await supabase.auth.getUser();

        if (data?.user) {
            req.user = {
                id: data.user.id,
                email: data.user.email,
                role: data.user.role,
            };
        }
    } catch (error) {
        // Silent fail - continue without user
        console.debug('[Optional Auth] No valid session');
    }
    next();
}

/**
 * Middleware to validate organization ID from header
 * Should be used after authenticateUser
 */
export function requireOrganization(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const orgId = req.headers['x-organization-id'] as string;

    if (!orgId) {
        return res.status(400).json({
            message: 'Organization ID required in X-Organization-Id header'
        });
    }

    // TODO: Optionally validate that req.user belongs to this organization
    // by querying userOrganizations table

    next();
}
