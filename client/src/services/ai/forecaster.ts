import * as tf from '@tensorflow/tfjs';
import { aiService } from './ai_service';

/**
 * Demand Forecaster Service
 * Uses a Time-Series LSTM/Dense model to predict future demand.
 */
class DemandForecaster {
    private model: tf.LayersModel | null = null;
    private windowSize = 7; // Look back at the last 7 days

    async trainModel(historicalData: number[]) {
        if (historicalData.length < this.windowSize + 1) {
            console.warn("[Forecaster] Insufficient data for training");
            return null;
        }

        const { normalized, min, max } = aiService.normalizeData(historicalData);
        const { X, y } = aiService.prepareTimeSeries(normalized, this.windowSize);

        // Define a simple sequential model
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [this.windowSize] }));
        model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1 }));

        model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

        // Train the model
        await model.fit(X, y, {
            epochs: 50,
            batchSize: 4,
            verbose: 0
        });

        this.model = model;
        return { min, max };
    }

    async predictNext(lastWindow: number[], scaling: { min: number, max: number }): Promise<number | null> {
        if (!this.model || lastWindow.length !== this.windowSize) return null;

        const normalizedWindow = lastWindow.map(v => (v - scaling.min) / (scaling.max - scaling.min || 1));
        const input = tf.tensor2d([normalizedWindow]);
        const prediction = this.model.predict(input) as tf.Tensor;
        const value = (await prediction.data())[0];

        return aiService.denormalizeValue(value, scaling.min, scaling.max);
    }
}

export const demandForecaster = new DemandForecaster();
