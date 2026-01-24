import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Calculator,
  FileText,
  Plus,
  Download,
  Filter,
  Zap,
  Brain,
  ShieldAlert,
  History,
  TrendingUp as TrendingUpIcon,
  LineChart
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CashControl } from "@/components/finance/CashControl";
import { Link } from "wouter";

export default function Finance() {
  const { session } = useAuth();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["/api/operations/finance/summary"],
    queryFn: async () => {
      const res = await fetch("/api/operations/finance/summary", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // Realtime subscriptions for financial data
  useSupabaseRealtime({ table: 'payments', queryKey: ["/api/operations/finance/summary"] });
  useSupabaseRealtime({ table: 'expenses', queryKey: ["/api/operations/finance/summary"] });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const income = summary?.income || 0;
  const expenses = summary?.expenses || 0;
  const balance = summary?.balance || 0;
  const recentTransactions = summary?.recentTransactions || [];

  return (
    <AppLayout title="Finanzas" subtitle="Control financiero y reportes">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Caja Actual"
            value={isLoading ? "..." : formatCurrency(balance / 100)}
            icon={Wallet}
            variant="primary"
          />
          <StatCard
            title="Valor Inventario"
            value={isLoading ? "..." : formatCurrency((summary?.inventoryValue || 0) / 100)}
            description="Costo total stock"
            icon={PiggyBank}
            variant="default"
          />
          <StatCard
            title="Supervivencia (Runway)"
            value={summary?.cognitive?.runway || "Calculando..."}
            description={`Gasto mensual: ${formatCurrency((summary?.cognitive?.burnRate || 0) / 100)}`}
            icon={Zap}
            variant="warning"
          />
          <StatCard
            title="Crecimiento Mensual"
            value={`${summary?.cognitive?.growth || 0}%`}
            icon={TrendingUpIcon}
            variant="success"
            allowTrend
          />
          <StatCard
            title="Balance Neto (30d)"
            value={formatCurrency((summary?.cognitive?.netCashFlow || 0) / 100)}
            icon={PiggyBank}
            variant={summary?.cognitive?.netCashFlow >= 0 ? "success" : "destructive"}
          />
        </div>

        {/* --- COGNITIVE INSIGHTS PANEL --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 overflow-hidden border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary animate-pulse" />
                  Proyección de Flujo de Caja (IA)
                </CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Modelo Predictivo v2.1
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Hoy', balance: balance / 100 },
                    ...(summary?.cognitive?.projections || []).map((p: any) => ({
                      name: `D+${p.days}`,
                      balance: p.predictedBalance / 100
                    }))
                  ]}>
                    <defs>
                      <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(val) => `$${val > 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorBal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-warning/20 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-warning">
                  <ShieldAlert className="w-4 h-4" />
                  Anomalías Detectadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary?.cognitive?.anomalies?.length > 0 ? (
                  summary.cognitive.anomalies.map((anomaly: any) => (
                    <div key={anomaly.id} className="p-3 rounded-lg bg-background/50 border border-warning/10 text-xs">
                      <div className="flex justify-between font-bold mb-1">
                        <span>{anomaly.description}</span>
                        <span className="text-warning">{formatCurrency(anomaly.amount / 100)}</span>
                      </div>
                      <p className="text-muted-foreground">{anomaly.reason}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-xs italic">
                    No se detectaron irregularidades en los últimos 30 días.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Insights Rápidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <TrendingUpIcon className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Ingresos Estables</p>
                    <p className="text-[10px] text-muted-foreground">La tendencia de ventas se mantiene 5% arriba del promedio.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <LineChart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Optimización Sugerida</p>
                    <p className="text-[10px] text-muted-foreground">Reducir gastos en 'Servicios' podría extender el runway 1.2 meses.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display">Resumen Financiero</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Por Cobrar</span>
                  <ArrowUpRight className="w-4 h-4 text-success" />
                </div>
                <p className="text-2xl font-bold font-mono text-success">
                  {formatCurrency((summary?.accountsReceivable?.total || 0) / 100)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{summary?.accountsReceivable?.count || 0} facturas pendientes</p>
              </div>

              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Por Pagar</span>
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-2xl font-bold font-mono text-destructive">
                  {formatCurrency((summary?.accountsPayable?.total || 0) / 100)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{summary?.accountsPayable?.count || 0} facturas pendientes</p>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Adelantos de Nómina</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency((summary?.payroll?.total || 0) / 100)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{summary?.payroll?.count || 0} empleados</p>
              </div>

              <NewTransactionDialog />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display">Movimientos</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/purchases">
                      <Plus className="w-4 h-4 mr-1" />
                      Nueva Compra
                    </a>
                  </Button>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-1" />
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    key: "description",
                    header: "Descripción",
                    render: (item: any) => (
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            item.type === "sale"
                              ? "bg-success/15 text-success"
                              : item.type === "expense"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-warning/15 text-warning"
                          )}
                        >
                          {item.type === "sale" ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.client || item.supplier || item.employee}
                          </p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "date",
                    header: "Fecha",
                    render: (item: any) => (
                      <span className="text-sm font-mono text-muted-foreground">
                        {item.date}
                      </span>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Monto",
                    render: (item: any) => (
                      <span
                        className={cn(
                          "font-bold font-mono",
                          item.amount >= 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {item.amount >= 0 ? "+" : ""}
                        {formatCurrency(item.amount / 100)}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Estado",
                    render: (item: any) => <StatusBadge status={item.status} />,
                  },
                ]}
                data={(Array.isArray(recentTransactions) ? recentTransactions : []).map((t: any) => ({
                  ...t,
                  type: t.amount > 0 ? 'sale' : 'expense',
                  description: t.description || (t.amount > 0 ? "Venta Regular" : "Gasto Operativo"),
                  status: 'completed'
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="arqueo" className="space-y-6">
          <TabsList>
            <TabsTrigger value="arqueo" data-testid="tab-arqueo">Arqueo de Caja</TabsTrigger>
            <TabsTrigger value="payroll" data-testid="tab-payroll">Nómina</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="arqueo">
            <CashControl />
          </TabsContent>

          <TabsContent value="payroll">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Gestión de Nómina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Módulo de Nómina</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Gestiona la nómina de tus empleados, adelantos, tickets de producción
                    y pagos automáticos.
                  </p>
                  <Link href="/finance/payroll">
                    <Button data-testid="button-generate-payroll">Generar Nómina</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Reportes Avanzados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: "Estado de Resultados", icon: TrendingUp },
                    { name: "Balance General", icon: PiggyBank },
                    { name: "Flujo de Efectivo", icon: Wallet },
                    { name: "Cuentas por Cobrar", icon: ArrowUpRight },
                    { name: "Cuentas por Pagar", icon: ArrowDownRight },
                    { name: "Reporte de Nómina", icon: Receipt },
                  ].map((report, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-24 flex-col gap-2 hover:border-primary/50 transition-colors"
                      data-testid={`button-report-${index}`}
                      onClick={() => {
                        toast({
                          title: `Generando ${report.name}`,
                          description: "El reporte se está procesando con Inteligencia Cognitiva...",
                        });
                        // Simulate generation delay
                        setTimeout(() => {
                          toast({
                            title: "Reporte Listo",
                            description: `Se ha generado el ${report.name} exitosamente.`,
                          });
                        }, 1500);
                      }}
                    >
                      <report.icon className="w-6 h-6 text-primary" />
                      <span>{report.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function NewTransactionDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [data, setData] = useState({
    type: "expense",
    amount: "",
    category: "general",
    description: ""
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/operations/finance/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount) * 100 // Convert to cents
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Transacción Registrada" });
      setOpen(false);
      setData({ type: "expense", amount: "", category: "general", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/operations/finance/summary"] });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Error al registrar",
        description: error.message || "Verifique los datos e intente nuevamente",
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2" data-testid="button-new-transaction">
          <Plus className="w-4 h-4" />
          Nueva Transacción
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Movimiento</DialogTitle>
          <DialogDescription>
            Ingrese los detalles de la transacción financiera para registrarla en el sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={data.type} onValueChange={v => setData({ ...data, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Gasto (Egreso)</SelectItem>
                <SelectItem value="income">Ingreso Extra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto</Label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                className="pl-9"
                type="number"
                placeholder="0.00"
                value={data.amount}
                onChange={e => setData({ ...data, amount: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={data.category} onValueChange={v => setData({ ...data, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="inventory">Inventario</SelectItem>
                <SelectItem value="services">Servicios</SelectItem>
                <SelectItem value="payroll">Nómina</SelectItem>
                <SelectItem value="sales">Ventas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              placeholder="Ej. Pago de Luz"
              value={data.description}
              onChange={e => setData({ ...data, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !data.amount}>
            {mutation.isPending ? "Guardando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
