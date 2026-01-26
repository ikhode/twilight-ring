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

    /**
     * Obtiene todos los documentos accesibles según el rol del usuario.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/documentation", async (req: Request, res: Response): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({ message: "No token provided" });
                return;
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                res.status(401).json({ message: "Invalid token" });
                return;
            }

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

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

    /**
     * Obtiene un documento específico por su ID, verificando el acceso por rol.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/documentation/:id", async (req: Request, res: Response): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({ message: "No token provided" });
                return;
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                res.status(401).json({ message: "Invalid token" });
                return;
            }

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const role = await getUserRole(user.id, organizationId);
            const { id } = req.params;

            const doc = await documentationService.getDocument(id, role);

            if (!doc) {
                res.status(404).json({ message: "Document not found or access denied" });
                return;
            }

            res.json({ document: doc });
        } catch (error) {
            console.error("Get document error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Busca documentos que coincidan con una consulta de texto y sean accesibles por el rol.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.post("/api/documentation/search", async (req: Request, res: Response): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({ message: "No token provided" });
                return;
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                res.status(401).json({ message: "Invalid token" });
                return;
            }

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const role = await getUserRole(user.id, organizationId);
            const { query, limit = 5 } = req.body;

            if (!query) {
                res.status(400).json({ message: "Query is required" });
                return;
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

    /**
     * Obtiene las categorías de documentación disponibles para el rol del usuario.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/documentation/categories", async (req: Request, res: Response): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({ message: "No token provided" });
                return;
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                res.status(401).json({ message: "Invalid token" });
                return;
            }

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const role = await getUserRole(user.id, organizationId);

            const categories = await documentationService.getCategories(role);

            res.json({ categories });
        } catch (error) {
            console.error("Get categories error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Crea un nuevo documento (Solo administradores).
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.post("/api/documentation", async (req: Request, res: Response): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({ message: "No token provided" });
                return;
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                res.status(401).json({ message: "Invalid token" });
                return;
            }

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const role = await getUserRole(user.id, organizationId);

            // Only admins can create documentation
            if (role !== "admin") {
                res.status(403).json({ message: "Forbidden: Admin access required" });
                return;
            }

            const { category, title, content, tags, accessRoles, metadata } = req.body;

            if (!category || !title || !content) {
                res.status(400).json({ message: "Missing required fields" });
                return;
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

    /**
     * Actualiza un documento existente (Solo administradores).
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.put("/api/documentation/:id", async (req: Request, res: Response): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({ message: "No token provided" });
                return;
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                res.status(401).json({ message: "Invalid token" });
                return;
            }

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const role = await getUserRole(user.id, organizationId);

            // Only admins can update documentation
            if (role !== "admin") {
                res.status(403).json({ message: "Forbidden: Admin access required" });
                return;
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

    /**
     * Elimina un documento (Solo administradores).
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.delete("/api/documentation/:id", async (req: Request, res: Response): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({ message: "No token provided" });
                return;
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                res.status(401).json({ message: "Invalid token" });
                return;
            }

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const role = await getUserRole(user.id, organizationId);

            // Only admins can delete documentation
            if (role !== "admin") {
                res.status(403).json({ message: "Forbidden: Admin access required" });
                return;
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
