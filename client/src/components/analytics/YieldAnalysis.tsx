
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function YieldAnalysis() {
    const { session } = useAuth();
    const { data: yieldData, isLoading } = useQuery({
        queryKey: ["/api/analytics/yield"],
        queryFn: async () => {
            const res = await fetch("/api/analytics/yield", {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch yield analysis");
            return res.json();
        },
        enabled: !!session?.access_token
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!yieldData || yieldData.length === 0) {
        return (
            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-8 text-center text-slate-500">
                    <p>No hay datos de análisis de rendimiento disponibles aún.</p>
                    <p className="text-xs mt-2">Vincula Lotes de Producción con Compras de Materia Prima para activar este reporte.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-widest italic text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Análisis de Rendimiento (Yield)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-500 bg-amber-500/5">
                            BETA
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-500">
                            Tiempo Real
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-950">
                            <TableRow>
                                <TableHead className="text-[10px] uppercase font-bold text-slate-400">Lote (MP)</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold text-slate-400">Producto</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold text-slate-400 text-right">Compra</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold text-slate-400 text-right">Prod. Real</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold text-slate-400 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        Rendimiento
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs p-3">
                                                    <p className="text-xs">Porcentaje de eficiencia del lote. Prod. Real vs Prod. Teórica esperada según la receta vinculada.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableHead>
                                <TableHead className="text-[10px] uppercase font-bold text-slate-400 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        Costo Unit.
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs p-3">
                                                    <p className="text-xs">Costo real de producción por unidad, calculado dividiendo el costo total de MP entre la producción real lograda.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableHead>
                                <TableHead className="text-[10px] uppercase font-bold text-slate-400 text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {yieldData.map((row: any) => (
                                <TableRow key={row.batchId} className="border-slate-800 hover:bg-white/5">
                                    <TableCell className="font-mono text-xs text-white">{row.batchId}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-200">{row.product}</span>
                                            <span className="text-[10px] text-slate-500">{row.supplier}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-slate-300">
                                        {row.purchaseQty} <span className="text-[9px] text-slate-500">Unid.</span>
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-slate-300">
                                        <span className={row.actualOutput < row.expectedTotalOutput ? "text-amber-500" : "text-emerald-500"}>
                                            {row.actualOutput}
                                        </span>
                                        <span className="text-[9px] text-slate-500"> / {row.expectedTotalOutput} Est.</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className={`
                        border-0 text-[10px] font-black w-12 justify-center
                        ${row.yieldPercentage >= 100 ? 'bg-emerald-500/10 text-emerald-500' :
                                                row.yieldPercentage >= 90 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}
                    `}>
                                            {row.yieldPercentage}%
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs text-slate-300">
                                        ${(row.realUnitCost / 100).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {row.inProgress ? (
                                            <Badge variant="secondary" className="text-[9px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">En Proceso</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-500">Finalizado</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
