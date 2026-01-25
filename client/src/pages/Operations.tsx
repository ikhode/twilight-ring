import { useConfiguration } from "@/context/ConfigurationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    AlertTriangle,
    Box,
    Truck,
    TrendingUp,
    Users,
    Zap,
    Factory,
    CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTensorFlow } from "@/hooks/use-tensorflow";
import { useEffect, useState } from "react";

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

    if (!prediction) return <span className="text-[10px] text-slate-600 animate-pulse">Calculating...</span>;

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
    const { enabledModules, universalConfig } = useConfiguration();
    const { profile } = useAuth();
    const modules = enabledModules || [];

    // Helper to check if module is active
    const has = (id: string) => modules.some(m => m === id);

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

                {/* 1. Guardian AI (Always recommended/Core) */}
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
                                Guardian AI no detecta anomalías en los últimos 30 minutos.
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
                                        <span className="text-2xl font-bold text-white">1,204</span>
                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Items</Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Stock Bajo</span>
                                            <span className="text-red-400 font-bold">3 items</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 w-[85%]" />
                                        </div>
                                        <div className="text-[10px] text-right text-slate-500">Capacidad: 85%</div>
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
                                        <span className="text-2xl font-bold text-white">Active</span>
                                        <span className="text-xs text-slate-500">Línea A & B</span>
                                    </div>
                                    <div className="w-8 h-8 rounded animate-pulse bg-orange-500/20 flex items-center justify-center">
                                        <Activity className="w-4 h-4 text-orange-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs items-center p-2 bg-slate-800/50 rounded">
                                        <span className="text-slate-300">Lote #4092</span>
                                        <Badge variant="outline" className="text-[10px] border-orange-500/20 text-orange-400">En Proceso</Badge>
                                    </div>
                                    <div className="flex justify-between text-xs items-center p-2 bg-slate-800/50 rounded">
                                        <span className="text-slate-300">Lote #4093</span>
                                        <Badge variant="outline" className="text-[10px] border-slate-600/50 text-slate-500">En Cola</Badge>
                                    </div>
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
                                    <div className="text-2xl font-bold text-white">$ 24,500</div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs text-green-400 flex items-center">
                                            +12% vs ayer
                                        </p>
                                        <NeuralForecast data={[21000, 22500, 21800, 23000, 24500]} />
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <div className="text-xs text-slate-500 mb-2">Últimas órdenes</div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-slate-300">
                                            <span>#ORD-992</span>
                                            <span>$ 450.00</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-300">
                                            <span>#ORD-991</span>
                                            <span>$ 1,200.00</span>
                                        </div>
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
                                    <div className="flex-1 text-center p-2 rounded bg-slate-800/30">
                                        <div className="text-lg font-bold text-white">4</div>
                                        <div className="text-[10px] text-slate-500 uppercase">En Ruta</div>
                                    </div>
                                    <div className="flex-1 text-center p-2 rounded bg-slate-800/30">
                                        <div className="text-lg font-bold text-white">2</div>
                                        <div className="text-[10px] text-slate-500 uppercase">Pendiente</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
