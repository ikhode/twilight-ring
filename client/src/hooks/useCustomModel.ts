import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

interface CustomModelConfig {
    modelPath: string;
    labels: string[];
    inputSize: number;
    scoreThreshold?: number;
}

interface Detection {
    bbox: [number, number, number, number]; // [x, y, width, height]
    class: string;
    score: number;
}

/**
 * Hook para cargar y usar modelos TensorFlow.js personalizados
 * Soporta modelos entrenados localmente para detección de objetos específicos del negocio
 * 
 * Ejemplo de uso:
 * ```tsx
 * const { model, detect, isLoading } = useCustomModel({
 *   modelPath: '/models/coco_detector/model.json',
 *   labels: ['coco', 'tarima', 'saco', 'caja'],
 *   inputSize: 320
 * });
 * ```
 */
export function useCustomModel(config: CustomModelConfig) {
    const [model, setModel] = useState<tf.GraphModel | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const {
        modelPath,
        labels,
        inputSize,
        scoreThreshold = 0.5
    } = config;

    // Cargar modelo
    useEffect(() => {
        let isMounted = true;

        const loadModel = async () => {
            try {
                setIsLoading(true);
                setError(null);

                console.log(`[CustomModel] Cargando modelo desde: ${modelPath}`);

                // Cargar modelo TensorFlow.js
                const loadedModel = await tf.loadGraphModel(modelPath);

                if (!isMounted) return;

                // Warm-up: ejecutar una inferencia dummy para optimizar
                const dummyInput = tf.zeros([1, inputSize, inputSize, 3]);
                await loadedModel.executeAsync(dummyInput);
                dummyInput.dispose();

                setModel(loadedModel);
                console.log(`[CustomModel] Modelo cargado exitosamente. Labels: ${labels.join(', ')}`);
            } catch (err) {
                console.error('[CustomModel] Error al cargar modelo:', err);
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Error desconocido');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadModel();

        return () => {
            isMounted = false;
            // Limpiar modelo al desmontar
            if (model) {
                model.dispose();
            }
        };
    }, [modelPath]);

    /**
     * Ejecutar detección en una imagen o video
     * @param input HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
     * @returns Array de detecciones
     */
    const detect = async (
        input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
    ): Promise<Detection[]> => {
        if (!model) {
            console.warn('[CustomModel] Modelo no cargado aún');
            return [];
        }

        return tf.tidy(() => {
            // Preprocesar imagen
            let img = tf.browser.fromPixels(input);

            // Resize a tamaño de entrada del modelo
            img = tf.image.resizeBilinear(img, [inputSize, inputSize]);

            // Normalizar [0, 255] -> [0, 1]
            img = img.div(255.0);

            // Agregar dimensión de batch
            const batched = img.expandDims(0);

            // Ejecutar inferencia
            const predictions = model.execute(batched) as tf.Tensor;

            // Procesar salidas del modelo
            // Formato esperado: [batch, num_detections, 6] donde 6 = [x, y, w, h, class_id, score]
            const detectionData = predictions.dataSync();
            const numDetections = predictions.shape[1];

            const detections: Detection[] = [];

            for (let i = 0; i < numDetections; i++) {
                const offset = i * 6;
                const score = detectionData[offset + 5];

                if (score >= scoreThreshold) {
                    const classId = Math.round(detectionData[offset + 4]);
                    const className = labels[classId] || `clase_${classId}`;

                    // Coordenadas normalizadas [0, 1]
                    const x = detectionData[offset + 0];
                    const y = detectionData[offset + 1];
                    const w = detectionData[offset + 2];
                    const h = detectionData[offset + 3];

                    // Convertir a coordenadas de píxeles
                    const imgWidth = input.width || (input as HTMLVideoElement).videoWidth;
                    const imgHeight = input.height || (input as HTMLVideoElement).videoHeight;

                    detections.push({
                        bbox: [
                            x * imgWidth,
                            y * imgHeight,
                            w * imgWidth,
                            h * imgHeight
                        ],
                        class: className,
                        score
                    });
                }
            }

            return detections;
        });
    };

    return {
        model,
        detect,
        isLoading,
        error,
        labels
    };
}

/**
 * Configuraciones predefinidas para modelos de negocio comunes
 */
export const MODEL_CONFIGS = {
    // Modelo para detección de productos agrícolas (cocos, tarimas, sacos)
    agriculture: {
        modelPath: '/models/agriculture/model.json',
        labels: ['coco', 'coco_verde', 'coco_seco', 'tarima', 'saco', 'caja_carton'],
        inputSize: 320,
        scoreThreshold: 0.6
    },

    // Modelo para detección de inventario en almacén
    warehouse: {
        modelPath: '/models/warehouse/model.json',
        labels: ['pallet', 'caja', 'contenedor', 'montacargas', 'estante'],
        inputSize: 416,
        scoreThreshold: 0.5
    },

    // Modelo para detección de EPP (Equipo de Protección Personal)
    safety: {
        modelPath: '/models/safety/model.json',
        labels: ['casco', 'chaleco', 'guantes', 'botas', 'lentes'],
        inputSize: 224,
        scoreThreshold: 0.7
    },

    // Modelo para detección de vehículos en patio
    fleet: {
        modelPath: '/models/fleet/model.json',
        labels: ['camion', 'trailer', 'pickup', 'auto', 'moto'],
        inputSize: 320,
        scoreThreshold: 0.6
    }
} as const;
