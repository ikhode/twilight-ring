
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine
} from "recharts";
import { Sparkles, AlertTriangle, ShieldCheck, TrendingUp, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface CognitiveFinancialsProps {
    projections: any[];
    anomalies: any[];
    trustScore?: number;
}

export function CognitiveFinancials({ projections, anomalies, trustScore = 100 }: CognitiveFinancialsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animated-in fade-in-50 duration-500">

            {/* 1. Cash Flow Projection (AI) */}
            <Card className="lg:col-span-2 border-primary/20 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-70" />

                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Brain className="h-5 w-5 text-cyan-400" />
                            Proyección de Flujo de Caja (IA)
                        </CardTitle>
                        <p className="text-xs text-slate-400">Proyección lineal basada en flujo neto promedio de 30 días</p>
                    </div>
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-950/20">
                        Modelo Predictivo v2.1
                    </Badge>
                </CardHeader>

                <CardContent className="h-[300px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projections}>
                            <defs>
                                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value / 1000}k`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px" }}
                                itemStyle={{ color: "#e2e8f0" }}
                                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Proyección"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="predicted"
                                stroke="#06b6d4"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorPredicted)"
                                animationDuration={2000}
                            />
                            {/* Reference line for Today */}
                            <ReferenceLine x="Día 1" stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Hoy', fill: '#ef4444', fontSize: 10 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 2. Guardian Anomalies & Trust Score */}
            <div className="space-y-6">

                {/* Trust Score Card */}
                <Card className="border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium text-emerald-400 flex items-center justify-between">
                            <span>Nivel de Confianza (TrustNet)</span>
                            <ShieldCheck className="h-4 w-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-bold text-white">{trustScore}%</span>
                            <span className="text-xs text-emerald-400/70 mb-1">Óptimo</span>
                        </div>
                        <div className="w-full bg-emerald-950/50 h-2 mt-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, trustScore)}%` }} />
                        </div>
                    </CardContent>
                </Card>

                {/* Anomalies List */}
                <Card className={cn(
                    "border-l-4 h-[240px] flex flex-col",
                    anomalies.length > 0 ? "border-l-amber-500 border-amber-500/20 bg-amber-950/10" : "border-l-slate-700 bg-slate-900/40"
                )}>
                    <CardHeader className="py-3 pb-2">
                        <CardTitle className={cn(
                            "text-sm font-bold flex items-center gap-2",
                            anomalies.length > 0 ? "text-amber-400" : "text-slate-400"
                        )}>
                            {anomalies.length > 0 ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                            {anomalies.length > 0 ? "ANOMALÍAS DETECTADAS" : "SISTEMA ESTABLE"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-3 pt-0">
                        {anomalies.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                                <ShieldCheck className="h-10 w-10 text-slate-500" />
                                <p className="text-xs text-slate-400">No se detectaron irregularidades en los últimos 30 días.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 mt-2">
                                {anomalies.map((anomaly, idx) => (
                                    <div key={idx} className="bg-black/40 p-3 rounded border border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xs font-bold text-amber-200 group-hover:text-amber-100">{anomaly.title}</h4>
                                            <span className="text-[10px] text-amber-500/70">{new Date(anomaly.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-tight mt-1 line-clamp-2">
                                            {anomaly.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
