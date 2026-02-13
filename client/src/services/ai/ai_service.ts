import * as tf from '@tensorflow/tfjs';

/**
 * Foundational AI Service for CognitiveOS
 * Responsible for TF.js initialization, model loading, and data normalization.
 */
class AIService {
    private initialized = false;

    async initialize() {
        if (this.initialized) return;

        // Use WebGL backend for better performance if available
        await tf.ready();
        const backend = tf.getBackend();
        console.log(`[Cognitive AI] Engine Initialized using backend: ${backend}`);

        this.initialized = true;
    }

    /**
     * Normalizes a numeric array to [0, 1] range (Min-Max).
     */
    normalizeMinMax(data: number[]): { normalized: number[], min: number, max: number } {
        if (data.length === 0) return { normalized: [], min: 0, max: 0 };

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        const normalized = data.map(v => (v - min) / range);
        return { normalized, min, max };
    }

    /**
     * Z-Score Normalization (Standardization)
     * Robust against outliers. Formula: (x - mean) / std
     */
    standardize(data: number[]): { standard: number[], mean: number, std: number } {
        if (data.length === 0) return { standard: [], mean: 0, std: 0 };

        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const squareDiffs = data.map(v => Math.pow(v - mean, 2));
        const std = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / data.length) || 1;

        const standard = data.map(v => (v - mean) / std);
        return { standard, mean, std };
    }

    /**
     * Denormalizes a standard value back to its original scale.
     */
    destandardizeValue(value: number, mean: number, std: number): number {
        return value * std + mean;
    }

    /**
     * Denormalizes a min-max value back to its original scale.
     */
    denormalizeValue(value: number, min: number, max: number): number {
        return value * (max - min) + min;
    }

    /**
     * Prepares time-series data for a sliding window prediction model.
     * Takes [1, 2, 3, 4, 5] with windowSize 2 -> [[1,2], [2,3], [3,4]] and targets [3, 4, 5]
     */
    prepareTimeSeries(data: number[], windowSize: number) {
        const X: number[][] = [];
        const y: number[] = [];

        for (let i = 0; i < data.length - windowSize; i++) {
            X.push(data.slice(i, i + windowSize));
            y.push(data[i + windowSize]);
        }

        return {
            X: tf.tensor2d(X),
            y: tf.tensor1d(y)
        };
    }

    /**
     * Saves a model to IndexedDB for local persistence.
     */
    async saveModel(model: tf.LayersModel, modelName: string) {
        try {
            const savePath = `indexeddb://${modelName}`;
            await model.save(savePath);
            console.log(`[Cognitive AI] Model ${modelName} saved to IndexedDB`);
        } catch (error) {
            console.error(`[Cognitive AI] Error saving model ${modelName}:`, error);
        }
    }

    /**
     * Loads a model from IndexedDB.
     */
    async loadModel(modelName: string): Promise<tf.LayersModel | null> {
        try {
            const loadPath = `indexeddb://${modelName}`;
            const model = await tf.loadLayersModel(loadPath);
            console.log(`[Cognitive AI] Model ${modelName} loaded from IndexedDB`);
            return model;
        } catch (error) {
            console.warn(`[Cognitive AI] Model ${modelName} not found in IndexedDB or failed to load`);
            return null;
        }
    }
}

export const aiService = new AIService();
