
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    Zap,
    Brain,
    User,
    Package,
    ArrowDownRight,
    TrendingDown,
    TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CognitiveEventThreadProps {
    instanceId: string;
}

export function CognitiveEventThread({ instanceId }: CognitiveEventThreadProps) {
    const { session } = useAuth();

    const { data: traceability, refetch } = useQuery({
        queryKey: [`/api/production/instances/${instanceId}/traceability`],
        queryFn: async () => {
            const res = await fetch(`/api/production/instances/${instanceId}/traceability`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch traceability");
            return res.json();
        },
        enabled: !!instanceId && !!session?.access_token
    });

    // Real-time updates
    useSupabaseRealtime({ table: 'process_events', queryKey: [`/api/production/instances/${instanceId}/traceability`] });
    useSupabaseRealtime({ table: 'ai_insights', queryKey: [`/api/production/instances/${instanceId}/traceability`] });
    useSupabaseRealtime({ table: 'piecework_tickets', queryKey: [`/api/production/instances/${instanceId}/traceability`] });

    const timeline = useMemo(() => {
        if (!traceability) return [];

        const { events = [], reports = [], insights = [], tickets = [] } = traceability;

        const allItems = [
            ...events.map((e: any) => ({ ...e, threadType: 'event' })),
            ...insights.map((i: any) => ({ ...i, threadType: 'insight', timestamp: i.createdAt })),
            ...tickets.map((t: any) => ({ ...t, threadType: 'ticket', timestamp: t.createdAt }))
        ];

        return allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [traceability]);

    if (!instanceId) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        Hilo de Eventos Cognitivos
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Trazabilidad en Tiempo Real con Análisis RCA</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5 animate-pulse">
                    LIVE_FEED_ACTIVE
                </Badge>
            </div>

            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[21px] top-4 bottom-4 w-[1px] bg-gradient-to-b from-primary/50 via-slate-800 to-transparent" />

                <div className="space-y-6">
                    <AnimatePresence initial={false}>
                        {timeline.length > 0 ? (
                            timeline.map((item: any, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                    className="relative pl-12"
                                >
                                    <EventDot item={item} />
                                    <EventCard item={item} />
                                </motion.div>
                            ))
                        ) : (
                            <div className="pl-12 py-10 text-slate-600 italic text-sm">
                                Esperando eventos del proceso...
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function EventDot({ item }: { item: any }) {
    let Icon = Activity;
    let colorClass = "bg-slate-700";

    if (item.threadType === 'insight') {
        Icon = Brain;
        colorClass = "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]";
        if (item.severity === 'critical') colorClass = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    } else if (item.threadType === 'ticket') {
        Icon = User;
        colorClass = "bg-emerald-500";
    } else if (item.eventType === 'anomaly') {
        Icon = AlertCircle;
        colorClass = "bg-amber-500 animate-bounce";
    } else if (item.eventType === 'complete') {
        Icon = CheckCircle2;
        colorClass = "bg-blue-500";
    }

    return (
        <div className={cn(
            "absolute left-[14px] top-4 w-4 h-4 rounded-full border-2 border-slate-950 z-10 flex items-center justify-center -translate-x-1/2",
            colorClass
        )}>
            <Icon className="w-2 h-2 text-white" />
        </div>
    );
}

function EventCard({ item }: { item: any }) {
    if (item.threadType === 'insight') {
        return (
            <Card className={cn(
                "bg-primary/5 border-primary/20",
                item.severity === 'critical' ? "border-red-500/50 bg-red-500/5" : ""
            )}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <Badge className={cn(
                                "text-[9px] uppercase font-black tracking-widest",
                                item.severity === 'critical' ? "bg-red-500" : "bg-primary"
                            )}>
                                {item.type || 'INSIGHT'}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-mono">
                                {format(new Date(item.timestamp), "HH:mm:ss", { locale: es })}
                            </span>
                        </div>
                        <Zap className="w-3 h-3 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">{item.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>

                    {item.data?.recommendation && (
                        <div className="mt-3 p-2 bg-black/40 border border-white/5 rounded text-[10px] text-primary italic">
                            💡 {item.data.recommendation}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (item.threadType === 'ticket') {
        return (
            <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Actividad de Personal</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                        {format(new Date(item.timestamp), "HH:mm:ss", { locale: es })}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                    <p className="text-xs text-slate-300">
                        <span className="text-white font-bold">{item.taskName}</span> reportado:
                        <span className="text-emerald-400 ml-1 font-mono">{item.quantity} unidades</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/20 border border-white/5 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                    {item.eventType === 'anomaly' ? 'Alerta Proceso' : 'Registro de Flujo'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                    {format(new Date(item.timestamp), "HH:mm:ss", { locale: es })}
                </span>
            </div>
            <p className="text-xs text-white">
                {item.eventType === 'anomaly' ? (
                    <span className="text-amber-500 font-bold uppercase tracking-tighter mr-2">MERMA_DETECTADA —</span>
                ) : null}
                {item.data?.message || item.data?.notes || `Operación en paso: ${item.eventType}`}
            </p>
            {item.data?.mermaType && (
                <div className="mt-2 flex items-center gap-3 text-[10px]">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-500 px-1 py-0 h-4">{item.data.mermaType}</Badge>
                    <span className="text-slate-500 font-mono">-{item.data.quantity} pza</span>
                </div>
            )}
        </div>
    );
}
