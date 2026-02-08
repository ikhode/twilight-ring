import React from 'react';
import { cn } from "@/lib/utils";
import { useCognitiveEngine } from "@/lib/cognitive/engine";
import { Shield, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useConfiguration } from "@/context/ConfigurationContext";

export function GuardianStatus({ className }: { className?: string }) {
    const { aiConfig } = useConfiguration();
    const { systemConfidence, activeMode, setConfidence, setMode } = useCognitiveEngine();
    const { session } = useAuth();

    if (!aiConfig.guardianEnabled) return null;

    // Fetch Real Guardian Status
    const { data: guardianStatusData } = useQuery({
        queryKey: ['/api/guardian/status'],
        queryFn: async () => {
            if (!session?.access_token) return;
            const res = await fetch('/api/guardian/status', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch status');
            const data = await res.json();
            // Update Global Store
            // Map anomalies to confidence: 0 anomalies = 98+, 1 = 85, etc.
            const newConfidence = data.status === 'active' ? Math.max(0, 100 - (data.recentAnomalies * 10)) : 100;
            setConfidence(newConfidence);
            setMode(data.recentAnomalies > 0 ? 'analysis' : 'observation');
            return data;
        },
        enabled: !!session?.access_token,
    });

    // Setup Realtime subscription for Guardian status
    useSupabaseRealtime({
        table: 'ai_configurations',
        queryKey: ['/api/guardian/status'],
    });

    return (
        <div className={cn("flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 backdrop-blur-sm", className)}>
            <div className="relative">
                <Shield className={cn("w-4 h-4", systemConfidence > 80 ? "text-success" : "text-warning")} />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-current rounded-full animate-ping opacity-75" />
            </div>

            <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                    Guardian Layer <Lock className="w-2 h-2" />
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">
                        {activeMode === 'observation' ? 'Monitoreando' : activeMode === 'analysis' ? 'Analizando Patrones' : 'Interviniendo'}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-slate-700 text-slate-400">
                        {systemConfidence}% Trust
                    </Badge>
                </div>
            </div>

            {/* Activity Visualizer */}
            <div className="flex items-center gap-0.5 h-4">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "w-0.5 rounded-full bg-slate-700 transition-all duration-500",
                            Math.random() > 0.5 ? "h-full bg-primary/50" : "h-1/2"
                        )}
                        style={{ animation: `pulse ${1 + Math.random()}s infinite` }}
                    />
                ))}
            </div>
        </div>
    );
}
