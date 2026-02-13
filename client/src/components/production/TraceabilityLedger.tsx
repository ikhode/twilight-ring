
import { useState } from "react";
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
    Database,
    Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DossierView } from "@/components/shared/DossierView";

interface TraceabilityLedgerProps {
    onSelectBatch?: (id: string) => void;
    selectedBatchId?: string | null;
}

export function TraceabilityLedger({ onSelectBatch, selectedBatchId }: TraceabilityLedgerProps) {
    const { session } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: batches = [], isLoading } = useQuery({
        queryKey: ["/api/production/instances/all"],
        queryFn: async () => {
            const res = await fetch("/api/production/instances/all", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch traceability ledger");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    const filteredBatches = batches.filter((b: any) =>
        String(b.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(b.processName).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Ledger Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <History className="w-6 h-6 text-emerald-400" />
                        </div>
                        Historial de Lotes
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Consulta la genealogía y trazabilidad completa de cada orden de producción.
                    </p>
                </div>
            </div>

            {/* Smart Search Bar */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-2 flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                        placeholder="Buscar por Batch ID, Proceso..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-white pl-10 h-10"
                    />
                </div>
            </div>

            {/* Timeline View */}
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-emerald-500/50 via-slate-800 to-transparent" />

                <div className="space-y-6">
                    {isLoading ? (
                        <div className="pl-14 py-10 text-slate-500 italic">Cargando historial de producción...</div>
                    ) : filteredBatches.length > 0 ? (
                        filteredBatches.map((item: any, idx: number) => {
                            const yields = item.aiContext?.yields?.final;
                            const hasYield = yields && Object.keys(yields).length > 0;

                            return (
                                <div key={item.id} className="relative pl-14 group">
                                    {/* Line Dot */}
                                    <div className={cn(
                                        "absolute left-6 top-6 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-slate-950 z-10 transition-all group-hover:scale-125",
                                        selectedBatchId === item.id ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-slate-700"
                                    )} />

                                    <Card
                                        className={cn(
                                            "bg-slate-900/40 border-slate-800 hover:border-primary/30 transition-all cursor-pointer",
                                            selectedBatchId === item.id ? "border-primary/50 bg-primary/5" : ""
                                        )}
                                        onClick={() => onSelectBatch?.(item.id)}
                                    >
                                        <CardContent className="p-4 md:p-6">
                                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500">
                                                        <Package className="w-6 h-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className={cn(
                                                                "text-[9px] uppercase font-bold",
                                                                item.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                                            )}>
                                                                {item.status === 'completed' ? 'Finalizado' : 'En Curso'}
                                                            </Badge>
                                                            <span className="text-xs font-mono text-slate-500">Batch #{item.id.split('-')[0]}</span>
                                                        </div>
                                                        <h3 className="text-lg font-bold text-white tracking-tight">{item.processName}</h3>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8 justify-between md:justify-end">
                                                    <div className="space-y-1 text-left md:text-right">
                                                        <span className="text-[10px] text-slate-600 uppercase font-bold block tracking-widest">Iniciado</span>
                                                        <div className="flex items-center gap-1.5 md:justify-end text-slate-400">
                                                            <Clock className="w-3 h-3" />
                                                            <span className="text-xs">{item.startedAt ? format(new Date(item.startedAt), "dd MMM, HH:mm", { locale: es }) : '-'}</span>
                                                        </div>
                                                    </div>

                                                    {hasYield && (
                                                        <div className="space-y-1 text-right">
                                                            <span className="text-[10px] text-slate-600 uppercase font-bold block tracking-widest">Rendimiento</span>
                                                            <div className="flex items-center gap-1.5 justify-end text-emerald-400 font-bold">
                                                                <Zap className="w-3 h-3 text-primary" />
                                                                <span className="text-xs">Calc AI</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <DossierView
                                                            entityType="transaction"
                                                            entityId={item.id}
                                                            entityName={item.processName || "Lote"}
                                                            trigger={
                                                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-primary">
                                                                    <History className="w-4 h-4" />
                                                                </Button>
                                                            }
                                                        />
                                                        <Button variant="ghost" size="icon" className={cn(
                                                            "text-slate-600 group-hover:text-white",
                                                            selectedBatchId === item.id ? "text-primary hover:text-primary" : ""
                                                        )}>
                                                            <ArrowRight className="w-5 h-5 translate-x-0 group-hover:translate-x-1 transition-transform" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })
                    ) : (
                        <div className="pl-14 py-10 text-slate-600 italic">No se encontraron lotes activos o finalizados.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
