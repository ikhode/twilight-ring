import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { VisionCamera } from "@/components/iot/VisionCamera";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Truck, Package, Activity, AlertCircle, Fuel, Settings2, Gauge, History, Sparkles, Plus, Map, Navigation, LocateFixed, Brain, Play,
    Smartphone,
    QrCode,
    Copy,
    Check,
    Loader2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom "Cognitive" Vehicle Icon
const createVehicleIcon = (status: string) => {
    return L.divIcon({
        className: 'custom-vehicle-icon',
        html: `<div class="relative flex items-center justify-center w-10 h-10">
                 <div class="absolute inset-0 ${status === 'active' ? 'bg-green-500/30 animate-ping' : 'bg-slate-500/30'} rounded-full"></div>
                 <div class="absolute inset-0 ${status === 'active' ? 'bg-green-500/20' : 'bg-slate-500/20'} rounded-full border border-${status === 'active' ? 'green-500' : 'slate-500'}"></div>
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck relative z-10 drop-shadow-md"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};

const MapController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    map.setView(center);
    return null;
};

interface Vehicle {
    id: string;
    plate: string;
    model: string;
    currentMileage: number;
    status: string;
    lastLocation: { lat: number; lng: number; timestamp: string };
}

interface Employee {
    id: string;
    name: string;
    role: string;
}

// Driver Link Generator
function DriverLinkDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const { session } = useAuth();
    // Fetch data for selection
    // Note: In real app, we might need a dedicated query for available vehicles/drivers
    // For now, we reuse the queries from the main page if passed, or fetch here. 
    // To keep it simple, let's fetch here or rely on prop drilling. 
    // Let's reuse the hooks pattern since it's cleaner.

    const [selectedDriver, setSelectedDriver] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState("");
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    const { data: vehicles = [] } = useQuery<Vehicle[]>({
        queryKey: ["/api/logistics/fleet/vehicles"],
        queryFn: async () => {
            const res = await fetch("/api/logistics/fleet/vehicles", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: drivers = [] } = useQuery<Employee[]>({
        queryKey: ["/api/hr/employees"],
        queryFn: async () => {
            const res = await fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/kiosks/driver/link/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ driverId: selectedDriver, vehicleId: selectedVehicle })
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: (data) => {
            const link = `${window.location.origin}/driver-pwa?token=${data.token}`;
            setGeneratedLink(link);
            toast({ title: "Enlace Generado", description: "Comparte este enlace con el conductor." });
        }
    });

    const copyLink = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink);
        toast({ title: "Copiado", description: "Enlace en portapapeles" });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setGeneratedLink(null); }}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="bg-black/40 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary backdrop-blur-md">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Vincular App
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Vincular Conductor (PWA)</DialogTitle>
                    <DialogDescription>Genera un enlace seguro para activar la App del Conductor.</DialogDescription>
                </DialogHeader>

                {!generatedLink ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Conductor</Label>
                            <Select onValueChange={setSelectedDriver}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar Conductor" /></SelectTrigger>
                                <SelectContent>
                                    {(drivers || []).filter((d: any) => d.role === 'driver' || true).map((d: any) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Vehículo</Label>
                            <Select onValueChange={setSelectedVehicle}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar Vehículo" /></SelectTrigger>
                                <SelectContent>
                                    {vehicles.map((v: any) => (
                                        <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            className="w-full"
                            onClick={() => generateMutation.mutate()}
                            disabled={!selectedDriver || !selectedVehicle || generateMutation.isPending}
                        >
                            {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                            Generar Enlace Seguro
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                            <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <h3 className="font-bold text-green-500">Enlace Activo</h3>
                            <p className="text-xs text-muted-foreground">Válido por 24 horas</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input value={generatedLink} readOnly className="font-mono text-xs" />
                            <Button size="icon" variant="outline" onClick={copyLink}>
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button variant="secondary" className="w-full" onClick={() => setIsOpen(false)}>
                            Cerrar
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function Logistics() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);

    const createVehicleMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/logistics/fleet/vehicles", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create vehicle");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/logistics/fleet/vehicles"] });
            setIsAddOpen(false);
            toast({ title: "Vehículo Registrado", description: "Unidad añadida a la flota." });
        }
    });

    const { data: vehiclesData = [] } = useQuery({
        queryKey: ["/api/logistics/fleet/vehicles"],
        queryFn: async () => {
            const res = await fetch("/api/logistics/fleet/vehicles", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: maintenanceLogs = [] } = useQuery({
        queryKey: ["/api/logistics/fleet/maintenance"],
        queryFn: async () => {
            const res = await fetch("/api/logistics/fleet/maintenance", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: salesOrders = [] } = useQuery({
        queryKey: ["/api/operations/sales/orders"],
        queryFn: async () => {
            const res = await fetch("/api/operations/sales/orders", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Calculate maintenance alerts client-side for now
    // Assume service needed every 10,000 km
    const vehiclesNeedingService = Array.isArray(vehiclesData) ? vehiclesData.filter((v: any) => {
        // Find last maintenance
        const lastMaint = maintenanceLogs
            .filter((l: any) => l.vehicleId === v.id && l.type === 'preventive')
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        const lastServiceMileage = lastMaint?.mileageIn || 0;
        return (v.currentMileage - lastServiceMileage) > 10000;
    }) : [];

    // Realtime subscriptions
    useSupabaseRealtime({ table: 'vehicles', queryKey: ["/api/logistics/fleet/vehicles"] });
    useSupabaseRealtime({ table: 'sales', queryKey: ["/api/operations/sales/orders"] });
    useSupabaseRealtime({ table: 'routes', queryKey: ["/api/logistics/fleet/routes/active"] });

    const { data: employees = [] } = useQuery({
        queryKey: ["/api/hr/employees"],
        queryFn: async () => {
            const res = await fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: activeRoutes = [] } = useQuery({
        queryKey: ["/api/logistics/fleet/routes/active"],
        queryFn: async () => {
            // Mock fetching active routes - In real app create specific endpoint
            // For now we'll just check if we can simulate the "Active" state
            return [];
        }
    });

    const generateRouteMutation = useMutation({
        mutationFn: async ({ vehicleId, driverId }: { vehicleId: string, driverId: string }) => {
            const res = await fetch("/api/logistics/fleet/routes/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ vehicleId, driverId })
            });
            if (!res.ok) throw new Error("Failed to generate route");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Ruta Cognitiva Generada", description: "El sistema ha asignado óptimamente la ruta." });
        }
    });


    return (
        <AppLayout title="Logística Inteligente">
            <Tabs defaultValue="vision" className="space-y-6 h-full">
                <TabsList className="bg-slate-900/50 border border-slate-800">
                    <TabsTrigger value="vision">Vision AI Dashboard</TabsTrigger>
                    <TabsTrigger value="fleet">Gestión de Flota</TabsTrigger>
                    <TabsTrigger value="routes">Rutas Inteligentes</TabsTrigger>
                </TabsList>

                <TabsContent value="vision" className="h-[calc(100vh-12rem)]">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Main Feed: Smart Dock */}
                        <div className="lg:col-span-2 space-y-6">
                            <VisionCamera />

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="bg-slate-900/50 border-slate-800">
                                    <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-slate-400">Vehículos Activos</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0 text-2xl font-black text-white">{vehiclesData.length}</CardContent>
                                </Card>
                                <Card className="bg-slate-900/50 border-slate-800">
                                    <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-slate-400">Entregas Hoy</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0 text-2xl font-black text-white">
                                        {salesOrders.filter((s: any) => new Date(s.date).toDateString() === new Date().toDateString()).length}
                                    </CardContent>
                                </Card>
                                <Card className="bg-slate-900/50 border-slate-800">
                                    <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-slate-400">Mantenimiento</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0 text-2xl font-black text-orange-400">{vehiclesNeedingService.length}</CardContent>
                                </Card>
                                <Card className="bg-slate-900/50 border-slate-800">
                                    <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-slate-400">Eficiencia</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0 text-2xl font-black text-green-400">100%</CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Sidebar: Event Log */}
                        <div className="space-y-6 h-full flex flex-col">
                            <Card className="bg-slate-900/50 border-slate-800 flex-1 overflow-hidden flex flex-col">
                                <CardHeader className="border-b border-white/5 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" />
                                        <CardTitle className="text-sm font-bold">Registro de Actividad</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1">
                                    <div className="divide-y divide-white/5">
                                        {/* Using Maintenance and Sales as "Events" for now as we don't have Vision Events */}
                                        {salesOrders.length === 0 && maintenanceLogs.length === 0 ? (
                                            <div className="p-6 text-center text-slate-500 text-xs">
                                                No hay actividad reciente detectada por el sistema.
                                            </div>
                                        ) : (
                                            <>
                                                {salesOrders.slice(0, 5).map((order: any) => (
                                                    <div key={order.id} className="p-4 flex items-start gap-3 hover:bg-white/5 transition-colors">
                                                        <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                                                            <Package className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-200">
                                                                Orden de Venta: {order.product?.name || "Producto"}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 mt-1">
                                                                {new Date(order.date).toLocaleTimeString()} • {order.quantity} unidades
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {maintenanceLogs.slice(0, 5).map((log: any) => (
                                                    <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-white/5 transition-colors">
                                                        <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                                                            <Truck className="w-4 h-4 text-orange-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-200">
                                                                Mantenimiento: {log.vehicle?.plate || "Vehículo"}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 mt-1">
                                                                {new Date(log.date).toLocaleDateString()} • {log.type}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {vehiclesNeedingService.length > 0 && (
                                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 shrink-0">
                                    <div className="flex items-center gap-2 text-yellow-500 mb-2">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Mantenimiento Requerido</span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        Hay {vehiclesNeedingService.length} vehículos que han superado el umbral de servicio preventivo.
                                    </p>
                                    <Button size="sm" className="w-full mt-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                                        Programar Servicio
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="fleet">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <Card className="bg-slate-900/50 border-slate-800">
                                <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg font-black italic uppercase tracking-tighter">Inventario de Vehículos</CardTitle>
                                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="gap-2">
                                                <Plus className="w-4 h-4" /> Registrar Unidad
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Nueva Unidad</DialogTitle>
                                            </DialogHeader>
                                            <form onSubmit={(e) => {
                                                e.preventDefault();
                                                const formData = new FormData(e.currentTarget);
                                                createVehicleMutation.mutate({
                                                    plate: formData.get("plate"),
                                                    model: formData.get("model"),
                                                    year: parseInt(formData.get("year") as string),
                                                    currentMileage: parseInt(formData.get("mileage") as string),
                                                    status: "active"
                                                });
                                            }} className="space-y-4 py-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Placa / ID</Label>
                                                        <Input name="plate" required placeholder="XYZ-123" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Modelo</Label>
                                                        <Input name="model" required placeholder="Ford Transit" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Año</Label>
                                                        <Input name="year" type="number" required defaultValue={new Date().getFullYear()} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Kilometraje Actual</Label>
                                                        <Input name="mileage" type="number" required defaultValue="0" />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button type="submit" disabled={createVehicleMutation.isPending}>
                                                        {createVehicleMutation.isPending ? "Guardando..." : "Registrar"}
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-white/5 max-h-[50vh] overflow-y-auto">
                                        {(!Array.isArray(vehiclesData) || vehiclesData.length === 0) ? (
                                            <div className="p-12 text-center">
                                                <Truck className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                                <p className="text-slate-500">No hay vehículos registrados</p>
                                            </div>
                                        ) : (
                                            vehiclesData.map((v: any) => (
                                                <div key={v.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                                            <Truck className="w-6 h-6 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white uppercase">{v.plate} - {v.model}</p>
                                                            <p className="text-xs text-slate-500">{v.year} • {v.currentMileage.toLocaleString()} km</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Badge className={v.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                                                            {v.status}
                                                        </Badge>
                                                        <Button variant="ghost" size="icon"><Settings2 className="w-4 h-4" /></Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="bg-slate-900/50 border-slate-800 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4">
                                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                </div>
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Predicción Mantenimiento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                            <div className="flex items-center gap-2 text-orange-400 mb-2">
                                                <Gauge className="w-4 h-4" />
                                                <span className="text-xs font-bold">ALERTA PREVENTIVA</span>
                                            </div>
                                            <p className="text-xs text-slate-300">
                                                {vehiclesNeedingService.length > 0
                                                    ? `Basado en el kilometraje, **${vehiclesNeedingService.length} vehículos** requieren servicio.`
                                                    : "Todos los vehículos están al día con su mantenimiento preventivo."}
                                            </p>
                                        </div>
                                        <Button variant="outline" className="w-full gap-2 text-xs border-white/10 hover:bg-white/5">
                                            <History className="w-3 h-3" /> Ver Historial Completo
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="routes">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 h-[70vh] flex flex-col">
                            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 bg-slate-900/50">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Brain className="w-5 h-5 text-primary animate-pulse" />
                                        <span>Cognitive Logistics Flow</span>
                                    </CardTitle>
                                    <p className="text-xs text-slate-500 mt-1">"Guardian" está optimizando rutas en tiempo real.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                        <Activity className="w-3 h-3 mr-1" /> ACTIVE
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 relative p-0 overflow-hidden bg-slate-950">
                                {/* LIVE MAP VISUALIZATION - Leaflet */}
                                <div className="absolute inset-0 z-0 bg-slate-950">
                                    <MapContainer
                                        center={[19.4326, -99.1332]}
                                        zoom={13}
                                        style={{ height: '100%', width: '100%', background: '#020617' }}
                                        zoomControl={false}
                                        dragging={true}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                            subdomains='abcd'
                                            maxZoom={20}
                                        />

                                        {/* Mock Nodes Visualization */}
                                        <Marker position={[19.42, -99.12]} icon={L.divIcon({ className: '', html: '<div class="w-3 h-3 bg-blue-500 rounded-full border border-black shadow-[0_0_10px_blue]"></div>' })}>
                                            <LeafletTooltip direction="top" offset={[0, -5]} opacity={1} permanent>CEDIS Principal</LeafletTooltip>
                                        </Marker>

                                        <Marker position={[19.44, -99.14]} icon={L.divIcon({ className: '', html: '<div class="w-2 h-2 bg-slate-500 rounded-full opacity-50"></div>' })}>
                                            <Popup>Cliente: Tienda A</Popup>
                                        </Marker>

                                        {/* Mock Nodes */}
                                        {[
                                            { x: 20, y: 30, type: "warehouse" },
                                            { x: 50, y: 50, type: "client" },
                                            { x: 80, y: 20, type: "client" },
                                            { x: 60, y: 80, type: "client" },
                                        ].map((node, i) => (
                                            <div key={i} className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center group cursor-pointer hover:scale-125 transition-all"
                                                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                            >
                                                <div className={cn("w-1.5 h-1.5 rounded-full", node.type === 'warehouse' ? "bg-primary" : "bg-white/50")} />

                                                {/* Hover Tooltip */}
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                    {node.type === 'warehouse' ? 'Centro de Distribución' : 'Punto de Entrega'}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Active Vehicle Marker (Mock or Real) */}
                                        <Marker
                                            position={[19.4326, -99.1332]}
                                            icon={createVehicleIcon('active')}
                                        >
                                            <Popup className="glass-popup">
                                                <div className="p-1">
                                                    <p className="font-bold text-sm">Unidad {vehiclesData[0]?.plate || "DEMO-01"}</p>
                                                    <p className="text-xs text-slate-500">En Ruta • 45 km/h</p>
                                                    <Badge className="mt-1 bg-green-500 hover:bg-green-600 text-[10px] h-5">OPTIMO</Badge>
                                                </div>
                                            </Popup>
                                            <LeafletTooltip direction="bottom" offset={[0, 20]} opacity={0.8} permanent>
                                                {vehiclesData[0]?.plate || "DEMO-01"}
                                            </LeafletTooltip>
                                        </Marker>

                                        <MapController center={[19.4326, -99.1332]} />
                                    </MapContainer>
                                </div>

                                {/* Controls Overlay */}
                                <div className="absolute bottom-6 left-6 right-6 flex justify-center">
                                    <div className="glass-card bg-black/60 border-white/10 p-2 rounded-2xl flex items-center gap-2 backdrop-blur-md">
                                        <div className="px-4 border-r border-white/10">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asignación Cognitiva</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-2">
                                            {/* Driver Link PWA */}
                                            <DriverLinkDialog />

                                            <div className="h-4 w-px bg-white/10 mx-1"></div>

                                            {/* Quick Auto Assign for Demo */}
                                            {vehiclesData.length > 0 && employees.length > 0 ? (
                                                <Button
                                                    size="sm"
                                                    className="bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_0_15px_rgba(79,70,229,0.4)] animate-pulse hover:animate-none transition-all"
                                                    onClick={() => generateRouteMutation.mutate({
                                                        vehicleId: vehiclesData[0].id,
                                                        driverId: employees[0].id
                                                    })}
                                                    disabled={generateRouteMutation.isPending}
                                                >
                                                    {generateRouteMutation.isPending ? <Brain className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                                    OPTIMIZAR Y ASIGNAR
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="ghost" disabled className="text-slate-500">
                                                    Requiere Vehículos/Conductores
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="bg-slate-900/50 border-slate-800 max-h-[70vh] flex flex-col">
                                <CardHeader className="shrink-0 border-b border-white/5">
                                    <CardTitle className="text-sm font-bold uppercase text-slate-400">Panel del Supervisor</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 overflow-y-auto flex-1 p-4">
                                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-orange-500/20 rounded-lg shrink-0">
                                                <AlertCircle className="w-5 h-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-orange-200">Alerta de Tráfico</h4>
                                                <p className="text-xs text-slate-400 mt-1">Retraso detectado en sector Norte. "Guardian" sugiere desvío por Av. Central (+4 min).</p>
                                                <Button size="sm" variant="ghost" className="h-6 mt-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 p-0">Aprobar Desvío</Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">En Ruta ({salesOrders.length > 0 ? '1' : '0'})</h4>
                                        {vehiclesData.length > 0 ? (
                                            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between group hover:border-primary/50 transition-colors cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                                                            <Truck className="w-5 h-5 text-slate-300" />
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                                            <Activity className="w-2.5 h-2.5 text-black" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{vehiclesData[0].plate}</p>
                                                        <p className="text-[10px] text-slate-400">{employees[0]?.name || "Conductor Asignado"}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-green-400">En Tiempo</p>
                                                    <p className="text-[10px] text-slate-500">ETA 14:30</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-600 italic">Sin vehículos activos.</p>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Entregas Pendientes</h4>
                                        <div className="space-y-2">
                                            {salesOrders.slice(0, 3).map((order: any) => (
                                                <div key={order.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                                    <p className="text-xs text-slate-300 flex-1 truncate">Orden #{order.id.slice(0, 8)}</p>
                                                    <Badge variant="outline" className="text-[10px] scale-90 text-slate-500">Pendiente</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </AppLayout>
    );
}
