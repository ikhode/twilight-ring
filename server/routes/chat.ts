import type { Express, Request, Response } from "express";
import { chatAgentService } from "../services/chat-agents";
import { getOrgIdFromRequest } from "../auth_util";
import { supabaseAdmin } from "../supabase";

/**
 * Register chat-related routes
 */
export function registerChatRoutes(app: Express) {

    // Create a new conversation
    app.post("/api/chat/conversations", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const { title } = req.body;

            // Get user's role
            const userOrg = await chatAgentService.getUserConversations(user.id, organizationId);
            // For now, we'll use a simple role detection - in production, fetch from userOrganizations table
            const role = "user"; // TODO: Get actual role from userOrganizations

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

    // Get user's conversations
    app.get("/api/chat/conversations", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

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

    // Get specific conversation
    app.get("/api/chat/conversations/:id", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const { id } = req.params;

            const conversation = await chatAgentService.getConversation(id, user.id);

            if (!conversation) {
                return res.status(404).json({ message: "Conversation not found" });
            }

            res.json({ conversation });
        } catch (error) {
            console.error("Get conversation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get conversation messages
    app.get("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const { id } = req.params;

            // Verify user has access to this conversation
            const conversation = await chatAgentService.getConversation(id, user.id);
            if (!conversation) {
                return res.status(404).json({ message: "Conversation not found" });
            }

            const messages = await chatAgentService.getConversationMessages(id);

            res.json({ messages });
        } catch (error) {
            console.error("Get messages error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Send a message
    app.post("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const { id } = req.params;
            const { message } = req.body;

            if (!message || message.trim().length === 0) {
                return res.status(400).json({ message: "Message is required" });
            }

            // Verify user has access to this conversation
            const conversation = await chatAgentService.getConversation(id, user.id);
            if (!conversation) {
                return res.status(404).json({ message: "Conversation not found" });
            }

            // Get user's role - TODO: fetch from userOrganizations
            const role = "user"; // Placeholder

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

    // Archive a conversation
    app.post("/api/chat/conversations/:id/archive", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const { id } = req.params;

            await chatAgentService.archiveConversation(id, user.id);

            res.json({ message: "Conversation archived successfully" });
        } catch (error) {
            console.error("Archive conversation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Delete a conversation
    app.delete("/api/chat/conversations/:id", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const { id } = req.params;

            await chatAgentService.deleteConversation(id, user.id);

            res.json({ message: "Conversation deleted successfully" });
        } catch (error) {
            console.error("Delete conversation error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
