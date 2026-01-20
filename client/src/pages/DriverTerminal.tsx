import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Navigation, MapPin, CheckCircle, Camera, Truck, User, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Cognitive UI Components
const PulseDot = ({ color = "bg-primary" }: { color?: string }) => (
    <div className="relative flex h-3 w-3">
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", color)}></span>
        <span className={cn("relative inline-flex rounded-full h-3 w-3", color)}></span>
    </div>
);

export default function DriverTerminal() {
    const { session } = useAuth();
    const [location, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State
    const [view, setView] = useState<"auth" | "dashboard" | "route" | "pod">("auth");
    const [activeStop, setActiveStop] = useState<any>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Driver Identity & Device
    const [driverIdentity, setDriverIdentity] = useState<any>(null);
    const [authStatus, setAuthStatus] = useState<"loading" | "linked" | "unlinked" | "error">("loading");

    // 1. Initialize & Check Auth
    useEffect(() => {
        const checkAuth = async () => {
            // Check for Token in URL (Binding Mode)
            const searchParams = new URLSearchParams(window.location.search);
            const token = searchParams.get("token");

            let deviceId = localStorage.getItem("driver_device_id");

            if (token) {
                // Binding Flow
                if (!deviceId) {
                    deviceId = crypto.randomUUID();
                    localStorage.setItem("driver_device_id", deviceId);
                }

                try {
                    const res = await fetch("/api/kiosks/driver/link/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, deviceId })
                    });

                    if (!res.ok) throw new Error("Link falido o expirado");

                    const data = await res.json();
                    setDriverIdentity({ ...data.driver, vehicle: data.vehicle, terminal: data.terminal });
                    setAuthStatus("linked");
                    setView("dashboard");

                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    toast({ title: "Dispositivo Vinculado", description: "Terminal configurada correctamente." });

                } catch (err) {
                    console.error(err);
                    setAuthStatus("error");
                    toast({ title: "Error de Vinculación", description: "El enlace no es válido.", variant: "destructive" });
                }

            } else if (deviceId) {
                // Session Flow
                try {
                    const res = await fetch(`/api/kiosks/driver/session/${deviceId}`);
                    if (!res.ok) throw new Error("Session invalid");

                    const data = await res.json();
                    setDriverIdentity({ ...data.driver, vehicle: data.vehicle, terminal: data.terminal });
                    setAuthStatus("linked");
                    setView("dashboard");

                } catch (err) {
                    setAuthStatus("unlinked");
                }
            } else {
                setAuthStatus("unlinked");
            }
        };

        checkAuth();
    }, []);

    // Get Active Route (Real)
    const { data: activeRoute, isLoading: isLoadingRoute } = useQuery({
        queryKey: ["/api/operations/fleet/routes/driver", driverIdentity?.id],
        queryFn: async () => {
            // In real app, we likely use the terminal ID or driver ID from the verified session
            // but for now let's assume the mutation uses the session context or we pass the ID.
            // We can use the endpoint we made earlier, but we need the ID.
            if (!driverIdentity?.id) return null;

            const res = await fetch(`/api/operations/fleet/routes/driver/${driverIdentity.id}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!driverIdentity?.id
    });

    const completeStopMutation = useMutation({
        mutationFn: async ({ stopId, signature }: { stopId: string, signature: string }) => {
            await fetch(`/api/operations/fleet/routes/stops/${stopId}/complete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Note: We might need a special headers for kiosk auth if no user session
                    // For now assuming the driver is also a user or we use the device ID in headers?
                    // Let's rely on standard Auth if the driver is logged in? 
                    // OR, effectively, this endpoint should be open to the device if validated.
                    // IMPORTANT: In a PWA, the "User" session might not exist same as the "Admin" session.
                    // We should probably pass the device-id header for validation middleware.
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    signature,
                    lat: 19.4326,
                    lng: -99.1332 // Mock GPS: To be replaced with simulator or real navigator
                })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/operations/fleet/routes/driver"] });
            setView("route");
            setActiveStop(null);
            setSignature(null);
            toast({ title: "Entrega Completada", description: "La prueba de entrega se ha subido correctamente." });
        }
    });

    // Canvas Logic for Signature
    useEffect(() => {
        if (view === "pod" && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#000";

                let painting = false;

                const startPosition = () => { painting = true; };
                const finishedPosition = () => { painting = false; ctx.beginPath(); };
                const draw = (e: any) => {
                    if (!painting) return;
                    const rect = canvas.getBoundingClientRect();
                    const x = (e.clientX || e.touches[0].clientX) - rect.left;
                    const y = (e.clientY || e.touches[0].clientY) - rect.top;
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                };

                canvas.addEventListener("mousedown", startPosition);
                canvas.addEventListener("mouseup", finishedPosition);
                canvas.addEventListener("mousemove", draw);
                canvas.addEventListener("touchstart", startPosition);
                canvas.addEventListener("touchend", finishedPosition);
                canvas.addEventListener("touchmove", draw);
            }
        }
    }, [view]);

    // Render Loading / Unlinked
    if (authStatus === "loading") {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8" /></div>;
    }

    if (authStatus === "unlinked" || authStatus === "error") {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 space-y-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                    <Shield className="w-24 h-24 text-red-500 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Terminal Bloqueada</h1>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto">
                        Este dispositivo no está vinculado. Solicita un enlace de activación a tu supervisor de Logística.
                    </p>
                </div>
                {authStatus === 'error' && <Badge variant="destructive">Enlace Inválido</Badge>}
            </div>
        );
    }

    // Render Auth (Face Simulator) - REMOVED / SKIPPED since we are "linked"

    // Render Dashboard (No Route)
    if (view === "dashboard" && !activeRoute) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center text-center space-y-6">
                <div className="p-6 rounded-full bg-slate-900 border border-slate-800 animate-pulse">
                    <Truck className="w-12 h-12 text-blue-500" />
                </div>
                <div>
                    <Badge className="mb-4 bg-blue-500/10 text-blue-500 border-blue-500/20">
                        {driverIdentity?.vehicle?.plate || "Vehículo Asignado"}
                    </Badge>
                    <h2 className="text-xl font-bold">Hola, {driverIdentity?.name?.split(' ')[0]}</h2>
                    <p className="text-slate-400 text-sm mt-2">Esperando asignación de ruta...</p>
                </div>
                <Button onClick={() => window.location.reload()} variant="outline">
                    Sincronizar
                </Button>
            </div>
        );
    }

    // Render Route View
    if (view === "dashboard" || view === "route") {
        if (isLoadingRoute) return <div className="h-screen flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin" /></div>;

        const stops = activeRoute?.stops || [];
        const completedStops = stops.filter((s: any) => s.status === 'completed').length;
        const totalStops = stops.length;
        const progress = (completedStops / totalStops) * 100;

        return (
            <div className="min-h-screen bg-black text-white pb-20">
                {/* Header */}
                <div className="bg-slate-900 border-b border-slate-800 p-6 sticky top-0 z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Ruta Activa</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <PulseDot color="bg-green-500" />
                                <span className="text-xs font-mono text-green-500">EN LINEA • {driverIdentity?.vehicle?.plate}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black">{completedStops}/{totalStops}</span>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {/* Stops List */}
                <div className="p-4 space-y-4">
                    {stops.map((stop: any, index: number) => {
                        const isNext = stop.status === 'pending' && (index === 0 || stops[index - 1].status === 'completed');
                        return (
                            <Card
                                key={stop.id}
                                className={cn(
                                    "border-0 transition-all",
                                    isNext ? "bg-primary/10 border border-primary/50 shadow-[0_0_30px_rgba(79,70,229,0.15)]" : "bg-slate-900/50 border border-slate-800 opacity-60"
                                )}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                            stop.status === 'completed' ? "bg-green-500 text-black" : (isNext ? "bg-primary text-white" : "bg-slate-800 text-slate-400")
                                        )}>
                                            {stop.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-lg leading-none mb-2">{stop.address}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <MapPin className="w-3 h-3" />
                                                <span>{stop.status === 'completed' ? 'Entregado a las 10:42 AM' : 'Pendiente de entrega'}</span>
                                            </div>

                                            {isNext && (
                                                <div className="mt-6 grid grid-cols-2 gap-3">
                                                    <Button className="w-full bg-slate-800 hover:bg-slate-700" size="lg">
                                                        <Navigation className="w-4 h-4 mr-2" />
                                                        GPS
                                                    </Button>
                                                    <Button
                                                        className="w-full font-bold"
                                                        size="lg"
                                                        onClick={() => {
                                                            setActiveStop(stop);
                                                            setView("pod");
                                                        }}
                                                    >
                                                        ENTREGAR
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Render POD (Proof of Delivery)
    if (view === "pod" && activeStop) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
                <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
                    <Button variant="ghost" onClick={() => setView("route")}>Cancelar</Button>
                    <h3 className="font-bold">Confirmar Entrega</h3>
                    <div className="w-10"></div>
                </div>

                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div className="bg-white p-4 rounded-xl shadow-sm border space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400">Dirección</label>
                        <p className="font-medium text-lg">{activeStop.address}</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase text-slate-400">Firma del Cliente</label>
                            <Button variant="ghost" size="sm" onClick={() => {
                                const ctx = canvasRef.current?.getContext("2d");
                                if (ctx) ctx.clearRect(0, 0, 300, 150);
                            }} className="text-xs text-red-500">Borrar</Button>
                        </div>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50 touch-none">
                            <canvas
                                ref={canvasRef}
                                width={320}
                                height={200}
                                className="w-full h-[200px]"
                            />
                        </div>
                    </div>

                    <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20"
                        onClick={() => {
                            const canvas = canvasRef.current;
                            const dataUrl = canvas?.toDataURL();
                            completeStopMutation.mutate({ stopId: activeStop.id, signature: dataUrl! });
                        }}
                    >
                        CONFIRMAR ENTREGA
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
