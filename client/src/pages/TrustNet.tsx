import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Shield,
    TrendingUp,
    AlertCircle,
    Lock,
    RefreshCw,
    Scale,
    History,
    CheckCircle2,
    XCircle,
    Zap,
    BrainCircuit
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { ConsentManager } from "@/components/trustnet/ConsentManager";
import { TrustGauge } from "@/components/trustnet/TrustGauge";
import { TrustBenchmarking } from "@/components/trustnet/TrustBenchmarking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface TrustStatus {
    trustScore: number;
    trustLevel: string;
    verificationStatus: string;
    previousScore?: number;
    lastScoreUpdate?: string;
    marketplaceActive: boolean;
}

interface ScoreBreakdown {
    totalScore: number;
    components: Record<string, number>;
    weights: Record<string, number>;
}

interface ScoreHistory {
    id: string;
    score: number;
    changedAt: string;
}

interface Appeal {
    id: string;
    appealType: string;
    status: string;
    reason: string;
    createdAt: string;
    resolvedAt?: string;
    reviewerNotes?: string;
}

const METRIC_INFO: Record<string, {
    label: string;
    description: string;
    formula: string;
}> = {
    payment_punctuality: {
        label: "Puntualidad de Pagos",
        description: "Cumplimiento en fechas de vencimiento de facturas",
        formula: "100 - (Días promedio de atraso / 30) * 100"
    },
    sales_volume: {
        label: "Volumen de Ventas",
        description: "Consistencia y magnitud de la facturación mensual",
        formula: "Log(Ventas Totales) normalizado a 100"
    },
    customer_retention: {
        label: "Retención de Clientes",
        description: "Estabilidad en la cartera de clientes recurrentes",
        formula: "(Clientes recurrentes / Total clientes) * 100"
    },
    inventory_turnover: {
        label: "Rotación de Inventario",
        description: "Velocidad con la que el inventario se vende y repone",
        formula: "(Costo de Ventas / Inventario Promedio)"
    },
    order_fulfillment: {
        label: "Cumplimiento de Órdenes",
        description: "Porcentaje de pedidos entregados a tiempo y completos",
        formula: "(Entregas Perfectas / Total Órdenes) * 100"
    },
    credit_compliance: {
        label: "Cumplimiento Crediticio",
        description: "Uso responsable de límites de crédito",
        formula: "100 - (Deuda Pendiente / Limite Crédito) * 100"
    }
};

