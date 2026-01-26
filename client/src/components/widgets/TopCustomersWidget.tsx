import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Crown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function TopCustomersWidget() {
    const { session } = useAuth();

    const { data: customers, isLoading } = useQuery({
        queryKey: ["/api/sales/top-customers"],
        queryFn: async () => {
            if (!session?.access_token) return [];
            const res = await fetch("/api/sales/top-customers", {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch customers");
            return res.json();
        },
        enabled: !!session?.access_token,
        refetchInterval: 300000 // 5 minutes
    });

    if (isLoading || !customers) {
        return (
            <Card className="bg-slate-900/40 border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Clientes VIP</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-32 flex items-center justify-center">
                        <div className="animate-pulse text-slate-600">Cargando...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const tierColors = {
        platinum: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        gold: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
        silver: "text-slate-400 bg-slate-500/10 border-slate-500/20"
    };

    return (
        <Card className="bg-slate-900/40 border-slate-800 hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest italic">Clientes VIP</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {customers.slice(0, 5).map((customer: any, index: number) => (
                        <motion.div
                            key={customer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700/50"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-bold text-slate-200 truncate">{customer.name}</h4>
                                        <Badge className={cn("text-[8px] h-4", tierColors[customer.tier as keyof typeof tierColors])}>
                                            {customer.tier.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{customer.email || customer.phone || 'Sin contacto'}</p>
                                </div>
                                <div className="text-right ml-2">
                                    <p className="text-sm font-black text-primary">${(customer.totalValue / 100).toFixed(0)}</p>
                                    <p className="text-[10px] text-slate-500">{customer.orderCount} pedidos</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-600">
                                <span>Ticket promedio: ${(customer.avgOrderValue / 100).toFixed(0)}</span>
                                <span>{formatDistanceToNow(new Date(customer.lastPurchase), { addSuffix: true, locale: es })}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
                {customers.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center text-center">
                        <Crown className="w-12 h-12 text-slate-800 mb-2" />
                        <p className="text-xs text-slate-600 font-bold">No hay clientes registrados</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
