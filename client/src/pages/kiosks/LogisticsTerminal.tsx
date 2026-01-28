import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    Navigation,
    MapPin,
    Truck,
    LogOut,
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    Wifi,
    Map
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KioskSession } from "@/types/kiosk";
import { getKioskHeaders } from "@/lib/kiosk-auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime";

const PulseDot = ({ color = "bg-primary" }: { color?: string }) => (
    <div className="relative flex h-3 w-3">
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", color)}></span>
        <span className={cn("relative inline-flex rounded-full h-3 w-3", color)}></span>
    </div>
);

export default function LogisticsTerminal({ sessionContext, onLogout }: { sessionContext: KioskSession, onLogout: () => void }) {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [view, setView] = useState<"dashboard" | "pod">("dashboard");
    const [activeStop, setActiveStop] = useState<any>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const driver = sessionContext.driver;

    useRealtimeSubscription({
        table: 'routes',
        queryKeyToInvalidate: ["/api/logistics/fleet/routes/driver", driver?.id]
    });

    useRealtimeSubscription({
        table: 'route_stops',
        queryKeyToInvalidate: ["/api/logistics/fleet/routes/driver", driver?.id]
    });

    // 1. GPS Tracking System
    useEffect(() => {
        if (!sessionContext.terminal?.id) return;

        let watchId: number;

        const startTracking = () => {
            if ("geolocation" in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        try {
                            await fetch(`/api/kiosks/${sessionContext.terminal.id}/heartbeat`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ latitude, longitude })
                            });
                        } catch (err) {
                            console.error("Heartbeat error:", err);
                        }
                    },
                    (error) => console.error("Geolocation error:", error),
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            }
        };

        startTracking();
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [sessionContext.terminal?.id]);

    // 2. Fetch Active Route 
    const { data: activeRoute, isLoading: isLoadingRoute } = useQuery({
        queryKey: ["/api/logistics/fleet/routes/driver", driver?.id],
        queryFn: async () => {
            if (!driver?.id) return null;
            const res = await fetch(`/api/logistics/fleet/routes/driver/${driver.id}`, {
                headers: getKioskHeaders({ employeeId: driver.id })
            });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!driver?.id
    });

    const completeStopMutation = useMutation({
        mutationFn: async ({ stopId, signature, isPaid, paymentAmount, paymentMethod }: any) => {
            const res = await fetch(`/api/logistics/fleet/routes/stops/${stopId}/complete`, {
                method: "POST",
                headers: getKioskHeaders({
                    employeeId: driver?.id,
                    supabaseToken: session?.access_token
                }),
                body: JSON.stringify({
                    signature,
                    lat: 0, lng: 0,
                    isPaid,
                    paymentAmount: paymentAmount ? Math.round(parseFloat(paymentAmount) * 100) : 0,
                    paymentMethod
                })
            });
            if (!res.ok) throw new Error("Error completing stop");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/logistics/fleet/routes/driver"] });
            setView("dashboard");
            setActiveStop(null);
            setSignature(null);
            setIsPaid(false);
            setPaymentAmount("");
            toast({ title: "Entrega Completada", description: "La prueba de entrega se ha registrado." });
        }
    });

    // Signature Canvas logic
    useEffect(() => {
        if (view === "pod" && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                // Adjust for high resolution displays
                const ratio = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * ratio;
                canvas.height = rect.height * ratio;
                ctx.scale(ratio, ratio);

                ctx.lineWidth = 4;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.strokeStyle = "#ffffff";

                let painting = false;
                const startPosition = (e: any) => {
                    painting = true;
                    draw(e);
                };
                const finishedPosition = () => {
                    painting = false;
                    ctx.beginPath();
                };
                const draw = (e: any) => {
                    if (!painting) return;
                    e.preventDefault();
                    const rect = canvas.getBoundingClientRect();
                    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
                    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
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

    if (isLoadingRoute) {
        return (
            <div className="h-[100vh] flex flex-col items-center justify-center bg-[#050505] p-12">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="font-black uppercase tracking-[0.5em] text-blue-500/50 animate-pulse">Sincronizando Ruta...</p>
            </div>
        );
    }

    if (view === "dashboard") {
        const stops = activeRoute?.stops || [];
        const completedStops = stops.filter((s: any) => s.status === 'completed').length;
        const totalStops = stops.length;
        const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

        return (
            <div className="h-[100vh] w-full bg-[#050505] text-white selection:bg-blue-500/30 p-4 md:p-8 flex flex-col gap-6 overflow-hidden">
                {/* Ultra Modern Header */}
                <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[22px] bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <Truck className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                                Ruta <span className="text-slate-500">Logística</span>
                            </h1>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                                    <Wifi className="w-3 h-3 text-blue-500" />
                                    <span className="text-[9px] text-blue-500 font-black tracking-widest uppercase">GPS ACTIVO</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{driver?.name}</span>
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

                <div className="flex flex-col gap-6 overflow-hidden flex-1">
                    {!activeRoute ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 rounded-[50px] space-y-8">
                            <div className="relative">
                                <Map className="w-32 h-32 text-slate-800" />
                                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-4xl font-black italic uppercase tracking-tighter">Sin Ruta Asignada</h3>
                                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Comuníquese con despacho para su hoja del día</p>
                            </div>
                            <Button
                                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/logistics/fleet/routes/driver"] })}
                                className="h-20 px-12 rounded-3xl bg-blue-500 hover:bg-blue-400 text-white font-black uppercase text-xl tracking-tighter shadow-2xl shadow-blue-500/20"
                            >
                                ACTUALIZAR PANEL
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
                            {/* Route Map & Progress */}
                            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                                <Card className="bg-blue-500/5 border-blue-500/20 p-10 rounded-[40px] shadow-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-6">UNIDAD DE TRANSPORTE</p>
                                    <div className="flex items-baseline gap-4">
                                        <h2 className="text-7xl font-black italic uppercase italic tracking-tighter leading-none">{activeRoute.vehicle?.plate || 'S/N'}</h2>
                                        <Badge className="bg-blue-500 text-white font-black uppercase text-[10px] py-1 px-3 mb-2">{activeRoute.vehicle?.model || 'General'}</Badge>
                                    </div>
                                    <p className="text-xs text-blue-400/50 font-bold uppercase tracking-[0.2em] mt-4 flex items-center gap-2">
                                        <PulseDot color="bg-blue-500" /> TRANSMITIENDO UBICACIÓN
                                    </p>
                                </Card>

                                <Card className="flex-1 bg-white/[0.02] border-white/5 p-10 rounded-[40px] flex flex-col justify-center space-y-10 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                                        <MapPin className="w-64 h-64 -rotate-12" />
                                    </div>
                                    <div className="relative z-10 space-y-6">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">PROGRESO DEL VIAJE</p>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h3 className="text-6xl font-black tracking-tighter tabular-nums">{completedStops}<span className="text-slate-700 text-4xl">/{totalStops}</span></h3>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">PUNTOS DE ENTREGA</p>
                                            </div>
                                            <div className="text-right">
                                                <h4 className="text-6xl font-black font-mono text-blue-500">{Math.round(progress)}%</h4>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">COMPLETADO</p>
                                            </div>
                                        </div>
                                        <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Stops List */}
                            <div className="col-span-12 lg:col-span-7 flex flex-col min-h-0">
                                <Card className="flex-1 bg-white/[0.02] border-white/5 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                    <CardHeader className="p-10 border-b border-white/5">
                                        <CardTitle className="text-xs font-black uppercase tracking-[0.5em] text-slate-500 flex items-center gap-4">
                                            <Navigation className="w-5 h-5 text-blue-500" /> PLAN DE RUTA DEL DÍA
                                        </CardTitle>
                                    </CardHeader>
                                    <ScrollArea className="flex-1 custom-scrollbar">
                                        <div className="divide-y divide-white/5">
                                            {stops.map((stop: any, index: number) => {
                                                const isNext = stop.status === 'pending' && (index === 0 || stops[index - 1].status === 'completed');
                                                const isCompleted = stop.status === 'completed';

                                                return (
                                                    <div
                                                        key={stop.id}
                                                        className={cn(
                                                            "group p-10 flex items-center gap-10 transition-all duration-500",
                                                            isNext ? "bg-white/[0.04]" : isCompleted ? "bg-emerald-500/[0.02] opacity-40" : "opacity-30 p-8 grayscale"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-16 h-16 rounded-[22px] flex items-center justify-center text-3xl font-black italic transition-all duration-500 shrink-0",
                                                            isCompleted ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" :
                                                                (isNext ? "bg-blue-500 text-white shadow-[0_10px_30px_rgba(59,130,246,0.4)]" : "bg-white/5 text-slate-700")
                                                        )}>
                                                            {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : index + 1}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <p className={cn(
                                                                "text-3xl font-black tracking-tighter uppercase italic leading-none transition-colors",
                                                                isNext ? "text-white" : "text-slate-500"
                                                            )}>{stop.address}</p>
                                                            <div className="flex items-center gap-3 pt-2">
                                                                <Badge variant="outline" className="border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-600 bg-black/40">
                                                                    ID: {stop.id.slice(0, 8)}
                                                                </Badge>
                                                                {isNext && <span className="text-[10px] text-blue-500 font-black animate-pulse uppercase tracking-[0.2em]">PRÓXIMA PARADA</span>}
                                                            </div>
                                                        </div>
                                                        {isNext && (
                                                            <Button
                                                                className="h-20 px-10 rounded-[30px] bg-white text-black hover:bg-blue-500 hover:text-white font-black uppercase text-xl shadow-xl transition-all duration-500"
                                                                onClick={() => { setActiveStop(stop); setView("pod"); }}
                                                            >
                                                                DESPACHAR <ChevronRight className="w-6 h-6 ml-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (view === "pod" && activeStop) {
        return (
            <div className="fixed inset-0 bg-[#050505] text-white z-[100] flex flex-col p-8 md:p-16 overflow-hidden">
                <div className="max-w-4xl w-full mx-auto flex flex-col h-full gap-8">
                    <header className="flex items-center gap-6 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setView("dashboard")}
                            className="h-16 w-16 rounded-[22px] bg-white/5 border border-white/5 hover:bg-white/10"
                        >
                            <ArrowLeft className="w-8 h-8" />
                        </Button>
                        <div className="space-y-1">
                            <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">Confirmar <span className="text-blue-500">Entrega</span></h2>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Punto de Destino: {activeStop.address}</p>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1 min-h-0">
                        {/* Details & Payment */}
                        <div className="md:col-span-5 flex flex-col gap-6">
                            <Card className="bg-white/[0.02] border-white/10 p-10 rounded-[40px] shadow-2xl">
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">LIQUIDACIÓN DE PAGO</Label>
                                            <p className="text-[10px] text-slate-700 font-bold uppercase">¿Hubo transacción económica?</p>
                                        </div>
                                        <Checkbox
                                            checked={isPaid}
                                            onCheckedChange={(val) => setIsPaid(!!val)}
                                            className="w-10 h-10 border-2 border-white/20 data-[state=checked]:bg-blue-500"
                                        />
                                    </div>

                                    {isPaid && (
                                        <div className="space-y-6 pt-4 animate-in slide-in-from-top-4 duration-500">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-4">Monto Recibido (MXN)</Label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none">
                                                        <span className="text-3xl font-black text-blue-500">$</span>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={paymentAmount}
                                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                                        className="h-24 pl-20 bg-black/40 border-2 border-white/5 rounded-[30px] text-4xl font-mono font-black text-white focus:border-blue-500 transition-all text-center"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-4">Método de Pago</Label>
                                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                    <SelectTrigger className="h-20 bg-black/40 border-2 border-white/5 rounded-[25px] px-8 text-xl font-black uppercase italic text-white flex justify-between items-center w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-950 border-white/10 text-white">
                                                        <SelectItem value="cash" className="py-4 font-black uppercase italic">EFECTIVO</SelectItem>
                                                        <SelectItem value="transfer" className="py-4 font-black uppercase italic">TRANSFERENCIA</SelectItem>
                                                        <SelectItem value="card" className="py-4 font-black uppercase italic">TARJETA / TPV</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Signature Pad */}
                        <div className="md:col-span-7 flex flex-col gap-6">
                            <Card className="flex-1 bg-white/[0.02] border-white/10 rounded-[50px] flex flex-col p-10 shadow-2xl relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">FIRMA ELECTRÓNICA DE RECIBIDO</Label>
                                        <p className="text-[10px] text-slate-700 font-bold uppercase whitespace-nowrap">Solicite al cliente que firme dentro del recuadro</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const canvas = canvasRef.current;
                                            const ctx = canvas?.getContext('2d');
                                            if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
                                        }}
                                        className="h-10 px-6 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500"
                                    >
                                        LIMPIAR
                                    </Button>
                                </div>
                                <div className="flex-1 bg-black/40 rounded-[40px] border-2 border-white/5 relative overflow-hidden touch-none group">
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                                        <Navigation className="w-64 h-64 -rotate-12" />
                                    </div>
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute inset-0 w-full h-full cursor-crosshair z-10"
                                    />
                                    {/* Signature Guide Line */}
                                    <div className="absolute bottom-16 left-12 right-12 h-[1px] bg-white/10 pointer-events-none z-0" />
                                </div>
                            </Card>

                            <Button
                                className="h-32 rounded-[50px] bg-blue-500 hover:bg-blue-400 text-white text-4xl font-black uppercase tracking-tighter italic shadow-[0_20px_60px_rgba(59,130,246,0.3)] transition-all active:scale-95 disabled:opacity-50"
                                disabled={completeStopMutation.isPending}
                                onClick={() => {
                                    const canvas = canvasRef.current;
                                    const dataUrl = canvas?.toDataURL();
                                    completeStopMutation.mutate({
                                        stopId: activeStop.id,
                                        signature: dataUrl,
                                        isPaid, paymentAmount, paymentMethod
                                    });
                                }}
                            >
                                {completeStopMutation.isPending ? (
                                    <Loader2 className="w-12 h-12 animate-spin mr-6" />
                                ) : (
                                    <CheckCircle2 className="w-12 h-12 mr-6" />
                                )}
                                FINALIZAR ENTREGA
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
