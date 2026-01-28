import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    MapPin,
    Package,
    CheckCircle2,
    Clock,
    Navigation,
    Camera,
    DollarSign,
    X,
    ChevronRight,
    AlertCircle,
    Phone,
    Home,
    Truck,
    Wifi,
    Signature,
    CreditCard,
    Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import SignatureCanvas from "react-signature-canvas";
import type { Employee } from "../../../../shared/schema";

interface DriverTerminalMobileProps {
    employee: Employee;
    terminalId?: string;
}

interface Stop {
    id: string;
    type: 'delivery' | 'pickup';
    customerName: string;
    address: string;
    phone: string;
    products: { name: string; quantity: number }[];
    expectedAmount?: number;
    status: 'pending' | 'completed' | 'failed';
    completedAt?: string;
    signature?: string;
    photo?: string;
    amountCollected?: number;
    notes?: string;
}

interface Route {
    id: string;
    driverName: string;
    vehiclePlate: string;
    stops: Stop[];
    startedAt?: string;
    completedAt?: string;
}

export function DriverTerminalMobile({ employee, terminalId }: DriverTerminalMobileProps) {
    const [activeStop, setActiveStop] = useState<Stop | null>(null);
    const [showSignature, setShowSignature] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [photo, setPhoto] = useState<string | null>(null);
    const signatureRef = useRef<SignatureCanvas>(null);
    const queryClient = useQueryClient();

    // GPS Tracking
    useEffect(() => {
        if (!employee?.id) return;
        let watchId: number;
        const trackLocation = () => {
            if ("geolocation" in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    async (position) => {
                        try {
                            await fetch("/api/logistics/driver-location", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    employeeId: employee.id,
                                    terminalId,
                                    latitude: position.coords.latitude,
                                    longitude: position.coords.longitude,
                                    timestamp: new Date().toISOString()
                                })
                            });
                        } catch (error) {
                            console.error("Failed to send location:", error);
                        }
                    },
                    (error) => console.error("GPS Error:", error),
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            }
        };
        trackLocation();
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [employee?.id, terminalId]);

    const { data: route, isLoading } = useQuery<Route>({
        queryKey: ["/api/logistics/driver-route", employee.id],
        queryFn: async () => {
            const res = await fetch(`/api/logistics/driver-route/${employee.id}`);
            if (!res.ok) return {
                id: `R-${new Date().getTime().toString().slice(-6)}`,
                driverName: employee.name,
                vehiclePlate: "---",
                stops: [],
                startedAt: new Date().toISOString()
            };
            return res.json();
        },
        enabled: !!employee?.id,
        refetchInterval: 30000
    });

    const completeStopMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/logistics/complete-stop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Fallo al registrar");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/logistics/driver-route", employee.id] });
            setActiveStop(null);
            setShowSignature(false);
            setShowPayment(false);
            setAmount("");
            setNotes("");
            setPhoto(null);
        }
    });

    const handleTakePhoto = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => setPhoto(event.target?.result as string);
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    if (isLoading || !route) {
        return (
            <div className="h-[100vh] bg-[#050505] flex flex-col items-center justify-center p-12">
                <div className="relative">
                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                </div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-primary/50 animate-pulse">Sincronizando Módulo...</p>
            </div>
        );
    }

    const pendingStops = route.stops.filter(s => s.status === 'pending');
    const completedStops = route.stops.filter(s => s.status === 'completed');

    return (
        <div className="h-[100vh] bg-[#050505] text-white overflow-hidden flex flex-col">
            {/* Ultra Premium Header */}
            <header className="shrink-0 p-6 bg-white/[0.02] border-b border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/20 border border-primary/30">
                            <Truck className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">Ruta <span className="text-slate-500">{route.id}</span></h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Wifi className="w-3 h-3 text-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">GPS ONLINE</span>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => window.location.href = '/kiosk'} className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5">
                        <Home className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Badge className="bg-primary text-black font-black uppercase text-[9px] py-1 px-3 border-none shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                        {pendingStops.length} PENDIENTES
                    </Badge>
                    <Badge className="bg-white/5 text-slate-500 font-black uppercase text-[9px] py-1 px-3 border border-white/5">
                        {route.vehiclePlate}
                    </Badge>
                </div>
            </header>

            {/* Scrollable List */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <AnimatePresence>
                    {pendingStops.map((stop, index) => (
                        <motion.div
                            key={stop.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card
                                className={cn(
                                    "bg-white/[0.02] border-white/5 rounded-[30px] overflow-hidden transition-all duration-500 active:scale-95 cursor-pointer touch-manipulation",
                                    "hover:border-primary/40 hover:bg-white/[0.04]"
                                )}
                                onClick={() => setActiveStop(stop)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 border",
                                            stop.type === 'delivery' ? "bg-primary/5 border-primary/20 text-primary" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
                                        )}>
                                            {stop.type === 'delivery' ? <Package className="w-8 h-8" /> : <MapPin className="w-8 h-8" />}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <h3 className="text-xl font-black italic uppercase italic tracking-tighter truncate">{stop.customerName}</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{stop.address}</p>
                                            <div className="flex items-center gap-4 pt-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 bg-white/5 px-2 py-0.5 rounded">
                                                    #{index + 1}
                                                </span>
                                                {stop.expectedAmount && (
                                                    <span className="text-[10px] font-black text-primary flex items-center gap-1">
                                                        <DollarSign className="w-3 h-3" /> ${(stop.expectedAmount / 100).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-6 h-6 text-slate-800" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {completedStops.length > 0 && (
                    <div className="pt-8 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 ml-4">ENTREGAS COMPLETADAS</p>
                        {completedStops.map((stop) => (
                            <div key={stop.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center gap-4 opacity-40 grayscale">
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                                <span className="text-sm font-bold text-slate-500 uppercase italic tracking-tight">{stop.customerName}</span>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Stop Detail View (Slide-up) */}
            <AnimatePresence>
                {activeStop && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-0 bg-[#050505] z-50 flex flex-col"
                    >
                        {/* Detail Header */}
                        <header className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{activeStop.customerName}</h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DETALLES DEL SERVICIO</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setActiveStop(null); setShowSignature(false); setShowPayment(false); }} className="h-12 w-12 rounded-2xl bg-white/5">
                                <X className="w-6 h-6" />
                            </Button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Actions & Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="bg-white/[0.02] border-white/5 p-6 rounded-[30px] flex flex-col items-center justify-center text-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Navigation className="w-6 h-6 text-primary" />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">NAVEGAR</p>
                                    <Button variant="link" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStop.address)}`)} className="text-xs font-black uppercase text-white p-0">MAPS</Button>
                                </Card>
                                <Card className="bg-white/[0.02] border-white/5 p-6 rounded-[30px] flex flex-col items-center justify-center text-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <Phone className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">CONTACTO</p>
                                    <a href={`tel:${activeStop.phone}`} className="text-xs font-black uppercase text-white">LLAMAR</a>
                                </Card>
                            </div>

                            {/* Status Stepper */}
                            <div className="space-y-6">
                                {/* Step 1: Signature */}
                                <Card className={cn(
                                    "bg-white/[0.02] border-white/5 rounded-[40px] overflow-hidden transition-all duration-500",
                                    showSignature ? "border-primary/40 bg-primary/[0.02]" : ""
                                )}>
                                    <div className="p-8 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black", showPayment ? "bg-primary text-black" : "bg-white/5 text-slate-500")}>
                                                    {showPayment ? <CheckCircle2 className="w-6 h-6" /> : "1"}
                                                </div>
                                                <h3 className="font-black uppercase italic tracking-tight">FIRMA DE RECIBIDO</h3>
                                            </div>
                                            {!showSignature && !showPayment && (
                                                <Button onClick={() => setShowSignature(true)} variant="outline" className="rounded-full font-black uppercase text-[10px]">INICIAR</Button>
                                            )}
                                        </div>

                                        {showSignature && !showPayment && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="bg-white rounded-3xl h-48 overflow-hidden touch-none relative">
                                                    <SignatureCanvas
                                                        ref={signatureRef}
                                                        canvasProps={{ width: 500, height: 200, className: 'w-full h-full' }}
                                                    />
                                                </div>
                                                <div className="flex gap-4">
                                                    <Button variant="ghost" onClick={() => signatureRef.current?.clear()} className="flex-1 rounded-2xl font-black uppercase text-xs">LIMPIAR</Button>
                                                    <Button onClick={() => setShowPayment(true)} className="flex-1 bg-primary text-black rounded-2xl font-black uppercase text-xs">CONFIRMAR</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>

                                {/* Step 2: Payment & Finalize */}
                                {showPayment && (
                                    <Card className="bg-white/[0.02] border-primary/40 rounded-[40px] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                                        <div className="p-8 space-y-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-black text-slate-500">2</div>
                                                <h3 className="font-black uppercase italic tracking-tight">LIQUIDACIÓN DE PAGO</h3>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-3 text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">MONTO A COBRAR</p>
                                                    <div className="relative">
                                                        <span className="absolute left-1/2 -translate-x-12 top-1/2 -translate-y-1/2 text-primary font-black text-2xl">$</span>
                                                        <Input
                                                            type="number"
                                                            value={amount}
                                                            onChange={(e) => setAmount(e.target.value)}
                                                            placeholder="0.00"
                                                            className="h-20 bg-black/40 border-white/5 rounded-[22px] text-4xl font-mono font-black text-center text-white focus:border-primary transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <Button onClick={handleTakePhoto} variant="outline" className="h-20 rounded-[25px] flex flex-col gap-1 border-white/5 bg-white/5">
                                                        <Camera className="w-6 h-6 text-slate-500" />
                                                        <span className="text-[10px] font-black uppercase text-slate-500">{photo ? "CAMBIAR FOTO" : "TOMAR FOTO"}</span>
                                                    </Button>
                                                    <Button className="h-20 rounded-[25px] flex flex-col gap-1 border-white/5 bg-white/5 active:bg-primary/20">
                                                        <CreditCard className="w-6 h-6 text-slate-500" />
                                                        <span className="text-[10px] font-black uppercase text-slate-500">TARJETA</span>
                                                    </Button>
                                                </div>

                                                {photo && <img src={photo} className="w-full rounded-[30px] border border-white/10" />}

                                                <Button
                                                    className="w-full h-24 bg-primary text-black hover:bg-primary/90 rounded-[35px] text-2xl font-black uppercase italic tracking-tighter shadow-2xl shadow-primary/20 transition-all active:scale-95"
                                                    onClick={() => {
                                                        const sig = signatureRef.current?.toDataURL();
                                                        completeStopMutation.mutate({
                                                            stopId: activeStop.id,
                                                            signature: sig,
                                                            photo,
                                                            amountCollected: amount ? Math.round(parseFloat(amount) * 100) : undefined,
                                                            notes
                                                        });
                                                    }}
                                                    disabled={completeStopMutation.isPending}
                                                >
                                                    {completeStopMutation.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : "FINALIZAR ENTREGA"}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
