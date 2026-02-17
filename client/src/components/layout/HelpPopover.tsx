import { HelpCircle, Info, BarChart3, Layout, MousePointer2 } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";

interface HelpSection {
    title: string;
    icon: any;
    items: {
        label: string;
        description: string;
    }[];
}

const GLOBAL_HELP: Record<string, HelpSection[]> = {
    "/": [
        {
            title: "Panel de Control",
            icon: Layout,
            items: [
                { label: "Resumen Financiero", description: "Vista rápida de ingresos, egresos y balance neto del periodo actual." },
                { label: "Alertas Activas", description: "Notificaciones críticas del sistema que requieren atención inmediata." }
            ]
        },
        {
            title: "KPIs de Negocio",
            icon: BarChart3,
            items: [
                { label: "Margen Operativo", description: "Porcentaje de utilidad después de descontar costos directos e indirectos." },
                { label: "Liquidez", description: "Capacidad de la empresa para cumplir con sus obligaciones de corto plazo." }
            ]
        }
    ],
    "/inventory": [
        {
            title: "Gestión de Compras",
            icon: Layout,
            items: [
                { label: "Flujo de Lotes", description: "Las compras se agrupan por orden de compra (lote) para facilitar la auditoría." },
                { label: "Catálogo Cognitivo", description: "Motor de búsqueda con IA que sugiere productos basados en historial y stock." }
            ]
        },
        {
            title: "KPIs de Abastecimiento",
            icon: BarChart3,
            items: [
                { label: "Costo Promedio", description: "Valor ponderado de adquisición de un producto en el tiempo." },
                { label: "Impacto en Caja", description: "Monto total que saldrá de la cuenta al confirmar la orden actual." }
            ]
        }
    ],
    "/vision": [
        {
            title: "Smart Vision",
            icon: Layout,
            items: [
                { label: "Canales de Análisis", description: "Especializaciones del motor de IA para distintos sectores (Retail, Seguridad, etc.)." },
                { label: "Libro de Objetos", description: "Registro histórico de detecciones validadas por el núcleo cognitivo." }
            ]
        },
        {
            title: "KPIs de IA",
            icon: BarChart3,
            items: [
                { label: "Confirmaciones IA", description: "Total de cuadros procesados donde se validó positivamente un objeto." },
                { label: "Confianza (Confidence)", description: "Nivel de precisión estadística del modelo ante la escena actual." }
            ]
        }
    ],
    "/analytics": [
        {
            title: "Cognitive Analytics",
            icon: Layout,
            items: [
                { label: "Simulador de Escenarios", description: "Herramienta interactiva para proyectar crecimiento basado en variables dinámicas." },
                { label: "Modelos Predictivos", description: "Gráficas de rendimiento real vs. predicción algorítmica de la IA." }
            ]
        },
        {
            title: "KPIs Predictivos",
            icon: BarChart3,
            items: [
                { label: "Precisión de Modelo", description: "Desviación estándar histórica entre lo proyectado y lo real." },
                { label: "Carga Cognitiva", description: "Uso de recursos computacionales dedicados al aprendizaje del modelo." }
            ]
        }
    ]
};

const DEFAULT_HELP: HelpSection[] = [
    {
        title: "Funciones del Sistema",
        icon: Layout,
        items: [
            { label: "Navegación", description: "Acceso lateral a todos los módulos operativos y administrativos." },
            { label: "Búsqueda Semántica", description: "Usa lenguaje natural para encontrar datos o ejecutar acciones." }
        ]
    }
];

export function HelpPopover() {
    const [location] = useLocation();
    const content = GLOBAL_HELP[location] || DEFAULT_HELP;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 text-muted-foreground hover:text-primary transition-colors"
                    title="Ayuda del sistema"
                >
                    <HelpCircle className="w-5 h-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 bg-slate-950 border-slate-800 shadow-2xl">
                <div className="p-4 bg-primary/10 border-b border-primary/20">
                    <h4 className="font-bold flex items-center gap-2 text-primary">
                        <Info className="w-4 h-4" />
                        Centro de Ayuda Contextual
                    </h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">Guía rápida de KPIs y Paneles</p>
                </div>
                <ScrollArea className="h-[400px]">
                    <div className="p-4 space-y-6">
                        {content.map((section, idx) => (
                            <div key={idx} className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-tighter text-slate-400">
                                    <section.icon className="w-3.5 h-3.5" />
                                    {section.title}
                                </div>
                                <div className="space-y-4 ml-2 border-l border-slate-800 pl-4">
                                    {section.items.map((item, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                <MousePointer2 className="w-2.5 h-2.5 text-primary opacity-50" />
                                                {item.label}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                                {item.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {idx < content.length - 1 && <Separator className="bg-slate-800 mt-4" />}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-3 bg-slate-900/50 border-t border-slate-800 text-center">
                    <p className="text-[9px] text-slate-500 uppercase font-black">Sistema de Soporte Cognitivo v2.4</p>
                </div>
            </PopoverContent>
        </Popover>
    );
}
