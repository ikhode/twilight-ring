import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    MapPin,
    Package,
    CheckCircle2,
    Clock,
    Navigation,
    Camera,
    Phone,
    ChevronDown,
    ChevronUp,
    Truck,
    LogOut,
    AlertCircle,
    Loader2,
    Wifi,
    X,
    MessageSquare,
    ExternalLink,
    ChevronRight,
    Map as MapIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import SignatureCanvas from "react-signature-canvas";
import type { Employee } from "../../../../shared/schema";
import { getKioskHeaders } from "@/lib/kiosk-auth";
import { Drawer } from "vaul";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
    status: 'pending' | 'en_camino' | 'arrived' | 'operación' | 'finalizada_operación' | 'completada' | 'failed';
    entityType?: 'sale' | 'purchase';
    locationLat?: number;
    locationLng?: number;
    completedAt?: string;
    signature?: string;
    photo?: string;
    amountCollected?: number;
    notes?: string;
    timeWindow?: string;
    distance?: string;
}

interface Route {
    id: string;
    driverName: string;
    vehiclePlate: string;
    stops: Stop[];
    startedAt?: string;
    completedAt?: string;
}

// Map Centering Component
function RecenterMap({ coords }: { coords: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(coords, 15);
    }, [coords, map]);
    return null;
}

