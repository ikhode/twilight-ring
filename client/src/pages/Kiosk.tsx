import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    ScanFace,
    Briefcase,
    Coffee,
    Utensils,
    LogOut,
    RefreshCw,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface Employee {
    id: string;
    name: string;
    role: string;
    currentArea?: string;
    currentStatus?: string;
    faceEmbedding?: number[];
}

export default function Kiosk() {
    const webcamRef = useRef<Webcam>(null);
    const modelsLoadedRef = useRef(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isScanning, setIsScanning] = useState(true); // Auto-scan by default
    const [identifiedUser, setIdentifiedUser] = useState<Employee | null>(null);
    const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
    const { toast } = useToast();

    // Debug / Enrollment State
    const [debugMode, setDebugMode] = useState(false);
    const [lastDescriptor, setLastDescriptor] = useState<number[] | null>(null);

    // Load Models
    useEffect(() => {
        const loadModels = async () => {
            // Prevent double loading in React Strict Mode
            if (modelsLoadedRef.current) return;
            modelsLoadedRef.current = true;

            const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setIsModelLoaded(true);
            } catch (err) {
                console.error("Failed to load face-api models", err);
                modelsLoadedRef.current = false;
                toast({ title: "Error", description: "No se pudieron cargar los modelos de IA facial.", variant: "destructive" });
            }
        };
        loadModels();
    }, []);

    // Fetch Employees for Enrollment Debug
    const { data: employees } = useQuery({
        queryKey: ["/api/hr/employees"],
        queryFn: async () => {
            const res = await fetch("/api/hr/employees");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: debugMode // Only fetch when needed
    });

    // Action Mutation
    const actionMutation = useMutation({
        mutationFn: async (payload: { employeeId: string, action: string, area?: string }) => {
            const res = await fetch("/api/kiosks/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Action failed");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Registro Exitoso", description: "Tu estado ha sido actualizado." });
            setIdentifiedUser(null);
            setIsScanning(true);
            setScanStatus("idle");
        }
    });

    // Enroll Mutation
    const enrollMutation = useMutation({
        mutationFn: async (payload: { employeeId: string, descriptor: number[] }) => {
            const res = await fetch("/api/kiosks/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Enroll failed");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Enrolamiento Completado", description: "Rostro vinculado al empleado." });
            setScanStatus("idle");
            setIdentifiedUser(null);
            setLastDescriptor(null);
        }
    });

    // Face Detection Logic
    const captureAndIdentify = useCallback(async () => {
        if (!webcamRef.current || !isModelLoaded || !isScanning) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        try {
            const img = await faceapi.fetchImage(imageSrc);
            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

            if (detection) {
                setScanStatus("scanning");
                const descriptor = Array.from(detection.descriptor);
                setLastDescriptor(descriptor); // Save for enrollment

                const res = await fetch("/api/kiosks/identify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ descriptor })
                });

                if (res.ok) {
                    const user = await res.json();
                    setIdentifiedUser(user);
                    setIsScanning(false);
                    setScanStatus("success");
                } else {
                    setScanStatus("error");
                    setTimeout(() => {
                        // Only reset if we are NOT in debug mode trying to enroll
                        // If debug mode is on, stick to error state so user can click enroll
                        // actually, we should probably let it reset but show the UI persistently if 'lastDescriptor' exists?
                        // For simplicity: reset after 2s
                        if (!debugMode) setScanStatus("idle");
                    }, 2000);
                }
            }
        } catch (e) {
            console.error(e);
            setScanStatus("error");
        }
    }, [isModelLoaded, isScanning, debugMode]);

    // Scan Interval
    useEffect(() => {
        const interval = setInterval(() => {
            // Pause scanning if we found an unknown face and we are in debug mode to allow interaction
            if (debugMode && scanStatus === "error" && lastDescriptor) return;

            captureAndIdentify();
        }, 1000);
        return () => clearInterval(interval);
    }, [captureAndIdentify, debugMode, scanStatus, lastDescriptor]);

    const handleAction = (action: string, area?: string) => {
        if (!identifiedUser) return;
        actionMutation.mutate({
            employeeId: identifiedUser.id,
            action,
            area
        });
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Debug Toggle (Bottom Right) */}
            <div className="absolute bottom-4 right-4 z-50">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn("text-xs opacity-50 hover:opacity-100", debugMode ? "text-green-500 font-bold opacity-100" : "text-slate-700")}
                    onClick={() => setDebugMode(!debugMode)}
                >
                    {debugMode ? "Debug Mode ON" : "v.1.0"}
                </Button>
            </div>

            {/* Background Ambient Effect */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black"></div>

            <div className="z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

                {/* Left: Camera Feed */}
                <div className="relative">
                    <div className={cn(
                        "relative rounded-2xl overflow-hidden border-4 shadow-[0_0_50px_-12px_rgba(79,70,229,0.5)] transition-all duration-500",
                        scanStatus === "success" && "border-green-500 shadow-[0_0_50px_-12px_rgba(34,197,94,0.5)]",
                        scanStatus === "error" && "border-red-500 shadow-[0_0_50px_-12px_rgba(239,68,68,0.5)]",
                        scanStatus === "scanning" && "border-indigo-500",
                        scanStatus === "idle" && "border-slate-800"
                    )}>
                        {isModelLoaded ? (
                            <Webcam
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="w-full aspect-square object-cover"
                                videoConstraints={{ facingMode: "user" }}
                            />
                        ) : (
                            <div className="w-full aspect-square flex items-center justify-center bg-slate-900">
                                <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
                                <p className="mt-4 text-sm text-slate-400">Cargando modelos cognitivos...</p>
                            </div>
                        )}

                        {/* Overlay Scanner Line */}
                        {isScanning && isModelLoaded && scanStatus !== "error" && (
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent w-full h-2 animate-[scan_2s_ease-in-out_infinite]" />
                        )}

                        {/* Error Overlay */}
                        {scanStatus === "error" && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-[2px]">
                                <p className="text-red-500 font-bold text-xl tracking-widest uppercase">No Reconocido</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 text-center">
                        <h2 className="text-2xl font-display font-bold tracking-tight">Kiosco Cognitivo</h2>
                        <p className="text-slate-400 text-sm mt-1">Acércate para identificarte</p>
                    </div>
                </div>

                {/* Right: Contextual Dashboard */}
                <div className="min-h-[400px] flex items-center w-full">
                    {!identifiedUser ? (
                        <div className="w-full space-y-6">
                            <div className="text-center space-y-4 opacity-50">
                                <ScanFace className="w-24 h-24 mx-auto text-slate-700" />
                                <p className="text-xl text-slate-600 font-light">
                                    {scanStatus === "error" ? "Rostro no reconocido" : "Esperando identidad..."}
                                </p>
                            </div>

                            {/* Debug Enrollment UI */}
                            {debugMode && scanStatus === "error" && lastDescriptor && (
                                <Card className="bg-slate-900/90 border-slate-700 animate-in fade-in slide-in-from-bottom-5 w-full">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-indigo-400 font-bold uppercase">Modo Enrolamiento</p>
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setScanStatus("idle")}>Reintentar</Button>
                                        </div>
                                        <p className="text-sm text-slate-300">Este rostro es desconocido. ¿Vincular a un empleado?</p>
                                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {employees?.map((emp: any) => (
                                                <Button
                                                    key={emp.id}
                                                    variant="outline"
                                                    className="text-xs justify-start border-slate-700 hover:bg-slate-800"
                                                    onClick={() => enrollMutation.mutate({ employeeId: emp.id, descriptor: lastDescriptor })}
                                                >
                                                    {emp.name}
                                                </Button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ) : (
                        <Card className="w-full bg-slate-900/50 border-slate-800 backdrop-blur-xl animate-in fade-in slide-in-from-right-10 duration-500">
                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-2xl">
                                        {identifiedUser.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white max-w-[200px] truncate">{identifiedUser.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
                                                {identifiedUser.role}
                                            </Badge>
                                            <span className="text-xs text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">
                                                {identifiedUser.currentArea || "Sin Área"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-2">Acciones Disponibles</p>

                                    {identifiedUser.currentStatus === 'offline' ? (
                                        <Button
                                            size="lg"
                                            className="w-full bg-green-600 hover:bg-green-700 text-lg h-16 gap-3 shadow-lg shadow-green-900/20"
                                            onClick={() => handleAction("check_in", "General")}
                                        >
                                            <Zap className="w-6 h-6" />
                                            Iniciar Jornada
                                        </Button>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button variant="outline" className="h-24 border-slate-700 hover:bg-slate-800 hover:border-indigo-500/50 flex-col gap-2"
                                                    onClick={() => handleAction("switch_area", "Producción")}
                                                >
                                                    <Briefcase className="w-8 h-8 text-indigo-400" />
                                                    <span>Producción</span>
                                                </Button>
                                                <Button variant="outline" className="h-24 border-slate-700 hover:bg-slate-800 hover:border-purple-500/50 flex-col gap-2"
                                                    onClick={() => handleAction("switch_area", "Empaquetado")}
                                                >
                                                    <Briefcase className="w-8 h-8 text-purple-400" />
                                                    <span>Empaquetado</span>
                                                </Button>
                                                <Button variant="outline" className="h-24 border-slate-700 hover:bg-slate-800 hover:border-yellow-500/50 flex-col gap-2"
                                                    onClick={() => handleAction("break")}
                                                >
                                                    <Coffee className="w-8 h-8 text-yellow-400" />
                                                    <span>Descanso</span>
                                                </Button>
                                                <Button variant="outline" className="h-24 border-slate-700 hover:bg-slate-800 hover:border-orange-500/50 flex-col gap-2"
                                                    onClick={() => handleAction("break", "comedor")}
                                                >
                                                    <Utensils className="w-8 h-8 text-orange-400" />
                                                    <span>Comer</span>
                                                </Button>
                                            </div>

                                            <Button
                                                variant="destructive"
                                                size="lg"
                                                className="w-full mt-4 bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-900/50"
                                                onClick={() => handleAction("check_out")}
                                            >
                                                <LogOut className="w-5 h-5 mr-2" />
                                                Finalizar Jornada
                                            </Button>
                                        </>
                                    )}
                                </div>

                                <Button variant="ghost" className="w-full text-slate-500 text-xs hover:text-white" onClick={() => {
                                    setIdentifiedUser(null);
                                    setIsScanning(true);
                                }}>
                                    Cancelar / Escanear otro
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
