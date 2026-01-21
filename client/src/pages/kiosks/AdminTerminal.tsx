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
    Loader2
} from "lucide-react";
import { KioskSession } from "@/types/kiosk";
import { useLocation } from "wouter";
import * as faceapi from 'face-api.js';

interface AdminTerminalProps {
    sessionContext: KioskSession;
    onLogout: () => void;
}

export default function AdminTerminal({ sessionContext, onLogout }: AdminTerminalProps) {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [formData, setFormData] = useState({ name: "", email: "", role: "operator" });
    const [isCapturing, setIsCapturing] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
    const [detectionStatus, setDetectionStatus] = useState<"none" | "detecting" | "valid">("none");

    // Quick Links
    const links = [
        { title: "Dashboard Financiero", icon: LayoutDashboard, href: "/finance" },
        { title: "Gestión de Personal", icon: UserPlus, href: "/hr" },
        { title: "Inventario", icon: LayoutDashboard, href: "/logistics" },
    ];

    // 1. Load Models on Mount
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
                toast({ title: "Error", description: "No se pudieron cargar los modelos de IA.", variant: "destructive" });
            }
        };
        loadModels();
    }, []);

    // 2. Detection Loop
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
        if (!modelsLoaded) {
            toast({ title: "Cargando Modelos", description: "Espere un momento..." });
            return;
        }
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            setIsCapturing(true);
        } catch (e) {
            toast({ title: "Error", description: "No se pudo acceder a la cámara", variant: "destructive" });
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
            if (!faceDescriptor) throw new Error("No face detected");

            // Convert Float32Array to standard array for JSON serialization
            const descriptorArray = Array.from(faceDescriptor);

            const res = await fetch("/api/hr/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    // Sending the descriptor as 'faceEmbedding' - backend must handle vector casting
                    faceEmbedding: descriptorArray
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to register");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Empleado Registrado", description: "Biometría facial vinculada correctamente.", className: "bg-green-500 text-white" });
            setFormData({ name: "", email: "", role: "operator" });
            stopCamera();
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });


    return (
        <div className="h-full flex flex-col gap-6 p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Terminal Administrativa</h1>
                    <p className="text-slate-400">Gestión y Altas</p>
                </div>
                <Button variant="outline" size="icon" onClick={onLogout}>
                    <LogOut className="w-4 h-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Quick Actions */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle>Accesos Rápidos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {links.map((link, i) => (
                            <Button
                                key={i}
                                variant="ghost"
                                className="w-full justify-between h-14 bg-slate-950/30 hover:bg-primary/10 border border-slate-800 hover:border-primary/30"
                                onClick={() => setLocation(link.href)}
                            >
                                <span className="flex items-center gap-3">
                                    <link.icon className="w-5 h-5 text-slate-400" />
                                    {link.title}
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            </Button>
                        ))}
                    </CardContent>
                </Card>

                {/* Enrollment Form */}
                <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Alta de Empleado con Face ID
                        </CardTitle>
                        <CardDescription>
                            {modelsLoaded ? "Sistema Biométrico Listo" : "Cargando Modelos de IA..."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nombre Completo</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. María González"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email (Opcional)</Label>
                                <Input
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="contacto@ejemplo.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Rol</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="operator">Operador General</option>
                                    <option value="driver">Conductor</option>
                                    <option value="cashier">Cajero</option>
                                    <option value="manager">Supervisor</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label>Biometría Facial</Label>
                            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center">
                                {!isCapturing ? (
                                    <div className="text-center">
                                        <ScanFace className="w-16 h-16 text-slate-600 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">Cámara Inactiva</p>
                                    </div>
                                ) : (
                                    <>
                                        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />

                                        {/* Overlay for Face Status */}
                                        <div className={`absolute inset-0 border-4 transition-colors duration-500 rounded-lg pointer-events-none 
                                            ${detectionStatus === 'valid' ? 'border-green-500/50' : 'border-yellow-500/20'}`} />

                                        {detectionStatus === 'detecting' && (
                                            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded animate-pulse">
                                                Buscando rostro...
                                            </div>
                                        )}
                                        {detectionStatus === 'valid' && (
                                            <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded font-bold">
                                                Rostro Detectado
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {!isCapturing ? (
                                <Button className="w-full" variant="secondary" onClick={startCamera} disabled={!modelsLoaded}>
                                    {modelsLoaded ? (
                                        <>
                                            <Camera className="w-4 h-4 mr-2" />
                                            Activar Cámara
                                        </>
                                    ) : (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Cargando Modelos...
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    className="w-full"
                                    onClick={() => enrollMutation.mutate()}
                                    disabled={enrollMutation.isPending || detectionStatus !== 'valid'}
                                    variant={detectionStatus === 'valid' ? "default" : "secondary"}
                                >
                                    {enrollMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Guardando Biometría...
                                        </>
                                    ) : (
                                        "Capturar y Registrar"
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
