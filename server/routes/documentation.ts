import type { Express, Request, Response } from "express";
import { documentationService } from "../services/documentation";
import { getOrgIdFromRequest } from "../auth_util";
import { supabaseAdmin } from "../supabase";
import { db } from "../storage";
import { userOrganizations } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Register documentation-related routes
 */
export function registerDocumentationRoutes(app: Express) {

    // Get user's role helper
    async function getUserRole(userId: string, organizationId: string): Promise<string> {
        const userOrg = await db.query.userOrganizations.findFirst({
            where: eq(userOrganizations.userId, userId)
        });
        return userOrg?.role || "user";
    }

    // Get all documentation accessible by user's role
    app.get("/api/documentation", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const role = await getUserRole(user.id, organizationId);
            const { category } = req.query;

            const docs = await documentationService.getDocumentsByRole(
                role,
                category as string | undefined
            );

            res.json({ documents: docs });
        } catch (error) {
            console.error("Get documentation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get specific document
    app.get("/api/documentation/:id", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const role = await getUserRole(user.id, organizationId);
            const { id } = req.params;

            const doc = await documentationService.getDocument(id, role);

            if (!doc) {
                return res.status(404).json({ message: "Document not found or access denied" });
            }

            res.json({ document: doc });
        } catch (error) {
            console.error("Get document error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Search documentation
    app.post("/api/documentation/search", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const role = await getUserRole(user.id, organizationId);
            const { query, limit = 5 } = req.body;

            if (!query) {
                return res.status(400).json({ message: "Query is required" });
            }

            const results = await documentationService.searchDocuments(
                query,
                role,
                limit
            );

            res.json({ results });
        } catch (error) {
            console.error("Search documentation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get available categories
    app.get("/api/documentation/categories", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const role = await getUserRole(user.id, organizationId);

            const categories = await documentationService.getCategories(role);

            res.json({ categories });
        } catch (error) {
            console.error("Get categories error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Create documentation (admin only)
    app.post("/api/documentation", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const role = await getUserRole(user.id, organizationId);

            // Only admins can create documentation
            if (role !== "admin") {
                return res.status(403).json({ message: "Forbidden: Admin access required" });
            }

            const { category, title, content, tags, accessRoles, metadata } = req.body;

            if (!category || !title || !content) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            const docId = await documentationService.addDocument({
                category,
                title,
                content,
                tags: tags || [],
                accessRoles: accessRoles || ["admin", "manager", "user", "viewer"],
                metadata: metadata || {}
            });

            res.status(201).json({
                documentId: docId,
                message: "Documentation created successfully"
            });
        } catch (error) {
            console.error("Create documentation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Update documentation (admin only)
    app.put("/api/documentation/:id", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const role = await getUserRole(user.id, organizationId);

            // Only admins can update documentation
            if (role !== "admin") {
                return res.status(403).json({ message: "Forbidden: Admin access required" });
            }

            const { id } = req.params;
            const updates = req.body;

            await documentationService.updateDocument(id, updates);

            res.json({ message: "Documentation updated successfully" });
        } catch (error) {
            console.error("Update documentation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Delete documentation (admin only)
    app.delete("/api/documentation/:id", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const role = await getUserRole(user.id, organizationId);

            // Only admins can delete documentation
            if (role !== "admin") {
                return res.status(403).json({ message: "Forbidden: Admin access required" });
            }

            const { id } = req.params;

            await documentationService.deleteDocument(id);

            res.json({ message: "Documentation deleted successfully" });
        } catch (error) {
            console.error("Delete documentation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
