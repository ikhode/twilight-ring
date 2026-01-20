import { db } from "../storage";
import { knowledgeBase, type InsertKnowledgeBase } from "@shared/schema";
import { vectorStore } from "./vector-store";
import { eq, and, sql, inArray } from "drizzle-orm";

/**
 * Service for managing ERP documentation and knowledge base
 */
export class DocumentationService {

    /**
     * Add a new document to the knowledge base
     */
    async addDocument(doc: InsertKnowledgeBase): Promise<string> {
        const [inserted] = await db.insert(knowledgeBase).values(doc).returning();

        // Index in vector store for semantic search
        await vectorStore.addDocument(
            "knowledge_base",
            inserted.id,
            `${inserted.title}\n\n${inserted.content}\n\nTags: ${(inserted.tags as string[])?.join(", ")}`
        );

        return inserted.id;
    }

    /**
     * Update an existing document
     */
    async updateDocument(id: string, updates: Partial<InsertKnowledgeBase>): Promise<void> {
        await db.update(knowledgeBase)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(knowledgeBase.id, id));

        // Re-index in vector store
        const doc = await db.query.knowledgeBase.findFirst({
            where: eq(knowledgeBase.id, id)
        });

        if (doc) {
            await vectorStore.updateDocument(
                "knowledge_base",
                doc.id,
                `${doc.title}\n\n${doc.content}\n\nTags: ${(doc.tags as string[])?.join(", ")}`
            );
        }
    }

    /**
     * Get documents accessible by a specific role
     */
    async getDocumentsByRole(role: string, category?: string): Promise<any[]> {
        let query = db.query.knowledgeBase.findMany({
            where: sql`${knowledgeBase.accessRoles}::jsonb ? ${role}`
        });

        const docs = await query;

        if (category) {
            return docs.filter(doc => doc.category === category);
        }

        return docs;
    }

    /**
     * Search documents using semantic search with role filtering
     */
    async searchDocuments(
        query: string,
        role: string,
        limit: number = 5
    ): Promise<any[]> {
        // First, get semantically similar documents
        const searchResults = await vectorStore.search(query, limit * 2, "knowledge_base");

        // Then filter by role access
        const docIds = searchResults.map(r => r.entityId);

        if (docIds.length === 0) return [];

        const docs = await db.query.knowledgeBase.findMany({
            where: and(
                inArray(knowledgeBase.id, docIds),
                sql`${knowledgeBase.accessRoles}::jsonb ? ${role}`
            )
        });

        // Sort by similarity score
        const docsWithScore = docs.map(doc => {
            const result = searchResults.find(r => r.entityId === doc.id);
            return {
                ...doc,
                similarity: result?.similarity || 0
            };
        });

        return docsWithScore
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    /**
     * Get document by ID with role check
     */
    async getDocument(id: string, role: string): Promise<any | null> {
        const doc = await db.query.knowledgeBase.findFirst({
            where: and(
                eq(knowledgeBase.id, id),
                sql`${knowledgeBase.accessRoles}::jsonb ? ${role}`
            )
        });

        return doc || null;
    }

    /**
     * Delete a document
     */
    async deleteDocument(id: string): Promise<void> {
        await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
        await vectorStore.deleteDocument("knowledge_base", id);
    }

    /**
     * Get all categories accessible by role
     */
    async getCategories(role: string): Promise<string[]> {
        const docs = await this.getDocumentsByRole(role);
        const categories = new Set(docs.map(doc => doc.category));
        return Array.from(categories);
    }

    /**
     * Batch index existing documents
     */
    async reindexAll(): Promise<void> {
        const allDocs = await db.query.knowledgeBase.findMany();

        const documents = allDocs.map(doc => ({
            entityType: "knowledge_base",
            entityId: doc.id,
            content: `${doc.title}\n\n${doc.content}\n\nTags: ${(doc.tags as string[])?.join(", ")}`
        }));

        await vectorStore.addDocuments(documents);
        console.log(`✅ Indexed ${documents.length} documents`);
    }
}

export const documentationService = new DocumentationService();
