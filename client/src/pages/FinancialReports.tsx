import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import { CalendarIcon, Download, SlidersHorizontal, ArrowRight, Table as TableIcon, CreditCard, Banknote, ChevronLeft, ChevronRight } from "lucide-react";
import {
    format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getWeek,
    addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, startOfQuarter, endOfQuarter, addQuarters, subQuarters
} from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";


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


    const { data: summary, isLoading } = useQuery({
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

    const report = summary?.report || {};

    // Helper row component
    const ReportRow = ({ label, value, type = 'neutral', indent = false, onDetail }: any) => (
        <div className={cn(
            "flex items-center justify-between p-3 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors",
            indent ? "pl-8 text-sm" : "font-semibold"
        )}>
            <span className={cn("text-slate-300", indent && "text-slate-500")}>{label}</span>
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
    );

    return (
        <AppLayout title="Reportes Financieros" subtitle="Análisis detallado de flujos y balances">
            <div className="space-y-6 pb-20">

                {/* Controls */}
                <Card className="bg-slate-950 border-slate-800 sticky top-4 z-10 shadow-xl shadow-black/50">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">

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
                < div className="grid grid-cols-1 lg:grid-cols-3 gap-6" >
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="bg-slate-950 border-slate-800 overflow-hidden">
                            <CardHeader className="bg-slate-900/50 border-b border-slate-800 py-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TableIcon className="w-4 h-4 text-primary" />
                                    Resumen de Movimientos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* Cash Section */}
                                <div className="bg-emerald-950/10 p-2 text-xs font-bold uppercase text-emerald-500 tracking-wider">Flujo de Efectivo (Caja)</div>
                                <ReportRow label="Ingreso Efectivo" value={report.cashIncome} type="income" indent />
                                <ReportRow label="Gasto Efectivo (Pagos)" value={report.cashExpenses} type="expense" indent />
                                <ReportRow label="Ingreso Capital (Efectivo)" value={report.capitalIncome} type="income" indent />
                                <ReportRow label="Flujo Neto Efectivo" value={report.netCashFlow} type={report.netCashFlow >= 0 ? 'income' : 'expense'} />

                                {/* Bank Section */}
                                <div className="bg-blue-950/10 p-2 text-xs font-bold uppercase text-blue-500 tracking-wider mt-2">Flujo Bancario (Transferencias)</div>
                                <ReportRow label="Recibido Transferencia" value={report.transferIncome} type="income" indent />
                                <ReportRow label="Pago Transferencia" value={report.transferPayments} type="expense" indent />
                                <ReportRow label="Flujo Neto Bancos" value={report.netTransferFlow} type={report.netTransferFlow >= 0 ? 'income' : 'expense'} />

                                {/* Accrual Section */}
                                <div className="bg-amber-950/10 p-2 text-xs font-bold uppercase text-amber-500 tracking-wider mt-2">Cuentas por Cobrar / Pagar</div>
                                <ReportRow label="Cuentas por Cobrar" value={report.accountsReceivable} type="income" indent />
                                <ReportRow label="Cuentas por Pagar" value={report.accountsPayable} type="expense" indent />

                                {/* Final Total */}
                                <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center mt-2">
                                    <span className="font-black text-lg uppercase tracking-tight">Utilidad / Pérdida del Periodo</span>
                                    <div className={cn(
                                        "text-2xl font-black font-mono",
                                        report.totalProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                                    )}>
                                        {formatCurrency((report.totalProfit || 0) / 100)}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Cards Side */}
                    <div className="space-y-4">
                        <Card className="bg-emerald-900/10 border-emerald-900/30">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Banknote className="w-5 h-5 text-emerald-500" />
                                    <h4 className="font-bold text-emerald-500">Saldo Operativo Efectivo</h4>
                                </div>
                                <p className="text-3xl font-black text-white">{formatCurrency((report.netCashFlow || 0) / 100)}</p>
                                <p className="text-xs text-slate-400 mt-2">Resultado neto de caja en este periodo.</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-900/10 border-blue-900/30">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <CreditCard className="w-5 h-5 text-blue-500" />
                                    <h4 className="font-bold text-blue-500">Saldo Operativo Bancos</h4>
                                </div>
                                <p className="text-3xl font-black text-white">{formatCurrency((report.netTransferFlow || 0) / 100)}</p>
                                <p className="text-xs text-slate-400 mt-2">Movimiento neto en cuentas bancarias.</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">
                                    {viewMode === 'week' && `Semana ${getWeek(cursorDate, { weekStartsOn: 1 })}`}
                                    {viewMode === 'month' && format(cursorDate, "MMMM", { locale: es })}
                                    {viewMode === 'quarter' && `Trimestre Q${Math.floor(cursorDate.getMonth() / 3) + 1}`}
                                    {viewMode === 'year' && `Año ${format(cursorDate, "yyyy")}`}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                                <p className="text-xs text-slate-500">
                                    Visualizando datos para: <span className="text-slate-300 font-medium">{periodLabel}</span>.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div >

            </div >
        </AppLayout >
    );
}
