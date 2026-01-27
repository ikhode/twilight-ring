import * as tf from '@tensorflow/tfjs';

// Force WebGL backend for GPU acceleration
tf.setBackend('webgl').catch(() => {
    console.warn('[AI] WebGL backend not available, falling back to CPU');
});

/**
 * Motor de predicciones basado en TensorFlow.js con optimizaciones de memoria.
 * Usa WebGL para aceleración GPU y gestiona recursos de forma eficiente.
 */
export class TensorFlowEngine {
    private static instance: TensorFlowEngine;
    private isInitialized = false;
    private cachedModel: tf.Sequential | null = null;

    private constructor() { }

    /**
     * Obtiene la instancia singleton del motor.
     * @returns La instancia única de TensorFlowEngine
     */
    public static getInstance(): TensorFlowEngine {
        if (!TensorFlowEngine.instance) {
            TensorFlowEngine.instance = new TensorFlowEngine();
        }
        return TensorFlowEngine.instance;
    }

    /**
     * Inicializa el motor de IA con backend WebGL.
     * @returns Promise que resuelve cuando la inicialización está completa.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log('[AI] Inicializando TensorFlow.js con WebGL...');

        await tf.ready();

        // Log backend info
        const backend = tf.getBackend();
        console.log(`[AI] TensorFlow.js listo. Backend: ${backend}`);

        // Configure memory management
        tf.engine().startScope();

        this.isInitialized = true;
    }

    /**
     * Predice ventas futuras basadas en datos históricos.
     * Usa tf.tidy() para gestión automática de memoria.
     * @param history - Secuencia de valores históricos (ej. ventas por día)
     * @param daysToPredict - Cuántos días predecir a futuro
     * @returns Array de predicciones para los próximos días.
     */
    public async predictSales(history: number[], daysToPredict = 7): Promise<number[]> {
        if (history.length < 5) {
            return new Array(daysToPredict).fill(0) as number[];
        }

        // Use tf.tidy for automatic memory cleanup
        return tf.tidy(() => {
            // Normalize data for better training
            const max = Math.max(...history, 1);
            const normalized = history.map(v => v / max);

            const xs = tf.tensor2d(normalized.map((_, i) => [i / history.length]), [history.length, 1]);
            const ys = tf.tensor2d(normalized.map(v => [v]), [history.length, 1]);

            // Reuse cached model or create new one
            const model = this.getOrCreateModel();

            // Quick training (fewer epochs for speed)
            model.fit(xs, ys, {
                epochs: 50,
                verbose: 0,
                batchSize: Math.min(32, history.length)
            });

            // Generate predictions
            const futureIndices = Array.from({ length: daysToPredict }, (_, i) =>
                [(history.length + i) / history.length]
            );

            const prediction = model.predict(tf.tensor2d(futureIndices)) as tf.Tensor;
            const data = prediction.dataSync(); // Synchronous for use inside tidy

            // Denormalize and ensure non-negative
            return Array.from(data).map(v => Math.max(0, v * max));
        });
    }

    /**
     * Obtiene o crea un modelo para predicciones.
     * Reutiliza el modelo para evitar creaciones repetidas.
     * @returns Modelo secuencial de TensorFlow
     */
    private getOrCreateModel(): tf.Sequential {
        if (this.cachedModel) {
            return this.cachedModel;
        }

        const model = tf.sequential({
            layers: [
                tf.layers.dense({ units: 8, inputShape: [1], activation: 'relu' }),
                tf.layers.dense({ units: 4, activation: 'relu' }),
                tf.layers.dense({ units: 1 })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.1),
            loss: 'meanSquaredError'
        });

        this.cachedModel = model;
        return model;
    }

    /**
     * Analiza una serie de tiempo para detectar anomalías.
     * Usa operaciones vectorizadas para eficiencia.
     * @param data - Array de valores numéricos
     * @returns Índices de los valores anómalos.
     */
    public detectAnomalies(data: number[]): number[] {
        if (data.length < 10) return [];

        // Use tf.tidy for automatic cleanup
        return tf.tidy(() => {
            const tensor = tf.tensor1d(data);

            const mean = tensor.mean().dataSync()[0];
            const variance = tensor.sub(mean).square().mean();
            const stdDev = variance.sqrt().dataSync()[0];

            if (stdDev === 0) return [];

            const threshold = 2.5;
            const anomalies: number[] = [];

            data.forEach((val, idx) => {
                const zScore = Math.abs((val - mean) / stdDev);
                if (zScore > threshold) {
                    anomalies.push(idx);
                }
            });

            return anomalies;
        });
    }

    /**
     * Pre-calienta los modelos para respuesta instantánea.
     * Llamar una vez al inicio de la app.
     * @returns Promise que resuelve cuando el warm-up está completo.
     */
    public async warmUp(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Warm up the model with a dummy prediction
        console.log('[AI] Calentando modelos...');
        await this.predictSales([1, 2, 3, 4, 5], 1);
        console.log('[AI] Modelos listos para uso instantáneo.');
    }

    /**
     * Obtiene estadísticas de uso de memoria.
     * @returns Objeto con información de memoria de TensorFlow.
     */
    public getMemoryInfo(): tf.MemoryInfo {
        return tf.memory();
    }

    /**
     * Verifica si el motor está inicializado y listo.
     * @returns true si el motor está listo para predicciones.
     */
    public isReady(): boolean {
        return this.isInitialized && this.cachedModel !== null;
    }
}

export const aiEngine = TensorFlowEngine.getInstance();
