import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatCard } from "@/components/shared/StatCard";
import { DollarSign, Receipt, TrendingUp } from "lucide-react";

export function SalesMetrics() {
    const { session } = useAuth();
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

    const { data: metrics } = useQuery({
        queryKey: ["/api/analytics/dashboard"],
        queryFn: async () => {
            const res = await fetch("/api/analytics/dashboard", { headers: { Authorization: `Bearer ${session?.access_token}` }, });
            return res.json();
        },
        enabled: !!session?.access_token,
    });

    const salesToday = metrics?.metrics?.length > 0 ? metrics.metrics[metrics.metrics.length - 1].value : 0;
    const transactionCount = metrics?.metrics?.length > 0 ? (metrics.metrics[metrics.metrics.length - 1].tags?.count || 0) : 0;
    const avgTicket = transactionCount > 0 ? salesToday / transactionCount : 0;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <div className="cursor-help">
                        <StatCard title="Ventas Hoy" value={formatCurrency(salesToday / 100)} icon={DollarSign} trend={metrics?.hasEnoughData ? 12.5 : 0} variant="success" />
                    </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-emerald-500 uppercase tracking-widest text-[9px] mb-1">Ingresos de Caja</p>
                    <p>Total de ventas confirmadas el día de hoy. Incluye pagos en efectivo y transferencias validadas.</p>
                </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <div className="cursor-help">
                        <StatCard title="Transacciones" value={transactionCount.toString()} icon={Receipt} variant="primary" />
                    </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-blue-500 uppercase tracking-widest text-[9px] mb-1">Volumen Operativo</p>
                    <p>Número total de notas de venta procesadas por el sistema en las últimas 24 horas.</p>
                </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <div className="cursor-help">
                        <StatCard title="Ticket Promedio" value={formatCurrency(avgTicket / 100)} icon={TrendingUp} trend={metrics?.hasEnoughData ? 5.2 : 0} />
                    </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                    <p className="font-bold text-indigo-500 uppercase tracking-widest text-[9px] mb-1">Valor de Cliente</p>
                    <p>Promedio de ingresos generados por cada transacción. Indicador de eficiencia en upselling.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
