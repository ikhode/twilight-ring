import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { useConfiguration } from "@/context/ConfigurationContext";
import { CognitiveInput, CognitiveField } from "@/components/cognitive";
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
                        <CognitiveField label="Conductor" value={selectedDriver} semanticType="category">
                            <Select onValueChange={setSelectedDriver}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar Conductor" /></SelectTrigger>
                                <SelectContent>
                                    {(drivers || []).filter((d: any) => d.role === 'driver' || true).map((d: any) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CognitiveField>
                        <CognitiveField label="Vehículo" value={selectedVehicle} semanticType="method">
                            <Select onValueChange={setSelectedVehicle}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar Vehículo" /></SelectTrigger>
                                <SelectContent>
                                    {vehicles.map((v: any) => (
                                        <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CognitiveField>
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


function VehicleDetailsDialog({
    open,
    onOpenChange,
    vehicle,
    maintenanceLogs,
    fuelLogs
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    vehicle: any,
    maintenanceLogs: any[],
    fuelLogs: any[]
}) {
    if (!vehicle) return null;

    const vMaintenance = maintenanceLogs.filter((l: any) => l.vehicleId === vehicle.id);
    const vFuel = fuelLogs.filter((l: any) => l.vehicleId === vehicle.id);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        {vehicle.plate} - {vehicle.model}
                    </DialogTitle>
                    <DialogDescription>
                        Historial y detalles de la unidad
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="maintenance">Mantenimiento ({vMaintenance.length})</TabsTrigger>
                        <TabsTrigger value="fuel">Combustible ({vFuel.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-xs text-slate-500 uppercase">Kilometraje Actual</span>
                                <p className="text-2xl font-bold">{vehicle.currentMileage?.toLocaleString()} km</p>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-xs text-slate-500 uppercase">Estado</span>
                                <Badge className={cn("ml-2", vehicle.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500')}>
                                    {vehicle.status}
                                </Badge>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-xs text-slate-500 uppercase">Año</span>
                                <p className="text-lg font-medium">{vehicle.year}</p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="maintenance">
                        <div className="rounded-md border border-slate-800">
                            {vMaintenance.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">Sin registros de mantenimiento.</div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {vMaintenance.map((log: any) => (
                                        <div key={log.id} className="p-3 flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm text-slate-200">{log.description}</p>
                                                <p className="text-xs text-slate-500">{new Date(log.date).toLocaleDateString()} • {log.type}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm text-slate-200">${(log.cost / 100).toFixed(2)}</p>
                                                <p className="text-xs text-slate-500">{log.mileageIn?.toLocaleString()} km</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="fuel">
                        <div className="rounded-md border border-slate-800">
                            {vFuel.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">Sin registros de combustible.</div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {vFuel.map((log: any) => (
                                        <div key={log.id} className="p-3 flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm text-slate-200">{log.liters} Litros</p>
                                                <p className="text-xs text-slate-500">{new Date(log.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm text-slate-200">${(log.cost / 100).toFixed(2)}</p>
                                                <p className="text-xs text-slate-500">{log.mileage?.toLocaleString()} km</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

export default function Logistics() {
    const { session } = useAuth();
    const { toast } = useToast();
    const { universalConfig } = useConfiguration();
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
    const [serviceVehicleId, setServiceVehicleId] = useState<string>("");
    const [vehicleDetails, setVehicleDetails] = useState<any>(null);

    const { data: fuelLogs = [] } = useQuery({
        queryKey: ["/api/logistics/fleet/fuel"],
        queryFn: async () => {
            const res = await fetch("/api/logistics/fleet/fuel", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

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

    const createMaintenanceMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/logistics/fleet/vehicles/${data.vehicleId}/maintenance`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ ...data, date: new Date().toISOString() })
            });
            if (!res.ok) throw new Error("Failed to schedule maintenance");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/logistics/fleet/maintenance"] });
            setIsServiceDialogOpen(false);
            toast({ title: "Mantenimiento Programado", description: "Se ha registrado la orden de servicio." });
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
        queryKey: ["/api/sales"],
        queryFn: async () => {
            const res = await fetch("/api/sales", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: purchaseOrders = [] } = useQuery({
        queryKey: ["/api/purchases"],
        queryFn: async () => {
            const res = await fetch("/api/purchases", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: activeTerminals = [] } = useQuery({
        queryKey: ["/api/kiosks"],
        queryFn: async () => {
            const res = await fetch("/api/kiosks", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            const data = await res.json();
            // Filter only driver kiosks or those with recent location
            return data.filter((k: any) => k.type === "driver_kiosk" || (k.lastLatitude && k.lastLongitude));
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
    useSupabaseRealtime({ table: 'sales', queryKey: ["/api/sales"] });
    useSupabaseRealtime({ table: 'purchases', queryKey: ["/api/purchases"] });
    useSupabaseRealtime({ table: 'routes', queryKey: ["/api/logistics/fleet/routes/active"] });
    useSupabaseRealtime({ table: 'terminals', queryKey: ["/api/kiosks"] });
    useSupabaseRealtime({ table: 'ai_insights', queryKey: ["/api/cognitive/insights"] });

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
            const res = await fetch("/api/logistics/fleet/routes/active", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const { data: aiInsights = [] } = useQuery({
        queryKey: ["/api/cognitive/insights"],
        queryFn: async () => {
            const res = await fetch("/api/cognitive/insights", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Derived state for map (using existing terminals data)
    const driverLocations = activeTerminals
        .filter((k: any) => k.lastLatitude && k.lastLongitude)
        .map((k: any) => {
            const emp = employees.find((e: any) => e.id === k.driverId);
            return {
                employeeId: k.driverId || k.id,
                employeeName: emp?.name || k.name || 'Conductor',
                latitude: k.lastLatitude,
                longitude: k.lastLongitude,
                timestamp: k.updatedAt || new Date().toISOString(),
                status: k.status || 'active'
            };
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
            <Tabs defaultValue="dashboard" className="space-y-6 h-full">
                <TabsList className="bg-slate-900/50 border border-slate-800">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="fleet">Gestión de Flota</TabsTrigger>
                    <TabsTrigger value="routes" data-tour="routes-section">Rutas Inteligentes</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="h-[calc(100vh-12rem)]">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                        {/* Main Area: Map & Widgets */}
                        <div className="lg:col-span-3 flex flex-col gap-6">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="bg-slate-900/50 border-slate-800">
                                    <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-slate-400 uppercase tracking-wider">Flota Activa</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="flex items-end gap-2">
                                            <span className="text-2xl font-black text-white">{driverLocations.length}</span>
                                            <span className="text-xs text-green-500 font-bold mb-1">En Ruta</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-slate-900/50 border-slate-800">
                                    <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-slate-400 uppercase tracking-wider">Entregas Pendientes</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="flex items-end gap-2">
                                            <span className="text-2xl font-black text-white">
                                                {salesOrders.filter((s: any) => s.deliveryStatus !== 'delivered').length}
                                            </span>
                                            <span className="text-xs text-slate-500 mb-1">Órdenes</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-slate-900/50 border-slate-800">
                                    <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-slate-400 uppercase tracking-wider">Vehículos Disp.</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="flex items-end gap-2">
                                            <span className="text-2xl font-black text-white">
                                                {vehiclesData.filter((v: any) => v.status === 'active').length}
                                            </span>
                                            <span className="text-xs text-slate-500 mb-1">De {vehiclesData.length} total</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-slate-900/50 border-slate-800">
                                    <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-slate-400 uppercase tracking-wider">Eficiencia</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="flex items-end gap-2">
                                            <span className="text-2xl font-black text-green-400">98.5%</span>
                                            <span className="text-xs text-green-500/50 mb-1">↑ 2.1%</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Live Map */}
                            <Card className="flex-1 bg-slate-950 border-slate-800 overflow-hidden relative group" data-tour="fleet-map">
                                <div className="absolute top-4 right-4 z-[400] bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-xs font-bold text-white tracking-widest uppercase">Live Tracking</span>
                                </div>

                                <MapContainer
                                    center={[universalConfig.cedisLat || 19.4326, universalConfig.cedisLng || -99.1332]}
                                    zoom={12}
                                    style={{ height: '100%', width: '100%', background: '#020617' }}
                                    zoomControl={false}
                                >
                                    <TileLayer
                                        attribution='&copy; CARTO'
                                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    />

                                    {/* CEDIS */}
                                    <Marker
                                        position={[universalConfig.cedisLat || 19.4326, universalConfig.cedisLng || -99.1332]}
                                        icon={L.divIcon({ className: '', html: '<div class="w-6 h-6 bg-primary rounded-full border-4 border-slate-900 shadow-[0_0_20px_rgba(59,130,246,0.6)] flex items-center justify-center"><div class="w-1.5 h-1.5 bg-white rounded-full"></div></div>' })}
                                    >
                                        <LeafletTooltip direction="top" offset={[0, -10]} opacity={1} permanent className="custom-tooltip">
                                            CEDIS Principal
                                        </LeafletTooltip>
                                    </Marker>

                                    {/* Drivers */}
                                    {driverLocations.map((driver: any) => (
                                        <Marker
                                            key={driver.employeeId}
                                            position={[driver.latitude, driver.longitude]}
                                            icon={createVehicleIcon('active')}
                                        >
                                            <Popup className="glass-popup">
                                                <div className="p-2 min-w-[150px]">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 font-bold text-xs">
                                                            {driver.employeeName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-900 leading-none">{driver.employeeName}</p>
                                                            <p className="text-[10px] text-slate-500">Hace {Math.floor((new Date().getTime() - new Date(driver.timestamp).getTime()) / 60000)} min</p>
                                                        </div>
                                                    </div>
                                                    <Badge className="w-full justify-center bg-green-500 hover:bg-green-600">EN RUTA</Badge>
                                                </div>
                                            </Popup>
                                            <LeafletTooltip direction="bottom" offset={[0, 10]} opacity={0.8}>
                                                {driver.employeeName}
                                            </LeafletTooltip>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </Card>
                        </div>

                        {/* Sidebar: Activity & Alerts */}
                        <div className="flex flex-col gap-6 h-full">
                            {/* Alerts Section */}
                            {vehiclesNeedingService.length > 0 && (
                                <Card className="bg-yellow-500/5 border-yellow-500/20 shrink-0">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 shrink-0">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-yellow-500 text-sm">Atención Requerida</h4>
                                                <p className="text-xs text-slate-400 mt-1 mb-3">
                                                    {vehiclesNeedingService.length} vehículos requieren mantenimiento preventivo urgente.
                                                </p>
                                                <Button size="sm" variant="outline" className="w-full border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 h-8 text-xs" onClick={() => setIsServiceDialogOpen(true)}>
                                                    Ver Vehículos
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Active Drivers List */}
                            <Card className="flex-1 bg-slate-900/50 border-slate-800 flex flex-col overflow-hidden">
                                <CardHeader className="py-3 border-b border-white/5 bg-slate-900/50">
                                    <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-primary" />
                                        Conductores Activos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                                    {driverLocations.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                                <Navigation className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <p className="text-xs text-slate-500">No hay conductores transmitiendo ubicación.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-white/5">
                                            {driverLocations.map((driver: any) => (
                                                <div key={driver.employeeId} className="p-3 hover:bg-white/5 transition-colors cursor-pointer group">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-xs text-slate-200">{driver.employeeName}</span>
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                            <span className="text-[10px] text-green-500 font-mono">LIVE</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                                                        <span>Última act: {new Date(driver.timestamp).toLocaleTimeString()}</span>
                                                        <Navigation className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <Card className="bg-slate-900/50 border-slate-800 shrink-0">
                                <CardContent className="p-3 grid grid-cols-2 gap-2">
                                    <Button variant="outline" size="sm" className="w-full text-xs h-9" onClick={() => setIsAddOpen(true)}>
                                        <Plus className="w-3 h-3 mr-2" />
                                        Vehículo
                                    </Button>
                                    <DriverLinkDialog />
                                </CardContent>
                            </Card>
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
                                                        <CognitiveInput name="plate" required placeholder="XYZ-123" semanticType="sku" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Modelo</Label>
                                                        <CognitiveInput name="model" required placeholder="Ford Transit" semanticType="name" />
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
                                                        <Button variant="ghost" size="icon" onClick={() => setVehicleDetails(v)}><Settings2 className="w-4 h-4" /></Button>
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
                                        center={[universalConfig.cedisLat || 19.4326, universalConfig.cedisLng || -99.1332]}
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

                                        {/* CEDIS Marker */}
                                        <Marker position={[universalConfig.cedisLat || 19.4326, universalConfig.cedisLng || -99.1332]} icon={L.divIcon({ className: '', html: '<div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>' })}>
                                            <LeafletTooltip direction="top" offset={[0, -5]} opacity={1} permanent>
                                                {universalConfig.cedisAddress || "CEDIS Principal"}
                                            </LeafletTooltip>
                                        </Marker>

                                        {/* Active Route Stops */}
                                        {activeRoutes.map((route: any) => (
                                            <div key={route.id}>
                                                {route.stops.map((stop: any) => (
                                                    <Marker
                                                        key={stop.id}
                                                        position={[stop.locationLat || 19.44, stop.locationLng || -99.14]}
                                                        icon={L.divIcon({
                                                            className: '',
                                                            html: `<div class="w-3 h-3 ${stop.stopType === 'delivery' ? 'bg-blue-500' : 'bg-purple-500'} rounded-full border border-white opacity-80"></div>`
                                                        })}
                                                    >
                                                        <Popup className="glass-popup">
                                                            <div className="p-1">
                                                                <p className="font-bold text-xs uppercase">{stop.stopType === 'delivery' ? 'Entrega' : 'Recolección'}</p>
                                                                <p className="text-[10px] text-slate-300">
                                                                    {stop.stopType === 'delivery' ? stop.order?.customer?.name : stop.purchase?.supplier?.name}
                                                                </p>
                                                                <Badge className="mt-1 text-[8px] h-4 uppercase">{stop.status}</Badge>
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                ))}
                                            </div>
                                        ))}

                                        {/* Real Active Terminals Tracking */}
                                        {activeTerminals.map((kiosk: any) => (
                                            <Marker
                                                key={kiosk.id}
                                                position={[kiosk.lastLatitude || 19.4326, kiosk.lastLongitude || -99.1332]}
                                                icon={createVehicleIcon(kiosk.status === 'online' ? 'active' : 'inactive')}
                                            >
                                                <Popup className="glass-popup">
                                                    <div className="p-1">
                                                        <p className="font-bold text-sm">{kiosk.name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            Vehículo: {vehiclesData.find((v: any) => v.id === kiosk.vehicleId)?.plate || 'N/A'}<br />
                                                            Conductor: {employees.find((e: any) => e.id === kiosk.driverId)?.name || 'N/A'}
                                                        </p>
                                                        <Badge className={cn("mt-1 text-[10px] h-5", kiosk.status === 'online' ? "bg-green-500" : "bg-slate-500")}>
                                                            {kiosk.status === 'online' ? 'EN MOVIMIENTO' : 'DESCONECTADO'}
                                                        </Badge>
                                                    </div>
                                                </Popup>
                                                <LeafletTooltip direction="bottom" offset={[0, 20]} opacity={0.8} permanent>
                                                    {vehiclesData.find((v: any) => v.id === kiosk.vehicleId)?.plate || kiosk.name}
                                                </LeafletTooltip>
                                            </Marker>
                                        ))}

                                        {/* Mock Vehicle Marker logic removed or kept as backup if no terminals */}
                                        {activeTerminals.length === 0 && (
                                            <Marker
                                                position={[19.4326, -99.1332]}
                                                icon={createVehicleIcon('active')}
                                            >
                                                <Popup className="glass-popup">
                                                    <div className="p-1">
                                                        <p className="font-bold text-sm">Unidad Demo</p>
                                                        <p className="text-xs text-slate-500">Sin terminales activas</p>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        )}

                                        <MapController center={[universalConfig.cedisLat || 19.4326, universalConfig.cedisLng || -99.1332]} />
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
                                    {aiInsights.filter((i: any) => i.type === 'logistics_alert').slice(0, 1).map((insight: any) => (
                                        <div key={insight.id} className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-orange-500/20 rounded-lg shrink-0">
                                                    <AlertCircle className="w-5 h-5 text-orange-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-orange-200">{insight.title}</h4>
                                                    <p className="text-xs text-slate-400 mt-1">{insight.description}</p>
                                                    <Button size="sm" variant="ghost" className="h-6 mt-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 p-0">Ver Detalles</Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">En Ruta ({activeRoutes.length})</h4>
                                        {activeRoutes.length > 0 ? (
                                            <div className="space-y-3">
                                                {activeRoutes.map((route: any) => (
                                                    <div key={route.id} className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between group hover:border-primary/50 transition-colors cursor-pointer">
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
                                                                <p className="text-sm font-bold text-white">{route.vehicle?.plate}</p>
                                                                <p className="text-[10px] text-slate-400">{route.driver?.name || "Conductor Asignado"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-bold text-green-400">En Tiempo</p>
                                                            <p className="text-[10px] text-slate-500">
                                                                Paradas: {route.stops?.filter((s: any) => s.status === 'completed').length || 0}/{route.stops?.length || 0}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-600 italic px-2">Sin rutas activas.</p>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Pendientes de Asignar</h4>
                                        <div className="space-y-2">
                                            {[
                                                ...salesOrders.filter((s: any) => s.deliveryStatus === 'pending').map((s: any) => ({ ...s, type: 'delivery' })),
                                                ...purchaseOrders.filter((p: any) => p.logisticsMethod === 'pickup' && p.deliveryStatus === 'pending').map((p: any) => ({ ...p, type: 'collection' }))
                                            ].map((task: any) => (
                                                <div key={task.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 group">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", task.type === 'delivery' ? 'bg-blue-500' : 'bg-purple-500')} />
                                                    <div className="flex-1 truncate">
                                                        <p className="text-xs text-slate-300 truncate">
                                                            {task.type === 'delivery' ? (task.customer?.name || `Venta #${task.id.slice(0, 5)}`) : (task.supplier?.name || `Recol #${task.id.slice(0, 5)}`)}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 italic">
                                                            {task.type === 'delivery' ? 'Entrega' : 'Recolección'} • {task.product?.name}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] scale-90 text-slate-500 border-white/5 opacity-0 group-hover:opacity-100">UNASSIGNED</Badge>
                                                </div>
                                            ))}
                                            {salesOrders.length === 0 && purchaseOrders.length === 0 && (
                                                <p className="text-xs text-slate-600 italic px-2">No hay tareas pendientes.</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Programar Mantenimiento</DialogTitle>
                        <DialogDescription>Registra una orden de servicio para el vehículo.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        createMaintenanceMutation.mutate({
                            vehicleId: serviceVehicleId,
                            type: formData.get("type"),
                            description: formData.get("description"),
                            cost: parseInt(formData.get("cost") as string) * 100, // Cents
                            mileageIn: parseInt(formData.get("mileage") as string) || 0
                        });
                    }} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Vehículo</Label>
                            <Select value={serviceVehicleId} onValueChange={setServiceVehicleId}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>
                                    {vehiclesData.map((v: any) => (
                                        <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Servicio</Label>
                            <Select name="type" defaultValue="preventive">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="preventive">Preventivo</SelectItem>
                                    <SelectItem value="corrective">Correctivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Input name="description" placeholder="Ej. Cambio de Aceite y Filtros 10k" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Costo Estimado ($)</Label>
                                <Input name="cost" type="number" placeholder="5000" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Kilometraje Actual</Label>
                                <Input name="mileage" type="number" placeholder="10500" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsServiceDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={createMaintenanceMutation.isPending}>
                                {createMaintenanceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Registrar Servicio
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <VehicleDetailsDialog
                open={!!vehicleDetails}
                onOpenChange={(open) => !open && setVehicleDetails(null)}
                vehicle={vehicleDetails}
                maintenanceLogs={maintenanceLogs}
                fuelLogs={fuelLogs}
            />
        </AppLayout>
    );
}
