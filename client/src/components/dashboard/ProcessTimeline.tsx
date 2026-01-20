
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock, ArrowRight, Activity, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { ProcessEvent, RcaReport } from '../../../../shared/schema';
import { useAuth } from "@/hooks/use-auth";

interface Event {
    id: string;
    step: string;
    time: string;
    status: 'completed' | 'error' | 'warning' | 'pending';
    insight?: string;
    data?: any;
}



export const ProcessTimeline = ({ instanceId = "demo-instance" }: { instanceId?: string }) => {
    const { session } = useAuth();

    // 1. Get Active Process Instance
    const { data: processes } = useQuery<any[]>({
        queryKey: ["/api/cpe/processes"],
        queryFn: async () => {
            if (!session?.access_token) return [];
            const res = await fetch("/api/cpe/processes", { headers: { Authorization: `Bearer ${session.access_token}` } });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const activeInstanceId = instanceId === "demo-instance" ?
        // Try to fetch the first instance of the first process if not provided
        // In a real app we'd fetch instances separately, but for speed we'll assume the parent passes it or we pick one
        "dynamic-fetch-needed" : instanceId;

    // Ideally we fetch instances for the process
    const { data: instances } = useQuery<any[]>({
        queryKey: [`/api/cpe/processes/${processes?.[0]?.id}/instances`],
        queryFn: async () => {
            if (!processes?.[0]?.id) return [];
            const res = await fetch(`/api/cpe/processes/${processes[0].id}/instances`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: !!processes?.[0]?.id && instanceId === "demo-instance"
    });

    const resolvedInstanceId = instanceId !== "demo-instance" ? instanceId : instances?.[0]?.id;

    const { data: events, isLoading: eventsLoading } = useQuery<any[]>({
        queryKey: [`/api/cpe/instances/${resolvedInstanceId}/events`],
        queryFn: async () => {
            if (!resolvedInstanceId) return [];
            const res = await fetch(`/api/cpe/instances/${resolvedInstanceId}/events`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: !!resolvedInstanceId
    });

    const { data: rcaReports } = useQuery<RcaReport[]>({
        queryKey: [`/api/cpe/instances/${resolvedInstanceId}/rca`],
        queryFn: async () => {
            if (!resolvedInstanceId) return [];
            const res = await fetch(`/api/cpe/instances/${resolvedInstanceId}/rca`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
            return res.json();
        },
        enabled: !!resolvedInstanceId
    });

    const displayEvents = events || [];
    const activeRca = rcaReports?.[0];

    if (!resolvedInstanceId && !eventsLoading) return <div className="p-4 text-center text-slate-500 italic">Esperando datos de trazabilidad...</div>;

    return (
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
            {/* ... existing render logic but using displayEvents ... */}
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Trazabilidad Cognitiva
                    </CardTitle>
                    <p className="text-xs text-slate-400">Hilo de eventos en tiempo real con análisis RCA</p>
                </div>
                <Badge variant="outline" className="border-blue-500/50 text-blue-400 bg-blue-500/10">
                    ID: {resolvedInstanceId?.slice(0, 8) || "..."}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="relative space-y-4">
                    {/* Vertical Line */}
                    <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500 via-slate-700 to-slate-800" />

                    {displayEvents.map((event, index) => {
                        // ... same mapping logic ...
                        const isError = event.eventType === 'anomaly' || event.status === 'error';
                        const isWarning = event.status === 'warning';
                        const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative pl-12"
                            >
                                {/* Icon construction same as before */}
                                <div className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 
                    ${!isError && !isWarning ? 'bg-slate-900 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                                        isError ? 'bg-slate-900 border-red-500 animate-pulse' :
                                            'bg-slate-900 border-amber-500'}`}
                                >
                                    {event.eventType === 'complete' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                    {event.eventType === 'anomaly' && <AlertCircle className="w-5 h-5 text-red-500" />}
                                    {event.eventType === 'check' && <Search className="w-5 h-5 text-amber-500" />}
                                    {!event.eventType && <Clock className="w-5 h-5 text-slate-500" />}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className={`text-sm font-bold uppercase ${isError ? 'text-red-400' : 'text-slate-200'}`}>
                                            {event.stepName || event.step || `Evento ${event.eventType}`}
                                        </h4>
                                        <span className="text-[10px] tabular-nums text-slate-500">{time}</span>
                                    </div>
                                    {(event.insight || event.analysis || (event.data && event.data.insight)) && (
                                        <motion.div
                                            initial={{ scale: 0.95 }}
                                            animate={{ scale: 1 }}
                                            className={`mt-1 p-2 rounded-md text-xs border flex items-start gap-2
                          ${isError ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}
                                        >
                                            <Search className="w-3 h-3 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="font-bold uppercase text-[9px] block mb-0.5">Hallazgo IA:</span>
                                                {event.insight || event.analysis || event.data?.insight}
                                            </div>
                                        </motion.div>
                                    )}
                                    {event.data && (
                                        <div className="flex gap-2 mt-1">
                                            {Object.entries(event.data)
                                                .filter(([k]) => k !== 'insight' && k !== 'quality' && k !== 'temp') // Filter if needed or show all
                                                .map(([key, val]) => (
                                                    <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                                                        {key}: {String(val)}
                                                    </span>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* RCA Section */}
                    <AnimatePresence>
                        {(activeRca || displayEvents.some((e: any) => e.eventType === 'anomaly')) && (
                            <motion.div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-transparent border border-red-500/30 relative overflow-hidden group">
                                {/* ... existing RCA UI ... */}
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-red-500 text-white border-0 text-[10px] font-black italic">RCA REPORT</Badge>
                                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Identificación de Causa Raíz</span>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-tight">
                                        {activeRca ? activeRca.analysis : "Esperando análisis cognitivo detallado..."}
                                    </p>
                                    {activeRca?.recommendation && (
                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                                Acción Preventiva
                                            </div>
                                            <div className="text-[10px] text-slate-400 italic mt-1">{activeRca.recommendation}</div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
};
