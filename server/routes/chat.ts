import type { Express, Request, Response } from "express";
import { chatAgentService } from "../services/chat-agents";
import { getOrgIdFromRequest } from "../auth_util";
import { supabaseAdmin } from "../supabase";

/**
 * Register chat-related routes
 * 
 * @param {import("express").Express} app - Express application
 */
export function registerChatRoutes(app: Express): void {

    /**
     * Crea una nueva conversación de chat para el usuario.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.post("/api/chat/conversations", async (req: Request, res: Response): Promise<void> => {
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

            const { title } = req.body;

            // Get user's role - TODO: Fetch from userOrganizations table
            const role = "user";

            const conversationId = await chatAgentService.createConversation(
                user.id,
                organizationId,
                role,
                title
            );

            res.status(201).json({
                conversationId,
                message: "Conversation created successfully"
            });
        } catch (error) {
            console.error("Create conversation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Obtiene el listado de conversaciones del usuario autenticado.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/chat/conversations", async (req: Request, res: Response): Promise<void> => {
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

            const { status = "active" } = req.query;

            const conversations = await chatAgentService.getUserConversations(
                user.id,
                organizationId,
                status as string
            );

            res.json({ conversations });
        } catch (error) {
            console.error("Get conversations error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Obtiene los detalles de una conversación específica.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/chat/conversations/:id", async (req: Request, res: Response): Promise<void> => {
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

            const { id } = req.params;

            const conversation = await chatAgentService.getConversation(id, user.id);

            if (!conversation) {
                res.status(404).json({ message: "Conversation not found" });
                return;
            }

            res.json({ conversation });
        } catch (error) {
            console.error("Get conversation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Obtiene el historial de mensajes de una conversación.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.get("/api/chat/conversations/:id/messages", async (req: Request, res: Response): Promise<void> => {
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

            const { id } = req.params;

            // Verify user has access to this conversation
            const conversation = await chatAgentService.getConversation(id, user.id);
            if (!conversation) {
                res.status(404).json({ message: "Conversation not found" });
                return;
            }

            const messages = await chatAgentService.getConversationMessages(id);

            res.json({ messages });
        } catch (error) {
            console.error("Get messages error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Envía un mensaje en una conversación y procesa la respuesta de la IA.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.post("/api/chat/conversations/:id/messages", async (req: Request, res: Response): Promise<void> => {
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

            const { id } = req.params;
            const { message } = req.body;

            if (!message || message.trim().length === 0) {
                res.status(400).json({ message: "Message is required" });
                return;
            }

            // Verify user has access to this conversation
            const conversation = await chatAgentService.getConversation(id, user.id);
            if (!conversation) {
                res.status(404).json({ message: "Conversation not found" });
                return;
            }

            // Get user's role - TODO: fetch from userOrganizations
            const role = "user";

            const { userMsg, aiMsg } = await chatAgentService.sendMessage(
                id,
                message,
                user.id,
                role
            );

            res.json({
                userMessage: userMsg,
                aiMessage: aiMsg
            });
        } catch (error) {
            console.error("Send message error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Archiva una conversación para ocultarla de la lista activa.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.post("/api/chat/conversations/:id/archive", async (req: Request, res: Response): Promise<void> => {
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

            const { id } = req.params;

            await chatAgentService.archiveConversation(id, user.id);

            res.json({ message: "Conversation archived successfully" });
        } catch (error) {
            console.error("Archive conversation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * Elimina definitivamente una conversación.
     * 
     * @param {import("express").Request} req - Solicitud de Express
     * @param {import("express").Response} res - Respuesta de Express
     * @returns {Promise<void>}
     */
    app.delete("/api/chat/conversations/:id", async (req: Request, res: Response): Promise<void> => {
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

            const { id } = req.params;

            await chatAgentService.deleteConversation(id, user.id);

            res.json({ message: "Conversation deleted successfully" });
        } catch (error) {
            console.error("Delete conversation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
