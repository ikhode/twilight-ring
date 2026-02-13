import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import { CalendarIcon, Download, SlidersHorizontal, ArrowRight, Table as TableIcon, CreditCard, Banknote, ChevronLeft, ChevronRight, Info, Search, Filter, Zap } from "lucide-react";
import {
    Tooltip as UiTooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getWeek,
    addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, startOfQuarter, endOfQuarter, addQuarters, subQuarters
} from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";


import { DataTable } from "@/components/shared/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DossierView } from "@/components/shared/DossierView";
import { History } from "lucide-react";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { StatCard } from "@/components/shared/StatCard";

type ViewMode = 'week' | 'month' | 'quarter' | 'year';

export default function FinancialReports() {
    const { session } = useAuth();

    // NEW: Time Navigation State
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [cursorDate, setCursorDate] = useState<Date>(new Date());

    // Calculate range based on mode and cursor
    const dateRange = useMemo(() => {
        const now = cursorDate;
        switch (viewMode) {
            case 'week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }; // Monday start
            case 'month': return { from: startOfMonth(now), to: endOfMonth(now) };
            case 'quarter': return { from: startOfQuarter(now), to: endOfQuarter(now) };
            case 'year': return { from: startOfYear(now), to: endOfYear(now) };
            default: return { from: startOfWeek(now), to: endOfWeek(now) };
        }
    }, [viewMode, cursorDate]);

    // Navigation Handlers
    const handlePrev = () => {
        switch (viewMode) {
            case 'week': setCursorDate(d => subWeeks(d, 1)); break;
            case 'month': setCursorDate(d => subMonths(d, 1)); break;
            case 'quarter': setCursorDate(d => subQuarters(d, 1)); break;
            case 'year': setCursorDate(d => subYears(d, 1)); break;
        }
    };

    const handleNext = () => {
        switch (viewMode) {
            case 'week': setCursorDate(d => addWeeks(d, 1)); break;
            case 'month': setCursorDate(d => addMonths(d, 1)); break;
            case 'quarter': setCursorDate(d => addQuarters(d, 1)); break;
            case 'year': setCursorDate(d => addYears(d, 1)); break;
        }
    };

    const handleToday = () => setCursorDate(new Date());

    // Dynamic Label
    const periodLabel = useMemo(() => {
        if (!dateRange.from) return "";
        switch (viewMode) {
            case 'week': return `Semana ${getWeek(cursorDate, { weekStartsOn: 1 })} - ${format(cursorDate, "yyyy")}`;
            case 'month': return format(cursorDate, "MMMM yyyy", { locale: es });
            case 'quarter': return `Q${Math.floor(cursorDate.getMonth() / 3) + 1} ${format(cursorDate, "yyyy")}`;
            case 'year': return format(cursorDate, "yyyy");
        }
    }, [viewMode, cursorDate, dateRange]);

    const fullDateRangeLabel = dateRange.from ? `${format(dateRange.from, "dd MMM yyyy", { locale: es })} - ${format(dateRange.to, "dd MMM yyyy", { locale: es })}` : "";


    const { data: allTransactions, isLoading: isLoadingAll } = useQuery({
        queryKey: ['/api/finance/all-transactions', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
        queryFn: async () => {
            if (!dateRange?.from) return null;
            const params = new URLSearchParams({
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to?.toISOString() || dateRange.from.toISOString()
            });
            const res = await fetch(`/api/finance/all-transactions?${params}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        enabled: !!dateRange?.from
    });

    const { data: summary } = useQuery({
        queryKey: ['/api/finance/summary', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
        queryFn: async () => {
            if (!dateRange?.from) return null;
            const params = new URLSearchParams({
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to?.toISOString() || dateRange.from.toISOString()
            });
            const res = await fetch(`/api/finance/summary?${params}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            return res.json();
        },
        enabled: !!dateRange?.from
    });

    // Realtime subscriptions to auto-update report when data changes
    useRealtimeSubscription({
        table: 'payments',
        queryKeyToInvalidate: ['/api/finance/summary', '/api/finance/all-transactions']
    });

    useRealtimeSubscription({
        table: 'sales',
        queryKeyToInvalidate: ['/api/finance/summary', '/api/finance/all-transactions']
    });

    useRealtimeSubscription({
        table: 'expenses',
        queryKeyToInvalidate: ['/api/finance/summary', '/api/finance/all-transactions']
    });

    useRealtimeSubscription({
        table: 'cash_transactions',
        queryKeyToInvalidate: ['/api/finance/summary', '/api/finance/all-transactions']
    });

    const report = summary?.report || {};

    const [searchTerm, setSearchTerm] = useState("");
    const [txFilter, setTxFilter] = useState("all");

    const filteredTransactions = useMemo(() => {
        if (!allTransactions) return [];
        return allTransactions.filter((tx: any) => {
            const matchesSearch = tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.category?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = txFilter === 'all' || tx.type === txFilter;
            return matchesSearch && matchesType;
        });
    }, [allTransactions, searchTerm, txFilter]);

    const txColumns = [
        {
            key: "date",
            header: "Fecha",
            render: (tx: any) => <span className="text-[10px] font-mono text-slate-500">{format(new Date(tx.date), "dd/MM HH:mm")}</span>
        },
        {
            key: "description",
            header: "Concepto",
            render: (tx: any) => (
                <div>
                    <p className="text-xs font-bold text-slate-300">{tx.description}</p>
                    <p className="text-[9px] text-slate-500 uppercase">{tx.category} {tx.details ? `• ${tx.details}` : ''}</p>
                </div>
            )
        },
        {
            key: "method",
            header: "Método",
            render: (tx: any) => (
                <Badge variant="outline" className="text-[9px] border-slate-800 text-slate-500 capitalize">
                    {tx.method || 'cash'}
                </Badge>
            )
        },
        {
            key: "amount",
            header: "Monto",
            className: "text-right",
            render: (tx: any) => (
                <span className={cn(
                    "font-mono font-bold text-xs",
                    tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                    {formatCurrency(tx.amount / 100)}
                </span>
            )
        },
        {
            key: "actions",
            header: "Auditoría",
            className: "text-center w-10",
            render: (tx: any) => (
                <DossierView
                    entityType="transaction"
                    entityId={tx.id.split('_')[1] || tx.id}
                    entityName={tx.description || "Transacción"}
                    trigger={
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-500 hover:text-primary">
                            <History className="h-3 w-3" />
                        </Button>
                    }
                />
            )
        }
    ];

    // Helper row component
    const ReportRow = ({ label, value, type = 'neutral', indent = false, onDetail, tooltip }: any) => (
        <UiTooltip>
            <TooltipTrigger asChild>
                <div className={cn(
                    "flex items-center justify-between p-3 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors cursor-help group",
                    indent ? "pl-8 text-sm" : "font-semibold"
                )}>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-slate-300", indent && "text-slate-500")}>{label}</span>
                        {!indent && <Info className="w-3 h-3 text-slate-600 group-hover:text-primary transition-colors" />}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={cn(
                            "font-mono",
                            type === 'income' ? "text-emerald-400" : type === 'expense' ? "text-rose-400" : "text-white"
                        )}>
                            {formatCurrency((value || 0) / 100)}
                        </span>
                        {onDetail && <Button size="sm" variant="ghost"><ArrowRight className="w-3 h-3" /></Button>}
                    </div>
                </div>
            </TooltipTrigger>
            {tooltip && (
                <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300 p-3 max-w-xs shadow-xl">
                    <p className="font-bold border-b border-white/5 pb-1 mb-1">{label}</p>
                    <p>{tooltip.description}</p>
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cálculo</p>
                        <p className="text-[10px] font-mono text-primary/70">{tooltip.formula}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Fuente</p>
                        <p className="text-[10px] italic">{tooltip.source}</p>
                    </div>
                </TooltipContent>
            )}
        </UiTooltip>
    );

    return (
        <AppLayout title="Reportes Financieros" subtitle="Análisis detallado de flujos y balances">
            <div className="space-y-6 pb-20">

                {/* Controls */}
                {/* Controls - Sticky Glassmorphic Header */}
                <Card className="bg-slate-950/80 border-slate-800/10 sticky top-4 z-10 shadow-2xl backdrop-blur-xl glass-card">
                    <CardContent className="p-3 md:p-4 flex flex-col md:flex-row gap-4 justify-between items-center">

                        {/* View Mode Selector */}
                        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                            {(['week', 'month', 'quarter', 'year'] as ViewMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={cn(
                                        "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                                        viewMode === mode
                                            ? "bg-primary/20 text-primary shadow-sm"
                                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                    )}
                                >
                                    {mode === 'week' && 'Semana'}
                                    {mode === 'month' && 'Mes'}
                                    {mode === 'quarter' && 'Trimestre'}
                                    {mode === 'year' && 'Año'}
                                </button>
                            ))}
                        </div>

                        {/* Navigation Controls */}
                        <div className="flex items-center gap-3 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>

                            <div className="flex flex-col items-center min-w-[140px]">
                                <span className="text-sm font-bold text-white uppercase tracking-wide">
                                    {periodLabel}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {fullDateRangeLabel}
                                </span>
                            </div>

                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleToday} className="text-xs h-8">
                                Hoy
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                        <CalendarIcon className="w-4 h-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={cursorDate}
                                        onSelect={(val) => val && setCursorDate(val)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><Download className="w-4 h-4" /></Button>
                        </div>

                    </CardContent>
                </Card>

                {/* Main Excel-like Report Table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="bg-slate-950/40 border-slate-800/50 overflow-hidden glass-card shadow-2xl">
                            <CardHeader className="bg-slate-900/40 border-b border-white/5 py-4">
                                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-300">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <TableIcon className="w-4 h-4 text-primary" />
                                    </div>
                                    Estado de Flujos y Resultados
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-white/5">
                                    {/* Cash Section */}
                                    <div className="bg-emerald-950/10 p-2 text-xs font-bold uppercase text-emerald-500 tracking-wider">Flujo de Efectivo (Caja)</div>
                                    <ReportRow
                                        label="Ingreso Efectivo"
                                        value={report.cashIncome}
                                        type="income"
                                        indent
                                        tooltip={{
                                            description: "Dinero recibido físicamente en cajas. Suma de ventas pagadas en efectivo y recibos manuales.",
                                            formula: "Sum(Sales[Cash]) + Sum(Payments[In, Cash, !Capital])",
                                            source: "Registros de sesiones de caja activo"
                                        }}
                                    />
                                    <ReportRow
                                        label="Gasto Efectivo (Pagos)"
                                        value={report.cashExpenses}
                                        type="expense"
                                        indent
                                        tooltip={{
                                            description: "Salidas de dinero físico de caja para pagos a proveedores o gastos operativos.",
                                            formula: "Sum(Expenses) + Sum(Payments[Out, Cash])",
                                            source: "Libro de gastos y caja chica"
                                        }}
                                    />
                                    <ReportRow
                                        label="Ingreso Capital (Efectivo)"
                                        value={report.capitalIncome}
                                        type="income"
                                        indent
                                        tooltip={{
                                            description: "Inyecciones de capital externo o aportaciones de socios realizadas en efectivo.",
                                            formula: "Sum(Payments[In, Cash, Category=Capital])",
                                            source: "Movimientos contables de socios"
                                        }}
                                    />
                                    <ReportRow
                                        label="Flujo Neto Efectivo"
                                        value={report.netCashFlow}
                                        type={report.netCashFlow >= 0 ? 'income' : 'expense'}
                                        tooltip={{
                                            description: "Variación neta del efectivo disponible en el periodo seleccionado.",
                                            formula: "Ingresos Efectivo - Gastos Efectivo",
                                            source: "Delta Balance de Cajas"
                                        }}
                                    />

                                    {/* Bank Section */}
                                    <div className="bg-blue-950/10 p-2 text-xs font-bold uppercase text-blue-500 tracking-wider mt-2">Flujo Bancario (Transferencias)</div>
                                    <ReportRow
                                        label="Recibido Transferencia"
                                        value={report.transferIncome}
                                        type="income"
                                        indent
                                        tooltip={{
                                            description: "Dinero acreditado en cuentas bancarias por ventas o transferencias directas.",
                                            formula: "Sum(Sales[Transfer]) + Sum(Payments[In, Transfer])",
                                            source: "Conciliación bancaria"
                                        }}
                                    />
                                    <ReportRow
                                        label="Pago Transferencia"
                                        value={report.transferPayments}
                                        type="expense"
                                        indent
                                        tooltip={{
                                            description: "Pagos realizados mediante banca electrónica, cheques o tarjetas corporativas.",
                                            formula: "Sum(Payments[Out, Transfer/Check/Card])",
                                            source: "Movimientos de cuentas bancarias"
                                        }}
                                    />
                                    <ReportRow
                                        label="Flujo Neto Bancos"
                                        value={report.netTransferFlow}
                                        type={report.netTransferFlow >= 0 ? 'income' : 'expense'}
                                        tooltip={{
                                            description: "Diferencia entre entradas y salidas bancarias del periodo.",
                                            formula: "Entradas Bancos - Salidas Bancos",
                                            source: "Extracto bancario consolidado"
                                        }}
                                    />

                                    {/* Accrual Section */}
                                    <div className="bg-amber-950/10 p-2 text-xs font-bold uppercase text-amber-500 tracking-wider mt-2">Cuentas por Cobrar / Pagar</div>
                                    <ReportRow
                                        label="Cuentas por Cobrar"
                                        value={report.accountsReceivable}
                                        type="income"
                                        indent
                                        tooltip={{
                                            description: "Ventas realizadas cuyo pago aún no ha sido recibido (Cartera activa).",
                                            formula: "Sum(Sales[PaymentStatus=Pending])",
                                            source: "Facturación pendiente de cobro"
                                        }}
                                    />
                                    <ReportRow
                                        label="Cuentas por Pagar"
                                        value={report.accountsPayable}
                                        type="expense"
                                        indent
                                        tooltip={{
                                            description: "Compras recibidas o gastos devengados que no han sido liquidados.",
                                            formula: "Sum(Purchases[Status=Pending] + Payroll[Pending])",
                                            source: "Pasivos operativos ERP"
                                        }}
                                    />

                                    {/* Final Total */}
                                    <UiTooltip>
                                        <TooltipTrigger asChild>
                                            <div className="p-6 bg-slate-900/40 border-t border-white/10 flex justify-between items-center mt-2 group cursor-help hover:bg-slate-900/60 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "p-3 rounded-xl rotate-3 group-hover:rotate-0 transition-transform",
                                                        report.totalProfit >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"
                                                    )}>
                                                        <Zap className={cn("w-6 h-6", report.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400")} />
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-xs uppercase tracking-[0.3em] text-slate-500 block">Balance Consolidado</span>
                                                        <span className="font-black text-xl uppercase tracking-tight text-white">Utilidad / Pérdida</span>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "text-3xl font-black font-display",
                                                    report.totalProfit >= 0 ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]" : "text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.3)]"
                                                )}>
                                                    {formatCurrency((report.totalProfit || 0) / 100)}
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-950 border-slate-800 text-white p-4 max-w-sm shadow-2xl">
                                            <p className="font-bold text-primary mb-2 uppercase tracking-widest text-[10px]">Utilidad Operativa Neta</p>
                                            <p className="text-xs leading-relaxed opacity-80">
                                                Es la diferencia entre la suma de todos los ingresos (Ventas, Cobros) y todos los egresos (Gastos, Compras, Nómina) registrados en el periodo seleccionado.
                                            </p>
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Fórmula de Cálculo:</p>
                                                <p className="text-[10px] font-mono text-emerald-400">Total Ingresos - Total Egresos = Utilidad BRUTA</p>
                                            </div>
                                        </TooltipContent>
                                    </UiTooltip>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Cards Side */}
                    <div className="space-y-6">
                        <StatCard
                            title="Saldo Efvo. (Operativo)"
                            value={formatCurrency((report.netCashFlow || 0) / 100)}
                            icon={Banknote}
                            variant="success"
                            description="Remanente neto de cajas físicas."
                            helpText="Fórmula: (Ventas Efvo + Ingresos Varios Efvo) - (Gastos Efvo + Compras Efvo + Adelantos Efvo). Representa la liquidez inmediata en moneda física."
                        />

                        <StatCard
                            title="Saldo Bancos (Digital)"
                            value={formatCurrency((report.netTransferFlow || 0) / 100)}
                            icon={CreditCard}
                            variant="primary"
                            description="Flujo neto en cuentas bancarias."
                            helpText="Fórmula: (Ventas Transferencia + Pagos Recibidos Digital) - (Gastos Transferencia + Compras Digital). Conciliación de movimientos en cuentas bancarias registradas."
                        />

                        <Card className="bg-slate-900/30 border-white/5 glass-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                    Periodo Activo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                                <p className="text-xl font-display font-bold text-white mb-2">{periodLabel}</p>
                                <p className="text-xs text-slate-400 font-mono opacity-60">{fullDateRangeLabel}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* DETAILED LEDGER SECTION - THE "ADVANCED" PART */}
                <div className="space-y-6 pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-900 rounded-2xl border border-white/5">
                                <History className="w-6 h-6 text-slate-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-white">Libro Diario</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase tracking-widest px-2 py-0">Advanced View</Badge>
                                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Trazabilidad Total</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Concepto o categoría..."
                                    className="h-10 w-64 pl-10 text-xs bg-slate-950/50 border-slate-800 focus:ring-1 ring-primary/50 glass-card"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm" className="h-10 border-slate-800 gap-2 text-xs glass-card hover:bg-white/5">
                                <Download className="w-4 h-4" /> Exportar
                            </Button>
                        </div>
                    </div>

                    <Card className="bg-slate-950/40 border-slate-800/50 overflow-hidden glass-card shadow-2xl">
                        <Tabs value={txFilter} onValueChange={setTxFilter} className="w-full">
                            <div className="px-4 border-b border-slate-900 bg-slate-900/20">
                                <TabsList className="bg-transparent border-none gap-6 h-12">
                                    <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 border-primary rounded-none px-0 text-xs uppercase font-black tracking-widest">Todos</TabsTrigger>
                                    <TabsTrigger value="income" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-500 data-[state=active]:border-b-2 border-emerald-500 rounded-none px-0 text-xs uppercase font-black tracking-widest">Ingresos</TabsTrigger>
                                    <TabsTrigger value="expense" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-rose-500 data-[state=active]:border-b-2 border-rose-500 rounded-none px-0 text-xs uppercase font-black tracking-widest">Egresos</TabsTrigger>
                                </TabsList>
                            </div>

                            <CardContent className="p-0 border-t border-white/5">
                                {isLoadingAll ? (
                                    <div className="p-32 flex flex-col items-center justify-center gap-6">
                                        <div className="relative">
                                            <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                            <Zap className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] text-center">
                                            Conciliando Ledger Maestro...<br />
                                            <span className="text-[9px] opacity-60">Sincronización en tiempo real activa</span>
                                        </p>
                                    </div>
                                ) : (
                                    <DataTable
                                        columns={txColumns}
                                        data={filteredTransactions}
                                        className="border-none shadow-none bg-transparent rounded-none"
                                    />
                                )}

                                {filteredTransactions.length === 0 && !isLoadingAll && (
                                    <div className="p-20 text-center">
                                        <Filter className="w-10 h-10 text-slate-800 mx-auto mb-4" />
                                        <p className="text-sm text-slate-500">No se encontraron movimientos para los filtros seleccionados.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Tabs>
                        <div className="p-4 bg-slate-900/40 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                                    Filtro aplicado: <span className="text-slate-300">{txFilter === 'all' ? 'Universal' : txFilter.toUpperCase()}</span>
                                    <span className="mx-2 opacity-20">•</span>
                                    Muestra: {filteredTransactions.length} entradas
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-black tracking-widest border border-white/5 hover:bg-white/5 opacity-50 cursor-not-allowed">Anterior</Button>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-black tracking-widest border border-white/5 hover:bg-white/5 opacity-50 cursor-not-allowed">Siguiente</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
