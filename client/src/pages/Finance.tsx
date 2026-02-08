import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Plus,
  Download,
  Filter,
  Zap,
  History,
  Building2,
  CreditCard
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { cn } from "@/lib/utils";
import { CashControl } from "@/components/finance/CashControl";
import { useConfiguration } from "@/context/ConfigurationContext";
import { ReportViewerDialog } from "@/components/finance/ReportViewerDialog";
import { CognitiveFinancials } from "@/components/finance/CognitiveFinancials";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DataTable } from "@/components/shared/DataTable";

export default function Finance() {
  const { session } = useAuth();
  const { enabledModules } = useConfiguration();
  const [activeReport, setActiveReport] = useState<any>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["/api/finance/summary"],
    queryFn: async () => {
      const res = await fetch("/api/finance/summary", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch finance summary");
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // Realtime subscriptions
  useSupabaseRealtime({ table: 'payments', queryKey: ["/api/finance/summary"] });
  useSupabaseRealtime({ table: 'expenses', queryKey: ["/api/finance/summary"] });
  useSupabaseRealtime({ table: 'sales', queryKey: ["/api/finance/summary"] });
  useSupabaseRealtime({ table: 'cash_transactions', queryKey: ["/api/finance/summary"] });
  useSupabaseRealtime({ table: 'cash_registers', queryKey: ["/api/finance/summary"] });
  useSupabaseRealtime({ table: 'bank_accounts', queryKey: ["/api/finance/summary"] });
  useSupabaseRealtime({ table: 'payroll_advances', queryKey: ["/api/finance/summary"] });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const transactions = summary?.recentTransactions || [];

  const uniqueCategories = Array.from(new Set(transactions.map((t: any) => t.category || "General")));

  const filteredTransactions = transactions.filter((t: any) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (categoryFilter !== "all" && (t.category || "General") !== categoryFilter) return false;
    return true;
  });

  const columns = [
    {
      key: "description",
      header: "Descripción",
      render: (t: any) => (
        <div>
          <p className="font-medium text-slate-300">{t.description}</p>
          {t.supplier && <span className="block text-xs text-slate-500">{t.supplier}</span>}
        </div>
      )
    },
    {
      key: "category",
      header: "Categoría",
      render: (t: any) => (
        <Badge variant="outline" className="text-[10px] capitalize text-slate-400 border-slate-700">
          {t.category || "General"}
        </Badge>
      )
    },
    {
      key: "date",
      header: "Fecha",
      className: "text-right",
      render: (t: any) => <span className="text-slate-500 font-mono text-xs">{t.date}</span>
    },
    {
      key: "amount",
      header: "Monto",
      className: "text-right",
      render: (t: any) => (
        <span className={cn(
          "font-mono font-medium",
          t.type === 'expense' ? "text-rose-400" : "text-emerald-400"
        )}>
          {typeof t.amount === 'number' && !isNaN(t.amount)
            ? <>{t.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(t.amount) / 100)}</>
            : <span className="text-slate-600">***</span>
          }
        </span>
      )
    },
    {
      key: "status",
      header: "Estado",
      className: "text-center",
      render: (t: any) => (
        <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px] h-5">
          {t.status}
        </Badge>
      )
    },
    {
      key: "link",
      header: "",
      render: (t: any) => {
        if (t.category === 'supplier' && t.referenceId) {
          return (
            <Link href={`/purchases?openBatchId=${t.referenceId}`}>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          );
        }
        if (t.category === 'sales' && t.referenceId) {
          return (
            <Link href={`/sales?openSaleId=${t.referenceId}`}>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          );
        }
        return null;
      }
    }
  ];

  return (
    <AppLayout title="Finanzas" subtitle="Control financiero y reportes">
      <div className="space-y-6 pb-20">

        {/* TOP METRICS ROW - COMPACT */}
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <UiTooltip>
              <TooltipTrigger asChild>
                <div className="group cursor-help">
                  <StatCard
                    title="Efectivo en Caja"
                    value={isLoading ? "..." : formatCurrency((summary?.cashInRegisters || 0) / 100)}
                    icon={Wallet}
                    variant="primary"
                    className="bg-slate-900/50 backdrop-blur border-slate-800 group-hover:border-emerald-500/50 transition-colors"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
                <p>Total físico en todas las cajas registradoras.</p>
                <p className="text-[10px] text-slate-500 mt-1">Incluye cajas cerradas.</p>
              </TooltipContent>
            </UiTooltip>

            <UiTooltip>
              <TooltipTrigger asChild>
                <div className="group cursor-help">
                  <StatCard
                    title="Valor Inventario"
                    value={isLoading ? "..." : formatCurrency((summary?.inventoryValue || 0) / 100)}
                    description="Costo Stock"
                    icon={PiggyBank}
                    className="bg-slate-900/50 backdrop-blur border-slate-800 hidden md:block group-hover:border-blue-500/50 transition-colors"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
                <p>Valor total del inventario al costo promedio.</p>
                <p className="text-[10px] text-slate-500 mt-1">Cálculo: Suma de (Costo * Stock) de todos los productos.</p>
              </TooltipContent>
            </UiTooltip>
            <UiTooltip>
              <TooltipTrigger asChild>
                <div className="group cursor-help">
                  <StatCard
                    title="Saldo Global Bancos"
                    value={isLoading ? "..." : formatCurrency((summary?.bankBalance || 0) / 100)}
                    icon={Building2}
                    className="bg-slate-900/50 backdrop-blur border-slate-800 group-hover:border-indigo-500/50 transition-colors"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
                <p>Suma de saldos de todas las cuentas bancarias registradas.</p>
              </TooltipContent>
            </UiTooltip>
            {/* ... Tooltip wrapper needs to be preserved by user if I don't replace it all, but I am replacing the StatCard. Actually I need to be careful with the Tooltip wrapper around the first card. ERROR: The previous view showed StatCard inside TooltipTrigger. */}

            {/* Let's try to match exactly the 'Salidas Bancos' block as it's separate */}
            <UiTooltip>
              <TooltipTrigger asChild>
                <div className="group cursor-help">
                  <StatCard
                    title="Pasivos (Destajo)"
                    value={isLoading ? "..." : formatCurrency((summary?.liabilities || 0) / 100)}
                    description="Deuda prod."
                    icon={DollarSign}
                    variant="destructive"
                    className="bg-slate-900/50 backdrop-blur border-slate-800 group-hover:border-red-500/50 transition-colors"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
                <p>Deuda acumulada por tickets de destajo pendientes de pago.</p>
                <p className="text-[10px] text-slate-500 mt-1">Incluye todos los tickets 'pending' de empleados.</p>
              </TooltipContent>
            </UiTooltip>
            <UiTooltip>
              <TooltipTrigger asChild>
                <div className="group cursor-help">
                  <StatCard
                    title="Logística Activa"
                    value={isLoading ? "..." : `${(summary?.pendingSalesCount || 0) + (summary?.pendingPurchasesCount || 0)}`}
                    description="En tránsito"
                    icon={Zap}
                    variant="warning"
                    className="bg-slate-900/50 backdrop-blur border-slate-800 hidden lg:block group-hover:border-amber-500/50 transition-colors"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
                <p>Total de operaciones con entrega/recolección pendiente.</p>
                <p className="text-[10px] text-slate-500 mt-1">Ventas por entregar + Compras por recibir.</p>
              </TooltipContent>
            </UiTooltip>
          </div>
        </TooltipProvider>

        {/* AI INSIGHTS & PROJECTIONS */}
        <CognitiveFinancials
          projections={summary?.projection || []}
          anomalies={summary?.anomalies || []}
          trustScore={summary?.trustScore || 100}
        />

        {/* HERO SECTION: CASH CONTROL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Operational Panel (Cash) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between p-1">
              <h3 className="text-lg font-semibold text-white">Resumen Financiero</h3>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 w-32 border-dashed bg-transparent border-slate-700 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="income">Ingresos</SelectItem>
                    <SelectItem value="expense">Egresos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 w-40 border-dashed bg-transparent border-slate-700 text-xs">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueCategories.map((c: any) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Reset Filters" onClick={() => { setTypeFilter("all"); setCategoryFilter("all"); }}>
                  <Filter className="h-4 w-4" />
                </Button>
                <Link to="/finance/reports">
                  <Button size="sm" variant="outline" className="h-8 gap-2 border-dashed">
                    <History className="h-3 w-3" /> Reportes
                  </Button>
                </Link>
              </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <UiTooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-emerald-950/20 border-emerald-900/50 p-4 relative overflow-hidden group cursor-help hover:border-emerald-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-3 opacity-20"><ArrowUpRight className="h-10 w-10 text-emerald-500" /></div>
                    <p className="text-xs text-emerald-400 font-medium mb-1">Por Cobrar</p>
                    <h4 className="text-2xl font-bold text-white/90">{formatCurrency(summary?.accountsReceivable?.total / 100 || 0)}</h4>
                    <p className="text-[10px] text-emerald-500/60 mt-1">{summary?.accountsReceivable?.count || 0} facturas pendientes</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
                  <p>Monto total de ventas con pago pendiente.</p>
                </TooltipContent>
              </UiTooltip>

              <UiTooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-rose-950/20 border-rose-900/50 p-4 relative overflow-hidden cursor-help group-hover:border-rose-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-3 opacity-20"><ArrowDownRight className="h-10 w-10 text-rose-500" /></div>
                    <p className="text-xs text-rose-400 font-medium mb-1">Por Pagar</p>
                    <h4 className="text-2xl font-bold text-white/90">{formatCurrency(summary?.accountsPayable?.total / 100 || 0)}</h4>
                    <p className="text-[10px] text-rose-500/60 mt-1">{summary?.accountsPayable?.count || 0} facturas pendientes</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
                  <p>Monto neto por pagar (excluye canceladas).</p>
                  {summary?.accountsPayable?.cancelledTotal > 0 && (
                    <p className="text-[10px] text-rose-400 mt-1">
                      Cancelado: {formatCurrency(summary.accountsPayable.cancelledTotal / 100)} ({summary.accountsPayable.cancelledCount})
                    </p>
                  )}
                </TooltipContent>
              </UiTooltip>

              <UiTooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-blue-950/20 border-blue-900/50 p-4 relative overflow-hidden group cursor-help hover:border-blue-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-3 opacity-20"><CreditCard className="h-10 w-10 text-blue-500" /></div>
                    <p className="text-xs text-blue-400 font-medium mb-1">Adelantos de Nómina</p>
                    <h4 className="text-2xl font-bold text-white/90">{formatCurrency(summary?.payroll?.total / 100 || 0)}</h4>
                    <p className="text-[10px] text-blue-500/60 mt-1">{summary?.payroll?.count || 0} empleados</p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
                  <p>Adelantos de sueldo otorgados en el periodo actual.</p>
                </TooltipContent>
              </UiTooltip>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 h-10 font-semibold tracking-wide">
              <Plus className="mr-2 h-4 w-4" /> Nueva Transacción
            </Button>

            {/* Main Transaction Table (Refactored) */}
            <Card className="bg-slate-950 border-slate-800/60">
              <CardHeader className="py-3 px-4 border-b border-slate-800/60">
                <CardTitle className="text-sm font-medium">Movimientos Recientes</CardTitle>
                <p className="text-[10px] text-slate-500">Doble click en Categoría o Estado para filtrar.</p>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={filteredTransactions}
                  onCellDoubleClick={(item, key, value) => {
                    if (key === 'category') setCategoryFilter(value || "General");
                    if (item.type) {
                      // If they click something that implies type, we could set it, but simplest is category.
                    }
                  }}
                />
              </CardContent>
            </Card>

          </div>

          {/* Right Column: CASH CONTROL (Hero) & History */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">

              {/* HERO COMPONENT - ALWAYS VISIBLE */}
              <CashControl />

              {/* Recent Cash Log (Mini) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <History className="h-3 w-3" /> Historial Reciente
                  </h4>
                  <Badge variant="outline" className="text-[10px] border-slate-800 text-slate-500 px-1 py-0 h-4">En tiempo real</Badge>
                </div>

                <div className="space-y-2">
                  {transactions.slice(0, 5).map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900/30 border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          t.type === 'expense' ? "bg-rose-950 text-rose-500" : "bg-emerald-950 text-emerald-500"
                        )}>
                          {t.type === 'expense' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-300 truncate w-32">{t.description}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{t.category || t.type} • 09:56 A.M.</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-mono font-bold",
                        t.type === 'expense' ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {typeof t.amount === 'number' && !isNaN(t.amount)
                          ? <>{t.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(t.amount) / 100)}</>
                          : <span className="text-slate-600">***</span>
                        }
                      </span>
                    </div>
                  ))}
                </div>

                <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-white h-8">
                  Ver liquidaciones pendientes <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

        </div>

        {activeReport && (
          <ReportViewerDialog
            open={!!activeReport}
            onOpenChange={(open) => !open && setActiveReport(null)}
            reportType={activeReport?.type || activeReport}
          />
        )}
      </div>
    </AppLayout>
  );
}
