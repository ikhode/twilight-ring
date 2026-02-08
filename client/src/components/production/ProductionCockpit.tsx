
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import {
    Play,
    Clock,
    Factory,
    Zap,
    AlertTriangle,
    Package,
    User,
    ArrowUpRight,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function ProductionCockpit() {
    const { session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: summary, isLoading: isSummaryLoading } = useQuery({
        queryKey: ["/api/production/summary"],
        queryFn: async () => {
            const res = await fetch("/api/production/summary", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const activeInstances = summary?.activeInstances || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Real-time Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Lotes Activos"
                    value={summary?.activeCount || 0}
                    icon={Factory}
                    variant="primary"
                />
                <StatCard
                    title="Eficiencia (OEE)"
                    value={`${summary?.efficiency || 0}%`}
                    icon={Zap}
                    variant="success"
                />
                <StatCard
                    title="Merma"
                    value={`${summary?.waste || 0}%`}
                    icon={AlertTriangle}
                    variant="warning"
                />
                <StatCard
                    title="T. Ciclo Promedio"
                    value={`${summary?.avgCycleTime || 0}h`}
                    icon={Clock}
                    variant="primary"
                />
            </div>

            {/* Main Operational Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Active Batches Section */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Play className="w-5 h-5 text-emerald-500" />
                                Ejecución en Planta
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Monitoreo de lotes y estaciones activas</p>
                        </div>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 gap-2">
                            <Play className="w-4 h-4 fill-current" />
                            Iniciar Lote
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeInstances.map((instance: any) => (
                            <Card key={instance.id} className="relative bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all group overflow-hidden">
                                {/* Activity Pulse Indicator */}
                                <div className="absolute top-0 right-0 p-3">
                                    <div className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </div>
                                </div>

                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                                                    #{instance.id.toString().slice(-4)}
                                                </Badge>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    Batch ID
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-100 uppercase tracking-tight">
                                                {instance.processName || "Procesamiento"}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between bg-slate-950/50 rounded-xl p-3 border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-full bg-slate-800">
                                                    <User className="w-3 h-3 text-slate-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Operador</span>
                                                    <span className="text-xs text-slate-300">Asignado a Estación</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[9px] text-slate-500 uppercase block">Iniciado</span>
                                                <span className="text-[10px] font-mono text-blue-400">
                                                    {new Date(instance.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button variant="secondary" size="sm" className="flex-1 bg-white hover:bg-slate-200 text-black text-xs font-bold h-9">
                                                Reportar
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1 border-slate-800 hover:bg-slate-800 text-xs h-9">
                                                Finalizar
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {activeInstances.length === 0 && !isSummaryLoading && (
                            <div className="col-span-full py-16 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center opacity-50">
                                <div className="w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4">
                                    <Package className="w-6 h-6 text-slate-500" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Planta en Reposo</h3>
                                <p className="text-xs text-slate-600 mt-1">No hay lotes activos en este momento</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cognitive Insights / Alerts Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />

                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap className="w-3 h-3 fill-current" />
                            Cognitive Insights
                        </h3>

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                    El lote <span className="text-blue-400 font-bold">#4582</span> muestra una desviación del <span className="text-amber-500 font-bold">12%</span> respecto al rendimiento histórico.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px]">Revisar Yield</Badge>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                    Capacidad instalada disponible en la estación de <span className="text-emerald-400 font-bold">Pelado</span>.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px]">Disponible</Badge>
                                </div>
                            </div>
                        </div>

                        <Button variant="ghost" className="w-full mt-4 text-[10px] text-slate-500 hover:text-white uppercase font-bold tracking-widest gap-2">
                            Ver Diagnóstico Completo
                            <ArrowUpRight className="w-3 h-3" />
                        </Button>
                    </div>

                    {/* Quick Stats Mini-Card */}
                    <div className="p-6 rounded-3xl bg-slate-950/50 border border-slate-800">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Output de Hoy</h4>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-white tracking-tighter">1,284</span>
                            <span className="text-xs text-slate-500 mb-1.5 uppercase font-bold">Piezas</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-900 flex justify-between">
                            <span className="text-[10px] text-slate-600 uppercase font-bold">Meta Diaria</span>
                            <span className="text-[10px] text-emerald-500 font-bold">85% Completado</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
