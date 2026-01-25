import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Navigation, MapPin, CheckCircle, Camera, Truck, Maximize, CreditCard, Banknote, LogOut, ArrowLeft, CheckCircle2 } from "lucide-react";
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
                    lat: 0, lng: 0, // In production use real GPS
                    isPaid,
                    paymentAmount: paymentAmount ? parseInt(paymentAmount) : 0,
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
                ctx.lineWidth = 3;
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

    if (isLoadingRoute) {
        return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (view === "dashboard") {
        const stops = activeRoute?.stops || [];
        const completedStops = stops.filter((s: any) => s.status === 'completed').length;
        const totalStops = stops.length;
        const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

        return (
            <div className="space-y-6 max-w-4xl mx-auto pb-12">
                <header className="flex items-center justify-between border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-500">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">Ruta Logística</h1>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Sincronizado vía Satélite</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xl font-black text-white leading-none uppercase">{driver?.name}</p>
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Conductor Asignado</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onLogout} className="bg-white/5 hover:bg-destructive/20 hover:text-destructive">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </header>

                {!activeRoute ? (
                    <Card className="bg-white/[0.02] border-white/5 p-20 text-center rounded-[40px]">
                        <div className="space-y-6">
                            <div className="w-20 h-20 rounded-full bg-slate-900 mx-auto flex items-center justify-center">
                                <Navigation className="w-10 h-10 text-slate-700" />
                            </div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Sin Ruta Asignada</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">Comuníquese con el despachador para recibir su plan de ruta del día.</p>
                            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/logistics/fleet/routes/driver"] })}>Sincronizar Panel</Button>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-primary/5 border-primary/20 p-6 rounded-[30px]">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">Vehículo</p>
                                <p className="text-3xl font-black italic uppercase">{activeRoute.vehicle?.plate || '---'}</p>
                                <p className="text-xs text-slate-500 mt-1">{activeRoute.vehicle?.model}</p>
                            </Card>
                            <Card className="bg-slate-900 border-white/5 p-6 rounded-[30px]">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Progreso de Entrega</p>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-3xl font-black">{completedStops}/{totalStops} Paradas</p>
                                    <p className="text-xl font-mono text-primary">{Math.round(progress)}%</p>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Hoja de Ruta</h4>
                            {stops.map((stop: any, index: number) => {
                                const isNext = stop.status === 'pending' && (index === 0 || stops[index - 1].status === 'completed');
                                return (
                                    <div
                                        key={stop.id}
                                        className={cn(
                                            "group p-6 rounded-[30px] border transition-all flex items-center gap-6",
                                            isNext ? "bg-primary/5 border-primary/40 shadow-xl" : "bg-white/[0.02] border-white/5 opacity-60"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black italic",
                                            stop.status === 'completed' ? "bg-success text-white" : (isNext ? "bg-primary text-white" : "bg-slate-800 text-slate-400")
                                        )}>
                                            {stop.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xl font-bold italic uppercase tracking-tight">{stop.address}</p>
                                            <p className="text-xs text-slate-500 mt-1">ID: #{stop.id.slice(0, 8)} • {stop.status === 'completed' ? "Entregado" : "Pendiente"}</p>
                                        </div>
                                        {isNext && (
                                            <Button
                                                className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-8 rounded-2xl h-14"
                                                onClick={() => { setActiveStop(stop); setView("pod"); }}
                                            >
                                                Registrar Entrega
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === "pod" && activeStop) {
        return (
            <div className="fixed inset-0 bg-white text-black z-[100] flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
                <div className="max-w-md w-full space-y-8 pb-20">
                    <div className="space-y-2">
                        <Button variant="ghost" onClick={() => setView("dashboard")} className="mb-4 -ml-4">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Ruta
                        </Button>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter underline decoration-primary decoration-4">Confirmar Entrega</h2>
                        <p className="text-slate-500 text-sm">{activeStop.address}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black uppercase tracking-widest">¿Se recibió pago?</Label>
                                <Checkbox checked={isPaid} onCheckedChange={(val) => setIsPaid(!!val)} className="w-6 h-6" />
                            </div>
                            {isPaid && (
                                <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Monto</Label>
                                        <Input type="number" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="h-12 text-lg font-bold" />
                                    </div>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Efectivo</SelectItem>
                                            <SelectItem value="transfer">Transferencia</SelectItem>
                                            <SelectItem value="card">Tarjeta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black uppercase tracking-widest">Firma del Cliente</Label>
                                <Button variant="link" size="sm" onClick={() => canvasRef.current?.getContext('2d')?.clearRect(0, 0, 800, 400)} className="text-xs text-destructive font-bold p-0">Limpiar</Button>
                            </div>
                            <div className="border-2 border-slate-200 rounded-3xl bg-white h-48 overflow-hidden touch-none">
                                <canvas ref={canvasRef} width={800} height={400} className="w-full h-full cursor-crosshair" />
                            </div>
                        </div>

                        <Button
                            className="w-full h-20 bg-primary hover:bg-primary/90 text-white text-2xl font-black uppercase tracking-widest italic rounded-[40px] glow"
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
                            {completeStopMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
                            CONFIRMAR RECIBIDO
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
