import { db } from "../storage";
import { trustProfiles, trustMetrics, trustScoreHistory, benchmarkData, TRUST_SCORE_WEIGHTS, TrustMetricName, type TrustMetric } from "../../shared/modules/trustnet/schema";
import { organizations } from "../../shared/core/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import * as tf from "@tensorflow/tfjs";

/**
 * TrustEngine - Cognitive Reputation & Risk Motor
 * 
 * Logic based on "PLAN DE IMPLEMENTACIÓN: TrustNet"
 * Formula: TRUST_SCORE = Σ(metric_value × metric_weight) × adjustments
 */
export class TrustEngine {

    /**
     * Recalculates the Trust Score for a specific organization
     */
    static async calculateScore(organizationId: string): Promise<number> {
        // 1. Fetch latest metrics for the organization
        const latestMetrics = await db.select()
            .from(trustMetrics)
            .where(eq(trustMetrics.organizationId, organizationId));

        if (latestMetrics.length === 0) {
            return 0; // Default score if no data
        }

        // 2. Base Calculation: Weighted Sum
        let baseScore = 0;
        let totalWeightsUsed = 0;

        for (const metric of latestMetrics) {
            const weight = TRUST_SCORE_WEIGHTS[metric.metricName as TrustMetricName] || 0;
            baseScore += (metric.metricValue * weight);
            totalWeightsUsed += weight;
        }

        // Normalize if not all metrics are present
        if (totalWeightsUsed > 0) {
            baseScore = (baseScore / totalWeightsUsed);
        }

        // 3. Adjustments (Multipliers)
        const adjustments = await this.calculateAdjustments(organizationId);
        let finalScore = baseScore + adjustments;

        // Ensure bounds 0-100
        finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));

        // 4. Update Profile
        await this.updateProfile(organizationId, finalScore);

        return finalScore;
    }

    /**
     * Calculates bonus/penalty adjustments
     * - Business Age Bonus: +5% if > 2 years
     * - Verified Status Bonus: +10% if externally verified
     * - Negative Review Weight: -2% per bad review
     */
    private static async calculateAdjustments(organizationId: string): Promise<number> {
        let adjustment = 0;

        const [org] = await db.select()
            .from(organizations)
            .where(eq(organizations.id, organizationId));

        if (org && org.createdAt) {
            const yearsOld = (new Date().getTime() - new Date(org.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365);
            if (yearsOld > 2) adjustment += 5;
        }

        // TODO: Include verified status from external_verifications
        // TODO: Include negative review penalties

        return adjustment;
    }

    /**
     * Persists the new score and maintains audit history
     */
    private static async updateProfile(organizationId: string, score: number) {
        // Determine level
        let level: "bronze" | "silver" | "gold" | "platinum" = "bronze";
        if (score > 85) level = "platinum";
        else if (score > 70) level = "gold";
        else if (score > 40) level = "silver";

        // Fetch current profile to check if update is needed
        const [current] = await db.select()
            .from(trustProfiles)
            .where(eq(trustProfiles.organizationId, organizationId));

        if (current) {
            if (current.trustScore !== score) {
                // Record history
                await db.insert(trustScoreHistory).values({
                    organizationId,
                    previousScore: current.trustScore,
                    newScore: score,
                    reason: "Automated daily recalculation",
                    metricsUsed: {} // TODO: Snapshot metrics
                });

                // Update profile
                await db.update(trustProfiles)
                    .set({
                        trustScore: score,
                        trustLevel: level,
                        lastScoreUpdate: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(trustProfiles.organizationId, organizationId));
            }
        } else {
            // Create profile
            await db.insert(trustProfiles).values({
                organizationId,
                trustScore: score,
                trustLevel: level,
                verificationStatus: "unverified"
            });
        }
    }

    /**
     * Cognitive Predictor: Probability of Default (TensorFlow.js)
     */
    static async predictDefaultRisk(organizationId: string): Promise<number> {
        // Simplified cognitive model (placeholder for full MLP implementation)
        // In a real scenario, we'd load a pre-trained model and pass the feature tensor
        const metrics = await db.select()
            .from(trustMetrics)
            .where(eq(trustMetrics.organizationId, organizationId));

        if (metrics.length < 3) return 0.5; // Unknown risk

        const paymentCompliance = metrics.find((m: TrustMetric) => m.metricName === 'payment_punctuality')?.metricValue || 50;
        const salesVolume = metrics.find((m: TrustMetric) => m.metricName === 'sales_volume')?.metricValue || 50;

        // Simple tensor computation example
        const input = tf.tensor2d([[paymentCompliance / 100, salesVolume / 100]]);
        const weights = tf.tensor2d([[-0.6], [-0.2]]); // Higher compliance/sales = lower risk
        const bias = tf.tensor1d([0.8]);

        const risk = input.matMul(weights).add(bias).sigmoid();
        const riskValue = (await risk.data())[0];

        return Math.round(riskValue * 100);
    }
}
