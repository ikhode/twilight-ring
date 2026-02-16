import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function ValuationReport() {
    const { data, isLoading } = useQuery({
        queryKey: ["/api/inventory/reports/valuation"],
        queryFn: async () => {
            const res = await fetch("/api/inventory/reports/valuation");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    if (!data) return <div className="text-center p-8">No hay datos disponibles</div>;

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val / 100);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Valor Costo (Inversión)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.valuation.totalCost)}</div>
                        <p className="text-xs text-slate-400 mt-1">Capital inmovilizado actual</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Valor Retail (Venta)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {formatCurrency(data.valuation.totalRetail)}
                            <Badge variant="outline" className="ml-auto text-emerald-600 border-emerald-200 bg-emerald-50">
                                +{data.valuation.marginPercentage.toFixed(1)}% Margen
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Proyección de ingresos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Rotación (90 días)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.performance.annualizedTurnover.toFixed(2)}x</div>
                        <p className="text-xs text-muted-foreground mt-1">Veces que rota el inventario al año</p>
                        <Progress value={Math.min(data.performance.annualizedTurnover * 10, 100)} className="h-1 mt-2" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Días Promedio Venta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(data.performance.avgDaysToSell)} días</div>
                        <p className="text-xs text-muted-foreground mt-1">Tiempo promedio en estantería</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Valoración por Categoría</CardTitle>
                        <CardDescription>Distribución del capital invertido.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.byCategory.map((cat: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <span className="text-sm font-medium">{cat.name}</span>
                                    </div>
                                    <span className="text-sm text-foreground">{formatCurrency(cat.value)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1 border-dashed bg-muted/20">
                    <CardHeader>
                        <CardTitle>Insights Cognitivos</CardTitle>
                        <CardDescription>Análisis de IA sobre tu inventario.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.performance.annualizedTurnover < 2 && (
                            <div className="flex gap-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Rotación Lenta Detectada</h4>
                                    <p className="text-xs text-muted-foreground mt-1">El inventario se mueve lentamente (&lt; 2x anual). Considera promociones para liberar capital.</p>
                                </div>
                            </div>
                        )}
                        {data.valuation.marginPercentage < 20 && (
                            <div className="flex gap-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <DollarSign className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-red-700 dark:text-red-400">Margen Crítico</h4>
                                    <p className="text-xs text-muted-foreground mt-1">El margen global es bajo ({data.valuation.marginPercentage.toFixed(1)}%). Revisa costos de adquisición.</p>
                                </div>
                            </div>
                        )}
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs leading-relaxed text-blue-800 dark:text-blue-300">
                            La valoración actual utiliza el método <strong>Costo Promedio</strong> (basado en el costo actual del producto). El análisis de COGS se basa en movimientos de los últimos 90 días.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
