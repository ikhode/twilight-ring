import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MarketTrendsWidget() {
    const { session } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ["/api/sales/trends"],
        queryFn: async () => {
            if (!session?.access_token) return null;
            const res = await fetch("/api/sales/trends", {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch trends");
            return res.json();
        },
        enabled: !!session?.access_token,
        refetchInterval: 300000 // 5 minutes
    });

    if (isLoading || !data) {
        return (
            <Card className="bg-slate-900/40 border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Tendencias del Mercado</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-32 flex items-center justify-center">
                        <div className="animate-pulse text-slate-600">Cargando...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const maxRevenue = Math.max(...data.trends.map((t: any) => t.revenue));
    const isGrowing = parseFloat(data.growth) > 0;

    return (
        <Card className="bg-slate-900/40 border-slate-800 hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-widest italic">Tendencias del Mercado</CardTitle>
                    <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                        isGrowing ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                        {isGrowing ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {data.growth}%
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-40 flex items-end gap-1">
                    {data.trends.slice(-8).map((trend: any, index: number) => {
                        const height = (trend.revenue / maxRevenue) * 100;
                        return (
                            <motion.div
                                key={trend.period}
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                className="flex-1 bg-primary/60 hover:bg-primary/80 rounded-t-sm relative group transition-colors"
                                title={`${trend.period}: $${(trend.revenue / 100).toFixed(0)}`}
                            >
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                                    <p className="font-bold text-primary">${(trend.revenue / 100).toFixed(0)}</p>
                                    <p className="text-slate-400">{trend.orders} pedidos</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-slate-500 uppercase font-bold">Últimas 8 semanas</span>
                    <span className="text-slate-400">Hover para detalles</span>
                </div>
            </CardContent>
        </Card>
    );
}
