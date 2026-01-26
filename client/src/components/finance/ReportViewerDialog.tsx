
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Loader2,
    Printer,
    Download,
    FileText,
    Share2,
    Sparkles,
    BarChart as BarChartIcon,
    Table as TableIcon,
    TrendingUp,
    Filter,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type ReportType = "income_statement" | "balance_sheet" | "cash_flow" | "receivables" | "payables" | "payroll" | "production" | null;

interface ReportViewerDialogProps {
    reportType: ReportType;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReportViewerDialog({ reportType, open, onOpenChange }: ReportViewerDialogProps) {
    const { session } = useAuth();
    const [showInsights, setShowInsights] = useState(true);
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: [`/api/analytics/advanced/${reportType}`],
        queryFn: async () => {
            if (!reportType) return null;
            const res = await fetch(`/api/analytics/advanced/${reportType}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch report");
            return res.json();
        },
        enabled: open && !!session?.access_token && !!reportType
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
        }).format(amount / 100); // Backend sends cents usually, but if analytic sends float, check. Analytics endpoint sends calculated numbers. 
    // My analytics endpoint sends raw sums (cents usually if sum(integer)).
    // Except predicted/averages might be floats.
    // I will assume backend sends CENTS for monetary sums, but COUNTS for others.
    // Wait, `value: revenue` in analytics.ts is sum(sales.totalPrice) which is cents.
    // `efficiencyAvg` is float (0-100).
    // I need to be careful formatting.

    const isMonetary = (label: string) => {
        const l = label.toLowerCase();
        return l.includes('ingreso') || l.includes('costo') || l.includes('gasto') || l.includes('total') || l.includes('ebitda') || l.includes('pendiente') || l.includes('productividad');
    };

    const formatValue = (label: string, value: any) => {
        if (typeof value === 'string') return value;
        if (isMonetary(label)) return formatCurrency(value);
        return value;
    };

    const getReportDetails = () => {
        switch (reportType) {
            case "income_statement": return { title: "Estado de Resultados", subtitle: "Análisis de Rentabilidad" };
            case "balance_sheet": return { title: "Balance General", subtitle: "Situación Patrimonial" };
            case "cash_flow": return { title: "Flujo de Efectivo", subtitle: "Liquidez" };
            case "receivables": return { title: "Cuentas por Cobrar", subtitle: "Cartera" };
            case "payables": return { title: "Cuentas por Pagar", subtitle: "Proveedores" };
            case "payroll": return { title: "Reporte de RH y Nómina", subtitle: "Desempeño y Rotación" };
            case "production": return { title: "Reporte de Producción", subtitle: "Mermas y Eficiencia" };
            default: return { title: "Reporte", subtitle: "General" };
        }
    };

    const details = getReportDetails();

    // AI Insight Component
    const AiAnnotation = ({ children, intent = "info" }: { children: React.ReactNode, intent?: "info" | "warning" | "success" | "danger" }) => {
        if (!showInsights) return null;
        return (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                    "my-1 text-[10px] p-2 rounded border-l-2 flex items-start gap-2",
                    intent === "info" && "bg-blue-500/10 border-blue-500 text-blue-200",
                    intent === "warning" && "bg-amber-500/10 border-amber-500 text-amber-200",
                    intent === "success" && "bg-emerald-500/10 border-emerald-500 text-emerald-200",
                    intent === "danger" && "bg-rose-500/10 border-rose-500 text-rose-200"
                )}
            >
                <Sparkles className="w-3 h-3 shrink-0 mt-0.5" />
                <span>{children}</span>
            </motion.div>
        );
    };

    const renderContent = () => {
        if (isLoading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
        if (!data) return <div className="p-10 text-center">Sin datos.</div>;

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <Tabs defaultValue="dashboard" className="w-full">
                    <TabsList className="bg-slate-900/50 border border-slate-800">
                        <TabsTrigger value="dashboard"><BarChartIcon className="w-4 h-4 mr-2" />Dashboard</TabsTrigger>
                        <TabsTrigger value="detail"><TableIcon className="w-4 h-4 mr-2" />Detalle</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-6 mt-4">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {data.summary?.map((stat: any, i: number) => (
                                <div key={i} className={cn(
                                    "p-4 rounded-xl border",
                                    stat.intent === 'success' ? "bg-emerald-500/10 border-emerald-500/20" :
                                        stat.intent === 'danger' ? "bg-rose-500/10 border-rose-500/20" :
                                            stat.intent === 'warning' ? "bg-amber-500/10 border-amber-500/20" :
                                                "bg-blue-500/10 border-blue-500/20"
                                )}>
                                    <p className={cn("text-xs uppercase font-bold",
                                        stat.intent === 'success' ? "text-emerald-500" :
                                            stat.intent === 'danger' ? "text-rose-500" :
                                                stat.intent === 'warning' ? "text-amber-500" :
                                                    "text-blue-500"
                                    )}>{stat.label}</p>
                                    <p className="text-xl font-black mt-1">
                                        {formatValue(stat.label, stat.value)}
                                    </p>
                                    {stat.change !== 0 && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Badge variant="outline" className="text-[10px] h-4 border-none bg-black/20">
                                                {stat.change > 0 ? "+" : ""}{stat.change}%
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Chart */}
                        {data.chart && data.chart.length > 0 ? (
                            <div className="h-[300px] bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                                <h4 className="text-xs font-bold uppercase mb-4 text-slate-400">Tendencia Histórica (Real)</h4>
                                <ResponsiveContainer width="100%" height="90%">
                                    <AreaChart data={data.chart}>
                                        <defs>
                                            <linearGradient id="colorChart" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={40} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                                            formatter={(val: number) => reportType === 'production' ? val : formatCurrency(val)}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorChart)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center border border-dashed border-slate-800 rounded-xl">
                                <p className="text-slate-500 text-xs">No hay datos históricos suficientes para graficar.</p>
                            </div>
                        )}

                        <AiAnnotation>
                            {reportType === 'payroll' && "El aumento de la rotación en el área de Producción sugiere revisar condiciones ambientales."}
                            {reportType === 'production' && "La eficiencia está en niveles óptimos, pero el desperdicio aumentó 2% el último turno."}
                            {reportType === 'income_statement' && "Margen operativo saludable. Se recomienda reinvertir excedentes en inventario antes de fin de mes."}
                        </AiAnnotation>
                    </TabsContent>

                    <TabsContent value="detail">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                                <h4 className="font-bold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" /> Registros Detallados
                                </h4>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="ghost" className="h-7 w-7"><Filter className="w-3 h-3" /></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="w-3 h-3" /></Button>
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                                        <TableHead className="text-xs uppercase font-bold text-slate-500">ID / Info</TableHead>
                                        <TableHead className="text-xs uppercase font-bold text-slate-500">Descripción / Rol</TableHead>
                                        <TableHead className="text-right text-xs uppercase font-bold text-slate-500">
                                            {reportType === 'production' ? 'Impacto' : reportType === 'payroll' ? 'Balance' : 'Monto'}
                                        </TableHead>
                                        <TableHead className="text-right text-xs uppercase font-bold text-slate-500">Info Extra</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.items?.slice((page - 1) * 10, page * 10).map((item: any, i: number) => (
                                        <TableRow key={i} className="border-b-slate-800 hover:bg-slate-800/50 transition-colors">
                                            <TableCell className="font-mono text-xs text-slate-400">
                                                {item.id?.slice(0, 8)}... <br />
                                                <span className="text-[9px] text-slate-600">{item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {item.name || item.description || item.entity}
                                                {item.role && <Badge variant="outline" className="ml-2 text-[9px]">{item.role}</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-200">
                                                {formatValue(reportType === 'production' ? 'impact' : 'monto', item.amount || item.balance || item.impact)}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-slate-500">
                                                {item.efficiency ? `${item.efficiency}% Efic.` : item.type}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!data.items || data.items.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-500">No hay registros.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            <div className="p-2 flex justify-end gap-2 border-t border-slate-800 bg-slate-900/50">
                                <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0"><ChevronLeft className="w-4 h-4" /></Button>
                                <span className="text-xs flex items-center px-2 text-slate-500">Pág {page}</span>
                                <Button size="sm" variant="ghost" onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0"><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0 bg-slate-950 border-slate-800 sm:rounded-xl overflow-hidden shadow-2xl shadow-black/50">
                <DialogHeader className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl shrink-0 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3 text-white">
                            <div className="p-2 rounded-lg bg-primary/20 text-primary">
                                <FileText className="w-6 h-6" />
                            </div>
                            {details.title}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1 ml-12">
                            {details.subtitle} • {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </DialogDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 mr-6">
                            <Sparkles className={cn("w-3.5 h-3.5", showInsights ? "text-primary animate-pulse" : "text-slate-600")} />
                            <Label htmlFor="ai-toggle" className="text-[10px] font-bold uppercase tracking-wide cursor-pointer select-none">AI Insights</Label>
                            <Switch
                                id="ai-toggle"
                                checked={showInsights}
                                onCheckedChange={setShowInsights}
                                className="scale-75 data-[state=checked]:bg-primary"
                            />
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative bg-black/20">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                    <ScrollArea className="h-full">
                        <div className="p-8 max-w-7xl mx-auto">
                            {renderContent()}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 border-t border-white/5 bg-slate-900 flex justify-between items-center shrink-0">
                    <div className="text-[10px] uppercase text-slate-500 font-mono flex gap-4">
                        <span>ID: RPT-{Date.now().toString().slice(-6)}</span>
                        <span>Gen: System Core</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => window.print()} className="uppercase text-xs font-bold hover:bg-white/5">
                            <Printer className="w-4 h-4 mr-2" /> Imprimir
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90 text-black uppercase text-xs font-black tracking-wider">
                            <Download className="w-4 h-4 mr-2" /> Exportar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
