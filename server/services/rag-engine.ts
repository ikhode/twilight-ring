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
 * RAG (Retrieval-Augmented Generation) Engine - LOCAL ONLY
 * Uses semantic search to find relevant documentation and returns matched content.
 */
export class RAGEngine {
    constructor() {
        console.log("🧠 Local Cognitive Engine Initialized (OpenAI Disabled)");
    }

    /**
     * Generate a response using local documentation retrieval
     */
    async generateResponse(context: RAGContext): Promise<RAGResponse> {
        const { query, role, maxResults = 5 } = context;

        // 1. Retrieve relevant documentation using local search
        const relevantDocs = await documentationService.searchDocuments(query, role, maxResults);

        return this.localResponse(query, relevantDocs);
    }

    /**
     * Build response from retrieved documents without external LLM
     */
    private localResponse(query: string, docs: any[]): RAGResponse {
        if (docs.length === 0) {
            return {
                answer: "No encontré información específica en los manuales locales para responder a esa consulta. Por favor, intenta usar términos más precisos relacionados con los módulos del sistema.",
                sources: [],
                confidence: 0
            };
        }

        // Return the most relevant document content as the primary answer
        const topDoc = docs[0];

        // Structure a professional response based on local data
        const answer = `He localizado información relevante en los manuales del sistema:\n\n**${topDoc.title}**\n\n${topDoc.content}\n\n_Información recuperada integralmente del Núcleo Cognitivo Local._`;

        return {
            answer,
            sources: docs.map(doc => ({
                id: doc.id,
                title: doc.title,
                similarity: doc.similarity || 0
            })),
            confidence: topDoc.similarity || 0.8
        };
    }

    /**
     * Stream a response (Mock streaming for local engine)
     */
    async *streamResponse(context: RAGContext): AsyncGenerator<string, void, unknown> {
        const response = await this.generateResponse(context);

        // Simulate streaming for UI continuity
        const words = response.answer.split(' ');
        for (const word of words) {
            yield word + ' ';
            await new Promise(resolve => setTimeout(resolve, 30));
        }
    }
}

export const ragEngine = new RAGEngine();

