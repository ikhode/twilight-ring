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
    Home
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
    expectedAmount?: number; // Amount to collect (if delivery) or pay (if pickup)
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
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const signatureRef = useRef<SignatureCanvas>(null);
    const queryClient = useQueryClient();

    // GPS Tracking - Send location to backend every 30 seconds
    useEffect(() => {
        if (!employee?.id) return;

        let watchId: number;

        const trackLocation = () => {
            if ("geolocation" in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    async (position) => {
                        const location = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        setCurrentLocation(location);

                        // Send to backend for tracking
                        try {
                            await fetch("/api/logistics/driver-location", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    employeeId: employee.id,
                                    terminalId,
                                    latitude: location.lat,
                                    longitude: location.lng,
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

    // Fetch real route data from backend
    const { data: route, isLoading } = useQuery<Route>({
        queryKey: ["/api/logistics/driver-route", employee.id],
        queryFn: async () => {
            const res = await fetch(`/api/logistics/driver-route/${employee.id}`);
            if (!res.ok) {
                // If no route found, return empty route
                return {
                    id: `RUTA-${new Date().toISOString().split('T')[0]}`,
                    driverName: employee.name,
                    vehiclePlate: "N/A",
                    stops: [],
                    startedAt: new Date().toISOString()
                };
            }
            const data = await res.json();
            // Override driverName with actual employee name
            return {
                ...data,
                driverName: employee.name
            };
        },
        enabled: !!employee?.id,
        refetchInterval: 60000 // Refresh every minute
    });

    const completeStopMutation = useMutation({
        mutationFn: async (data: {
            stopId: string;
            signature: string;
            photo?: string;
            amountCollected?: number;
            notes?: string;
        }) => {
            const res = await fetch("/api/logistics/complete-stop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    saleId: data.stopId,
                    signature: data.signature,
                    photo: data.photo,
                    amountCollected: data.amountCollected,
                    notes: data.notes,
                    paymentMethod: amount ? "cash" : undefined
                })
            });

            if (!res.ok) {
                throw new Error("Failed to complete stop");
            }

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

    const handleCompleteStop = () => {
        if (!activeStop || !signatureRef.current) return;

        const signatureData = signatureRef.current.toDataURL();

        completeStopMutation.mutate({
            stopId: activeStop.id,
            signature: signatureData,
            photo: photo || undefined,
            amountCollected: amount ? parseFloat(amount) * 100 : undefined,
            notes: notes || undefined
        });
    };

    const handleTakePhoto = () => {
        // In real app, use camera API
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setPhoto(event.target?.result as string);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    if (isLoading || !route) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Cargando ruta...</p>
                </div>
            </div>
        );
    }

    const pendingStops = route.stops.filter(s => s.status === 'pending');
    const completedStops = route.stops.filter(s => s.status === 'completed');

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-xl font-black uppercase">Ruta {route.id}</h1>
                        <p className="text-sm text-slate-400">{route.vehiclePlate} • {route.driverName}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.location.href = '/kiosk'}
                        className="rounded-full"
                    >
                        <Home className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Badge className="bg-primary/20 text-primary border-primary/50">
                        {pendingStops.length} Pendientes
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                        {completedStops.length} Completadas
                    </Badge>
                </div>
            </div>

            {/* Stops List */}
            <div className="p-4 space-y-3">
                <AnimatePresence>
                    {pendingStops.map((stop, index) => (
                        <motion.div
                            key={stop.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card
                                className={cn(
                                    "bg-slate-900 border-slate-800 cursor-pointer transition-all",
                                    activeStop?.id === stop.id && "border-primary bg-primary/5"
                                )}
                                onClick={() => setActiveStop(stop)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                                            stop.type === 'delivery' ? "bg-blue-500/20 text-blue-500" : "bg-orange-500/20 text-orange-500"
                                        )}>
                                            {stop.type === 'delivery' ? (
                                                <Package className="w-6 h-6" />
                                            ) : (
                                                <MapPin className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-1">
                                                <h3 className="font-bold text-white truncate">{stop.customerName}</h3>
                                                <Badge variant="outline" className="ml-2">
                                                    #{index + 1}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-400 line-clamp-1">{stop.address}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs">
                                                <span className="flex items-center gap-1 text-slate-500">
                                                    <Package className="w-3 h-3" />
                                                    {stop.products.length} producto(s)
                                                </span>
                                                {stop.expectedAmount && (
                                                    <span className="flex items-center gap-1 text-primary font-bold">
                                                        <DollarSign className="w-3 h-3" />
                                                        ${(stop.expectedAmount / 100).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-600" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Completed Stops */}
                {completedStops.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">Completadas</h3>
                        {completedStops.map((stop) => (
                            <Card key={stop.id} className="bg-slate-900/50 border-slate-800 mb-2">
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-slate-400">{stop.customerName}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Stop Detail Modal */}
            <AnimatePresence>
                {activeStop && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30 }}
                        className="fixed inset-0 bg-slate-950 z-50 overflow-y-auto"
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase">{activeStop.customerName}</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setActiveStop(null)}
                                className="rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Address & Contact */}
                            <Card className="bg-slate-900 border-slate-800">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold mb-1">Dirección</p>
                                            <p className="text-slate-400 text-sm">{activeStop.address}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                // Open maps
                                                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStop.address)}`);
                                            }}
                                        >
                                            <Navigation className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-5 h-5 text-green-500 shrink-0" />
                                        <a href={`tel:${activeStop.phone}`} className="text-sm text-green-500 font-bold">
                                            {activeStop.phone}
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Products */}
                            <Card className="bg-slate-900 border-slate-800">
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-bold uppercase mb-3">Productos</h3>
                                    <div className="space-y-2">
                                        {activeStop.products.map((product, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300">{product.name}</span>
                                                <Badge variant="outline">{product.quantity} unidades</Badge>
                                            </div>
                                        ))}
                                    </div>
                                    {activeStop.expectedAmount && (
                                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                                            <span className="text-sm font-bold">Monto {activeStop.type === 'delivery' ? 'a Cobrar' : 'a Pagar'}</span>
                                            <span className="text-xl font-black text-primary">
                                                ${(activeStop.expectedAmount / 100).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Signature */}
                            {!showSignature && (
                                <Button
                                    className="w-full h-14 text-lg font-bold"
                                    onClick={() => setShowSignature(true)}
                                >
                                    Capturar Firma
                                </Button>
                            )}

                            {showSignature && (
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardContent className="p-4">
                                        <h3 className="text-sm font-bold uppercase mb-3">Firma del Cliente</h3>
                                        <div className="border-2 border-dashed border-slate-700 rounded-lg overflow-hidden bg-white">
                                            <SignatureCanvas
                                                ref={signatureRef}
                                                canvasProps={{
                                                    width: 400,
                                                    height: 200,
                                                    className: 'w-full h-auto'
                                                }}
                                            />
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => signatureRef.current?.clear()}
                                                className="flex-1"
                                            >
                                                Limpiar
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => setShowPayment(true)}
                                                className="flex-1"
                                            >
                                                Continuar
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Payment */}
                            {showPayment && (
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardContent className="p-4 space-y-4">
                                        <div>
                                            <label className="text-sm font-bold uppercase mb-2 block">
                                                Monto {activeStop.type === 'delivery' ? 'Recibido' : 'Entregado'}
                                            </label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="h-12 text-lg bg-slate-800 border-slate-700"
                                            />
                                            {activeStop.expectedAmount && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Esperado: ${(activeStop.expectedAmount / 100).toFixed(2)}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold uppercase mb-2 block">Notas (Opcional)</label>
                                            <Input
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Agregar comentarios..."
                                                className="bg-slate-800 border-slate-700"
                                            />
                                        </div>

                                        <div>
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                onClick={handleTakePhoto}
                                            >
                                                <Camera className="w-4 h-4 mr-2" />
                                                {photo ? 'Cambiar Foto' : 'Tomar Foto (Opcional)'}
                                            </Button>
                                            {photo && (
                                                <img src={photo} alt="Evidence" className="mt-2 rounded-lg w-full" />
                                            )}
                                        </div>

                                        <Button
                                            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
                                            onClick={handleCompleteStop}
                                            disabled={completeStopMutation.isPending}
                                        >
                                            {completeStopMutation.isPending ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Completando...
                                                </div>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                                    Completar Entrega
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
