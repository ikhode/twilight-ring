import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ShieldAlert,
    Bell,
    CheckCircle2,
    AlertTriangle,
    Search,
    ExternalLink,
    Clock,
    ShieldCheck,
    ArrowRight,
    Activity,
    Info
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { guardian, AnomalyAlert } from "@/lib/ai/guardian";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { RcaReport } from "../../../shared/schema";
import { cn } from "@/lib/utils";

export function GuardianPanel() {
    const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Cargar alertas iniciales
        const activeAlerts = guardian.getActiveAlerts();
        setAlerts(activeAlerts);
        setIsLoading(false);

        // Simular monitoreo en tiempo real
        const interval = setInterval(() => {
            const current = guardian.getActiveAlerts();
            setAlerts([...current]);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const { data: rcaReports } = useQuery<RcaReport[]>({
        queryKey: ["/api/cpe/instances/demo/rca"], // In a real app we'd fetch for all active or recent
        queryFn: async () => {
            // This is a bit of a hack for the demo to fetch all recent RCA
            const res = await fetch("/api/cpe/instances/all/rca");
            if (!res.ok) return [];
            return res.json();
        },
        refetchInterval: 10000
    });

    const combinedAlerts = [
        ...alerts,
        ...(rcaReports?.map(rca => ({
            id: rca.id,
            type: 'rca',
            severity: 'critical',
            title: `RCA: Fallo Detectado`,
            description: rca.analysis,
            timestamp: new Date(rca.createdAt || Date.now()),
            acknowledged: false
        })) || [])
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const handleDismiss = (id: string) => {
        guardian.dismissAlert(id);
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/30';
            case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
            case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
            default: return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
        }
    };

    return (
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl h-full flex flex-col overflow-hidden">
            <CardHeader className="p-6 border-b border-white/5 bg-slate-950/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                            <ShieldAlert className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black uppercase italic tracking-wider flex items-center gap-2">
                                Capa <span className="text-orange-500">GUARDIAN</span>
                            </CardTitle>
                            <CardDescription className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 mt-1">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                Monitoreo Cognitivo Activo
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className="border-slate-800 text-slate-400 font-black uppercase text-[10px]">
                            SOC 2 Certificado
                        </Badge>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter cursor-help",
                                        combinedAlerts.length > 0 ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                    )}>
                                        <Activity className="w-3 h-3" />
                                        Estado: {combinedAlerts.length > 0 ? "AMENAZA DETECTADA" : "NORMAL"}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 border-slate-800 text-[10px] p-2 max-w-[150px]">
                                    Indicador de salud del ecosistema basado en análisis de patrones en tiempo real.
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                {combinedAlerts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-50">
                        <div className="w-20 h-20 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                            <ShieldCheck className="w-10 h-10 text-slate-700" />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-widest text-slate-400">Sin Anomalías</p>
                            <p className="text-xs text-slate-500 mt-1 uppercase italic font-bold">Tu ecosistema está operando al 100% de eficiencia</p>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-4">
                            <AnimatePresence>
                                {combinedAlerts.map((alert) => (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 group hover:border-orange-500/30 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex gap-4">
                                                <div className={`mt-1 h-2 w-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                                                    alert.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                                                    }`} />
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge className={`text-[10px] font-black uppercase tracking-tighter ${getSeverityColor(alert.severity)}`}>
                                                            {alert.severity}
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Hace {Math.floor((Date.now() - alert.timestamp.getTime()) / 60000)}m
                                                        </span>
                                                    </div>
                                                    <h4 className="font-black text-slate-100 italic uppercase tracking-tight leading-tight">
                                                        {alert.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                        {alert.description}
                                                    </p>
                                                    <div className="flex gap-2 mt-3">
                                                        <Button size="sm" variant="outline" className="h-7 text-[10px] font-black uppercase border-slate-800 hover:bg-slate-800">
                                                            Investigar <ExternalLink className="ml-1.5 w-3 h-3" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => handleDismiss(alert.id)} className="h-7 text-[10px] font-black uppercase text-slate-500 hover:text-white">
                                                            Descartar
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </ScrollArea>
                )}
            </CardContent>

            <div className="p-4 border-t border-white/5 bg-slate-950/20 text-center">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" className="w-full text-[10px] font-black uppercase text-primary hover:text-primary/80 tracking-widest italic group">
                                Ver Reporte de Auditoría IA
                                <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 border-slate-800 text-[10px] p-3 max-w-xs">
                            <p className="font-bold text-primary mb-1 uppercase tracking-widest text-[9px]">Deep Audit Log</p>
                            Genera una traza completa de decisiones tomadas por la Capa Guardian en las últimas 24h.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </Card>
    );
}

function ScrollArea({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={`overflow-y-auto ${className}`}>{children}</div>;
}
