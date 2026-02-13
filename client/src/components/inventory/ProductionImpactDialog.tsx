import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Workflow, ArrowRight, DollarSign, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

interface ProductionImpactDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    productId: string | null;
}

export function ProductionImpactDialog({ isOpen, onOpenChange, productId }: ProductionImpactDialogProps) {
    const { session } = useAuth();
    const { data, isLoading, isError } = useQuery({
        queryKey: [`/api/inventory/products/${productId}/production-impact`],
        queryFn: async () => {
            if (!productId) return null;
            const res = await fetch(`/api/inventory/products/${productId}/production-impact`, {
                headers: {
                    "Authorization": `Bearer ${session?.access_token}`
                    // Note: In real app, use useAuth hook or similar to get token
                }
            });
            if (!res.ok) throw new Error("Failed to fetch impact analysis");
            return res.json();
        },
        enabled: !!productId && isOpen
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
        }).format(amount);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Workflow className="w-6 h-6 text-amber-500" />
                        Análisis de Impacto en Producción
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Evaluando consecuencias de desabasto para: <span className="text-white font-bold">{data?.productName || "..."}</span>
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-sm text-slate-500 animate-pulse">Simulando cadena de producción...</p>
                    </div>
                ) : isError ? (
                    <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg text-red-400">
                        Error al analizar el impacto. Intente nuevamente.
                    </div>
                ) : !data || data.impactedRecipes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                        <Package className="w-12 h-12 text-slate-600 mb-2" />
                        <p className="text-slate-400 font-medium">Sin impacto directo detectado</p>
                        <p className="text-xs text-slate-600">Este insumo no es parte de ninguna receta activa actualmente.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Procesos Afectados</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold font-mono text-white">{data.impactedRecipes.length}</span>
                                    <span className="text-xs text-amber-400/70">líneas de producción</span>
                                </div>
                            </Card>
                            <Card className="p-4 bg-red-500/10 border-red-500/20">
                                <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1">Valor en Riesgo (por lote)</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold font-mono text-white">{formatCurrency(data.totalPotentialValuePerBatch)}</span>
                                    <span className="text-xs text-red-400/70">MXN</span>
                                </div>
                            </Card>
                        </div>

                        <Separator className="bg-slate-800" />

                        {/* Detailed List */}
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-300">Detalle de Afectación:</p>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {data.impactedRecipes.map((impact: any) => (
                                    <div key={impact.recipeId} className="flex items-center gap-4 p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                                        {/* Input Side */}
                                        <div className="flex flex-col items-center min-w-[60px]">
                                            <Badge variant="outline" className="border-slate-700 text-slate-500 mb-1 text-[10px]">Insumo</Badge>
                                            <span className="text-xs font-mono text-slate-300">-{impact.inputRequiredPerBatch}</span>
                                        </div>

                                        <ArrowRight className="w-4 h-4 text-slate-600" />

                                        {/* Process Info */}
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">{impact.recipeName}</p>
                                            <p className="text-xs text-slate-500">Produce: <span className="text-emerald-400">{impact.outputProduct.name}</span></p>
                                        </div>

                                        {/* Value Side */}
                                        <div className="text-right">
                                            <p className="text-xs font-mono text-slate-500">Valor Lote</p>
                                            <p className="text-sm font-bold text-emerald-400">{formatCurrency(impact.potentialValuePerBatch)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-blue-400 mb-0.5">Recomendación IA</p>
                                <p className="text-xs text-blue-300/80">
                                    Dada la criticidad de este insumo para {data.impactedRecipes.length} procesos, se recomienda mantener un stock de seguridad de al menos 15 días.
                                    Considere buscar proveedores alternativos para reducir riesgo de parada.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
