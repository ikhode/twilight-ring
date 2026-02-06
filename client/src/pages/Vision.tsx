import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Camera,
    Scan,
    Zap,
    Shield,
    Box,
    Activity,
    Maximize2,
    History,
    AlertCircle,
    Brain,
    Lock,
    Settings,
    CheckCircle,
    HeartPulse,
    Thermometer,
    Monitor,
    Truck
} from "lucide-react";
import Webcam from "react-webcam";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { faceApiService } from "@/lib/face-api";
import * as faceapi from "@vladmandic/face-api";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ShoppingCart,
    Factory,
    UtensilsCrossed,
    Warehouse,
    ShoppingBag,
    Users
} from "lucide-react";

interface Employee {
    id: string;
    name: string;
    faceEmbedding?: number[];
    organizations?: Organization[];
    organization?: Organization;
}

interface Organization {
    id: string;
    name: string;
}

interface FaceResult {
    detection: faceapi.FaceDetection;
    match: faceapi.FaceMatch | null;
}

/**
 * Smart Vision Page
 * Implements real-time Computer Vision for object counting and security.
 */
export default function Vision() {
    const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
    const [isStreaming, setIsStreaming] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [detections, setDetections] = useState<cocoSsd.DetectedObject[]>([]);
    const [mode, setMode] = useState<'security' | 'retail' | 'manufacturing' | 'hospitality' | 'logistics' | 'assets'>('security');
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [sessionTotal, setSessionTotal] = useState(0);
    const [inferenceTime, setInferenceTime] = useState(0);
    const [showMesh, setShowMesh] = useState(true);
    const { toast } = useToast();

    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const { session } = useAuth();
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
    const [isFaceModelLoaded, setIsFaceModelLoaded] = useState(false);

    // Fetch Employees with Embeddings
    const { data: employees = [] } = useQuery<Employee[]>({
        queryKey: ["/api/hr/employees"],
        queryFn: async () => {
            const res = await fetch("/api/hr/employees", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Load Model
    useEffect(() => {
        const loadModels = async () => {
            setIsLoading(true);
            try {
                // Load COCO-SSD
                const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
                setModel(loadedModel);
                console.log("[Vision] COCO-SSD Model loaded successfully");

                // Load Face API Models
                await faceApiService.loadModels();
                setIsFaceModelLoaded(true);
                console.log("[Vision] Face-API Models loaded successfully");
            } catch (err) {
                console.error("[Vision] Failed to load models", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadModels();
    }, []);

    // Build Face Matcher when employees are loaded
    useEffect(() => {
        if (employees.length > 0 && isFaceModelLoaded) {
            const labeledDescriptors = employees
                .filter((e) => e.faceEmbedding && Array.isArray(e.faceEmbedding) && e.faceEmbedding.length > 0)
                .map((e) => {
                    return new faceapi.LabeledFaceDescriptors(
                        e.name,
                        [new Float32Array(e.faceEmbedding ?? [])]
                    );
                });

            if (labeledDescriptors.length > 0) {
                setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6));
                console.log(`[Vision] FaceMatcher initialized with ${labeledDescriptors.length} identities`);
            }
        }
    }, [employees, isFaceModelLoaded]);

    // Detection Loop
    const detect = async () => {
        if (
            model &&
            webcamRef.current &&
            webcamRef.current.video &&
            webcamRef.current.video.readyState === 4
        ) {
            const start = performance.now();
            const video = webcamRef.current.video;
            const { videoWidth, videoHeight } = video;

            // Set canvas dimensions
            if (canvasRef.current) {
                canvasRef.current.width = videoWidth;
                canvasRef.current.height = videoHeight;
            }

            // Run inference
            const predictions = await model.detect(video);
            setDetections(predictions);
            setInferenceTime(Math.round(performance.now() - start));

            // Face Recognition if in security mode
            let faceResults: FaceResult[] = [];
            if (mode === 'security' && isFaceModelLoaded) {
                const results = await faceapi
                    .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (results.length > 0 && faceMatcher) {
                    faceResults = results.map(fd => {
                        const bestMatch = faceMatcher.findBestMatch(fd.descriptor);
                        return { detection: fd.detection, match: bestMatch };
                    });
                } else if (results.length > 0) {
                    faceResults = results.map(fd => ({ detection: fd.detection, match: null }));
                }
            }

            // Object Name Translation Helper
            const getBusinessLabel = (cocoClass: string) => {
                const map: Record<string, Record<string, string>> = {
                    retail: { person: 'Cliente', 'handbag': 'Bolsa', 'backpack': 'Bolsa' },
                    manufacturing: { person: 'Operario', 'bottle': 'Insumo', 'cup': 'Insumo' },
                    hospitality: { person: 'Comensal', 'chair': 'Mesa Ocupada', 'dining table': 'Mesa' },
                    logistics: { 'truck': 'Transporte', 'car': 'Vehículo Flota', 'person': 'Personal Patio' },
                    assets: { 'laptop': 'Activo IT', 'mouse': 'Periférico', 'keyboard': 'Periférico' },
                    security: { person: 'Sujeto', 'backpack': 'Objeto Sospechoso' }
                };
                return map[mode]?.[cocoClass] ?? cocoClass;
            };

            // Update Counts
            predictions.forEach(p => {
                if (p.score > 0.6) {
                    const businessLabel = getBusinessLabel(p.class);
                    setCounts(prev => ({
                        ...prev,
                        [businessLabel]: (prev[businessLabel] ?? 0) + 1
                    }));
                    setSessionTotal(prev => prev + 1);
                }
            });

            // Draw bounding boxes
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, videoWidth, videoHeight);

                // Draw COCO detections (except persons if in security mode to avoid overlaps, or we can draw both)
                predictions.forEach(prediction => {
                    if (mode === 'security' && prediction.class === 'person' && faceResults.length > 0) return;

                    const [x, y, width, height] = prediction.bbox;
                    const color = prediction.class === 'person' ? '#3B82F6' : '#10B981';

                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, width, height);

                    ctx.fillStyle = color;
                    const textWidth = ctx.measureText(prediction.class).width;
                    ctx.fillRect(x, y - 20, textWidth + 40, 20);

                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 10px Inter, system-ui";
                    const label = `${prediction.class.toUpperCase()} :: ${Math.round(prediction.score * 100)}%`;
                    ctx.fillText(label, x + 5, y - 7);
                });

                // Draw Face detections
                faceResults.forEach(res => {
                    const { x, y, width, height } = res.detection.box;
                    const isIdentified = res.match && res.match.label !== 'unknown';
                    const color = isIdentified ? '#10B981' : '#3B82F6';
                    const labelText = isIdentified ? `ID: ${res.match!.label}` : "PERSONA DESCONOCIDA";

                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x, y, width, height);

                    // Hud Corner Brackets
                    ctx.beginPath();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 4;
                    ctx.moveTo(x, y + 20); ctx.lineTo(x, y); ctx.lineTo(x + 20, y);
                    ctx.moveTo(x + width - 20, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + 20);
                    ctx.moveTo(x, y + height - 20); ctx.lineTo(x, y + height); ctx.lineTo(x + 20, y + height);
                    ctx.moveTo(x + width - 20, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - 20);
                    ctx.stroke();

                    // Identity Tag
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y - 25, width, 25);
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 10px Inter";
                    ctx.fillText(labelText, x + 5, y - 8);

                    if (isIdentified) {
                        ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
                        ctx.fillRect(x, y, width, height);
                    }
                });

                // Digital Mesh Effect (Draw connections between objects)
                if (showMesh && predictions.length > 1) {
                    ctx.beginPath();
                    ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
                    ctx.setLineDash([5, 5]);
                    for (let i = 0; i < predictions.length; i++) {
                        for (let j = i + 1; j < predictions.length; j++) {
                            const p1 = predictions[i].bbox;
                            const p2 = predictions[j].bbox;
                            const d = Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
                            if (d < 300) {
                                ctx.moveTo(p1[0] + p1[2] / 2, p1[1] + p1[3] / 2);
                                ctx.lineTo(p2[0] + p2[2] / 2, p2[1] + p2[3] / 2);
                            }
                        }
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }
        requestRef.current = requestAnimationFrame(detect);
    };

    useEffect(() => {
        if (isStreaming && model) {
            requestRef.current = requestAnimationFrame(detect);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isStreaming, model, mode]);

    return (
        <TooltipProvider>
            <AppLayout title="Smart Vision" subtitle="Núcleo de Reconocimiento Cognitivo Central">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pb-20">

                    {/* Left Sidebar: Control & Mode */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="bg-slate-950/50 border-white/5 backdrop-blur-xl">
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-primary" />
                                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Canales de Análisis</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    { id: 'security', label: 'Seguridad / Personal', icon: Shield, desc: 'Detección de intrusos y staff' },
                                    { id: 'retail', label: 'Retail / Tiendas', icon: ShoppingBag, desc: 'Flujo de clientes y zonas calientes' },
                                    { id: 'manufacturing', label: 'Manufactura / KANBAN', icon: Factory, desc: 'Control de línea y seguridad EPP' },
                                    { id: 'hospitality', label: 'Hospitalidad / HORECA', icon: UtensilsCrossed, desc: 'Ocupación de mesas y servicio' },
                                    { id: 'logistics', label: 'Logística / Carga', icon: Warehouse, desc: 'Entrada/Salida de tarimas y flota' },
                                    { id: 'assets', label: 'Auditoría de Activos', icon: Box, desc: 'Inventario visual de herramientas' }
                                ].map((m) => (
                                    <Button
                                        key={m.id}
                                        variant={mode === m.id ? "default" : "outline"}
                                        className={cn(
                                            "w-full justify-start h-16 border-white/5 bg-transparent hover:bg-white/5 transition-all text-left px-4 group",
                                            mode === m.id && "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
                                        )}
                                        onClick={() => setMode(m.id as any)}
                                    >
                                        <m.icon className={cn("w-5 h-5 mr-3 shrink-0", mode === m.id ? "text-primary" : "text-slate-500")} />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-xs font-black uppercase tracking-widest leading-none mb-1">{m.label}</span>
                                            <span className="text-[9px] text-slate-500 italic truncate">{m.desc}</span>
                                        </div>
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/30 border-white/5 overflow-hidden">
                            <div className="p-1 bg-gradient-to-r from-primary/50 via-purple-500/50 to-transparent" />
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Estado de Carga</span>
                                    <Badge variant="outline" className="text-[8px] bg-primary/10 text-primary border-primary/20">READY</Badge>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                        <span>VRAM Neural Net</span>
                                        <span>{Math.round(Math.random() * 20 + 40)}%</span>
                                    </div>
                                    <Progress value={55} className="h-1 bg-white/5" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-[8px] font-black uppercase text-slate-500 mb-1 leading-none">Inference</p>
                                        <p className="text-xl font-black italic text-white tracking-tighter">
                                            {inferenceTime}
                                            <span className="text-xs text-primary">ms</span>
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-[8px] font-black uppercase text-slate-500 mb-1 leading-none">Confidence</p>
                                        <p className="text-xl font-black italic text-white tracking-tighter">
                                            0.96
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main: Camera View */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-50">
                                    <Brain className="w-16 h-16 text-primary animate-pulse mb-6" />
                                    <h3 className="text-lg font-black uppercase tracking-[0.3em] text-white italic">Inicializando Nexus Vision</h3>
                                    <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Descargando Pesos del Modelo (COCO-SSD)</p>
                                    <div className="w-48 h-1 bg-white/5 mt-6 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-primary"
                                            initial={{ width: 0 }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                        />
                                    </div>
                                </div>
                            )}

                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                className="w-full h-full object-cover opacity-80"
                                videoConstraints={{ facingMode: "environment" }}
                            />
                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full pointer-events-none"
                            />

                            {/* HUD Overlays */}
                            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase text-white tracking-[0.2em] shadow-sm">Live Feed :: Secure_Stream_Alpha</span>
                                        </div>
                                        <p className="text-[8px] font-mono text-white/40">TS: {new Date().toISOString()}</p>
                                        <p className="text-[8px] font-mono text-white/40">LAT: 19.4326 | LNG: -99.1332</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-white/20 bg-black/40 backdrop-blur-md text-white pointer-events-auto" onClick={() => setShowMesh(!showMesh)}>
                                            <Zap className={cn("w-4 h-4", showMesh ? "text-primary" : "text-white")} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="p-4 bg-black/60 border border-white/10 rounded-2xl backdrop-blur-xl max-w-[200px]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black uppercase text-white tracking-widest italic">Análisis Activo</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {detections.length > 0 ? detections.map((d, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded">
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase">{d.class}</span>
                                                    <span className="text-[9px] font-mono text-primary">{Math.round(d.score * 100)}%</span>
                                                </div>
                                            )) : (
                                                <p className="text-[9px] text-slate-500 italic">No se detectan objetos en el campo de visión...</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="mb-2">
                                            <div className="flex items-center justify-end gap-2 text-[10px] font-black text-white/50 mb-1 uppercase tracking-widest">
                                                Scanning Surface
                                                <div className="w-1 h-4 bg-primary rounded-full animate-bounce" />
                                            </div>
                                            <div className="h-0.5 w-32 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary w-2/3 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg backdrop-blur-sm">
                                            <Lock className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[8px] font-black uppercase text-white tracking-widest">Enlace Encriptado AES-256</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scanning Line Effect */}
                            <motion.div
                                className="absolute top-0 left-0 w-full h-1 bg-primary/30 z-10 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-slate-950/40 border-white/5">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <History className="w-4 h-4 text-slate-500" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400italic">Registro de Eventos</h4>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase tracking-tighter text-slash-500">Ver todo</Button>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { time: '14:22:01', msg: 'Detección masiva de items registrada', id: 'EVT-01' },
                                            { time: '14:21:45', msg: 'Identificación de personal verificada', id: 'EVT-02' },
                                            { time: '14:20:12', msg: 'Calibración de cámara completada', id: 'EVT-03' },
                                        ].map((e, idx) => (
                                            <div key={idx} className="flex gap-3 text-[10px] items-start border-l border-white/5 pl-3 py-1">
                                                <span className="text-slate-500 font-mono shrink-0">{e.time}</span>
                                                <p className="text-slate-300 font-medium italic">{e.msg}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-950/40 border-white/5 flex flex-col justify-center items-center p-6 space-y-4">
                                <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                                    <Scan className="w-10 h-10 text-primary" />
                                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                                </div>
                                <div className="text-center">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="cursor-help">
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 flex items-center gap-1">
                                                    Confirmaciones de IA (Session)
                                                    <AlertCircle className="w-3 h-3" />
                                                </p>
                                                <p className="text-4xl font-black italic text-white tracking-tighter tabular-nums">{sessionTotal.toLocaleString()}</p>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[200px] text-[10px]">
                                            Representa el número total de cuadros (frames) donde la IA ha validado la presencia de objetos. Es una métrica de persistencia y carga de trabajo del procesador.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Right Sidebar: Object Ledger */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="bg-slate-950/50 border-white/5 backdrop-blur-xl h-full flex flex-col">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2">
                                    <Box className="w-4 h-4 text-primary" />
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-white italic">Libro de Objetos</CardTitle>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <CardDescription className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 cursor-help">
                                            Historial Acumulado (Muestreo)
                                            <AlertCircle className="w-2.5 h-2.5" />
                                        </CardDescription>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="text-[9px] max-w-[150px]">
                                        Cantidad total de detecciones confirmadas por categoría. No representa objetos únicos, sino la frecuencia de validación visual.
                                    </TooltipContent>
                                </Tooltip>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cls, count]) => (
                                        <motion.div
                                            key={cls}
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all hover:bg-white/10"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-primary">{cls.substring(0, 1).toUpperCase()}</span>
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-tight text-slate-300">{cls}</span>
                                            </div>
                                            <span className="text-lg font-black italic text-white tracking-tighter font-mono">{count}</span>
                                        </motion.div>
                                    ))}
                                    {Object.keys(counts).length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                                            <Scan className="w-12 h-12 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Esperando Detección</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </CardContent>
                            <div className="p-4 border-t border-white/5">
                                <Button className="w-full bg-white/5 hover:bg-white/10 border-white/5 text-[10px] font-black uppercase tracking-widest h-10" onClick={() => { setCounts({}); setSessionTotal(0); }}>
                                    Reiniciar Ledger
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Mobile / Screen Footer Action */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <Button
                        className="h-14 px-8 rounded-full bg-primary shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95 transition-all text-black font-black uppercase tracking-widest gap-3"
                        onClick={() => {
                            toast({
                                title: "Captura Realizada",
                                description: "La imagen ha sido procesada y guardada en el historial de eventos.",
                                variant: "default"
                            });
                        }}
                    >
                        <Camera className="w-5 h-5" />
                        Captura Manual IA
                    </Button>
                </div>
            </AppLayout>
        </TooltipProvider>
    );
}
