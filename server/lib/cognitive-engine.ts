
import { db } from "../storage";
import { aiInsights, employees, products, sales, terminals } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

type EventType = "production_finish" | "sale_created" | "inventory_low" | "anomaly_detected" | "employee_action" | "logistics_stop_complete" | "finance_cash_shortage";

export interface CognitiveEvent {
    orgId: string;
    type: EventType;
    data: any;
}

/**
 * Sistema Nervioso Central de la IA (Cognitive Engine)
 * Procesa eventos en tiempo real y genera insights, alertas o acciones correctivas.
 */
export class CognitiveEngine {

    static async emit(event: CognitiveEvent) {
        console.log(`[Cognitive] Processing event: ${event.type}`, event.data);

        try {
            // 2. React to specific patterns
            switch (event.type) {
                case "production_finish":
                    await this.analyzeProductionEfficiency(event);
                    break;
                case "sale_created":
                    await this.analyzeSalesTrend(event);
                    break;
                case "anomaly_detected":
                    await this.handleAnomaly(event);
                    break;
                case "logistics_stop_complete":
                    await this.analyzeLogisticsPerformance(event);
                    break;
                case "finance_cash_shortage":
                    await this.handleCashShortage(event);
                    break;
            }
        } catch (error) {
            console.error("[Cognitive] Error processing event:", error);
        }
    }

    // --- Analyzers ---

    private static async analyzeProductionEfficiency(event: CognitiveEvent) {
        const { instanceId, yields, estimatedInput } = event.data;

        // Calculate conversion rate
        if (estimatedInput > 0) {
            const efficiency = (yields / estimatedInput) * 100;

            // Insight Rule: Efficiency Drop
            if (efficiency < 85) { // Threshold should be dynamic/learned
                await this.createInsight({
                    organizationId: event.orgId,
                    type: "efficiency_alert",
                    title: "Baja Eficiencia Detectada",
                    description: `El lote ${instanceId.slice(0, 6)} tuvo una conversión del ${efficiency.toFixed(1)}%, inferior al estándar.`,
                    impact: "high",
                    confidence: 0.9,
                    metadata: { instanceId, efficiency }
                });
            }
        }
    }

    private static async analyzeSalesTrend(event: CognitiveEvent) {
        // Simple logic: Is this a high value sale?
        const { amount } = event.data;
        if (amount > 1000000) { // > $10,000 MXN
            await this.createInsight({
                organizationId: event.orgId,
                type: "sales_opportunity",
                title: "Venta Mayorista Detectada",
                description: "Se ha registrado una venta significativa. Considerar seguimiento post-venta VIP.",
                impact: "positive",
                confidence: 0.85,
                metadata: { saleId: event.data.saleId }
            });
        }
    }

    private static async handleAnomaly(event: CognitiveEvent) {
        const { reason, quantity, productId } = event.data;

        // Fetch product name for context
        // const product = ... (optimization: send name in event data)

        await this.createInsight({
            organizationId: event.orgId,
            type: "quality_risk",
            title: "Riesgo de Calidad",
            description: `Merma reportada: ${quantity} unidades. Motivo: ${reason}`,
            impact: "high",
            confidence: 0.95,
            metadata: { productId, reason }
        });
    }

    private static async analyzeLogisticsPerformance(event: CognitiveEvent) {
        const { type, amount, isPaid } = event.data;

        // Rule: High value delivery with Cash collection
        if (type === 'delivery' && isPaid && amount > 500000) { // > $5,000 MXN
            await this.createInsight({
                organizationId: event.orgId,
                type: "logistics_cash_risk",
                title: "Riesgo de Efectivo en Ruta",
                description: `Se ha recolectado un monto significativo ($${(amount / 100).toFixed(2)}) en efectivo en ruta. Considerar protocolos de seguridad.`,
                impact: "medium",
                confidence: 0.9,
                metadata: event.data
            });
        }
    }

    private static async handleCashShortage(event: CognitiveEvent) {
        const { difference, registerId } = event.data;

        await this.createInsight({
            organizationId: event.orgId,
            type: "finance_anomaly",
            title: "Faltante de Caja Detectado",
            description: `Se reportó un faltante de $${Math.abs(difference / 100).toFixed(2)} durante el arqueo de caja.`,
            impact: "high",
            confidence: 1.0,
            metadata: event.data
        });
    }

    // --- Helpers ---

    private static async createInsight(insight: {
        organizationId: string,
        type: string,
        title: string,
        description: string,
        impact: "low" | "medium" | "high" | "positive",
        confidence: number,
        metadata?: any
    }) {
        await db.insert(aiInsights).values({
            organizationId: insight.organizationId,
            type: insight.type,
            severity: insight.impact === "positive" ? "low" : insight.impact,
            title: insight.title,
            description: insight.description,
            data: {
                ...insight.metadata,
                confidence: Math.floor(insight.confidence * 100),
                impact: insight.impact
            },
            acknowledged: false,
            createdAt: new Date()
        });
        console.log(`[Cognitive] Insight generated: ${insight.title}`);
    }
}
