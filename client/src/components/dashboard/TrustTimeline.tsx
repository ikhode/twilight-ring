import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ShieldCheck, ShieldAlert, Activity } from "lucide-react";
import { guardianService, SecurityEvent } from "@/lib/ai/guardian-service";
import { motion, AnimatePresence } from "framer-motion";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { Network, TrendingUp, Users, Shield } from 'lucide-react';

export function TrustTimeline() {
    const { session } = useAuth();
    const [data, setData] = useState<{ time: string; trust: number; risk: number }[]>([]);
    const [lastEvent, setLastEvent] = useState<SecurityEvent | null>(null);

    const { data: healthData } = useQuery({
        queryKey: ["/api/ai/guardian/status"],
        queryFn: async () => {
            if (!session?.access_token) return null;
            const res = await fetch("/api/ai/guardian/status", {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            return res.json();
        },
        enabled: !!session?.access_token,
        // refetchInterval: 5000 // This was removed as per instruction, but the instruction snippet shows it removed from a different query. Keeping it here for now as the instruction was ambiguous.
    });

    const { data: events = [] } = useQuery({
        queryKey: ['/api/trust/timeline'],
        queryFn: async () => {
            const res = await fetch('/api/trust/timeline', {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch timeline');
            return res.json();
        },
        enabled: !!session?.access_token,
        // Removed refetchInterval - using Realtime instead
    });

    // Setup Realtime subscription for trust events
    useSupabaseRealtime({
        table: 'trust_events',
        queryKey: ['/api/trust/timeline'],
    });

    const systemHealth = healthData?.status === "active" ? 100 - (healthData?.recentAnomalies * 10) : 100;

    useEffect(() => {
        const newData = {
            time: new Date().toLocaleTimeString(),
            trust: systemHealth,
            risk: 100 - systemHealth
        };
        setData(prev => {
            const updated = [...prev, newData];
            if (updated.length > 20) updated.shift();
            return updated;
        });
    }, [systemHealth]);

    useEffect(() => {
        // Still keep a small simulation for mock actions if needed, or rely on insights
    }, []);

    return (
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl relative overflow-hidden">
            {/* Dynamic Border based on health */}
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-500 ${systemHealth > 80 ? 'bg-green-500' : systemHealth > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />

            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-5 h-5 transition-colors ${systemHealth > 80 ? 'text-green-500' : 'text-slate-500'}`} />
                    <div>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-300">Nivel de Confianza (TrustNet)</CardTitle>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-xl font-black text-white">{systemHealth}%</span>
                </div>
            </CardHeader>

            <CardContent>
                <div className="h-[150px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorTrust" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" hide />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                                itemStyle={{ color: '#fff', fontSize: '10px' }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="trust"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorTrust)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <AnimatePresence mode="wait">
                    {lastEvent && lastEvent.isAnomaly && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3"
                        >
                            <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                            <div>
                                <p className="text-xs font-bold text-red-400 uppercase tracking-wide">Amenaza Detectada</p>
                                <p className="text-[10px] text-red-300/80">{lastEvent.details}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
