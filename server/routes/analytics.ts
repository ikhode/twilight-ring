import { Router } from "express";
import { storage } from "../storage";
import { getOrgIdFromRequest } from "../auth_util";
import { insertAnalyticsMetricSchema } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * Obtiene las métricas para el dashboard de analítica, incluyendo predicciones basadas en datos reales.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/dashboard", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const [realSales, models] = await Promise.all([
            storage.getDailySalesStats(orgId),
            storage.getMetricModels(orgId)
        ]);

        const hasEnoughData = realSales.length >= 5;

        // Transform real sales data into the expected format
        const metrics = realSales.map((s, i, arr) => {
            const avg = i > 0 ? (arr[i - 1].value + s.value) / 2 : s.value;
            return {
                id: `real-${i}`,
                organizationId: orgId,
                metricKey: "daily_revenue",
                value: s.value,
                date: s.date, // already formatted YYYY-MM-DD
                predictedValue: hasEnoughData ? Math.round(avg * 1.1) : null,
                confidence: hasEnoughData ? 85 : 0,
                tags: {}
            };
        });

        res.json({ metrics, models, hasEnoughData });
    } catch (error) {
        console.error("Analytics dashboard error:", error);
        res.status(500).json({ message: "Failed to fetch analytics dashboard" });
    }
});

/**
 * Genera una proyección de flujo de caja (Cashflow) para los próximos 30 días.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.get("/cashflow", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const days = 30;
        const now = new Date();
        const forecast = [];

        // 1. Get Historical (Mock or Real) - For now assuming linear growth for demo
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(now.getDate() + i);

            // Base amounts (cents)
            const baseIncome = 500000; // $5,000
            const baseExpense = 300000; // $3,000

            // Add variance and trend
            const trend = 1 + (i * 0.02); // 2% growth per day
            const variance = (Math.random() * 0.4) + 0.8; // +/- 20%

            forecast.push({
                date: date.toISOString().split('T')[0],
                projectedIncome: Math.round(baseIncome * trend * variance),
                projectedExpense: Math.round(baseExpense * variance),
                netCashflow: Math.round((baseIncome * trend - baseExpense) * variance)
            });
        }

        res.json(forecast);
    } catch (error) {
        console.error("Cashflow error:", error);
        res.status(500).json({ message: "Failed to fetch cashflow" });
    }
});

/**
 * Registra una nueva métrica analítica en la base de datos.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/metrics", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const parsed = insertAnalyticsMetricSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) return res.status(400).json(parsed.error);

        const metric = await storage.createAnalyticsMetric(parsed.data);
        res.json(metric);
    } catch (error) {
        console.error("Create metric error:", error);
        res.status(500).json({ message: "Failed to create metric" });
    }
});

/**
 * Inicia el entrenamiento de un modelo de métricas específico.
 * 
 * @param {import("express").Request} req - Solicitud de Express
 * @param {import("express").Response} res - Respuesta de Express
 * @returns {Promise<void>}
 */
router.post("/models/:id/train", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;
        // Verify ownership (simplified)
        const models = await storage.getMetricModels(orgId);
        if (!models.find(m => m.id === id)) return res.status(403).json({ message: "Forbidden" });

        // Simulate training start
        const updated = await storage.updateMetricModel(id, {
            status: "training",
            accuracy: Math.floor(Math.random() * 10) + 85 // Mock improvement
        });

        // Simulate training completion after 5s (async)
        setTimeout(async () => {
            await storage.updateMetricModel(id, { status: "active" });
        }, 5000);

        res.json(updated);
    } catch (error) {
        console.error("Train model error:", error);
        res.status(500).json({ message: "Failed to start training" });
    }
});

export default router;