export default function TrustNet() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [appealText, setAppealText] = useState("");
    const [appealDialogOpen, setAppealDialogOpen] = useState(false);

    // Fetch Trust Status
    const { data: status, isLoading: statusLoading } = useQuery<TrustStatus>({
        queryKey: ["/api/trust/status"],
        queryFn: async () => {
            const res = await fetch("/api/trust/status", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch trust status");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Fetch Score Breakdown
    const { data: breakdown } = useQuery<ScoreBreakdown>({
        queryKey: ["/api/trust/score/breakdown"],
        queryFn: async () => {
            const res = await fetch("/api/trust/score/breakdown", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch breakdown");
            return res.json();
        },
        enabled: !!session?.access_token && !!status
    });

    // Fetch Risk Prediction
    const { data: riskData } = useQuery<{ riskProbability: number }>({
        queryKey: ["/api/trust/score/predict-risk"],
        queryFn: async () => {
            const res = await fetch("/api/trust/score/predict-risk", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return { riskProbability: 0 };
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Fetch Score History
    const { data: history = [] } = useQuery<ScoreHistory[]>({
        queryKey: ["/api/trust/score/history"],
        queryFn: async () => {
            const res = await fetch("/api/trust/score/history", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Fetch Appeals
    const { data: appeals = [] } = useQuery<Appeal[]>({
        queryKey: ["/api/trust/appeals"],
        queryFn: async () => {
            const res = await fetch("/api/trust/appeals", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!session?.access_token
    });

    // Mutation: Recalculate
    const recalculateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/trust/score/recalculate", {
                method: "POST",
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Recalculation failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/trust/status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/trust/score/breakdown"] });
            queryClient.invalidateQueries({ queryKey: ["/api/trust/score/history"] });
            toast({
                title: "Trust Score Actualizado",
                description: "Se han procesado los datos más recientes de tu ERP.",
            });
        }
    });

    const appealMutation = useMutation({
        mutationFn: async (evidence: string) => {
            const res = await fetch("/api/trust/appeals", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    appealType: "score_dispute",
                    reason: evidence
                })
            });
            if (!res.ok) throw new Error("Failed to submit appeal");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/trust/appeals"] });
            setAppealDialogOpen(false);
            setAppealText("");
            toast({ title: "Apelación Enviada", description: "Nuestro equipo revisará tu solicitud." });
        }
    });

    if (statusLoading) return (
        <AppLayout title="TrustNet" subtitle="Cognitive Reputation Engine">
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-12 h-12 text-primary animate-spin" />
            </div>
        </AppLayout>
    );

    return (
        <TooltipProvider>
            <AppLayout title="TrustNet" subtitle="Motor de Reputación Empresarial Cognitive">
                <div className="space-y-8 pb-32">

                    {/* Top Gauge Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <Card className="lg:col-span-1 bg-slate-900/40 border-slate-800 backdrop-blur-md overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4">
                                <Zap className="text-primary w-5 h-5 animate-pulse" />
                            </div>
                            <CardHeader className="text-center">
                                <CardTitle className="tracking-tighter italic font-black text-2xl uppercase">Tu Reputación Global</CardTitle>
                                <CardDescription>Basado en métricas ERP en tiempo real</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center pb-10">
                                <TrustGauge
                                    score={status?.trustScore || 0}
                                    previousScore={history[0]?.score}
                                />
                            </CardContent>
                            <div className="bg-slate-950/50 p-4 border-t border-slate-800 flex justify-between items-center text-xs">
                                <span className="text-slate-500">Última actualización: {status?.lastScoreUpdate ? new Date(status.lastScoreUpdate).toLocaleString() : 'Nunca'}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 gap-2 text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={() => recalculateMutation.mutate()}
                                    disabled={recalculateMutation.isPending}
                                >
                                    <RefreshCw className={`w-3 h-3 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                                    Recalcular ahora
                                </Button>
                            </div>
                        </Card>

                        {/* Cognitive Risk Section */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
                                <div className="p-1 px-4 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                                    <BrainCircuit className="w-4 h-4 text-primary" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Análisis Predictivo AI (TensorFlow)</span>
                                </div>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col md:flex-row gap-8 items-center">
                                        <div className="flex-1 space-y-4">
                                            <h3 className="text-xl font-black italic uppercase tracking-tight">Probabilidad de Riesgo Operativo</h3>
                                            <p className="text-sm text-slate-400">Nuestro modelo cognitivo estima la probabilidad de incumplimiento en los próximos 90 días basado en patrones de pago y rotación de inventario.</p>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-bold uppercase">
                                                    <span className="text-slate-500">Nivel de Riesgo</span>
                                                    <span className={riskData?.riskProbability && riskData.riskProbability > 50 ? 'text-red-400' : 'text-green-400'}>
                                                        {riskData?.riskProbability}% {riskData?.riskProbability && riskData.riskProbability > 50 ? '(Crítico)' : '(Bajo)'}
                                                    </span>
                                                </div>
                                                <Progress value={riskData?.riskProbability || 0} className="h-3 bg-slate-800" indicatorClassName={riskData?.riskProbability && riskData.riskProbability > 50 ? 'bg-red-500' : 'bg-green-500'} />
                                            </div>
                                        </div>
                                        <div className="w-full md:w-32 h-32 flex-shrink-0 bg-slate-950 rounded-full border-4 border-slate-800 flex items-center justify-center relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                                            <div className="flex flex-col items-center">
                                                <span className="text-3xl font-black text-white">{100 - (riskData?.riskProbability || 0)}%</span>
                                                <span className="text-[8px] font-bold uppercase text-slate-500">Salud Financiera</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <TrustBenchmarking currentMetrics={breakdown?.components || {}} />
                        </div>
                    </div>

                    {/* Tabs Section */}
                    <Tabs defaultValue="breakdown" className="w-full">
                        <TabsList className="bg-slate-950/50 p-1 border border-slate-800 grid grid-cols-4 w-full md:w-[600px]">
                            <TabsTrigger value="breakdown" className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase font-bold text-[10px] tracking-widest">Desglose</TabsTrigger>
                            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase font-bold text-[10px] tracking-widest">Historial</TabsTrigger>
                            <TabsTrigger value="privacy" className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase font-bold text-[10px] tracking-widest">Privacidad</TabsTrigger>
                            <TabsTrigger value="appeals" className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase font-bold text-[10px] tracking-widest">Apelaciones</TabsTrigger>
                        </TabsList>

                        <TabsContent value="breakdown" className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {breakdown && Object.entries(breakdown.components).map(([key, value]) => {
                                    const info = METRIC_INFO[key] || { label: key, description: "Métrica operacional", formula: "Dato directo del sistema" };
                                    const weight = (breakdown.weights[key] || 0) * 100;

                                    return (
                                        <Card key={key} className="bg-slate-900/30 border-slate-800 hover:border-primary/30 transition-colors">
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-sm font-black uppercase italic text-white flex items-center gap-2">
                                                        {info.label}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <AlertCircle className="w-3 h-3 text-slate-600 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-950 border-slate-800 text-xs max-w-xs">
                                                                <p className="font-bold mb-1">{info.description}</p>
                                                                <p className="text-slate-400"><strong>Fórmula:</strong> {info.formula}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </CardTitle>
                                                    <Badge variant="outline" className="text-[9px] font-bold border-slate-700 bg-slate-950">{weight.toFixed(0)}% PESO</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-baseline justify-between mb-4">
                                                    <span className="text-3xl font-black italic tracking-tighter text-white">{value}</span>
                                                    <span className="text-xs text-slate-500 font-bold">/ 100</span>
                                                </div>
                                                <Progress value={value} className="h-1.5 bg-slate-800" />
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="pt-6">
                            <Card className="bg-slate-900/40 border-slate-800">
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        {history.length > 0 ? (
                                            history.map((entry, idx) => (
                                                <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-900 group hover:border-primary/20 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center font-black italic text-primary group-hover:bg-primary/10 transition-colors">
                                                            #{history.length - idx}
                                                        </div>
                                                        <div>
                                                            <p className="font-black italic text-white">{entry.score} PTS</p>
                                                            <p className="text-xs text-slate-500">{new Date(entry.changedAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {idx < history.length - 1 && (
                                                            <Badge className={entry.score >= history[idx + 1].score ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
                                                                {entry.score >= history[idx + 1].score ? '+' : ''}{entry.score - history[idx + 1].score}
                                                            </Badge>
                                                        )}
                                                        <History className="w-4 h-4 text-slate-700" />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12">
                                                <History className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                                <p className="text-slate-500 font-bold italic uppercase tracking-widest text-sm">Sin historial registrado</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="privacy" className="pt-6">
                            <ConsentManager />
                        </TabsContent>

                        <TabsContent value="appeals" className="pt-6">
                            <Card className="bg-slate-900/40 border-slate-800">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="font-black uppercase italic">Centro de Disputas</CardTitle>
                                        <CardDescription>Apela cálculos de métricas que consideres incorrectos</CardDescription>
                                    </div>
                                    <Dialog open={appealDialogOpen} onOpenChange={setAppealDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="gap-2">
                                                <Scale className="w-4 h-4" />
                                                Nueva Apelación
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-slate-950 border-slate-800">
                                            <DialogHeader>
                                                <DialogTitle className="font-black uppercase italic tracking-tight">Nueva Disputa de Score</DialogTitle>
                                                <DialogDescription>Describe detalladamente por qué consideras que hay un error y adjunta evidencia si es posible.</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 pt-4">
                                                <Textarea
                                                    placeholder="Ej: La métrica de puntualidad no refleja el pago X realizado el día..."
                                                    className="bg-slate-900 border-slate-800"
                                                    rows={5}
                                                    value={appealText}
                                                    onChange={(e) => setAppealText(e.target.value)}
                                                />
                                                <Button
                                                    className="w-full"
                                                    disabled={!appealText.trim() || appealMutation.isPending}
                                                    onClick={() => appealMutation.mutate(appealText)}
                                                >
                                                    {appealMutation.isPending ? "Enviando..." : "Enviar para Revisión Compliance"}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {appeals.length > 0 ? (
                                            appeals.map((appeal) => (
                                                <div key={appeal.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{appeal.appealType}</span>
                                                            <p className="text-sm font-bold text-white mt-1">{appeal.reason}</p>
                                                        </div>
                                                        <Badge className={
                                                            appeal.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                                appeal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                                    'bg-slate-800 text-slate-400'
                                                        }>
                                                            {appeal.status.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-[10px] text-slate-500 mt-4 border-t border-slate-900 pt-2">
                                                        <span>ID: {appeal.id.split('-')[0]}</span>
                                                        <span>FECHA: {new Date(appeal.createdAt).toLocaleDateString()}</span>
                                                        {appeal.reviewerNotes && <span className="text-primary italic">Respuesta del Analista: {appeal.reviewerNotes}</span>}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12 bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                                                <Scale className="w-12 h-12 text-slate-900 mx-auto mb-4" />
                                                <p className="text-slate-600 font-bold uppercase italic text-xs">No hay apelaciones activas</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                </div>
            </AppLayout>
        </TooltipProvider>
    );
}
