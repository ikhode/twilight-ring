import { db } from "../storage";
import { sql as drizzleSql } from "drizzle-orm";
import { sqlGenerator } from "./sql-generator";
import { schemaContextBuilder } from "./schema-context";

interface QueryResult {
    query: string;
    sql: string;
    explanation: string;
    results: any[];
    rowCount: number;
    executionTime: number;
    confidence: number;
    suggestions?: string[];
}

interface QueryHistoryEntry {
    id: string;
    userId: string;
    organizationId: string;
    naturalQuery: string;
    generatedSQL: string;
    rowCount: number;
    executionTime: number;
    success: boolean;
    error?: string;
    createdAt: Date;
}

// In-memory cache for frequent queries (in production, use Redis)
const queryCache = new Map<string, { result: QueryResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // queries per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

/**
 * Natural Language Query Service
 * Main orchestrator for NL to SQL conversion and execution
 */
export class NLQueryService {

    /**
     * Execute a natural language query
     */
    async executeQuery(
        naturalQuery: string,
        userId: string,
        organizationId: string,
        role: string
    ): Promise<QueryResult> {

        // Check rate limit
        this.checkRateLimit(userId);

        // Check cache
        const cacheKey = `${organizationId}:${role}:${naturalQuery}`;
        const cached = queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.result;
        }

        const startTime = Date.now();

        try {
            // Generate SQL from natural language
            const { sql, explanation, confidence } = await sqlGenerator.generateSQL(
                naturalQuery,
                role,
                organizationId
            );

            console.log(`Generated SQL: ${sql}`);

            // Execute the query
            const results = await this.executeSQLQuery(sql);
            const executionTime = Date.now() - startTime;

            // Get follow-up suggestions
            const suggestions = await sqlGenerator.suggestFollowUp(
                naturalQuery,
                results,
                role
            );

            const result: QueryResult = {
                query: naturalQuery,
                sql,
                explanation,
                results,
                rowCount: results.length,
                executionTime,
                confidence,
                suggestions
            };

            // Cache the result
            queryCache.set(cacheKey, { result, timestamp: Date.now() });

            // Log to history
            await this.logQuery({
                id: crypto.randomUUID(),
                userId,
                organizationId,
                naturalQuery,
                generatedSQL: sql,
                rowCount: results.length,
                executionTime,
                success: true,
                createdAt: new Date()
            });

            return result;

        } catch (error: any) {
            const executionTime = Date.now() - startTime;

            // Log error to history
            await this.logQuery({
                id: crypto.randomUUID(),
                userId,
                organizationId,
                naturalQuery,
                generatedSQL: "",
                rowCount: 0,
                executionTime,
                success: false,
                error: error.message,
                createdAt: new Date()
            });

            throw error;
        }
    }

    /**
     * Execute SQL query safely
     */
    private async executeSQLQuery(sqlQuery: string): Promise<any[]> {
        try {
            // Use Drizzle's raw SQL execution
            const results = await db.execute(drizzleSql.raw(sqlQuery));
            return results.rows || [];
        } catch (error: any) {
            console.error("SQL execution error:", error);
            throw new Error(`Error ejecutando query: ${error.message}`);
        }
    }

    /**
     * Get query history for a user
     */
    async getQueryHistory(
        userId: string,
        organizationId: string,
        limit: number = 10
    ): Promise<QueryHistoryEntry[]> {
        // In production, this would query the nl_query_logs table
        // For now, return empty array
        return [];
    }

    /**
     * Get query suggestions for a role
     */
    getQuerySuggestions(role: string): string[] {
        const suggestions: Record<string, string[]> = {
            admin: [
                "¿Cuántos usuarios tenemos activos?",
                "Muéstrame las conversaciones de chat de hoy",
                "¿Cuáles son los documentos más consultados?",
                "Dame un resumen de procesos ejecutados esta semana"
            ],
            manager: [
                "¿Cuáles son las ventas del mes actual?",
                "Muéstrame los 10 productos más vendidos",
                "¿Cuántos empleados tenemos activos?",
                "Dame el total de gastos del mes",
                "¿Qué productos tienen stock bajo?"
            ],
            user: [
                "¿Cuántos productos tenemos en inventario?",
                "Muéstrame las ventas de hoy",
                "Lista de clientes activos",
                "¿Qué vehículos están disponibles?",
                "Productos con stock menor a 10 unidades"
            ],
            viewer: [
                "Lista de productos",
                "Información de clientes",
                "Catálogo de productos por categoría"
            ]
        };

        return suggestions[role] || suggestions.viewer;
    }

    /**
     * Explain a SQL query
     */
    async explainQuery(sql: string): Promise<string> {
        return await sqlGenerator.explainSQL(sql);
    }

    /**
     * Check rate limit for user
     */
    private checkRateLimit(userId: string): void {
        const now = Date.now();
        const userLimit = rateLimitMap.get(userId);

        if (!userLimit || now > userLimit.resetAt) {
            // Reset or create new limit
            rateLimitMap.set(userId, {
                count: 1,
                resetAt: now + RATE_WINDOW
            });
            return;
        }

        if (userLimit.count >= RATE_LIMIT) {
            throw new Error("Rate limit exceeded. Por favor espera un momento antes de hacer otra consulta.");
        }

        userLimit.count++;
    }

    /**
     * Log query to history (stub for now)
     */
    private async logQuery(entry: QueryHistoryEntry): Promise<void> {
        // In production, insert into nl_query_logs table
        console.log("Query logged:", {
            query: entry.naturalQuery,
            success: entry.success,
            rowCount: entry.rowCount,
            executionTime: entry.executionTime
        });
    }

    /**
     * Clear cache (for testing or admin purposes)
     */
    clearCache(): void {
        queryCache.clear();
    }
}

export const nlQueryService = new NLQueryService();
