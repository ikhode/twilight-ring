import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
    TrendingUp,
    TrendingDown,
    Activity,
    DollarSign,
    Package,
    Users,
    Zap,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface KPIProps {
    id: string;
    label: string;
    value: string;
    trend: number;
    icon: any;
    status?: 'normal' | 'warning' | 'critical';
}

const iconMap: Record<string, any> = {
    revenue: DollarSign,
    production_efficiency: Zap,
    active_users: Users,
    active_lots: Package,
    fleet_utilization: Activity,
    total_sales: DollarSign,
    default: Activity
};

export function DynamicKPIs({ kpis }: { kpis: string[] }) {
    const { session } = useAuth();

    // Fetch real KPIs from backend
    const { data: kpisData, isLoading } = useQuery({
        queryKey: ["/api/analytics/kpis"],
        queryFn: async () => {
            const res = await fetch("/api/analytics/kpis", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch KPIs");
            return res.json();
        },
        enabled: !!session?.access_token,
        refetchInterval: 60000, // Refresh every minute
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpiId) => (
                    <Card key={kpiId} className="bg-slate-900/40 border-slate-800">
                        <CardContent className="p-6">
                            <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpiId, index) => {
                const data = kpisData?.[kpiId] || { label: kpiId, value: '---', trend: 0, status: 'normal' };
                const Icon = iconMap[kpiId] || iconMap.default;

                return (
                    <motion.div
                        key={kpiId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className={cn(
                            "bg-slate-900/40 border-slate-800 backdrop-blur-md hover:border-primary/30 transition-all",
                            data.status === 'warning' && "border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]",
                            data.status === 'critical' && "border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        )}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        data.status === 'warning' ? "bg-yellow-500/10 text-yellow-500" :
                                            data.status === 'critical' ? "bg-red-500/10 text-red-500" :
                                                "bg-primary/10 text-primary"
                                    )}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-1 text-xs font-bold",
                                        data.trend >= 0 ? "text-green-500" : "text-red-500"
                                    )}>
                                        {data.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {Math.abs(data.trend)}%
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">{data.label}</p>
                                    <h3 className="text-2xl font-black mt-1 italic tracking-tight">{data.value}</h3>
                                </div>
                                {data.status !== 'normal' && (
                                    <div className="mt-3 flex items-center gap-1.5">
                                        <AlertCircle className={cn(
                                            "w-3 h-3",
                                            data.status === 'warning' ? "text-yellow-500" : "text-red-500"
                                        )} />
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Atención requerida</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}
