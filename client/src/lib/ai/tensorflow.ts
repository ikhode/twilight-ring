import * as tf from '@tensorflow/tfjs';

/**
 * Motor de predicciones basado en TensorFlow.js
 * Proporciona capacidades de forecasting y detección de patrones en el cliente.
 */
export class TensorFlowEngine {
    private static instance: TensorFlowEngine;
    private isModelLoaded: boolean = false;

    private constructor() { }

    public static getInstance(): TensorFlowEngine {
        if (!TensorFlowEngine.instance) {
            TensorFlowEngine.instance = new TensorFlowEngine();
        }
        return TensorFlowEngine.instance;
    }

    /**
     * Inicializa el motor de IA
     */
    public async initialize(): Promise<void> {
        console.log('[AI] Inicializando TensorFlow.js...');
        await tf.ready();
        console.log('[AI] TensorFlow.js listo.');
        this.isModelLoaded = true;
    }

    /**
     * Predice ventas futuras basadas en datos históricos
     * @param history Secuencia de valores históricos (ej. ventas por día)
     * @param daysToPredict Cuántos días predecir a futuro
     */
    public async predictSales(history: number[], daysToPredict: number = 7): Promise<number[]> {
        if (history.length < 5) return new Array(daysToPredict).fill(0);

        // Simulación simple con regresión lineal para demostración
        // En un caso real, cargaríamos un modelo pre-entrenado o usaríamos LSTM
        const xs = tf.tensor1d(history.map((_, i) => i));
        const ys = tf.tensor1d(history);

        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

        await model.fit(xs, ys, { epochs: 100, verbose: 0 });

        const futureIndices = history.map((_, i) => i + history.length).slice(0, daysToPredict);
        if (futureIndices.length === 0) {
            for (let i = 0; i < daysToPredict; i++) futureIndices.push(history.length + i);
        }

        const prediction = model.predict(tf.tensor1d(futureIndices)) as tf.Tensor;
        const data = await prediction.data();

        // Limpieza de tensores
        xs.dispose();
        ys.dispose();
        model.dispose();
        prediction.dispose();

        return Array.from(data).map(v => Math.max(0, v));
    }

    /**
     * Analiza una serie de tiempo para detectar anomalías
     */
    public async detectAnomalies(data: number[]): Promise<number[]> {
        if (data.length < 10) return [];

        const mean = data.reduce((a, b) => a + b) / data.length;
        const stdDev = Math.sqrt(data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / data.length);

        const threshold = 2.5; // Z-score threshold
        const anomalies: number[] = [];

        data.forEach((val, idx) => {
            const zScore = Math.abs((val - mean) / stdDev);
            if (zScore > threshold) {
                anomalies.push(idx);
            }
        });

        return anomalies;
    }
}

export const aiEngine = TensorFlowEngine.getInstance();
