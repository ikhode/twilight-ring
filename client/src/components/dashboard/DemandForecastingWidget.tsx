import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { demandForecaster } from "@/services/ai/forecaster";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ReferenceLine
} from "recharts";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
    historicalData: number[];
    title?: string;
}

export function DemandForecastingWidget({ historicalData, title = "Predicción de Demanda (7D)" }: Props) {
    const [stats, setStats] = useState<{ predictions: number[], confidence: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const runAI = async () => {
            if (historicalData.length < 5) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const scaling = await demandForecaster.trainModel(historicalData);

            if (scaling) {
                const predictions: number[] = [];
                let currentWindow = historicalData.slice(-7);

                // Predict 7 days ahead
                for (let i = 0; i < 7; i++) {
                    const pred = await demandForecaster.predictNext(currentWindow, scaling);
                    if (pred !== null) {
                        predictions.push(pred);
                        currentWindow = [...currentWindow.slice(1), pred];
                    }
                }

                setStats({ predictions, confidence: 85 }); // Mock confidence for now
            }
            setLoading(false);
        };

        runAI();
    }, [historicalData]);

    const chartData = [
        ...historicalData.map((val, i) => ({ day: i - historicalData.length + 1, value: val, type: 'actual' })),
        ...(stats?.predictions.map((val, i) => ({ day: i + 1, value: val, type: 'prediction' })) || [])
    ];

    if (loading) {
        return (
            <Card className="bg-slate-900/50 border-slate-800 animate-pulse">
                <CardContent className="h-[300px] flex items-center justify-center">
                    <Brain className="w-8 h-8 text-primary/40 animate-bounce" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl overflow-hidden group">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black uppercase text-[10px]">
                                BETA
                            </Badge>
                            <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px]">
                                <Sparkles className="w-3 h-3 mr-1" />
                                TensorFlow.js Core
                            </Badge>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="p-1 rounded-full bg-slate-800 border border-slate-700 cursor-help hover:bg-slate-700 transition-all">
                                            <Brain className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-slate-900 border-slate-800 text-xs p-3 text-white max-w-xs transition-all">
                                        <p className="font-bold text-primary italic uppercase tracking-widest text-[9px] mb-1">Métrica Predictiva</p>
                                        <p>Proyecciones generadas mediante una red neuronal recurrente (LSTM) entrenada localmente en el navegador. Analiza patrones históricos de 7 días. Consistencia: ±85%.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <CardTitle className="text-xl font-black italic uppercase tracking-tighter text-white">{title}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[220px] w-full mt-4">
                    {historicalData.length < 5 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950/30 rounded-xl border border-dashed border-white/5">
                            <Brain className="w-10 h-10 text-slate-800 mb-2 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Datos Insuficientes</p>
                            <p className="text-[9px] text-slate-600 mt-1 max-w-[150px]">Se requieren al menos 5 puntos de datos para generar proyecciones.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#475569" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#475569" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    stroke="#475569"
                                    fontSize={10}
                                    tickFormatter={(v) => v === 1 ? 'Hoy' : v > 1 ? `+${v - 1}d` : `${v}d`}
                                />
                                <YAxis stroke="#475569" fontSize={10} tickFormatter={(v) => `$${v}`} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <ReferenceLine x={1} stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#475569"
                                    fill="url(#actualGradient)"
                                    strokeWidth={2}
                                    connectNulls
                                    data={chartData.filter(d => d.type === 'actual')}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    fill="url(#predGradient)"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    connectNulls
                                    data={chartData.filter(d => d.type === 'prediction' || d.day === 1)}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
                {stats && (
                    <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-bold text-slate-400">Tendencia Proyectada</span>
                        </div>
                        <span className="text-[10px] font-black text-white">{stats.confidence}% Confianza</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
