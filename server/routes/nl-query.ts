import type { Express, Request, Response } from "express";
import { nlQueryService } from "../services/nl-query";
import { supabaseAdmin } from "../supabase";
import { getOrgIdFromRequest } from "../auth_util";
import { db } from "../storage";
import { userOrganizations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Natural Language Query Routes
 * API endpoints for querying database with natural language
 */
export function registerNLQueryRoutes(app: Express) {

    // Middleware to get user role
    async function getUserRole(req: Request, res: Response, next: Function) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            // Get user role
            const userOrg = await db.query.userOrganizations.findFirst({
                where: and(
                    eq(userOrganizations.userId, user.id),
                    eq(userOrganizations.organizationId, organizationId)
                )
            });

            if (!userOrg) {
                return res.status(403).json({ message: "User not in organization" });
            }

            // Attach to request
            (req as any).user = user;
            (req as any).organizationId = organizationId;
            (req as any).role = userOrg.role || "user";

            next();
        } catch (error) {
            console.error("Auth middleware error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    // Execute natural language query
    app.post("/api/nl-query", getUserRole, async (req: Request, res: Response) => {
        try {
            const { query } = req.body;

            if (!query || typeof query !== "string") {
                return res.status(400).json({ message: "Query is required" });
            }

            const userId = (req as any).user.id;
            const organizationId = (req as any).organizationId;
            const role = (req as any).role;

            const result = await nlQueryService.executeQuery(
                query,
                userId,
                organizationId,
                role
            );

            res.json(result);
        } catch (error: any) {
            console.error("NL query error:", error);

            if (error.message?.includes("Rate limit")) {
                return res.status(429).json({ message: error.message });
            }

            if (error.message?.includes("validation failed")) {
                return res.status(400).json({ message: error.message });
            }

            res.status(500).json({
                message: "Error procesando consulta",
                error: error.message
            });
        }
    });

    // Get query suggestions for user's role
    app.get("/api/nl-query/suggestions", getUserRole, async (req: Request, res: Response) => {
        try {
            const role = (req as any).role;
            const suggestions = nlQueryService.getQuerySuggestions(role);

            res.json({ suggestions });
        } catch (error) {
            console.error("Get suggestions error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get query history
    app.get("/api/nl-query/history", getUserRole, async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const organizationId = (req as any).organizationId;
            const limit = parseInt(req.query.limit as string) || 10;

            const history = await nlQueryService.getQueryHistory(
                userId,
                organizationId,
                limit
            );

            res.json({ history });
        } catch (error) {
            console.error("Get history error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Explain SQL query
    app.post("/api/nl-query/explain", getUserRole, async (req: Request, res: Response) => {
        try {
            const { sql } = req.body;

            if (!sql || typeof sql !== "string") {
                return res.status(400).json({ message: "SQL is required" });
            }

            const explanation = await nlQueryService.explainQuery(sql);

            res.json({ explanation });
        } catch (error) {
            console.error("Explain query error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Clear cache (admin only)
    app.post("/api/nl-query/clear-cache", getUserRole, async (req: Request, res: Response) => {
        try {
            const role = (req as any).role;

            if (role !== "admin") {
                return res.status(403).json({ message: "Admin access required" });
            }

            nlQueryService.clearCache();

            res.json({ message: "Cache cleared successfully" });
        } catch (error) {
            console.error("Clear cache error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
