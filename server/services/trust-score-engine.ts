import { db } from "../storage";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import {
    trustMetrics,
    trustScoreHistory,
    trustAuditLogs,
    TRUST_SCORE_WEIGHTS,
    type MetricType,
    type InsertTrustMetric
} from "../../shared/modules/trustnet/schema";
import { trustParticipants } from "../../shared/schema";
import { sales, purchases } from "../../shared/modules/commerce/schema";

/**
 * Trust Score Calculation Engine
 * 
 * Calculates Trust Scores based on verified operational metrics from ERP data.
 * Formula: TrustScore = Σ(MetricWeight × MetricScore × VerificationMultiplier)
 */
export class TrustScoreEngine {

    /**
     * Calculate and update Trust Score for an organization
     * This is the main entry point for score calculation
     */
    async calculateTrustScore(orgId: string): Promise<{
        score: number;
        breakdown: Record<string, number>;
        status: string;
    }> {
        // 1. Collect metrics from ERP data
        await this.collectMetricsFromERP(orgId);

        // 2. Get the latest metrics for each type
        const metrics = await this.getLatestMetrics(orgId);

        // 3. Calculate weighted score
        const breakdown: Record<string, number> = {};
        let totalScore = 0;

        for (const [metricType, weight] of Object.entries(TRUST_SCORE_WEIGHTS)) {
            const metric = metrics.find(m => m.metricType === metricType);
            const value = metric?.value ?? 50; // Default to 50% if no data
            breakdown[metricType] = value;

            // Invert dispute_rate (lower is better)
            const effectiveValue = metricType === 'dispute_rate' ? (100 - value) : value;
            totalScore += effectiveValue * weight;
        }

        // 4. Apply multipliers and constraints
        const score = Math.min(1000, Math.max(0, Math.round(totalScore * 10)));

        // 5. Determine status based on score
        const status = this.getStatusFromScore(score);

        // 6. Store in history
        await db.insert(trustScoreHistory).values({
            organizationId: orgId,
            score,
            breakdown,
        });

        // 7. Update trust_participants
        await db.update(trustParticipants).set({
            trustScore: score,
            status,
            lastActiveAt: new Date(),
        }).where(eq(trustParticipants.organizationId, orgId));

        // 8. Log audit
        await this.logAudit(orgId, 'score_calculated', 'score', undefined, { score, breakdown });

        return { score, breakdown, status };
    }

    /**
     * Get status label based on trust score
     */
    private getStatusFromScore(score: number): string {
        if (score >= 800) return 'guardian';
        if (score >= 500) return 'verified';
        if (score >= 300) return 'active';
        if (score >= 100) return 'emerging';
        return 'review_required';
    }

    /**
     * Collect operational metrics from ERP tables
     * Analyzes sales, purchases, and other operational data
     */
    async collectMetricsFromERP(orgId: string): Promise<void> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Payment Compliance - % of payments made on time (from purchases)
        const paymentMetric = await this.calculatePaymentCompliance(orgId, thirtyDaysAgo, now);
        if (paymentMetric) {
            await this.upsertMetric(orgId, 'payment_compliance', paymentMetric.value, thirtyDaysAgo, now, paymentMetric.count);
        }

        // Delivery Timeliness - % of orders delivered on time (from sales)
        const deliveryMetric = await this.calculateDeliveryTimeliness(orgId, thirtyDaysAgo, now);
        if (deliveryMetric) {
            await this.upsertMetric(orgId, 'delivery_timeliness', deliveryMetric.value, thirtyDaysAgo, now, deliveryMetric.count);
        }

        // Order Fulfillment - % of orders completed successfully
        const fulfillmentMetric = await this.calculateOrderFulfillment(orgId, thirtyDaysAgo, now);
        if (fulfillmentMetric) {
            await this.upsertMetric(orgId, 'order_fulfillment', fulfillmentMetric.value, thirtyDaysAgo, now, fulfillmentMetric.count);
        }

