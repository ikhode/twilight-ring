import type { Express, Request, Response } from "express";
import { db } from "../storage";
import { aiInsights, aiConfigurations, products } from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getOrgIdFromRequest } from "../auth_util";

/**
 * Register AI-related routes
 */
export function registerAIRoutes(app: Express) {

    // Get AI insights (predictions, anomalies, suggestions)
    app.get("/api/ai/insights", async (req: Request, res: Response) => {
        try {
            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const { type, limit = 10 } = req.query;

            let query = db.query.aiInsights.findMany({
                where: eq(aiInsights.organizationId, organizationId),
                orderBy: [desc(aiInsights.createdAt)],
                limit: Number(limit),
            });

            if (type) {
                query = db.query.aiInsights.findMany({
                    where: and(
                        eq(aiInsights.organizationId, organizationId),
                        eq(aiInsights.type, type as string)
                    ),
                    orderBy: [desc(aiInsights.createdAt)],
                    limit: Number(limit),
                });
            }

            const insights = await query;

            res.json({ insights });
        } catch (error) {
            console.error("Get insights error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get Pending Insights (Notifications/Briefing)
    app.get("/api/ai/insights/pending", async (req: Request, res: Response) => {
        try {
            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            // --- AUTO-RESOLUTION LOGIC ---
            // 1. Check if inventory is no longer empty
            try {
                const productCountRes = await db.select({ count: sql<number>`count(*)` })
                    .from(products)
                    .where(eq(products.organizationId, organizationId));

                const productCount = Number(productCountRes[0]?.count || 0);

                if (productCount > 0) {
                    // Auto-resolve "Empty Inventory" suggestions
                    await db.update(aiInsights)
                        .set({
                            acknowledged: true,
                            data: sql`jsonb_set(coalesce(data, '{}'), '{autoResolved}', 'true')`
                        })
                        .where(and(
                            eq(aiInsights.organizationId, organizationId),
                            eq(aiInsights.acknowledged, false),
                            sql`lower(${aiInsights.title}) LIKE '%inventario vacío%'`
                        ));
                }
            } catch (err) {
                console.warn("Auto-resolution check failed:", err);
                // Continue execution, don't block the API
            }
            // -----------------------------

            const insights = await db.query.aiInsights.findMany({
                where: and(
                    eq(aiInsights.organizationId, organizationId),
                    eq(aiInsights.acknowledged, false)
                ),
                orderBy: [desc(aiInsights.createdAt)],
                limit: 20,
            });

            res.json(insights);
        } catch (error) {
            console.error("Get pending insights error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Acknowledge/Dismiss Insight
    app.patch("/api/ai/insights/:id", async (req: Request, res: Response) => {
        try {
            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const { id } = req.params;
            const { acknowledged, feedback } = req.body; // feedback can be 'agreed', 'disagreed'

            await db.update(aiInsights)
                .set({
                    acknowledged: acknowledged,
                    data: sql`jsonb_set(coalesce(data, '{}'), '{feedback}', ${JSON.stringify(feedback)})`
                })
                .where(and(
                    eq(aiInsights.id, id),
                    eq(aiInsights.organizationId, organizationId)
                ));

            res.json({ message: "Insight updated" });
        } catch (error) {
            console.error("Update insight error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Natural language query to Decision Copilot
    app.post("/api/ai/query", async (req: Request, res: Response) => {
        try {
            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const { query } = req.body;

            if (!query) {
                return res.status(400).json({ message: "Query is required" });
            }

            // TODO: Connect to real LLM (Decision Copilot)
            // For now, we keep the keyword matching but ensure it's context-aware if possible
            // In a real implementation, we would pass 'organizationId' context to the LLM agent.

            const mockResponses: Record<string, string> = {
                "revenue": "Basado en las tendencias actuales, tus ingresos proyectados para este mes son de $1.2M, un 14.2% más que el mes pasado. El modelo de IA tiene un 98.4% de confianza en este pronóstico.",
                "forecast": "El pronóstico de ingresos muestra un crecimiento constante. Se espera alcanzar los $1.2M al final del mes con un 98.4% de confianza.",
                "inventory": "Los niveles de inventario actuales son óptimos. Sin embargo, Guardian detectó una desviación del 15% en merma de copra en el Lote-992, sugiriendo posibles problemas mecánicos.",
                "production": "La eficiencia de producción está al 87%. He detectado una oportunidad de optimización en el área de pelado que podría mejorar el rendimiento en un 12%.",
                "anomaly": "La Capa Guardian ha detectado 1 anomalía crítica: 15% de desviación en merma de copra en el Lote-992. Acción recomendada: inspeccionar prensa #4.",
                "default": "Estoy analizando tu solicitud. Basado en los patrones de datos actuales, recomiendo enfocarse en la optimización logística y la gestión de inventarios para maximizar el impacto esta semana.",
            };

            const lowerQuery = query.toLowerCase();
            let response = mockResponses.default;

            for (const [key, value] of Object.entries(mockResponses)) {
                if (lowerQuery.includes(key)) {
                    response = value;
                    break;
                }
            }

            res.json({
                query,
                response,
                confidence: 0.95,
                suggestions: [
                    "Ver analítica detallada",
                    "Revisar alertas Guardian",
                    "Optimizar flujo de producción",
                ],
            });
        } catch (error) {
            console.error("AI query error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get Guardian status
    app.get("/api/ai/guardian/status", async (req: Request, res: Response) => {
        try {
            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const config = await db.query.aiConfigurations.findFirst({
                where: eq(aiConfigurations.organizationId, organizationId),
            });

            if (!config) {
                return res.status(404).json({ message: "AI configuration not found" });
            }

            // Get recent anomalies
            const recentAnomalies = await db.query.aiInsights.findMany({
                where: and(
                    eq(aiInsights.organizationId, organizationId),
                    eq(aiInsights.type, "anomaly")
                ),
                orderBy: [desc(aiInsights.createdAt)],
                limit: 5,
            });

            res.json({
                enabled: config.guardianEnabled,
                sensitivity: config.guardianSensitivity,
                status: "active",
                recentAnomalies: recentAnomalies.length,
                lastScan: new Date().toISOString(),
            });
        } catch (error) {
            console.error("Guardian status error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Update AI configuration
    app.post("/api/ai/config", async (req: Request, res: Response) => {
        try {
            const organizationId = await getOrgIdFromRequest(req);
            if (!organizationId) return res.status(401).json({ message: "Unauthorized" });

            const { guardianEnabled, guardianSensitivity, copilotEnabled, adaptiveUiEnabled } = req.body;

            const config = await db.query.aiConfigurations.findFirst({
                where: eq(aiConfigurations.organizationId, organizationId),
            });

            if (!config) {
                return res.status(404).json({ message: "AI configuration not found" });
            }

            const updates: any = { updatedAt: new Date() };
            if (guardianEnabled !== undefined) updates.guardianEnabled = guardianEnabled;
            if (guardianSensitivity !== undefined) updates.guardianSensitivity = guardianSensitivity;
            if (copilotEnabled !== undefined) updates.copilotEnabled = copilotEnabled;
            if (adaptiveUiEnabled !== undefined) updates.adaptiveUiEnabled = adaptiveUiEnabled;

            await db.update(aiConfigurations)
                .set(updates)
                .where(eq(aiConfigurations.id, config.id));

            res.json({ message: "AI configuration updated successfully" });
        } catch (error) {
            console.error("Update AI config error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}

