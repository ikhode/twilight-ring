import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SalesFunnelWidget() {
    const { session } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ["/api/sales/funnel"],
        queryFn: async () => {
            if (!session?.access_token) return null;
            const res = await fetch("/api/sales/funnel", {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch funnel");
            return res.json();
        },
        enabled: !!session?.access_token,
        refetchInterval: 120000 // 2 minutes
    });

    if (isLoading || !data) {
        return (
            <Card className="bg-slate-900/40 border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Embudo de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-32 flex items-center justify-center">
                        <div className="animate-pulse text-slate-600">Cargando datos...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-900/40 border-slate-800 hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-widest italic">Embudo de Ventas</CardTitle>
                    <div className="flex items-center gap-1 text-xs">
                        {parseFloat(data.conversionRate) > 50 ? (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : (
                            <TrendingDown className="w-3 h-3 text-yellow-500" />
                        )}
                        <span className="font-bold text-primary">{data.conversionRate}%</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {data.stages.map((stage: any, index: number) => (
                        <motion.div
                            key={stage.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-400">{stage.name}</span>
                                <span className="text-xs font-bold text-slate-300">{stage.count}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stage.percentage}%` }}
                                    transition={{ duration: 0.8, delay: index * 0.1 }}
                                    className={cn(
                                        "h-full rounded-full",
                                        index === 0 && "bg-blue-500",
                                        index === 1 && "bg-yellow-500",
                                        index === 2 && "bg-green-500",
                                        index === 3 && "bg-purple-500"
                                    )}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 uppercase font-bold">Valor Total</span>
                        <span className="text-primary font-black">${(data.totalValue / 100).toFixed(0)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
