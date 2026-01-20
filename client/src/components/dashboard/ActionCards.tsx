import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    Sparkles,
    ShieldAlert,
    TrendingUp,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRoleType } from "@/lib/ai/dashboard-engine";

interface ActionCard {
    id: string;
    title: string;
    description: string;
    type: 'optimization' | 'security' | 'growth' | 'efficiency';
    icon: any;
}

const roleActions: Record<UserRoleType, ActionCard[]> = {
    admin: [
        {
            id: 'cost_optimize',
            title: 'Optimización de Costos',
            description: 'Hemos detectado redundancias en la cadena de suministro que podrían ahorrar un 8% mensual.',
            type: 'optimization',
            icon: Zap
        },
        {
            id: 'security_audit',
            title: 'Auditoría de Seguridad',
            description: 'Guardian sugiere revisar los permisos del módulo de Finanzas tras detectar accesos inusuales.',
            type: 'security',
            icon: ShieldAlert
        }
    ],
    production: [
        {
            id: 'machine_maintenance',
            title: 'Mantenimiento Preventivo',
            description: 'La vibración en la Prensa #4 indica una falla probable en los próximos 3 días. Agendar revisión.',
            type: 'efficiency',
            icon: Zap
        },
        {
            id: 'batch_optimization',
            title: 'Optimización de Lote',
            description: 'Ajustar la temperatura en la fase 2 podría reducir la merma en un 1.5%.',
            type: 'optimization',
            icon: TrendingUp
        }
    ],
    logistics: [
        {
            id: 'route_recalc',
            title: 'Recálculo de Ruta',
            description: 'Debido a congestión en la zona norte, sugerimos desviar la Flota B por la ruta alterna 12.',
            type: 'efficiency',
            icon: Zap
        },
        {
            id: 'inventory_rebalance',
            title: 'Rebalanceo de Stock',
            description: 'El Almacén Central tiene exceso de Copra. Transferir 5t al Almacén Sur para demanda proyectada.',
            type: 'optimization',
            icon: TrendingUp
        }
    ],
    sales: [
        {
            id: 'upsell_opportunity',
            title: 'Oportunidad de Upsell',
            description: 'El Cliente 802 ha aumentado su frecuencia de compra. Sugerir el Plan Enterprise.',
            type: 'growth',
            icon: TrendingUp
        },
        {
            id: 'churn_prediction',
            title: 'Predicción de Abandono',
            description: 'Se detectó una reducción en la actividad del Cliente 551. Programar llamada de seguimiento.',
            type: 'security',
            icon: ShieldAlert
        }
    ]
};

export function ActionCards({ role }: { role: UserRoleType }) {
    const actions = roleActions[role] || roleActions.admin;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                    <motion.div
                        key={action.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                    >
                        <Card className="bg-primary/5 border-primary/20 hover:bg-primary/10 transition-all group cursor-pointer overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Icon className="w-16 h-16 text-primary" />
                            </div>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 rounded-md bg-primary/20">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Sugerencia Proactiva</span>
                                </div>
                                <h4 className="text-lg font-black italic uppercase tracking-tight">{action.title}</h4>
                                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                                    {action.description}
                                </p>
                                <Button variant="link" className="p-0 h-auto mt-4 text-xs font-black uppercase tracking-widest text-primary group-hover:gap-2 transition-all">
                                    Ejecutar Acción <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}
