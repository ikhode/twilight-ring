import * as tf from '@tensorflow/tfjs';

export interface SecurityEvent {
    id: string;
    type: 'login' | 'transaction' | 'access' | 'data_export';
    timestamp: Date;
    riskScore: number; // 0-100
    details: string;
    isAnomaly: boolean;
}

class GuardianService {
    private model: tf.Sequential | null = null;
    private isTrained = false;

    constructor() {
        this.initModel();
    }

    private async initModel() {
        // Simple Autoencoder architecture
        // Input -> Encoder -> Latent Space -> Decoder -> Output
        // If Output is effectively same as Input, it's "Normal".
        // If Output is different (high reconstruction error), it's "Anomaly".

        this.model = tf.sequential();

        // Encoder
        this.model.add(tf.layers.dense({ units: 8, activation: 'relu', inputShape: [10] }));
        this.model.add(tf.layers.dense({ units: 4, activation: 'relu' }));

        // Decoder
        this.model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
        this.model.add(tf.layers.dense({ units: 10, activation: 'sigmoid' }));

        this.model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

        // Simulate training on "normal" data
        this.trainMock();
    }

    private async trainMock() {
        // Generate 100 "normal" vectors (randomized but structured)
        const normalData = tf.randomNormal([100, 10], 0.5, 0.1);

        if (this.model) {
            await this.model.fit(normalData, normalData, { epochs: 20, verbose: 0 });
            this.isTrained = true;
            console.log("Guardian AI: Autoencoder Trained on Normal Patterns.");
        }
    }

    /**
     * Analyzes an action vector to detect anomalies.
     * In a real app, this vector would come from (Time, IP Hash, Amount, Frequency, etc.)
     */
    async analyzeAction(actionVector: number[]): Promise<SecurityEvent> {
        if (!this.isTrained || !this.model) {
            return {
                id: Date.now().toString(),
                type: 'transaction',
                timestamp: new Date(),
                riskScore: 0,
                details: "Guardian initializing...",
                isAnomaly: false
            };
        }

        // Pad or trim vector to 10 dims
        const input = Array(10).fill(0);
        actionVector.slice(0, 10).forEach((v, i) => input[i] = v);

        const tensor = tf.tensor2d([input]);
        const prediction = this.model.predict(tensor) as tf.Tensor;
        const error = tf.losses.meanSquaredError(tensor, prediction);
        const mse = (await error.data())[0];

        // Threshold logic (arbitrary for demo)
        // MSE > 0.05 is suspicious
        const riskScore = Math.min(100, Math.round(mse * 1000));
        const isAnomaly = riskScore > 50;

        tensor.dispose();
        prediction.dispose();
        error.dispose();

        return {
            id: Date.now().toString(),
            type: 'transaction',
            timestamp: new Date(),
            riskScore,
            details: isAnomaly
                ? `Anomalía detectada (Error reconstrucción: ${mse.toFixed(4)})`
                : "Patrón verificado como seguro.",
            isAnomaly
        };
    }
}

export const guardianService = new GuardianService();
