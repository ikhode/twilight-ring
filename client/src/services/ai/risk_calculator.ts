import * as tf from '@tensorflow/tfjs';

/**
 * Credit Risk Calculator
 * Generates a score from 0 (High Risk) to 100 (Safe) based on customer profile.
 */
class CreditRiskCalculator {
    /**
     * Calculates risk score based on customer metrics.
     * @param balance - Current customer debt balance (in cents)
     * @param creditLimit - Total credit limit granted (in cents)
     * @param accountAgeDays - Days since the customer was created
     * @param historicalOnTimeRatio - Ratio of on-time payments (0 to 1)
     */
    async calculateScore(
        balance: number,
        creditLimit: number,
        accountAgeDays: number,
        historicalOnTimeRatio: number
    ): Promise<number> {
        return tf.tidy(() => {
            // Feature 1: Debt-to-Limit Ratio (Utilization)
            // Lower is better. 0 utilization = 1.0, 100%+ utilization = 0.0
            const utilization = Math.min(balance / (creditLimit || 1), 1.5);
            const utilizationScore = 1.0 - (utilization / 1.5);

            // Feature 2: Loyalty (Account Maturity)
            // 0 days = 0.0, 365+ days = 1.0
            const loyaltyScore = Math.min(accountAgeDays / 365, 1.0);

            // Feature 3: Payment History
            const historyScore = historicalOnTimeRatio;

            // Weighted aggregation (simulating a simple model)
            // 40% History, 40% Utilization, 20% Loyalty
            const weights = tf.tensor1d([0.4, 0.4, 0.2]);
            const features = tf.tensor1d([historyScore, utilizationScore, loyaltyScore]);

            const totalScore = features.mul(weights).sum();
            const result = totalScore.dataSync()[0];

            return Math.round(result * 100);
        });
    }

    /**
     * Gets a qualitative label and color for a score.
     */
    getRiskAssessment(score: number): { label: string, color: string, reason: string } {
        if (score >= 80) return {
            label: "Excelente",
            color: "text-emerald-500",
            reason: "Bajo nivel de deuda y excelente historial de pagos."
        };
        if (score >= 60) return {
            label: "Bueno",
            color: "text-blue-500",
            reason: "Comportamiento estable con nivel de riesgo moderado."
        };
        if (score >= 40) return {
            label: "Regular",
            color: "text-amber-500",
            reason: "Niveles de deuda elevados o historial inconsistente."
        };
        return {
            label: "Crítico",
            color: "text-destructive",
            reason: "Alta probabilidad de incumplimiento. Revisar garantías."
        };
    }
}

export const creditRiskCalculator = new CreditRiskCalculator();
