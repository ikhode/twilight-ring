import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import {
    Factory,
    Workflow,
    Layers,
    ClipboardList,
    PackageSearch,
    Plus,
    Activity,
    AlertTriangle,
    CheckCircle2,
    Settings2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { BOMBuilder } from "@/components/manufacturing/BOMBuilder";
import { ProductionScheduler } from "@/components/manufacturing/ProductionScheduler";
import { MRPView } from "@/components/manufacturing/MRPView";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";

export default function Manufacturing() {
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState("dashboard");

    const { data: orders = [] } = useQuery<any[]>({
        queryKey: ["/api/manufacturing/orders"],
        enabled: !!session?.access_token
    });

    const { data: recommendations = [] } = useQuery<any[]>({
        queryKey: ["/api/manufacturing/mrp/recommendations"],
        enabled: !!session?.access_token
    });

    const stats = [
        { title: "Órdenes Activas", value: orders.filter((o: any) => o.status === 'in_progress').length, icon: Activity, variant: "primary" as const },
        { title: "Pendiente QC", value: orders.filter((o: any) => o.status === 'qc_pending').length, icon: ClipboardList, variant: "warning" as const },
        { title: "Faltantes MRP", value: recommendations.length, icon: PackageSearch, variant: "destructive" as const },
        { title: "OEE Global", value: "84%", icon: Factory, variant: "success" as const, trend: 2.1 }
    ];

    return (
        <AppLayout title="Manufactura Avanzada" subtitle="Control de Planta, BOM y Planificación MRP">
            <div className="space-y-6">
                {/* Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((s, idx) => (
                        <StatCard key={idx} {...s} />
                    ))}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-slate-900 border-slate-800 p-1">
                        <TabsTrigger value="dashboard" className="gap-2">
                            <Activity className="w-4 h-4" /> Panel
                        </TabsTrigger>
                        <TabsTrigger value="scheduler" className="gap-2">
                            <Workflow className="w-4 h-4" /> Planificador
                        </TabsTrigger>
                        <TabsTrigger value="bom" className="gap-2">
                            <Layers className="w-4 h-4" /> Estructura (BOM)
                        </TabsTrigger>
                        <TabsTrigger value="mrp" className="gap-2">
                            <PackageSearch className="w-4 h-4" /> MRP
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="lg:col-span-2 bg-slate-950 border-slate-800">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg">Órdenes Recientes</CardTitle>
                                    <Button variant="outline" size="sm" className="gap-2 border-slate-700">
                                        Ver Todas <Plus className="w-4 h-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <DataTable
                                        data={orders.slice(0, 5)}
                                        columns={[
                                            { header: "ID", key: "id", render: (item: any) => item.id.slice(-6).toUpperCase() },
                                            { header: "Producto", key: "product", render: (item: any) => item.product?.name || "N/A" },
                                            { header: "Cant.", key: "quantityRequested" },
                                            {
                                                header: "Status",
                                                key: "status",
                                                render: (item: any) => {
                                                    const status = item.status || "draft";
                                                    const colors: any = {
                                                        draft: "bg-slate-500/10 text-slate-500",
                                                        scheduled: "bg-blue-500/10 text-blue-500",
                                                        in_progress: "bg-amber-500/10 text-amber-500",
                                                        qc_pending: "bg-purple-500/10 text-purple-500",
                                                        completed: "bg-emerald-500/10 text-emerald-500"
                                                    };
                                                    return <Badge className={colors[status] || "bg-slate-500"}>{status.toUpperCase()}</Badge>;
                                                }
                                            },
                                            {
                                                header: "Prioridad",
                                                key: "priority",
                                                render: (item: any) => <span className={item.priority === 'high' || item.priority === 'urgent' ? "text-red-500 font-bold" : ""}>{(item.priority || 'medium').toUpperCase()}</span>
                                            }
                                        ]}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-950 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        Alertas Críticas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {recommendations.length > 0 ? (
                                        recommendations.slice(0, 3).map((r: any) => (
                                            <div key={r.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-bold text-red-500 uppercase">Falta Material</span>
                                                    <span className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm font-medium">{r.product?.name}</p>
                                                <p className="text-xs text-slate-400">Requerido: {r.suggestedPurchaseQuantity} para OP #{r.orderId?.slice(-6)}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center text-slate-500">
                                            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-20 text-emerald-500" />
                                            <p className="text-xs">Sin desabasto crítico detectado por MRP.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="scheduler">
                        <ProductionScheduler />
                    </TabsContent>

                    <TabsContent value="bom">
                        <BOMBuilder />
                    </TabsContent>

                    <TabsContent value="mrp">
                        <MRPView />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
