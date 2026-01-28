import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
    UserPlus,
    ScanFace,
    LayoutDashboard,
    LogOut,
    ChevronRight,
    Camera,
    Loader2,
    Shield,
    History,
    Users,
    Package,
    ArrowLeft
} from "lucide-react";
import { KioskSession } from "@/types/kiosk";
import { useLocation } from "wouter";
import * as faceapi from 'face-api.js';
import { cn } from "@/lib/utils";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { useQueryClient } from "@tanstack/react-query";

interface AdminTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

export default function AdminTerminal({ sessionContext, onLogout }: AdminTerminalProps) {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [formData, setFormData] = useState({ name: "", email: "", role: "operator" });
    const [isCapturing, setIsCapturing] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
    const [detectionStatus, setDetectionStatus] = useState<"none" | "detecting" | "valid">("none");
    const queryClient = useQueryClient();

    // Realtime Invalidation
    useRealtimeSubscription({
        table: 'employees',
        queryKeyToInvalidate: ['/api/hr/employees']
    });

    const links = [
        { title: "Dashboard Financiero", icon: LayoutDashboard, href: "/finance", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { title: "Gestión de Personal", icon: Users, href: "/hr", color: "text-blue-500", bg: "bg-blue-500/10" },
        { title: "Inventario y Flota", icon: Package, href: "/logistics", color: "text-orange-500", bg: "bg-orange-500/10" },
    ];

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (err) {
                console.error("Failed to load face models", err);
                toast({ title: "Error de IA", description: "No se pudieron cargar los modelos biométricos.", variant: "destructive" });
            }
        };
        loadModels();
    }, []);

    useEffect(() => {
        if (!isCapturing || !videoRef.current || !modelsLoaded) return;

        const interval = setInterval(async () => {
            if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
                const detection = await faceapi.detectSingleFace(videoRef.current)
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    setDetectionStatus("valid");
                    setFaceDescriptor(detection.descriptor);
                } else {
                    setDetectionStatus("detecting");
                    setFaceDescriptor(null);
                }
            }
        }, 500);

        return () => clearInterval(interval);
    }, [isCapturing, modelsLoaded]);

    const startCamera = async () => {
        if (!modelsLoaded) return;
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            setIsCapturing(true);
        } catch (e) {
            toast({ title: "Acceso Denegado", description: "Verifique los permisos de cámara.", variant: "destructive" });
        }
    };

    const stopCamera = () => {
        stream?.getTracks().forEach(t => t.stop());
        setStream(null);
        setIsCapturing(false);
        setFaceDescriptor(null);
        setDetectionStatus("none");
    };

    const enrollMutation = useMutation({
        mutationFn: async () => {
            if (!faceDescriptor) throw new Error("Rostro no detectado");
            const descriptorArray = Array.from(faceDescriptor);
            const res = await fetch("/api/hr/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    faceEmbedding: descriptorArray
                })
            });
            if (!res.ok) throw new Error("Fallo en el servidor");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Alta Exitosa", description: `${formData.name} ya cuenta con FaceID activo.` });
            setFormData({ name: "", email: "", role: "operator" });
            stopCamera();
        },
        onError: (err: any) => {
            toast({ title: "Error de Registro", description: err.message, variant: "destructive" });
        }
    });

    return (
        <div className="h-[100vh] w-full bg-[#050505] text-white selection:bg-primary/30 p-4 md:p-8 flex flex-col gap-6 overflow-hidden">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[22px] bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                            Central <span className="text-slate-500">Administrativa</span>
                        </h1>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-indigo-500/20 text-indigo-400 bg-indigo-500/5 uppercase text-[9px] font-black tracking-widest px-2 py-0.5">
                                AUTH_LEVEL_7: SUPERVISOR
                            </Badge>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">ENRROLAMIENTO BIOMÉTRICO</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onLogout}
                        className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 hover:bg-red-500/20 hover:text-red-500 transition-all"
                    >
                        <LogOut className="w-6 h-6" />
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8 flex-1 min-h-0 overflow-hidden">
                {/* Left Panel: Quick Links */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    <Card className="bg-white/[0.02] border-white/5 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                        <CardHeader className="p-10 pb-6 border-b border-white/5">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-3">
                                <LayoutDashboard className="w-4 h-4 text-primary" /> ACCEDER AL SISTEMA
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-4">
                            {links.map((link, i) => (
                                <button
                                    key={i}
                                    onClick={() => setLocation(link.href)}
                                    className="w-full group flex items-center justify-between p-6 rounded-[30px] bg-white/[0.02] border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all duration-500"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500", link.bg)}>
                                            <link.icon className={cn("w-7 h-7", link.color)} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-black text-lg text-white uppercase italic tracking-tight group-hover:text-primary transition-colors">{link.title}</h3>
                                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">SISTEMA INTEGRAL</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-800 group-hover:text-primary group-hover:translate-x-2 transition-all" />
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="flex-1 bg-primary/5 border-primary/20 p-10 rounded-[40px] relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield className="w-64 h-64 -rotate-12" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-end">
                            <h4 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">Núcleo de <br /><span className="text-primary italic">Seguridad</span></h4>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Identificación de confianza habilitada mediante reconocimiento de patrones neuronales.</p>
                        </div>
                    </Card>
                </div>

                {/* Main Content: Enrollment */}
                <Card className="col-span-12 lg:col-span-8 bg-white/[0.02] border-white/5 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                    <CardHeader className="p-10 pb-4 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-black italic tracking-tighter uppercase mb-1">Registro de Nuevo <span className="text-primary italic">Colaborador</span></CardTitle>
                                <CardDescription className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Integración biométrica con motor cognitivo</CardDescription>
                            </div>
                            {isCapturing && (
                                <Button variant="ghost" onClick={stopCamera} className="text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10">
                                    CANCELAR CAPTURA
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-10 flex flex-col gap-10 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Form Section */}
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">DATOS DE IDENTIFICACIÓN</Label>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Input
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="NOMBRE COMPLETO"
                                                className="h-16 bg-black/40 border-white/10 rounded-[20px] px-8 font-bold text-lg focus:border-primary transition-all uppercase placeholder:opacity-20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Input
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="CORREO ELECTRÓNICO ELECTRÓNICO (OPCIONAL)"
                                                className="h-16 bg-black/40 border-white/10 rounded-[20px] px-8 font-bold text-lg focus:border-primary transition-all uppercase placeholder:opacity-20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <select
                                                className="flex h-16 w-full items-center justify-between rounded-[20px] border border-white/10 bg-black/40 px-8 py-2 text-lg font-bold ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 appearance-none uppercase transition-all"
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            >
                                                <option value="operator">PERSONAL OPERATIVO</option>
                                                <option value="driver">CONDUCTOR LOGÍSTICO</option>
                                                <option value="cashier">CAJERO / POS</option>
                                                <option value="manager">SUPERVISOR DE ÁREA</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 rounded-[30px] bg-primary/5 border border-primary/20 space-y-4">
                                    <h5 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <History className="w-4 h-4" /> REQUISITOS DE CAPTURA
                                    </h5>
                                    <ul className="space-y-2">
                                        {["ILUMINACIÓN FRONTAL ADECUADA", "SIN ACCESORIOS (LENTES, GORRAS)", "POSICIÓN FRONTAL AL SENSOR"].map((req, i) => (
                                            <li key={i} className="text-[9px] text-slate-400 font-bold flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-primary" /> {req}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Camera Section */}
                            <div className="space-y-6">
                                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">SENSOR BIOMÉTRICO</Label>
                                <div className="relative aspect-[4/3] bg-black/60 rounded-[40px] overflow-hidden border-2 border-white/10 shadow-inner group">
                                    {!isCapturing ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                                            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
                                                <ScanFace className="w-12 h-12 text-slate-700" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 italic">Sensor en Espera</p>
                                        </div>
                                    ) : (
                                        <>
                                            <video ref={videoRef} autoPlay muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />

                                            {/* AI Scanning Lines Overlay */}
                                            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[2px] bg-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan z-10" />
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent animate-scan-slow" />

                                            {/* Face Box Simulation */}
                                            <div className={cn(
                                                "absolute inset-16 border-2 border-dashed transition-all duration-500 rounded-[60px]",
                                                detectionStatus === 'valid' ? 'border-primary scale-105 opacity-100' : 'border-slate-800 opacity-20'
                                            )} />

                                            <div className="absolute bottom-6 inset-x-6 flex justify-center z-20">
                                                <Badge className={cn(
                                                    "px-6 py-2 font-black uppercase text-[10px] tracking-widest border-none transition-all duration-500",
                                                    detectionStatus === 'valid' ? 'bg-primary text-black scale-110 shadow-xl' : 'bg-black/60 text-slate-500'
                                                )}>
                                                    {detectionStatus === 'valid' ? 'NEXUS.ID_VERIFICADO' : 'ANALIZANDO ENTORNO...'}
                                                </Badge>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {!isCapturing ? (
                                    <Button
                                        className="h-24 w-full rounded-[30px] bg-white text-black hover:bg-slate-200 text-2xl font-black uppercase tracking-tighter italic shadow-xl transition-all active:scale-95"
                                        onClick={startCamera}
                                        disabled={!modelsLoaded}
                                    >
                                        {modelsLoaded ? (
                                            <>INICIAR ESCANEO <Camera className="w-8 h-8 ml-4" /></>
                                        ) : (
                                            <><Loader2 className="w-8 h-8 mr-4 animate-spin" /> CARGANDO IA...</>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        className="h-24 w-full rounded-[30px] bg-primary hover:bg-primary/90 text-black text-2xl font-black uppercase tracking-tighter italic shadow-2xl transition-all shadow-primary/20 active:scale-95 disabled:grayscale"
                                        onClick={() => enrollMutation.mutate()}
                                        disabled={enrollMutation.isPending || detectionStatus !== 'valid'}
                                    >
                                        {enrollMutation.isPending ? (
                                            <><Loader2 className="w-8 h-8 mr-4 animate-spin" /> GUARDANDO VÍNCULO...</>
                                        ) : (
                                            <>VINCULAR IDENTIDAD <ChevronRight className="w-8 h-8 ml-4" /></>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
