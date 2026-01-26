
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, BellRing, Sparkles, Loader2, AlertTriangle, Info, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Insight {
    id: string;
    title: string;
    description: string;
    type: "prediction" | "anomaly" | "suggestion";
    severity: "low" | "medium" | "high" | "critical";
    createdAt: string;
    data?: any;
}

export function DailyBriefing() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [processedIds, setProcessedIds] = useState<string[]>([]);

    const { data: insights = [], isLoading } = useQuery<Insight[]>({
        queryKey: ["/api/ai/insights/pending"],
        queryFn: async () => {
            const res = await fetch("/api/ai/insights/pending", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch briefing");
            return res.json();
        },
        enabled: !!session?.access_token,
        // Don't refetch automatically too often while user is interacting
        refetchOnWindowFocus: false,
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, feedback }: { id: string, feedback: 'agreed' | 'disagreed' }) => {
            const res = await fetch(`/api/ai/insights/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ acknowledged: true, feedback })
            });
            if (!res.ok) throw new Error("Failed to update");
            return res.json();
        },
        onSuccess: () => {
            // We optimize locally by filtering, but we invalidate to sync eventually
            queryClient.invalidateQueries({ queryKey: ["/api/ai/insights/pending"] });
        }
    });

    const handleAction = (id: string, feedback: 'agreed' | 'disagreed') => {
        setProcessedIds(prev => [...prev, id]);
        updateMutation.mutate({ id, feedback });
        toast({
            title: feedback === 'agreed' ? "Confirmado" : "Descartado",
            description: feedback === 'agreed' ? "Sugerencia aplicada al modelo." : "Gracias por el feedback.",
            duration: 1500,
        });
    };

    const visibleInsights = insights.filter((i) => !processedIds.includes(i.id));

    if (isLoading) return <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

    if (visibleInsights.length === 0) {
        if (processedIds.length > 0) {
            return (
                <div className="h-40 flex flex-col items-center justify-center text-center p-6 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-3">
                        <Check className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg text-primary">¡Todo al día!</h3>
                    <p className="text-sm text-muted-foreground">Has revisado todos los eventos pendientes.</p>
                </div>
            );
        }
        return null; // Don't show anything if empty initially (or show placeholder)
    }

    return (
        <Card className="border-primary/20 bg-primary/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent" />
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-display">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Resumen Diario
                    </CardTitle>
                    <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20 text-primary">
                        {visibleInsights.length} Pendiente{visibleInsights.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-2">Revisa y confirma los sucesos detectados por Cognitive OS.</p>
                    <AnimatePresence mode="popLayout">
                        {visibleInsights.map((insight) => (
                            <motion.div
                                key={insight.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="bg-background/80 backdrop-blur-md rounded-lg border border-border p-4 shadow-sm"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "p-2 rounded-md shrink-0",
                                        insight.type === 'anomaly' ? "bg-rose-500/10 text-rose-500" :
                                            insight.type === 'prediction' ? "bg-violet-500/10 text-violet-500" :
                                                "bg-blue-500/10 text-blue-500"
                                    )}>
                                        {insight.type === 'anomaly' && <AlertTriangle className="w-5 h-5" />}
                                        {insight.type === 'prediction' && <TrendingUp className="w-5 h-5" />}
                                        {insight.type === 'suggestion' && <Info className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-sm truncate">{insight.title}</h4>
                                            {insight.severity === 'critical' && <Badge variant="destructive" className="h-5 text-[10px]">Crítico</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{insight.description}</p>
                                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground/70">
                                            <span>{new Date(insight.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>•</span>
                                            <span className="capitalize">{insight.type}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <Button
                                            size="icon"
                                            className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
                                            onClick={() => handleAction(insight.id, 'agreed')}
                                            title="Confirmar / De acuerdo"
                                        >
                                            <Check className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                                            onClick={() => handleAction(insight.id, 'disagreed')}
                                            title="Descartar / Falso positivo"
                                        >
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
}
