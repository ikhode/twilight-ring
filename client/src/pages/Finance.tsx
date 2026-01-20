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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
            value={formatCurrency(balance)}
            icon={Wallet}
            variant="primary"
          />
          <StatCard
            title="Ingresos"
            value={formatCurrency(income)}
            icon={TrendingUp}
            trend={12.5}
            variant="success"
          />
          <StatCard
            title="Egresos"
            value={formatCurrency(expenses)}
            icon={TrendingDown}
            trend={-5.2}
            variant="destructive"
          />
          <StatCard
            title="Balance Neto"
            value={formatCurrency(balance)}
            icon={PiggyBank}
            variant="success"
          />
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
                  {formatCurrency(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">4 facturas pendientes</p>
              </div>

              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Por Pagar</span>
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-2xl font-bold font-mono text-destructive">
                  {formatCurrency(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">2 facturas pendientes</p>
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display">Movimientos</CardTitle>
                <div className="flex items-center gap-2">
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
                        {formatCurrency(item.amount)}
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
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Arqueo de Caja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Billetes</h4>
                    {[500, 200, 100, 50, 20].map((denomination) => (
                      <div key={denomination} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="font-mono">${denomination}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="w-16 h-8 text-center rounded border bg-background font-mono"
                            defaultValue={0}
                            min={0}
                          />
                          <span className="text-muted-foreground font-mono w-20 text-right">
                            = $0
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Monedas</h4>
                    {[10, 5, 2, 1, 0.5].map((denomination) => (
                      <div key={denomination} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="font-mono">${denomination}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="w-16 h-8 text-center rounded border bg-background font-mono"
                            defaultValue={0}
                            min={0}
                          />
                          <span className="text-muted-foreground font-mono w-20 text-right">
                            = $0
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
                      <p className="text-sm text-muted-foreground mb-2">Total Contado</p>
                      <p className="text-3xl font-bold font-mono">$0.00</p>
                    </div>
                    <div className="p-6 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">Esperado en Sistema</p>
                      <p className="text-3xl font-bold font-mono">{formatCurrency(balance)}</p>
                    </div>
                    <div className="p-6 rounded-xl bg-success/10 border border-success/20">
                      <p className="text-sm text-muted-foreground mb-2">Diferencia</p>
                      <p className="text-3xl font-bold font-mono text-success">$0.00</p>
                    </div>
                    <Button className="w-full" data-testid="button-save-arqueo">
                      Guardar Arqueo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  <Button data-testid="button-generate-payroll">Generar Nómina</Button>
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
                      className="h-24 flex-col gap-2"
                      data-testid={`button-report-${index}`}
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount) * 100 // Convert to cents
        })
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Transacción Registrada" });
      setOpen(false);
      setData({ type: "expense", amount: "", category: "general", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/operations/finance/summary"] });
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
