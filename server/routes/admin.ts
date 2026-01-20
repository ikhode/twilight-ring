import type { Express, Request, Response } from "express";
import { db } from "../storage";
import {
    aiChatAgents,
    chatConversations,
    chatMessages,
    userOrganizations
} from "@shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { supabaseAdmin } from "../supabase";
import { getOrgIdFromRequest } from "../auth_util";

/**
 * Register admin-only routes for managing AI documentation system
 */
export function registerAdminRoutes(app: Express) {

    // Middleware to check admin role
    async function requireAdmin(req: Request, res: Response, next: Function) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            // Check if user is admin
            const userOrg = await db.query.userOrganizations.findFirst({
                where: and(
                    eq(userOrganizations.userId, user.id),
                    eq(userOrganizations.organizationId, organizationId)
                )
            });

            if (!userOrg || userOrg.role !== "admin") {
                return res.status(403).json({ message: "Forbidden: Admin access required" });
            }

            // Attach user and org to request
            (req as any).user = user;
            (req as any).organizationId = organizationId;
            next();
        } catch (error) {
            console.error("Admin middleware error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    // Get all agents
    app.get("/api/admin/agents", requireAdmin, async (req: Request, res: Response) => {
        try {
            const agents = await db.query.aiChatAgents.findMany({
                orderBy: [aiChatAgents.role]
            });

            res.json({ agents });
        } catch (error) {
            console.error("Get agents error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get agent by ID
    app.get("/api/admin/agents/:id", requireAdmin, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const agent = await db.query.aiChatAgents.findFirst({
                where: eq(aiChatAgents.id, id)
            });

            if (!agent) {
                return res.status(404).json({ message: "Agent not found" });
            }

            res.json({ agent });
        } catch (error) {
            console.error("Get agent error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Update agent
    app.put("/api/admin/agents/:id", requireAdmin, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { name, description, systemPrompt, knowledgeScope, capabilities, settings } = req.body;

            const updates: any = { updatedAt: new Date() };
            if (name) updates.name = name;
            if (description) updates.description = description;
            if (systemPrompt) updates.systemPrompt = systemPrompt;
            if (knowledgeScope) updates.knowledgeScope = knowledgeScope;
            if (capabilities) updates.capabilities = capabilities;
            if (settings) updates.settings = settings;

            await db.update(aiChatAgents)
                .set(updates)
                .where(eq(aiChatAgents.id, id));

            res.json({ message: "Agent updated successfully" });
        } catch (error) {
            console.error("Update agent error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get chat statistics
    app.get("/api/admin/chat-stats", requireAdmin, async (req: Request, res: Response) => {
        try {
            const organizationId = (req as any).organizationId;

            // Total conversations
            const [conversationsCount] = await db
                .select({ count: count() })
                .from(chatConversations)
                .where(eq(chatConversations.organizationId, organizationId));

            // Total messages
            const [messagesCount] = await db
                .select({ count: count() })
                .from(chatMessages)
                .innerJoin(
                    chatConversations,
                    eq(chatMessages.conversationId, chatConversations.id)
                )
                .where(eq(chatConversations.organizationId, organizationId));

            // Active users (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const activeUsers = await db
                .selectDistinct({ userId: chatConversations.userId })
                .from(chatConversations)
                .where(
                    and(
                        eq(chatConversations.organizationId, organizationId),
                        sql`${chatConversations.lastMessageAt} >= ${sevenDaysAgo}`
                    )
                );

            // Average confidence (from message metadata)
            const messagesWithConfidence = await db
                .select({ metadata: chatMessages.metadata })
                .from(chatMessages)
                .innerJoin(
                    chatConversations,
                    eq(chatMessages.conversationId, chatConversations.id)
                )
                .where(
                    and(
                        eq(chatConversations.organizationId, organizationId),
                        eq(chatMessages.role, "assistant")
                    )
                )
                .limit(100);

            let totalConfidence = 0;
            let confidenceCount = 0;

            for (const msg of messagesWithConfidence) {
                const metadata = msg.metadata as any;
                if (metadata?.confidence) {
                    totalConfidence += metadata.confidence;
                    confidenceCount++;
                }
            }

            const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

            // Top queries (simplified - in production, use proper analytics)
            const recentUserMessages = await db
                .select({ content: chatMessages.content })
                .from(chatMessages)
                .innerJoin(
                    chatConversations,
                    eq(chatMessages.conversationId, chatConversations.id)
                )
                .where(
                    and(
                        eq(chatConversations.organizationId, organizationId),
                        eq(chatMessages.role, "user")
                    )
                )
                .orderBy(desc(chatMessages.createdAt))
                .limit(50);

            // Simple frequency count
            const queryFrequency: Record<string, number> = {};
            for (const msg of recentUserMessages) {
                const query = msg.content.toLowerCase().trim();
                queryFrequency[query] = (queryFrequency[query] || 0) + 1;
            }

            const topQueries = Object.entries(queryFrequency)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([query, count]) => ({ query, count }));

            res.json({
                totalConversations: conversationsCount.count,
                totalMessages: messagesCount.count,
                activeUsers: activeUsers.length,
                avgConfidence,
                topQueries
            });
        } catch (error) {
            console.error("Get chat stats error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get all conversations (admin view)
    app.get("/api/admin/conversations", requireAdmin, async (req: Request, res: Response) => {
        try {
            const organizationId = (req as any).organizationId;
            const { limit = 50, offset = 0 } = req.query;

            const conversations = await db.query.chatConversations.findMany({
                where: eq(chatConversations.organizationId, organizationId),
                orderBy: [desc(chatConversations.lastMessageAt)],
                limit: Number(limit),
                offset: Number(offset),
                with: {
                    agent: true
                }
            });

            res.json({ conversations });
        } catch (error) {
            console.error("Get conversations error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Reindex all documentation (admin utility)
    app.post("/api/admin/reindex-docs", requireAdmin, async (req: Request, res: Response) => {
        try {
            const { documentationService } = await import("../services/documentation");
            await documentationService.reindexAll();

            res.json({ message: "Documentation reindexed successfully" });
        } catch (error) {
            console.error("Reindex error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
