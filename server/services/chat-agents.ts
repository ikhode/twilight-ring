import { db } from "../storage";
import {
    aiChatAgents,
    chatConversations,
    chatMessages,
    type InsertChatConversation,
    type InsertChatMessage,
    type ChatMessage
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { ragEngine } from "./rag-engine";

/**
 * Service for managing AI chat agents and conversations
 */
export class ChatAgentService {

    /**
     * Initialize default agents for each role
     */
    async initializeAgents(): Promise<void> {
        const agents = [
            {
                role: "admin" as const,
                name: "NexusAI Admin",
                description: "Asistente especializado para administradores con acceso completo al sistema",
                systemPrompt: "Eres un asistente experto para administradores de NexusERP con acceso completo a configuración, gestión de usuarios, y análisis del sistema.",
                knowledgeScope: ["graphql", "process", "module", "tutorial", "faq"],
                capabilities: [
                    "Configuración del sistema",
                    "Gestión de usuarios y roles",
                    "Análisis avanzado",
                    "Troubleshooting técnico",
                    "Optimización del sistema"
                ],
                settings: { temperature: 0.7, maxTokens: 1000 }
            },
            {
                role: "manager" as const,
                name: "NexusAI Manager",
                description: "Asistente para gerentes enfocado en reportes y análisis de negocio",
                systemPrompt: "Eres un asistente para gerentes de NexusERP enfocado en reportes, análisis de datos, y gestión de equipos.",
                knowledgeScope: ["process", "module", "tutorial", "faq"],
                capabilities: [
                    "Reportes y analytics",
                    "Gestión de equipos",
                    "Optimización de procesos",
                    "KPIs y métricas",
                    "Análisis de tendencias"
                ],
                settings: { temperature: 0.7, maxTokens: 1000 }
            },
            {
                role: "user" as const,
                name: "NexusAI Assistant",
                description: "Asistente para usuarios enfocado en operaciones diarias",
                systemPrompt: "Eres un asistente para usuarios de NexusERP enfocado en operaciones diarias y uso de módulos.",
                knowledgeScope: ["module", "tutorial", "faq"],
                capabilities: [
                    "Operaciones diarias",
                    "Uso de módulos",
                    "Tutoriales paso a paso",
                    "Preguntas frecuentes",
                    "Tareas comunes"
                ],
                settings: { temperature: 0.7, maxTokens: 800 }
            },
            {
                role: "viewer" as const,
                name: "NexusAI Viewer",
                description: "Asistente para observadores con acceso solo a consultas",
                systemPrompt: "Eres un asistente para observadores de NexusERP con acceso solo a consultas y visualización de datos.",
                knowledgeScope: ["faq"],
                capabilities: [
                    "Consultas de datos",
                    "Visualización de reportes",
                    "Preguntas frecuentes básicas"
                ],
                settings: { temperature: 0.7, maxTokens: 500 }
            }
        ];

        for (const agent of agents) {
            // Check if agent already exists
            const existing = await db.query.aiChatAgents.findFirst({
                where: eq(aiChatAgents.role, agent.role)
            });

            if (!existing) {
                await db.insert(aiChatAgents).values(agent);
                console.log(`✅ Created agent: ${agent.name}`);
            }
        }
    }

    /**
     * Get agent for a specific role
     */
    async getAgentByRole(role: string): Promise<any> {
        return await db.query.aiChatAgents.findFirst({
            where: eq(aiChatAgents.role, role as any)
        });
    }

    /**
     * Create a new conversation
     */
    async createConversation(
        userId: string,
        organizationId: string,
        role: string,
        title?: string
    ): Promise<string> {
        const agent = await this.getAgentByRole(role);

        if (!agent) {
            throw new Error(`Agent not found for role: ${role}`);
        }

        const [conversation] = await db.insert(chatConversations).values({
            userId,
            organizationId,
            agentId: agent.id,
            title: title || "Nueva conversación",
            status: "active"
        }).returning();

        return conversation.id;
    }

    /**
     * Get user's conversations
     */
    async getUserConversations(
        userId: string,
        organizationId: string,
        status: string = "active"
    ): Promise<any[]> {
        return await db.query.chatConversations.findMany({
            where: and(
                eq(chatConversations.userId, userId),
                eq(chatConversations.organizationId, organizationId),
                eq(chatConversations.status, status)
            ),
            orderBy: [desc(chatConversations.lastMessageAt)],
            with: {
                agent: true
            }
        });
    }

    /**
     * Get conversation messages
     */
    async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
        return await db.query.chatMessages.findMany({
            where: eq(chatMessages.conversationId, conversationId),
            orderBy: [chatMessages.createdAt]
        });
    }

    /**
     * Send a message and get AI response
     */
    async sendMessage(
        conversationId: string,
        userMessage: string,
        userId: string,
        role: string
    ): Promise<{ userMsg: ChatMessage; aiMsg: ChatMessage }> {
        // 1. Get conversation to get organizationId
        const conversation = await this.getConversation(conversationId, userId);
        if (!conversation) throw new Error("Conversation not found");

        // 2. Save user message
        const [userMsg] = await db.insert(chatMessages).values({
            conversationId,
            role: "user",
            content: userMessage,
            metadata: {}
        }).returning();

        // 3. Get conversation history
        const history = await this.getConversationMessages(conversationId);

        // 4. Generate AI response using RAG + Cognitive Reasoning
        const ragResponse = await ragEngine.generateResponse({
            query: userMessage,
            role,
            conversationHistory: history,
            maxResults: 5,
            organizationId: conversation.organizationId,
            userId: userId
        });

        // 5. Save AI response with reasoning metadata
        const [aiMsg] = await db.insert(chatMessages).values({
            conversationId,
            role: "assistant",
            content: ragResponse.answer,
            metadata: {
                sources: ragResponse.sources,
                confidence: ragResponse.confidence,
                tokensUsed: ragResponse.tokensUsed,
                reasoning: ragResponse.reasoning // Pass reasoning data to frontend
            }
        }).returning();

        // 6. Update conversation last message time
        await db.update(chatConversations)
            .set({
                lastMessageAt: new Date(),
                title: history.length === 1 ? userMessage.substring(0, 50) : undefined // Only rename if it's the first real msg
            })
            .where(eq(chatConversations.id, conversationId));

        return { userMsg, aiMsg };
    }


    /**
     * Archive a conversation
     */
    async archiveConversation(conversationId: string, userId: string): Promise<void> {
        await db.update(chatConversations)
            .set({ status: "archived" })
            .where(and(
                eq(chatConversations.id, conversationId),
                eq(chatConversations.userId, userId)
            ));
    }

    /**
     * Delete a conversation
     */
    async deleteConversation(conversationId: string, userId: string): Promise<void> {
        await db.delete(chatConversations)
            .where(and(
                eq(chatConversations.id, conversationId),
                eq(chatConversations.userId, userId)
            ));
    }

    /**
     * Get conversation by ID with access check
     */
    async getConversation(conversationId: string, userId: string): Promise<any | null> {
        return await db.query.chatConversations.findFirst({
            where: and(
                eq(chatConversations.id, conversationId),
                eq(chatConversations.userId, userId)
            ),
            with: {
                agent: true
            }
        });
    }
}

export const chatAgentService = new ChatAgentService();
