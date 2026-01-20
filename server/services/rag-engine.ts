import OpenAI from 'openai';
import { documentationService } from './documentation';
import type { ChatMessage } from '@shared/schema';

interface RAGContext {
    query: string;
    role: string;
    conversationHistory?: ChatMessage[];
    maxResults?: number;
}

interface RAGResponse {
    answer: string;
    sources: Array<{
        id: string;
        title: string;
        similarity: number;
    }>;
    confidence: number;
    tokensUsed?: number;
}

/**
 * RAG (Retrieval-Augmented Generation) Engine
 * Combines semantic search with LLM generation for accurate, context-aware responses
 */
export class RAGEngine {
    private openai: OpenAI | null = null;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        } else {
            console.warn("⚠️  OPENAI_API_KEY not found. RAG will use fallback responses.");
        }
    }

    /**
     * Generate a response using RAG
     */
    async generateResponse(context: RAGContext): Promise<RAGResponse> {
        const { query, role, conversationHistory = [], maxResults = 5 } = context;

        // 1. Retrieve relevant documentation
        const relevantDocs = await documentationService.searchDocuments(query, role, maxResults);

        if (!this.openai) {
            return this.fallbackResponse(query, relevantDocs);
        }

        // 2. Build context for LLM
        const contextText = this.buildContext(relevantDocs);

        // 3. Build conversation history
        const messages = this.buildMessages(query, contextText, conversationHistory, role);

        try {
            // 4. Generate response with OpenAI
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages,
                temperature: 0.7,
                max_tokens: 1000,
            });

            const answer = completion.choices[0].message.content || "No pude generar una respuesta.";
            const tokensUsed = completion.usage?.total_tokens || 0;

            // 5. Calculate confidence based on source similarity
            const avgSimilarity = relevantDocs.length > 0
                ? relevantDocs.reduce((sum, doc) => sum + (doc.similarity || 0), 0) / relevantDocs.length
                : 0;

            return {
                answer,
                sources: relevantDocs.map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    similarity: doc.similarity || 0
                })),
                confidence: avgSimilarity,
                tokensUsed
            };

        } catch (error) {
            console.error("OpenAI generation error:", error);
            return this.fallbackResponse(query, relevantDocs);
        }
    }

    /**
     * Build context from retrieved documents
     */
    private buildContext(docs: any[]): string {
        if (docs.length === 0) {
            return "No se encontró documentación relevante.";
        }

        return docs.map((doc, idx) =>
            `[Documento ${idx + 1}: ${doc.title}]\n${doc.content}\n`
        ).join("\n---\n\n");
    }

    /**
     * Build messages array for OpenAI chat completion
     */
    private buildMessages(
        query: string,
        contextText: string,
        history: ChatMessage[],
        role: string
    ): OpenAI.Chat.ChatCompletionMessageParam[] {
        const systemPrompt = this.getSystemPrompt(role);

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: systemPrompt
            }
        ];

        // Add conversation history (last 10 messages for context)
        const recentHistory = history.slice(-10);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content
            });
        }

        // Add current query with context
        messages.push({
            role: "user",
            content: `Contexto de documentación:\n\n${contextText}\n\n---\n\nPregunta del usuario: ${query}`
        });

        return messages;
    }

    /**
     * Get system prompt based on user role
     */
    private getSystemPrompt(role: string): string {
        const basePrompt = `Eres un asistente de IA especializado en el ERP NexusERP. Tu objetivo es ayudar a los usuarios a entender y utilizar el sistema de manera efectiva.

Instrucciones:
- Responde SOLO basándote en la documentación proporcionada en el contexto
- Si la información no está en el contexto, indica claramente que no tienes esa información
- Sé conciso pero completo en tus respuestas
- Usa ejemplos cuando sea apropiado
- Responde en español de manera profesional y amigable
- Si la pregunta requiere permisos que el usuario no tiene, indícalo claramente`;

        const roleSpecificPrompts: Record<string, string> = {
            admin: `\n\nComo asistente para ADMINISTRADORES, tienes acceso completo a toda la documentación del sistema, incluyendo configuración avanzada, gestión de usuarios, y análisis del sistema.`,

            manager: `\n\nComo asistente para GERENTES, enfócate en reportes, análisis de datos, gestión de equipos, y optimización de procesos. No proporciones información sobre configuración del sistema.`,

            user: `\n\nComo asistente para USUARIOS, enfócate en operaciones diarias, uso de módulos asignados, y tareas comunes. Proporciona tutoriales paso a paso cuando sea necesario.`,

            viewer: `\n\nComo asistente para OBSERVADORES, enfócate solo en consultas y visualización de datos. No proporciones información sobre modificación de datos o configuración.`
        };

        return basePrompt + (roleSpecificPrompts[role] || roleSpecificPrompts.user);
    }

    /**
     * Fallback response when OpenAI is not available
     */
    private fallbackResponse(query: string, docs: any[]): RAGResponse {
        if (docs.length === 0) {
            return {
                answer: "No encontré documentación relevante para tu pregunta. Por favor, intenta reformular tu consulta o contacta al soporte técnico.",
                sources: [],
                confidence: 0
            };
        }

        // Simple fallback: return the most relevant document
        const topDoc = docs[0];
        return {
            answer: `Encontré información relevante en la documentación:\n\n**${topDoc.title}**\n\n${topDoc.content.substring(0, 500)}...\n\n_Nota: Para respuestas más precisas, configura OPENAI_API_KEY._`,
            sources: docs.map(doc => ({
                id: doc.id,
                title: doc.title,
                similarity: doc.similarity || 0
            })),
            confidence: topDoc.similarity || 0.5
        };
    }

    /**
     * Stream a response (for real-time chat experience)
     */
    async *streamResponse(context: RAGContext): AsyncGenerator<string, void, unknown> {
        const { query, role, conversationHistory = [], maxResults = 5 } = context;

        const relevantDocs = await documentationService.searchDocuments(query, role, maxResults);

        if (!this.openai) {
            yield this.fallbackResponse(query, relevantDocs).answer;
            return;
        }

        const contextText = this.buildContext(relevantDocs);
        const messages = this.buildMessages(query, contextText, conversationHistory, role);

        try {
            const stream = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages,
                temperature: 0.7,
                max_tokens: 1000,
                stream: true,
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    yield content;
                }
            }
        } catch (error) {
            console.error("OpenAI streaming error:", error);
            yield this.fallbackResponse(query, relevantDocs).answer;
        }
    }
}

export const ragEngine = new RAGEngine();
