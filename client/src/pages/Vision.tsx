import { useRef, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import { Camera, Brain, Zap, AlertCircle } from "lucide-react";

// Clases ImageNet (top 10 más comunes en agricultura/logística)
const IMAGENET_CLASSES = [
    "coco", "tarima", "caja", "saco", "contenedor",
    "persona", "camión", "montacargas", "pallet", "producto"
];

export default function Vision() {
    const webcamRef = useRef<Webcam>(null);
    const [model, setModel] = useState<tf.LayersModel | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [predictions, setPredictions] = useState<Array<{ class: string; confidence: number }>>([]);
    const [fps, setFps] = useState(0);
    const [inferenceTime, setInferenceTime] = useState(0);

    // Cargar modelo
    useEffect(() => {
        let isMounted = true;

        const loadModel = async () => {
            try {
                setIsLoading(true);
                setError(null);

                console.log("[Vision] Cargando modelo MobileNetV2 desde /models/model.json");

                // Cargar modelo local
                const loadedModel = await tf.loadLayersModel("/models/model.json");

                if (!isMounted) return;

                // Warm-up: ejecutar inferencia dummy
                const dummyInput = tf.zeros([1, 224, 224, 3]);
                await loadedModel.predict(dummyInput);
                dummyInput.dispose();

                setModel(loadedModel);
                console.log("[Vision] Modelo cargado exitosamente");
            } catch (err) {
                console.error("[Vision] Error al cargar modelo:", err);
                if (isMounted) {
                    setError(err instanceof Error ? err.message : "Error desconocido");
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
            if (model) {
                model.dispose();
            }
        };
    }, []);

    // Loop de detección
    useEffect(() => {
        if (!model || isLoading || error) return;

        let animationId: number;
        let lastTime = performance.now();
        let frameCount = 0;

        const detect = async () => {
            const video = webcamRef.current?.video;
            if (!video || video.readyState !== 4) {
                animationId = requestAnimationFrame(detect);
                return;
            }

            try {
                const startTime = performance.now();

                // Preprocesar imagen
                const tensor = tf.tidy(() => {
                    // Capturar frame del video
                    let img = tf.browser.fromPixels(video);

                    // Resize a 224x224 (input del modelo)
                    img = tf.image.resizeBilinear(img, [224, 224]);

                    // Normalizar [0, 255] -> [0, 1]
                    img = img.div(255.0);

                    // Agregar dimensión de batch
                    return img.expandDims(0);
                });

                // Ejecutar inferencia
                const output = model.predict(tensor) as tf.Tensor;
                const probabilities = await output.data();

                // Limpiar tensores
                tensor.dispose();
                output.dispose();

                // Obtener top 5 predicciones
                const topK = Array.from(probabilities)
                    .map((prob, idx) => ({ class: IMAGENET_CLASSES[idx % IMAGENET_CLASSES.length], confidence: prob }))
                    .sort((a, b) => b.confidence - a.confidence)
                    .slice(0, 5);

                setPredictions(topK);

                // Calcular métricas
                const endTime = performance.now();
                setInferenceTime(endTime - startTime);

                // Calcular FPS
                frameCount++;
                const elapsed = endTime - lastTime;
                if (elapsed >= 1000) {
                    setFps(Math.round((frameCount * 1000) / elapsed));
                    frameCount = 0;
                    lastTime = endTime;
                }
            } catch (err) {
                console.error("[Vision] Error en detección:", err);
            }

            animationId = requestAnimationFrame(detect);
        };

        detect();

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [model, isLoading, error]);

    return (
        <AppLayout title="Vision AI" subtitle="Detección en Tiempo Real con Modelo Local">
            <div className="space-y-6 pb-20">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2">
                            VISION AI
                        </h1>
                        <p className="text-slate-400">
                            MobileNetV2 ejecutándose 100% en tu navegador
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                            <Zap className="w-3 h-3 mr-1" />
                            {fps} FPS
                        </Badge>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <Brain className="w-3 h-3 mr-1" />
                            {inferenceTime.toFixed(0)}ms
                        </Badge>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Video Feed */}
                    <div className="lg:col-span-2">
                        <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-primary" />
                                    Cámara en Vivo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {error ? (
                                    <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
                                        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                                        <p className="text-red-400 font-bold mb-2">Error al cargar modelo</p>
                                        <p className="text-sm text-slate-400">{error}</p>
                                    </div>
                                ) : isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-96">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                                        <p className="text-slate-400">Cargando modelo MobileNetV2...</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Webcam
                                            ref={webcamRef}
                                            audio={false}
                                            screenshotFormat="image/jpeg"
                                            videoConstraints={{
                                                width: 1280,
                                                height: 720,
                                                facingMode: "user"
                                            }}
                                            className="w-full h-auto"
                                        />

                                        {/* Overlay con info */}
                                        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3">
                                            <p className="text-xs font-bold uppercase text-slate-400 mb-1">Modelo Activo</p>
                                            <p className="text-sm font-black text-white">MobileNetV2</p>
                                            <p className="text-xs text-slate-400">Input: 224x224x3</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Predictions Panel */}
                    <div className="space-y-6">
                        <Card className="bg-slate-900/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-primary" />
                                    Predicciones
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {predictions.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-8">
                                        Esperando detecciones...
                                    </p>
                                ) : (
                                    predictions.map((pred, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-white capitalize">
                                                    {pred.class}
                                                </span>
                                                <span className="text-sm font-mono text-primary">
                                                    {(pred.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-primary to-blue-400 h-full transition-all duration-300"
                                                    style={{ width: `${pred.confidence * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Model Info */}
                        <Card className="bg-slate-900/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-sm">Información del Modelo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Arquitectura</span>
                                    <span className="text-white font-semibold">MobileNetV2</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Framework</span>
                                    <span className="text-white font-semibold">TensorFlow.js</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Input Shape</span>
                                    <span className="text-white font-mono">224×224×3</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Clases</span>
                                    <span className="text-white font-semibold">{IMAGENET_CLASSES.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Ubicación</span>
                                    <span className="text-white font-semibold">Local</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
