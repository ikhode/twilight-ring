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
    // Simulamos datos de KPIs. En producción esto vendría de una API o store global.
    const mockData: Record<string, Omit<KPIProps, 'id' | 'icon'>> = {
        revenue: { label: 'Ingresos Totales', value: '$1.2M', trend: 12.5, status: 'normal' },
        active_users: { label: 'Usuarios Activos', value: '142', trend: 3.2, status: 'normal' },
        system_health: { label: 'Salud del Sistema', value: '99.9%', trend: 0.1, status: 'normal' },
        critical_alerts: { label: 'Alertas Críticas', value: '1', trend: -50, status: 'warning' },
        production_efficiency: { label: 'Eficiencia', value: '87%', trend: 5.4, status: 'normal' },
        active_lots: { label: 'Lotes Activos', value: '24', trend: 0, status: 'normal' },
        equipment_status: { label: 'Equipos OK', value: '11/12', trend: -8.3, status: 'warning' },
        waste_levels: { label: 'Nivel de Merma', value: '4.2%', trend: 15.2, status: 'warning' },
        fleet_utilization: { label: 'Uso de Flota', value: '92%', trend: 2.1, status: 'normal' },
        pending_deliveries: { label: 'Entregas Pend.', value: '18', trend: 12.0, status: 'normal' },
        total_sales: { label: 'Ventas del Mes', value: '$458k', trend: 8.7, status: 'normal' },
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpiId, index) => {
                const data = mockData[kpiId] || { label: kpiId, value: '---', trend: 0, status: 'normal' };
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
