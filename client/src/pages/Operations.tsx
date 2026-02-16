import { useConfiguration } from "@/context/ConfigurationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    AlertTriangle,
    Box,
    Truck,
    TrendingUp,
    Zap,
    Factory,
    CheckCircle2,
    Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTensorFlow } from "@/hooks/use-tensorflow";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

function NeuralForecast({ data }: { data: number[] }) {
    const { predictTrend, isReady } = useTensorFlow();
    const [prediction, setPrediction] = useState<{ next: number, trend: string } | null>(null);

    useEffect(() => {
        if (isReady && data.length > 0) {
            predictTrend(data).then(res => {
                if (res) {
                    setPrediction({
                        next: Math.round(res.nextValue),
                        trend: res.trend
                    });
                }
            });
        }
    }, [isReady, data, predictTrend]);

    if (!isReady) return null;
    if (!prediction) return <span className="text-[10px] text-slate-600 animate-pulse">Analyzing...</span>;

    return (
        <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded w-fit">
            <Zap className="w-3 h-3 text-purple-400" />
            <span>
                AI Forecast: <span className="text-white font-mono">${prediction.next.toLocaleString()}</span>
            </span>
        </div>
    );
}

export default function Operations() {
    const { enabledModules } = useConfiguration();
    const { profile, session } = useAuth();
    const modules = enabledModules || [];

    const { data: dashboard, isLoading } = useQuery({
        queryKey: ["/api/operations/dashboard"],
        queryFn: async () => {
            const res = await fetch("/api/operations/dashboard", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch dashboard");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Helper to check if module is active
    const has = (id: string) => modules.some(m => m === id);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 min-h-screen bg-slate-950/50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white mb-1">
                        Centro de Operaciones
                    </h1>
                    <p className="text-slate-400">
                        Visión general de {profile?.organization?.name || "la empresa"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1 border-primary/20 text-primary bg-primary/5">
                        <Activity className="w-3 h-3 mr-2 animate-pulse" />
                        Sistema Operativo
                    </Badge>
                </div>
            </div>

            {/* Adaptive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Guardian AI (Health) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="bg-slate-900/50 border-slate-800 h-full hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
                                Salud del Sistema
                                <Zap className="w-4 h-4 text-purple-400" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">100%</div>
                                    <div className="text-xs text-slate-500">Operativo</div>
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-slate-400">
                                {dashboard?.healthMessage || "Guardian AI no detecta anomalías críticas."}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 2. Inventory Widget */}
                {has('inventory') && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="bg-slate-900/50 border-slate-800 h-full hover:border-blue-500/50 transition-colors">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
                                    Inventario
                                    <Box className="w-4 h-4 text-blue-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-2xl font-bold text-white">
                                            {dashboard?.inventory?.totalItems || 0}
                                        </span>
                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">Items</Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Stock Bajo</span>
                                            <span className={cn(
                                                "font-bold",
                                                (dashboard?.inventory?.lowStock || 0) > 0 ? "text-red-400" : "text-slate-500"
                                            )}>
                                                {dashboard?.inventory?.lowStock || 0} items
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-1000"
                                                style={{ width: `${dashboard?.inventory?.capacity || 0}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-right text-slate-500">
                                            Nivel: {dashboard?.inventory?.capacity || 0}%
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* 3. Production Widget */}
                {has('production') && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="bg-slate-900/50 border-slate-800 h-full hover:border-orange-500/50 transition-colors">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
                                    Producción
                                    <Factory className="w-4 h-4 text-orange-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold text-white">
                                            {dashboard?.production?.activeCount || 0}
                                        </span>
                                        <span className="text-xs text-slate-500 lowercase tracking-widest font-bold">Lotes Activos</span>
                                    </div>
                                    <div className={cn(
                                        "w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center",
                                        (dashboard?.production?.activeCount || 0) > 0 && "animate-pulse"
                                    )}>
                                        <Activity className="w-4 h-4 text-orange-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {dashboard?.production?.activeInstances?.slice(0, 2).map((instance: any) => (
                                        <div key={instance.id} className="flex justify-between text-xs items-center p-2 bg-slate-800/50 rounded border border-white/5">
                                            <span className="text-slate-300 font-medium">Batch #{instance.id.toString().slice(-4)}</span>
                                            <Badge variant="outline" className="text-[10px] border-orange-500/20 text-orange-400 bg-orange-500/5">ACTIVO</Badge>
                                        </div>
                                    ))}
                                    {(dashboard?.production?.activeCount || 0) === 0 && (
                                        <div className="py-4 text-center border border-dashed border-slate-800 rounded bg-slate-900/20">
                                            <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Sin actividad</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* 4. Sales/Revenue Widget */}
                {has('sales') && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card className="bg-slate-900/50 border-slate-800 h-full hover:border-green-500/50 transition-colors">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
                                    Ventas (Hoy)
                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1">
                                    <div className="text-2xl font-bold text-white">
                                        $ {Number(dashboard?.sales?.todayRevenue || 0).toLocaleString()}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className={cn(
                                            "text-xs flex items-center",
                                            (dashboard?.sales?.trend || 0) >= 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {(dashboard?.sales?.trend || 0) >= 0 ? '+' : ''}{dashboard?.sales?.trend || 0}% vs ayer
                                        </p>
                                        {dashboard?.sales?.history?.length > 0 && (
                                            <NeuralForecast data={dashboard.sales.history} />
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <div className="text-[10px] text-slate-500 mb-2 uppercase font-bold tracking-widest">Últimas órdenes</div>
                                    <div className="space-y-1.5">
                                        {dashboard?.sales?.recentOrders?.map((order: any) => (
                                            <div key={order.id} className="flex justify-between text-xs text-slate-300">
                                                <span>#ORD-{order.id.toString().slice(-3)}</span>
                                                <span className="font-mono">$ {Number(order.total || 0).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        {(dashboard?.sales?.recentOrders?.length || 0) === 0 && (
                                            <span className="text-[10px] text-slate-600 italic">No hay órdenes hoy</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* 5. Logistics Widget */}
                {has('logistics') && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <Card className="bg-slate-900/50 border-slate-800 h-full hover:border-indigo-500/50 transition-colors">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
                                    Logística
                                    <Truck className="w-4 h-4 text-indigo-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <div className="flex-1 text-center p-2 rounded bg-slate-800/30 border border-white/5">
                                        <div className="text-lg font-bold text-white">
                                            {dashboard?.logistics?.inRoute || 0}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase font-black">En Ruta</div>
                                    </div>
                                    <div className="flex-1 text-center p-2 rounded bg-slate-800/30 border border-white/5">
                                        <div className="text-lg font-bold text-white">
                                            {dashboard?.logistics?.pending || 0}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase font-black">Pendiente</div>
                                    </div>
                                </div>
                                <div className="mt-4 text-[10px] text-slate-500 italic text-center">
                                    Flota monitoreada en tiempo real
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
