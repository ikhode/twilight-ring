import * as tf from '@tensorflow/tfjs';
import { aiService } from './ai_service';

/**
 * Anomaly Detector Service
 * Uses standard deviation and tensor statistics to detect outliers 
 * in transactional or numeric data.
 */
class AnomalyDetector {
    /**
     * Detects anomalies in a set of values (e.g., recent transactions).
     * @returns indices of anomalous values
     */
    async detectOutliers(data: number[], threshold = 2.5): Promise<number[]> {
        if (data.length < 5) return [];

        return tf.tidy(() => {
            const tensor = tf.tensor1d(data);
            const mean = tf.moments(tensor).mean;
            const variance = tf.moments(tensor).variance;
            const stdDev = tf.sqrt(variance);

            const zScores = tensor.sub(mean).div(stdDev.add(1e-6)).abs();
            const mask = zScores.greater(tf.scalar(threshold));

            // Get indices where zScore > threshold
            const anomalousIndices: number[] = [];
            const maskData = mask.dataSync();
            maskData.forEach((isAnomalous, index) => {
                if (isAnomalous) anomalousIndices.push(index);
            });

            return anomalousIndices;
        });
    }

    /**
     * Checks if a single new value is anomalous compared to a baseline.
     */
    async isAnomaly(newValue: number, baseline: number[], threshold = 2.5): Promise<boolean> {
        const baselineMean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
        const baselineStdDev = Math.sqrt(baseline.map(x => Math.pow(x - baselineMean, 2)).reduce((a, b) => a + b, 0) / baseline.length);

        const zScore = Math.abs((newValue - baselineMean) / (baselineStdDev || 1));
        return zScore > threshold;
    }
}

export const anomalyDetector = new AnomalyDetector();
