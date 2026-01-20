import OpenAI from 'openai';
import { db } from "../storage";
import { embeddings } from "@shared/schema";
import { desc, sql, eq, and } from "drizzle-orm";

interface SearchResult {
    id: string;
    content: string;
    similarity: number;
    entityType: string;
    entityId: string;
}

export class VectorStore {
    private openai: OpenAI | null = null;

    constructor() {
        // Initialize OpenAI client if API key is available
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        } else {
            console.warn("⚠️  OPENAI_API_KEY not found. Vector embeddings will use mock data.");
        }
    }

    /**
     * Generate embedding vector for text using OpenAI or fallback to mock
     */
    private async generateEmbedding(text: string): Promise<number[]> {
        if (this.openai) {
            try {
                const response = await this.openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: text,
                    dimensions: 1536,
                });
                return response.data[0].embedding;
            } catch (error) {
                console.error("OpenAI embedding error:", error);
                // Fallback to mock if API fails
            }
        }

        // Mock embedding generation for testing (deterministic pseudo-random)
        const hash = text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return Array.from({ length: 1536 }, (_, i) => Math.sin(hash + i));
    }

    /**
     * Add a document to the vector store
     */
    async addDocument(entityType: string, entityId: string, content: string): Promise<void> {
        const vector = await this.generateEmbedding(content);

        await db.insert(embeddings).values({
            entityType,
            entityId,
            content,
            vector
        });
    }

    /**
     * Update an existing document in the vector store
     */
    async updateDocument(entityType: string, entityId: string, content: string): Promise<void> {
        // Delete old embeddings for this entity
        await db.delete(embeddings)
            .where(and(
                eq(embeddings.entityType, entityType),
                eq(embeddings.entityId, entityId)
            ));

        // Add new embedding
        await this.addDocument(entityType, entityId, content);
    }

    /**
     * Search for similar documents using semantic search
     */
    async search(
        query: string,
        limit: number = 5,
        entityType?: string,
        minSimilarity: number = 0.5
    ): Promise<SearchResult[]> {
        const queryVector = await this.generateEmbedding(query);

        // Calculate cosine similarity: 1 - cosine_distance
        const similarity = sql<number>`1 - (${embeddings.vector} <=> ${JSON.stringify(queryVector)})`;

        let queryBuilder = db
            .select({
                id: embeddings.id,
                content: embeddings.content,
                entityType: embeddings.entityType,
                entityId: embeddings.entityId,
                similarity
            })
            .from(embeddings);

        // Filter by entity type if specified
        if (entityType) {
            queryBuilder = queryBuilder.where(eq(embeddings.entityType, entityType)) as any;
        }

        const results = await queryBuilder
            .orderBy(desc(similarity))
            .limit(limit);

        // Filter by minimum similarity threshold
        return results.filter(r => r.similarity >= minSimilarity);
    }

    /**
     * Delete all embeddings for a specific entity
     */
    async deleteDocument(entityType: string, entityId: string): Promise<void> {
        await db.delete(embeddings)
            .where(and(
                eq(embeddings.entityType, entityType),
                eq(embeddings.entityId, entityId)
            ));
    }

    /**
     * Batch add multiple documents
     */
    async addDocuments(documents: Array<{ entityType: string; entityId: string; content: string }>): Promise<void> {
        const embeddingsData = await Promise.all(
            documents.map(async (doc) => ({
                entityType: doc.entityType,
                entityId: doc.entityId,
                content: doc.content,
                vector: await this.generateEmbedding(doc.content)
            }))
        );

        await db.insert(embeddings).values(embeddingsData);
    }
}

export const vectorStore = new VectorStore();