export function DriverTerminalMobile({ employee, terminalId }: DriverTerminalMobileProps) {
    const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
    const [isArrived, setIsArrived] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [lastCompletedStopId, setLastCompletedStopId] = useState<string | null>(null);
    const [activeStopId, setActiveStopId] = useState<string | null>(localStorage.getItem(`active_stop_id_${employee.id}`));
    const [stopStatus, setStopStatus] = useState<'pending' | 'en_camino' | 'arrived' | 'operación' | 'finalizada_operación'>(
        (localStorage.getItem(`stop_status_${employee.id}`) as any) || 'pending'
    );
    const [hasArrivedAuto, setHasArrivedAuto] = useState(false);
    const [wakeLock, setWakeLock] = useState<any>(null);
    const [distanceToStop, setDistanceToStop] = useState<number | null>(null);
    const [hasLoadedData, setHasLoadedData] = useState(false);

    const signatureRef = useRef<SignatureCanvas>(null);
    const queryClient = useQueryClient();

    // Persist status
    useEffect(() => {
        localStorage.setItem(`stop_status_${employee.id}`, stopStatus);
    }, [stopStatus, employee.id]);

    useEffect(() => {
        if (activeStopId) {
            localStorage.setItem(`active_stop_id_${employee.id}`, activeStopId);
        }
    }, [activeStopId, employee.id]);

    // Load active stop on mount
    useEffect(() => {
        const savedId = localStorage.getItem(`active_stop_id_${employee.id}`);
        if (savedId) setActiveStopId(savedId);
    }, [employee.id]);

    // Screen Wake Lock
    useEffect(() => {
        const requestWakeLock = async () => {
            if ("wakeLock" in navigator) {
                try {
                    const lock = await (navigator as any).wakeLock.request("screen");
                    setWakeLock(lock);
                    console.log("[WakeLock] Active");
                } catch (err) {
                    console.error("[WakeLock] Failed:", err);
                }
            }
        };
        requestWakeLock();
        return () => {
            if (wakeLock) {
                wakeLock.release().then(() => setWakeLock(null));
            }
        };
    }, []);

    // GPS Tracking
    useEffect(() => {
        if (!employee?.id) return;
        let watchId: number;
        if ("geolocation" in navigator) {
            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentPosition([latitude, longitude]);

                    // Geofencing: Check distance to active stop
                    if (activeStop?.locationLat && activeStop?.locationLng) {
                        const dist = calculateDistance(latitude, longitude, activeStop.locationLat, activeStop.locationLng);
                        setDistanceToStop(dist);

                        setDistanceToStop(dist);

                        // Auto-arrival if within 100m and currently en_camino
                        if (dist < 0.1 && stopStatus === 'en_camino' && !hasArrivedAuto) {
                            setStopStatus('arrived');
                            setHasArrivedAuto(true); // Prevent repeating auto-arrival if user manually resets
                        }
                    }

                    try {
                        await fetch("/api/logistics/driver-location", {
                            method: "POST",
                            headers: getKioskHeaders({ employeeId: employee.id }),
                            body: JSON.stringify({
                                employeeId: employee.id,
                                terminalId,
                                latitude,
                                longitude,
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
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [employee?.id, terminalId]);

    // Fetch route data
    const { data: route, isLoading } = useQuery<Route>({
        queryKey: ["/api/logistics/driver-route", employee.id],
        queryFn: async () => {
            const res = await fetch(`/api/logistics/driver-route/${employee.id}`, {
                headers: getKioskHeaders({ employeeId: employee.id })
            });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!employee?.id,
        refetchInterval: 30000,
    });

    // Effect to track data loading
    useEffect(() => {
        if (route) setHasLoadedData(true);
    }, [route]);

    // Helper: Haversine distance in KM
    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // KM
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Demo data fallback logic
    const stops = useMemo(() => {
        if (route?.stops?.length) return route.stops;
        if (hasLoadedData) return []; // If we loaded real data and it's empty, route is finished
        return [
            {
                id: "1",
                type: 'delivery',
                customerName: 'María González',
                address: 'Av. Insurgentes 1234, Col. Roma',
                phone: '+52 55 1234 5678',
                products: [{ name: 'Caja 25kg - Frutas', quantity: 1 }],
                locationLat: 19.4143,
                locationLng: -99.1663,
                status: 'pending'
            },
            {
                id: "2",
                type: 'delivery',
                customerName: 'Comercial López',
                address: 'Calle Morelos 567, Centro',
                phone: '+52 55 8765 4321',
                products: [{ name: 'Pallet - Mercancía', quantity: 1 }],
                locationLat: 19.4285,
                locationLng: -99.1415,
                status: 'pending'
            }
        ] as Stop[];
    }, [route, hasLoadedData]);

    const activeStop = useMemo(() => {
        const candidateStops = stops.filter((s: Stop) => s.id !== lastCompletedStopId);
        return candidateStops.find((s: Stop) => s.id === activeStopId) ||
            candidateStops.find((s: Stop) => s.status === 'pending' || s.status === 'arrived');
    }, [stops, activeStopId, lastCompletedStopId]);

    const completeStopMutation = useMutation({
        mutationFn: async (data: { stopId: string; signature?: string; entityType?: string }) => {
            const res = await fetch("/api/logistics/complete-stop", {
                method: "POST",
                headers: getKioskHeaders({ employeeId: employee.id }),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Fallo al registrar");
            return res.json();
        },
        onSuccess: (data, variables) => {
            setLastCompletedStopId(variables.stopId);
            queryClient.invalidateQueries({ queryKey: ["/api/logistics/driver-route", employee.id] });
            setShowSignatureModal(false);
            setStopStatus('pending');
            setHasArrivedAuto(false);
            setActiveStopId(null);
            setDistanceToStop(null);
            localStorage.removeItem(`active_stop_id_${employee.id}`);
        }
    });

    const handleStatusTransition = () => {
        if (stopStatus === 'pending') setStopStatus('en_camino');
        else if (stopStatus === 'en_camino') setStopStatus('arrived');
        else if (stopStatus === 'arrived') setStopStatus('operación');
        else if (stopStatus === 'operación') setStopStatus('finalizada_operación');
    };

    const confirmCompletion = () => {
        if (!activeStop) return;
        const signatureData = signatureRef.current?.toDataURL() || undefined;
        completeStopMutation.mutate({
            stopId: activeStop.id,
            signature: signatureData,
            entityType: activeStop.entityType
        });
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-white font-black uppercase tracking-widest text-xs animate-pulse">Optimizando Ruta...</p>
            </div>
        );
    }

    // Route Completed Screen
    if (hasLoadedData && stops.length === 0) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 rounded-[32px] bg-primary/20 flex items-center justify-center mb-8"
                >
                    <CheckCircle2 className="w-12 h-12 text-primary" />
                </motion.div>
                <h1 className="text-4xl font-black italic uppercase italic tracking-tighter mb-4">Ruta Finalizada</h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-12">Todas las paradas han sido completadas</p>

                <div className="w-full max-w-sm grid grid-cols-1 gap-4">
                    <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-between">
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase text-primary mb-1">Monto Total Hoy</p>
                            <p className="text-2xl font-black">$0.00</p>
                        </div>
                        <Badge className="bg-primary text-black">DIARIO</Badge>
                    </div>
                </div>

                <Button
                    className="mt-12 h-16 w-full max-w-sm rounded-[32px] bg-white text-black font-black uppercase italic text-lg"
                    onClick={() => window.location.reload()}
                >
                    Finalizar Turno
                </Button>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-[#020202] text-white overflow-hidden relative font-sans">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <MapContainer
                    center={[19.4326, -99.1332]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; OpenStreetMap &copy; CARTO'
                    />
                    {currentPosition && (
                        <Marker position={currentPosition} icon={L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div style="background-color: #facc15; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #facc15;"></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })} />
                    )}
                    {activeStop?.locationLat && activeStop?.locationLng && (
                        <Marker position={[activeStop.locationLat, activeStop.locationLng]} />
                    )}
                    {currentPosition && activeStop?.locationLat && (
                        <RecenterMap coords={currentPosition} />
                    )}
                </MapContainer>
                {/* Gradient Overlay for Top */}
                <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black to-transparent pointer-events-none" />
            </div>

            {/* Top Bar Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                                <Truck className="text-black w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Conductor</p>
                                <p className="text-sm font-black uppercase italic tracking-tight">{employee.name}</p>
                            </div>
                        </div>
                        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-2xl flex items-center gap-2 h-[50px]">
                            <Wifi className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-500">LIVE</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl h-12 w-12 text-red-500"
                        onClick={() => window.location.reload()}
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>

                {/* Next Move Tip */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-primary text-black p-4 rounded-3xl shadow-2xl flex items-center justify-between"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center shrink-0">
                            <Navigation className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">
                                {activeStop?.type === 'delivery' ? 'En camino a entregar' : 'En camino a recoger'}
                            </p>
                            <p className="text-lg font-black uppercase truncate">{activeStop?.customerName || "Buscando..."}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Floating Action Buttons */}
            <div className="absolute right-4 bottom-72 z-10 flex flex-col gap-3">
                <Button
                    size="icon"
                    className="h-14 w-14 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-xl"
                    onClick={() => {
                        if (currentPosition) {
                            // Manual recenter
                        }
                    }}
                >
                    <MapIcon className="w-6 h-6" />
                </Button>
                <Button
                    size="icon"
                    className="h-14 w-14 rounded-full bg-primary text-black shadow-xl shadow-primary/20"
                    onClick={() => {
                        if (activeStop) {
                            window.open(`https://maps.google.com/?q=${encodeURIComponent(activeStop.address)}`);
                        }
                    }}
                >
                    <Navigation className="w-6 h-6" />
                </Button>
            </div>

            {/* Bottom Drawer Stop Interface */}
            <Drawer.Root open={!!activeStop} modal={false} dismissible={false}>
                <Drawer.Portal>
                    <Drawer.Content className="bg-[#0a0a0a] flex flex-col rounded-t-[40px] h-[340px] fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 shadow-2xl">
                        <div className="p-4 bg-[#0a0a0a] flex-1 rounded-t-[40px]">
                            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/10 mb-4" />

                            <div className="flex items-start justify-between mb-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge className={cn(
                                            "uppercase text-[9px] font-black px-2",
                                            activeStop?.type === 'delivery' ? "bg-blue-500 text-white" : "bg-amber-500 text-black"
                                        )}>
                                            {activeStop?.type === 'delivery' ? 'Entrega' : 'Recolección'}
                                        </Badge>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{activeStop?.timeWindow || "Sin horario"}</span>
                                    </div>
                                    <h2 className="text-2xl font-black italic uppercase italic tracking-tight truncate leading-tight">
                                        {activeStop?.customerName}
                                    </h2>
                                    <div className="flex items-center gap-2 text-slate-400 mt-1">
                                        <MapPin className="w-4 h-4 shrink-0" />
                                        <p className="text-[11px] truncate">{activeStop?.address}</p>
                                    </div>
                                    {distanceToStop && stopStatus === 'en_camino' && (
                                        <div className="flex items-center gap-2 text-primary mt-2">
                                            <Clock className="w-4 h-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">
                                                Llegada en ~{(distanceToStop * 3).toFixed(0)} min ({(distanceToStop).toFixed(1)} km)
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <a
                                    href={`tel:${activeStop?.phone}`}
                                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0"
                                >
                                    <Phone className="w-6 h-6 text-primary" />
                                </a>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10"
                                    onClick={() => setShowTicketModal(true)}
                                >
                                    <Package className="w-6 h-6 text-white" />
                                </Button>
                            </div>

                            <ScrollArea className="h-20 mb-4">
                                <div className="space-y-2">
                                    {activeStop?.products.map((p: { name: string; quantity: number }, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <Package className="w-4 h-4 text-primary" />
                                                <span className="text-sm font-bold">{p.name}</span>
                                            </div>
                                            <span className="text-xs font-black bg-primary/20 text-primary px-2 py-0.5 rounded-lg">x{p.quantity}</span>
                                        </div>
                                    ))}
                                    {activeStop?.notes && (
                                        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-slate-400 font-medium leading-normal">{activeStop.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Sticky Action Button Workflow */}
                            <div className="flex gap-3">
                                {stopStatus === 'pending' && (
                                    <Button
                                        onClick={() => setStopStatus('en_camino')}
                                        className="flex-1 h-16 rounded-3xl bg-blue-600 text-white font-black uppercase italic text-lg shadow-xl"
                                    >
                                        Iniciar Viaje
                                    </Button>
                                )}

                                {stopStatus === 'en_camino' && (
                                    <Button
                                        onClick={() => setStopStatus('arrived')}
                                        className="flex-1 h-16 rounded-3xl bg-amber-500 text-black font-black uppercase italic text-lg shadow-xl"
                                    >
                                        <MapPin className="mr-2" />
                                        He Llegado
                                        {distanceToStop && distanceToStop < 1 ? ` (${(distanceToStop * 1000).toFixed(0)}m)` : ""}
                                    </Button>
                                )}

                                {stopStatus === 'arrived' && (
                                    <Button
                                        onClick={() => setStopStatus('operación')}
                                        className="flex-1 h-16 rounded-3xl bg-white text-black font-black uppercase italic text-lg shadow-xl"
                                    >
                                        <Package className="mr-2" />
                                        {activeStop?.type === 'delivery' ? 'Iniciar Descarga' : 'Iniciar Carga'}
                                    </Button>
                                )}

                                {stopStatus === 'operación' && (
                                    <Button
                                        onClick={() => setStopStatus('finalizada_operación')}
                                        className="flex-1 h-16 rounded-3xl bg-emerald-500 text-white font-black uppercase italic text-lg shadow-xl"
                                    >
                                        <CheckCircle2 className="mr-2" />
                                        Carga Lista
                                    </Button>
                                )}

                                {stopStatus === 'finalizada_operación' && (
                                    <Button
                                        onClick={() => setShowSignatureModal(true)}
                                        className="flex-1 h-16 rounded-3xl bg-primary text-black font-black uppercase italic text-lg shadow-xl"
                                    >
                                        Firma y Pago
                                    </Button>
                                )}

                                {stopStatus !== 'pending' && (
                                    <Button
                                        variant="outline"
                                        className="h-16 w-16 rounded-3xl border-white/10"
                                        onClick={() => {
                                            if (stopStatus === 'en_camino') setStopStatus('pending');
                                            if (stopStatus === 'arrived') setStopStatus('en_camino');
                                            if (stopStatus === 'operación') setStopStatus('arrived');
                                            if (stopStatus === 'finalizada_operación') setStopStatus('operación');
                                        }}
                                    >
                                        <X className="w-6 h-6" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Signature Modal */}
            <AnimatePresence>
                {showSignatureModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex flex-col p-6"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter">Finalizar Entrega</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Firma del receptor</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-2xl bg-white/5"
                                onClick={() => setShowSignatureModal(false)}
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        </div>

                        <div className="flex-1 bg-white rounded-[40px] overflow-hidden mb-6 relative border-4 border-primary">
                            <SignatureCanvas
                                ref={signatureRef}
                                canvasProps={{
                                    className: "w-full h-full",
                                    style: { width: '100%', height: '100%' }
                                }}
                                backgroundColor="white"
                            />

                            {/* Signature Overlay - Transaction Awareness */}
                            <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none">
                                <div className="bg-black/90 text-white p-6 rounded-3xl border border-primary/30 shadow-2xl backdrop-blur-md">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-primary mb-1">Confirmando para:</p>
                                            <h4 className="text-xl font-black uppercase italic">{activeStop?.customerName}</h4>
                                        </div>
                                        <Badge className="bg-primary text-black font-black">
                                            {activeStop?.entityType === 'sale' ? 'DOCUMENTO DE ENTREGA' : 'RECIBO DE RECOLECCIÓN'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1 mb-4">
                                        {activeStop?.products.map((p: { name: string; quantity: number }, i: number) => (
                                            <p key={i} className="text-xs font-bold text-slate-300">
                                                • {p.quantity} x {p.name}
                                            </p>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-500">Monto Transacción</p>
                                            <p className="text-2xl font-black text-white">
                                                ${((activeStop?.expectedAmount || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                <span className="text-xs ml-1 text-slate-400 font-normal underline">
                                                    {activeStop?.entityType === 'sale' ? '(POR COBRAR)' : '(A PAGAR)'}
                                                </span>
                                            </p>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400">FECHA: {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest border border-slate-200 px-6 py-2 rounded-full bg-white shadow-lg animate-bounce">
                                    Firme aquí para conformar
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pb-8">
                            <Button
                                variant="outline"
                                className="h-16 rounded-3xl border-white/10 font-black uppercase"
                                onClick={() => signatureRef.current?.clear()}
                            >
                                Limpiar
                            </Button>
                            <Button
                                className="h-16 rounded-3xl bg-primary text-black font-black uppercase shadow-xl shadow-primary/20"
                                onClick={confirmCompletion}
                                disabled={completeStopMutation.isPending}
                            >
                                {completeStopMutation.isPending ? <Loader2 className="animate-spin" /> : "Registrar"}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ticket Modal */}
            <AnimatePresence>
                {showTicketModal && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
                    >
                        <Card className="w-full max-w-sm bg-white text-black rounded-[40px] overflow-hidden shadow-2xl">
                            <CardContent className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-primary/10 p-3 rounded-2xl">
                                        <Truck className="w-6 h-6 text-primary" />
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setShowTicketModal(false)} className="rounded-full">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-black italic uppercase italic tracking-tighter mb-1">Comprobante Digital</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nexo Logs v1.0 • {activeStop?.id.slice(0, 8)}</p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium">Entidad:</span>
                                        <span className="font-black uppercase">{activeStop?.customerName}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium">Concepto:</span>
                                        <span className="font-bold">{activeStop?.type === 'delivery' ? 'Entrega Mercancía' : 'Recolección Insumos'}</span>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Desglose:</p>
                                        {activeStop?.products.map((p: { name: string; quantity: number }, i: number) => (
                                            <div key={i} className="flex justify-between text-xs mb-1">
                                                <span>{p.name}</span>
                                                <span className="font-bold">x{p.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-4 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
                                        <span className="text-lg font-black uppercase italic tracking-tighter">Total</span>
                                        <span className="text-2xl font-black">
                                            ${((activeStop?.expectedAmount || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 rounded-2xl bg-black text-white font-black uppercase tracking-widest shadow-xl"
                                    onClick={() => setShowTicketModal(false)}
                                >
                                    Cerrar Ticket
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .leaflet-container { 
                    background: #020202 !important; 
                }
                .vaul-overlay { 
                    background: rgba(0,0,0,0.6) !important; 
                }
                .custom-div-icon {
                    background: none !important;
                    border: none !important;
                }
            `}</style>
        </div>
    );
}

export default DriverTerminalMobile;