        // Dispute Rate - % of transactions with disputes (lower is better)
        const disputeMetric = await this.calculateDisputeRate(orgId, thirtyDaysAgo, now);
        if (disputeMetric) {
            await this.upsertMetric(orgId, 'dispute_rate', disputeMetric.value, thirtyDaysAgo, now, disputeMetric.count);
        }
    }

    /**
     * Calculate payment compliance from purchases
     * Measures how reliably the organization pays its suppliers
     */
    private async calculatePaymentCompliance(
        orgId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<{ value: number; count: number } | null> {
        const purchaseData = await db.select({
            total: sql<number>`count(*)`,
            paid: sql<number>`count(*) filter (where payment_status = 'paid')`
        })
            .from(purchases)
            .where(and(
                eq(purchases.organizationId, orgId),
                gte(purchases.date, periodStart),
                lte(purchases.date, periodEnd)
            ));

        const result = purchaseData[0];
        if (!result || result.total === 0) return null;

        return {
            value: Math.round((result.paid / result.total) * 100),
            count: result.total
        };
    }

    /**
     * Calculate delivery timeliness from sales
     * Measures how reliably the organization delivers orders on time
     */
    private async calculateDeliveryTimeliness(
        orgId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<{ value: number; count: number } | null> {
        const salesData = await db.select({
            total: sql<number>`count(*)`,
            delivered: sql<number>`count(*) filter (where delivery_status = 'delivered')`
        })
            .from(sales)
            .where(and(
                eq(sales.organizationId, orgId),
                gte(sales.date, periodStart),
                lte(sales.date, periodEnd)
            ));

        const result = salesData[0];
        if (!result || result.total === 0) return null;

        return {
            value: Math.round((result.delivered / result.total) * 100),
            count: result.total
        };
    }

    /**
     * Calculate order fulfillment rate
     * Measures complete/successful order rate vs cancelled/returned
     */
    private async calculateOrderFulfillment(
        orgId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<{ value: number; count: number } | null> {
        const salesData = await db.select({
            total: sql<number>`count(*)`,
            fulfilled: sql<number>`count(*) filter (where payment_status = 'paid' and delivery_status = 'delivered')`
        })
            .from(sales)
            .where(and(
                eq(sales.organizationId, orgId),
                gte(sales.date, periodStart),
                lte(sales.date, periodEnd)
            ));

        const result = salesData[0];
        if (!result || result.total === 0) return null;

        return {
            value: Math.round((result.fulfilled / result.total) * 100),
            count: result.total
        };
    }

    /**
     * Calculate dispute rate
     * Measures percentage of transactions that resulted in disputes/refunds
     */
    private async calculateDisputeRate(
        orgId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<{ value: number; count: number } | null> {
        const salesData = await db.select({
            total: sql<number>`count(*)`,
            disputed: sql<number>`count(*) filter (where payment_status = 'refunded' or delivery_status = 'returned')`
        })
            .from(sales)
            .where(and(
                eq(sales.organizationId, orgId),
                gte(sales.date, periodStart),
                lte(sales.date, periodEnd)
            ));

        const result = salesData[0];
        if (!result || result.total === 0) return null;

        return {
            value: Math.round((result.disputed / result.total) * 100),
            count: result.total
        };
    }

    /**
     * Upsert a metric for an organization
     */
    private async upsertMetric(
        orgId: string,
        metricType: MetricType,
        value: number,
        periodStart: Date,
        periodEnd: Date,
        sourceCount: number
    ): Promise<void> {
        await db.insert(trustMetrics).values({
            organizationId: orgId,
            metricType,
            value,
            periodStart,
            periodEnd,
            sourceCount,
            isVerified: true, // Auto-verified from ERP data
        });
    }

    /**
     * Get latest metrics for each type
     */
    async getLatestMetrics(orgId: string) {
        // Get the most recent metric for each type
        const metrics = await db.select()
            .from(trustMetrics)
            .where(eq(trustMetrics.organizationId, orgId))
            .orderBy(desc(trustMetrics.createdAt))
            .limit(20);

        // De-duplicate by metric type, keeping most recent
        const latest = new Map<string, typeof metrics[0]>();
        for (const metric of metrics) {
            if (!latest.has(metric.metricType)) {
                latest.set(metric.metricType, metric);
            }
        }

        return Array.from(latest.values());
    }

    /**
     * Get score breakdown for display
     */
    async getScoreBreakdown(orgId: string): Promise<{
        score: number;
        status: string;
        breakdown: Record<string, { value: number; weight: number; contribution: number }>;
        lastCalculated: Date | null;
    }> {
        // Get latest score from history
        const [latestScore] = await db.select()
            .from(trustScoreHistory)
            .where(eq(trustScoreHistory.organizationId, orgId))
            .orderBy(desc(trustScoreHistory.calculatedAt))
            .limit(1);

        // Get participant status
        const [participant] = await db.select()
            .from(trustParticipants)
            .where(eq(trustParticipants.organizationId, orgId));

        const breakdown: Record<string, { value: number; weight: number; contribution: number }> = {};
        const rawBreakdown = (latestScore?.breakdown as Record<string, number>) || {};

        for (const [key, weight] of Object.entries(TRUST_SCORE_WEIGHTS)) {
            const value = rawBreakdown[key] ?? 50;
            const effectiveValue = key === 'dispute_rate' ? (100 - value) : value;
            breakdown[key] = {
                value,
                weight: weight * 100,
                contribution: Math.round(effectiveValue * weight * 10)
            };
        }

        return {
            score: latestScore?.score ?? 0,
            status: participant?.status ?? 'observation',
            breakdown,
            lastCalculated: latestScore?.calculatedAt ?? null
        };
    }

    /**
     * Log an audit event
     */
    private async logAudit(
        orgId: string,
        action: string,
        entityType: string,
        entityId?: string,
        newValue?: any,
        oldValue?: any
    ): Promise<void> {
        await db.insert(trustAuditLogs).values({
            organizationId: orgId,
            action,
            entityType,
            entityId,
            oldValue,
            newValue,
        });
    }
}

export const trustScoreEngine = new TrustScoreEngine();
