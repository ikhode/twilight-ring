
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import {
    History,
    Search,
    Filter,
    ArrowRight,
    Package,
    Clock,
    CheckCircle2,
    Database
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TraceabilityLedger() {
    const { session } = useAuth();

    const { data: batches } = useQuery({
        queryKey: ["/api/production/summary"], // Currently reusing summary for demo purposes
        queryFn: async () => {
            const res = await fetch("/api/production/summary", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const mockTraceability = [
        { id: "B4582", product: "Pulpa de Coco", type: "Final", date: "2024-05-20", status: "Completed", yield: "94%" },
        { id: "B4581", product: "Coco Deshuesado", type: "Intermediate", date: "2024-05-20", status: "Completed", yield: "92%" },
        { id: "B4580", product: "Coco (Raw)", type: "Input", date: "2024-05-19", status: "Completed", yield: "100%" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Ledger Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <History className="w-6 h-6 text-emerald-400" />
                        </div>
                        Traceability Ledger
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Historial inmutable y visualización de la genealogía de productos.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-800 bg-slate-900/50 gap-2 text-xs">
                        <Filter className="w-3 h-3" />
                        Filtros Avanzados
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-500 gap-2 text-xs font-bold">
                        <Database className="w-3 h-3" />
                        Exportar Reporte
                    </Button>
                </div>
            </div>

            {/* Smart Search Bar */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-2 flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                        placeholder="Buscar por Batch ID, SKU, Operador o Lote de Compra..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-white pl-10 h-10"
                    />
                </div>
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-800 bg-slate-950 text-[10px] text-slate-500 font-mono mr-2">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </div>

            {/* Timeline View */}
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-emerald-500/50 via-slate-800 to-transparent" />

                <div className="space-y-6">
                    {mockTraceability.map((item, idx) => (
                        <div key={item.id} className="relative pl-14 group">
                            {/* Line Dot */}
                            <div className={cn(
                                "absolute left-6 top-6 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-slate-950 z-10 transition-all group-hover:scale-125",
                                idx === 0 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-700"
                            )} />

                            <Card className="bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] uppercase font-bold">
                                                        {item.type}
                                                    </Badge>
                                                    <span className="text-xs font-mono text-slate-500">Batch #{item.id}</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-white tracking-tight">{item.product}</h3>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 text-right">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-600 uppercase font-bold block tracking-widest">Finalizado</span>
                                                <div className="flex items-center gap-1.5 justify-end text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-xs">{item.date}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-600 uppercase font-bold block tracking-widest">Rendimiento</span>
                                                <div className="flex items-center gap-1.5 justify-end text-emerald-400 font-bold">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    <span className="text-xs">{item.yield}</span>
                                                </div>
                                            </div>

                                            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-white">
                                                <ArrowRight className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
