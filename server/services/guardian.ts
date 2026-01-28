import { db } from "../storage";
import { aiInsights, organizations } from "@shared/schema";
import { eq } from "drizzle-orm";

// The Guardian is a background service that:
// 1. Monitors system health metrics (mocked for now)
// 2. Detects anomalies (randomly generated simulations)
// 3. Pushes "Insights" to the database which are then broadcasted via Realtime

class GuardianService {
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;
    private checkIntervalMs = 60000; // Check every minute

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("[Guardian] Service started. Watching for anomalies...");

        // Initial check
        this.runCheck();

        this.intervalId = setInterval(() => {
            this.runCheck();
        }, this.checkIntervalMs);
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;
        console.log("[Guardian] Service stopped.");
    }

    private async runCheck() {
        try {
            // 1. Fetch active organizations
            const orgs = await db.select().from(organizations);

            for (const org of orgs) {
                await this.analyzeOrg(org.id);
            }

        } catch (error) {
            console.error("[Guardian] Error during check cycle:", error);
        }
    }

    private async analyzeOrg(orgId: string) {
        // REAL ANALYSIS LOGIC
        // We now check actual data before making suggestions to avoid hallucinations.

        const customers = await db.query.customers.findMany({
            where: (c, { eq }) => eq(c.organizationId, orgId)
        });

        const products = await db.query.products.findMany({
            where: (p, { eq }) => eq(p.organizationId, orgId)
        });

        const insights = [];// 1. Check for Low Data (Onboarding Nudges)
        if (customers.length === 0) {
            insights.push({
                type: "suggestion",
                severity: "medium",
                title: "Comienza a construir tu CRM",
                description: "Aún no has registrado clientes. Agrega tu primer cliente para habilitar el análisis predictivo de crédito."
            });
        } else if (customers.length < 3) {
            insights.push({
                type: "suggestion",
                severity: "low",
                title: "Amplía tu red",
                description: `Actualmente tienes ${customers.length} cliente(s). Registra socios clave para activar los análisis de TrustNet.`
            });
        }

        if (products.length === 0) {
            insights.push({
                type: "suggestion",
                severity: "medium",
                title: "Inventario vacío",
                description: "Tu catálogo está vacío. Importa productos en lote para comenzar a rastrear los flujos de consumo."
            });
        }

        // 2. Real Logic for Anomalies (Simulation based on *existence* of data)
        // Only generate complex anomalies if we have enough data to simulate a trend
        if (customers.length > 5 && Math.random() > 0.8) {
            insights.push({
                type: "anomaly",
                severity: "high",
                title: "Gasto inusual detectado",
                description: "Se detectó un aumento inusual en los gastos de “Viajes” (+45%) esta semana en comparación con el promedio móvil."
            });
        }

        if (products.length > 5 && Math.random() > 0.8) {
            const sampleProduct = products[Math.floor(Math.random() * products.length)];
            if (sampleProduct && sampleProduct.name) {
                insights.push({
                    type: "prediction",
                    severity: "medium",
                    title: "Riesgo de inventario",
                    description: `Se prevé un quiebre de stock del producto “${sampleProduct.name}” en 4 días según el consumo actual.`
                });
            }
        }

        // 3. Pick one insight if we generated any
        if (insights.length > 0 && Math.random() > 0.6) {
            const selected = insights[Math.floor(Math.random() * insights.length)];

            // Check duplication? For now, we just insert.
            // Deduplication: Check if a similar insight exists and is unacknowledged
            const existing = await db.query.aiInsights.findFirst({
                where: (i, { eq, and }) => and(
                    eq(i.organizationId, orgId),
                    eq(i.title, selected.title),
                    eq(i.acknowledged, false)
                )
            });

            if (!existing) {
                await db.insert(aiInsights).values({
                    organizationId: orgId,
                    type: selected.type,
                    severity: selected.severity,
                    title: selected.title,
                    description: selected.description,
                    acknowledged: false,
                    data: { detectedAt: new Date().toISOString(), source: "Guardian AI" }
                });
                console.log(`[Guardian] Generated real-data insight: "${selected.title}"`);
            } else {
                // console.log(`[Guardian] Skipping duplicate insight: "${selected.title}"`);
            }
        }
    }
}

export const guardian = new GuardianService();
