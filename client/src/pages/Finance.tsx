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
import { mockTransactions, mockDashboardStats } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Finance() {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const income = mockTransactions.filter((t) => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const expenses = mockTransactions.filter((t) => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);

  return (
    <AppLayout title="Finanzas" subtitle="Control financiero y reportes">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Caja Actual"
            value={formatCurrency(mockDashboardStats.cashBalance)}
            icon={Wallet}
            variant="primary"
          />
          <StatCard
            title="Ingresos del Día"
            value={formatCurrency(income)}
            icon={TrendingUp}
            trend={12.5}
            variant="success"
          />
          <StatCard
            title="Egresos del Día"
            value={formatCurrency(expenses)}
            icon={TrendingDown}
            trend={-5.2}
            variant="destructive"
          />
          <StatCard
            title="Balance Neto"
            value={formatCurrency(mockDashboardStats.cashBalance + mockDashboardStats.receivables - mockDashboardStats.payables)}
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
                  {formatCurrency(mockDashboardStats.receivables)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">4 facturas pendientes</p>
              </div>

              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Por Pagar</span>
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-2xl font-bold font-mono text-destructive">
                  {formatCurrency(mockDashboardStats.payables)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">2 facturas pendientes</p>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Adelantos de Nómina</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(5000)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">2 empleados</p>
              </div>

              <Button className="w-full gap-2" data-testid="button-new-transaction">
                <Plus className="w-4 h-4" />
                Nueva Transacción
              </Button>
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
                    render: (item) => (
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
                    render: (item) => (
                      <span className="text-sm font-mono text-muted-foreground">
                        {item.date}
                      </span>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Monto",
                    render: (item) => (
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
                    render: (item) => <StatusBadge status={item.status} />,
                  },
                ]}
                data={mockTransactions}
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
                      <p className="text-3xl font-bold font-mono">{formatCurrency(mockDashboardStats.cashBalance)}</p>
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
