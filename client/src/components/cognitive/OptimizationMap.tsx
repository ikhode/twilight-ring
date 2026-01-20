import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AliveValue } from "./AliveValue";
import { cn } from "@/lib/utils";
import { useCognitiveEngine } from "@/lib/cognitive/engine";
import { useQuery } from "@tanstack/react-query";
import { Process, ProcessStep } from "../../../../shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface ProcessStepData {
    name: string;
    efficiency: number; // 0-100
    waste: number; // 0-100 percentage
    status: "optimal" | "warning" | "critical";
    analysis?: string; // AI generated insight
    suggestion?: {
        title: string;
        description: string;
        impact: string;
    };
}

export function OptimizationMap() {
    const { systemConfidence } = useCognitiveEngine();
    const { session } = useAuth();

    // 1. Fetch Active Process
    const { data: processes } = useQuery<Process[]>({
        queryKey: ["/api/cpe/processes"],
        queryFn: async () => {
            if (!session?.access_token) return [];
            const res = await fetch("/api/cpe/processes", {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch processes");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const activeProcess = processes?.[0];

    // 2. Fetch Steps for Process
    const { data: steps } = useQuery<ProcessStep[]>({
        queryKey: [`/api/cpe/processes/${activeProcess?.id}/steps`],
        queryFn: async () => {
            if (!activeProcess?.id || !session?.access_token) return [];
            const res = await fetch(`/api/cpe/processes/${activeProcess.id}/steps`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch steps");
            return res.json();
        },
        enabled: !!activeProcess?.id && !!session?.access_token
    });

    // 3. Transform Steps to Chart Data
    const chartData: ProcessStepData[] = useMemo(() => {
        if (!steps?.length) return [];
        return steps.map(step => {
            // @ts-ignore - metrics is jsonb
            const metrics = (step.metrics as any) || { efficiency: 0, waste: 0 };
            const efficiency = metrics.efficiency || 0;
            const waste = metrics.waste || 0;

            let status: "optimal" | "warning" | "critical" = "optimal";
            if (waste > 10) status = "critical";
            else if (waste > 5) status = "warning";

            return {
                name: step.name,
                efficiency,
                waste,
                status,
                analysis: waste > 5 ? `Merma en ${step.name} supera el umbral operativo.` : undefined,
                suggestion: waste > 5 ? {
                    title: "Optimización Requerida",
                    description: `Correlación: Ajustar parámetros en ${step.name} podría reducir merma un ${(waste * 0.2).toFixed(1)}%.`,
                    impact: status === "critical" ? "High" : "Medium"
                } : undefined
            };
        }).sort((a, b) => 0); // Keep order as fetched (assumed order field is handled by API or should be sorted here)
    }, [steps]);

    if (!activeProcess) return <div className="p-4 text-center text-slate-500 italic">Esperando activación de flujo...</div>;

    return (
        <div className="space-y-6">
            <Card className="border-muted/40 shadow-sm overflow-hidden bg-slate-900/50 backdrop-blur-xl border-slate-800">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
                                {activeProcess.name}
                            </CardTitle>
                            <CardDescription className="text-slate-400">Análisis de Merma y Detección de Puntos Ciegos</CardDescription>
                        </div>
                        <AliveValue
                            value={`${systemConfidence}%`}
                            label="Confianza del Análisis"
                            unit=""
                            className="text-right"
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Efficiency Chart */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {chartData.map((step, index) => (
                            <div key={index} className="flex flex-col gap-2 relative group p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-slate-200">{step.name}</span>
                                    <span className={cn(
                                        "text-xs font-bold",
                                        step.status === "critical" ? "text-red-400" : "text-slate-400"
                                    )}>
                                        {step.efficiency}% Efic.
                                    </span>
                                </div>

                                <div className="relative h-24 w-full bg-slate-950/50 rounded-md overflow-hidden flex items-end border border-white/5">
                                    {/* Efficiency Bar */}
                                    <motion.div
                                        className={cn(
                                            "w-full rounded-t-sm",
                                            step.status === "optimal" && "bg-emerald-500/80",
                                            step.status === "warning" && "bg-amber-500/80",
                                            step.status === "critical" && "bg-rose-500/80",
                                        )}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${step.efficiency}%` }}
                                        transition={{ duration: 1, delay: index * 0.1 }}
                                    />
                                </div>

                                {/* Waste Alert (Merma) */}
                                {step.waste > 5 && (
                                    <motion.div
                                        className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300 flex gap-2 items-start"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + index * 0.2 }}
                                    >
                                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        <span>
                                            <b>Merma:</b> {step.waste}%
                                        </span>
                                    </motion.div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* AI Suggestions Section */}
                    {chartData.some(s => s.suggestion) && (
                        <div className="space-y-3 pt-4 border-t border-dashed border-slate-700">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-violet-400">
                                <Sparkles className="w-4 h-4" /> Sugerencias Proactivas IA
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {chartData.filter(s => s.suggestion).map((step, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-4"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1 + idx * 0.2 }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                                                <Sparkles className="w-4 h-4 text-violet-500" />
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-medium text-slate-200 mb-1">{step.suggestion?.title}</h5>
                                                <p className="text-xs text-slate-400 leading-relaxed">
                                                    {step.suggestion?.description}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Contextual Insights / Where data comes from */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/30 flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2 rounded">
                        <AlertCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-300">Uso de Módulos</p>
                        <p className="text-slate-500">Métricas en tiempo real</p>
                    </div>
                </div>
                <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/30 flex items-center gap-3">
                    <div className="bg-emerald-500/10 p-2 rounded">
                        <AlertCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-300">Nivel de Confianza</p>
                        <p className="text-slate-500">TrustNet: 98% (High)</p>
                    </div>
                </div>
                <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/30 flex items-center gap-3">
                    <div className="bg-amber-500/10 p-2 rounded">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-300">Actividad</p>
                        <p className="text-slate-500">1 Flujo Activo</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
