
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguration } from "@/hooks/use-configuration";
import { Activity, Settings, Users, AlertTriangle, Truck, Package, ShoppingBag, Clock, Save, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Operations() {
    const { session } = useAuth();
    const { getModuleStatus } = useConfiguration();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Module Enforcement
    const isEnabled = getModuleStatus("operations");
    // In strict mode we might redirect, but here we show a disabled state UI for clarity if accessed directly

    const { data: dashboard, isLoading: isLoadingDash } = useQuery({
        queryKey: ["/api/operations/dashboard"],
        queryFn: async () => {
            const res = await fetch("/api/operations/dashboard", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: isEnabled && !!session?.access_token
    });

    const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
        queryKey: ["/api/operations/suppliers"],
        queryFn: async () => {
            const res = await fetch("/api/operations/suppliers", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: isEnabled && !!session?.access_token
    });

    const { data: config } = useQuery({
        queryKey: ["/api/operations/config"],
        queryFn: async () => {
            const res = await fetch("/api/operations/config", { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: isEnabled && !!session?.access_token
    });

    if (!isEnabled) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
                    <div className="p-4 bg-muted rounded-full">
                        <Settings className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Módulo de Operaciones Desactivado</h2>
                        <p className="text-muted-foreground max-w-md mx-auto mt-2">
                            Gestiona el núcleo de tu empresa activando este módulo en el Marketplace.
                        </p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-8 p-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Operaciones Central
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Centro de comando y configuración operativa.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Clock className="w-4 h-4 mr-2" />
                            Historial
                        </Button>
                        <Button>
                            <Activity className="w-4 h-4 mr-2" />
                            Reporte Rápido
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Flota Activa</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                <Truck className="w-5 h-5 text-blue-500" />
                                {dashboard?.stats?.activeVehicles || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background border-l-4 border-l-orange-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Crítico</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                {dashboard?.stats?.criticalStock || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Cumplimiento</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                <Package className="w-5 h-5 text-green-500" />
                                {dashboard?.stats?.fulfillmentRate || 0}%
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background border-l-4 border-l-purple-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-purple-500" />
                                {dashboard?.stats?.efficiency || 0}%
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="dashboard" className="space-y-4">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
                        <TabsTrigger value="config">Configuración de Sede</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Actividad Reciente</CardTitle>
                                <CardDescription>Eventos operativos importantes.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {dashboard?.activity?.map((act: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${act.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    <Activity className="w-4 h-4" />
                                                </div>
                                                <span>{act.message}</span>
                                            </div>
                                            <span className="text-sm text-muted-foreground">{act.time}</span>
                                        </div>
                                    ))}
                                    {(!dashboard?.activity || dashboard.activity.length === 0) && (
                                        <p className="text-muted-foreground text-center py-4">No hay actividad reciente.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="suppliers">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Directorio de Proveedores</CardTitle>
                                    <CardDescription>Gestión básica de proveedores autorizados.</CardDescription>
                                </div>
                                <Button size="sm"><Users className="w-4 h-4 mr-2" /> Nuevo Proveedor</Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {suppliers.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No hay proveedores registrados.
                                        </div>
                                    ) : (
                                        suppliers.map((sup: any) => (
                                            <div key={sup.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                        {sup.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{sup.name}</p>
                                                        <p className="text-xs text-muted-foreground">{sup.contactEmail || "Sin contacto"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm">Ver</Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="config">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configuración de la Sede</CardTitle>
                                <CardDescription>Ajustes generales de la operación.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Horario de Operación (Inicio)</Label>
                                        <Input defaultValue={config?.workingHours?.start} type="time" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Horario de Operación (Fin)</Label>
                                        <Input defaultValue={config?.workingHours?.end} type="time" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Zona Horaria</Label>
                                        <Input defaultValue={config?.timezone} />
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label>Despacho Automático</Label>
                                            <p className="text-xs text-muted-foreground">Asignar rutas automáticamente al generar pedidos.</p>
                                        </div>
                                        <Switch checked={config?.autoDispatch} />
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label>Notificaciones por Email</Label>
                                            <p className="text-xs text-muted-foreground">Reportes diarios y alertas críticas.</p>
                                        </div>
                                        <Switch checked={config?.notifications?.email} />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button><Save className="w-4 h-4 mr-2" /> Guardar Cambios</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
