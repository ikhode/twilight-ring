import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";
import {
  mockDashboardStats,
  mockTransactions,
  mockAlerts,
  mockEmployees,
  mockKiosks,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  return (
    <AppLayout title="Fábrica de Procesamiento de Coco" subtitle="Gestión de Recepción, Procesado y Comercialización">
      <div className="space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8 text-center backdrop-blur-sm">
          <h2 className="text-3xl font-display font-black tracking-tight mb-2 gradient-text">
            Panel de Control de Planta
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Plataforma integral para la gestión de procesamiento de coco, desde la recepción en patio hasta la comercialización de copra y agua.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Ventas del Día"
            value={formatCurrency(mockDashboardStats.totalSales)}
            icon={DollarSign}
            trend={mockDashboardStats.salesGrowth}
            trendLabel="vs ayer"
            variant="success"
          />
          <StatCard
            title="Gastos del Día"
            value={formatCurrency(mockDashboardStats.totalExpenses)}
            icon={TrendingUp}
            trend={mockDashboardStats.expensesGrowth}
            trendLabel="vs ayer"
            variant="destructive"
          />
          <StatCard
            title="Empleados Presentes"
            value={`${mockDashboardStats.employeesPresent}/${mockDashboardStats.activeEmployees}`}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Pedidos Pendientes"
            value={mockDashboardStats.pendingOrders}
            icon={ShoppingCart}
            variant="warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-display">Últimas Transacciones</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary" data-testid="button-view-all-transactions">
                Ver todas <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
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
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            item.type === "sale"
                              ? "bg-success/15 text-success"
                              : item.type === "expense"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-warning/15 text-warning"
                          )}
                        >
                          {item.type === "sale" ? (
                            <ShoppingCart className="w-4 h-4" />
                          ) : item.type === "expense" ? (
                            <Package className="w-4 h-4" />
                          ) : (
                            <Users className="w-4 h-4" />
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
                      <span className="text-sm text-muted-foreground">{item.date}</span>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Monto",
                    render: (item) => (
                      <span
                        className={cn(
                          "font-semibold font-mono",
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

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Alertas Recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-3 rounded-lg border-l-4",
                      alert.type === "critical"
                        ? "bg-destructive/10 border-destructive"
                        : alert.type === "warning"
                        ? "bg-warning/10 border-warning"
                        : alert.type === "success"
                        ? "bg-success/10 border-success"
                        : "bg-primary/10 border-primary"
                    )}
                    data-testid={`alert-${alert.id}`}
                  >
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{alert.time}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Kioskos Activos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockKiosks.slice(0, 3).map((kiosk) => (
                  <div
                    key={kiosk.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`kiosk-status-${kiosk.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          kiosk.status === "online" ? "bg-success animate-pulse" : "bg-muted-foreground"
                        )}
                      />
                      <div>
                        <p className="font-medium text-sm">{kiosk.name}</p>
                        <p className="text-xs text-muted-foreground">{kiosk.location}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{kiosk.lastPing}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Asistencia de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Asistencia general</span>
                  <span className="font-semibold">
                    {Math.round((mockDashboardStats.employeesPresent / mockDashboardStats.activeEmployees) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(mockDashboardStats.employeesPresent / mockDashboardStats.activeEmployees) * 100}
                  className="h-2"
                />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="text-center p-3 rounded-lg bg-success/10">
                    <p className="text-2xl font-bold text-success">{mockDashboardStats.employeesPresent}</p>
                    <p className="text-xs text-muted-foreground">Presentes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-warning/10">
                    <p className="text-2xl font-bold text-warning">2</p>
                    <p className="text-xs text-muted-foreground">En descanso</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-bold text-muted-foreground">
                      {mockDashboardStats.activeEmployees - mockDashboardStats.employeesPresent}
                    </p>
                    <p className="text-xs text-muted-foreground">Ausentes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-success" />
                Balance Financiero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-xs text-muted-foreground mb-1">Caja</p>
                    <p className="text-lg font-bold text-success font-mono">
                      {formatCurrency(mockDashboardStats.cashBalance)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Por cobrar</p>
                    <p className="text-lg font-bold text-primary font-mono">
                      {formatCurrency(mockDashboardStats.receivables)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-muted-foreground mb-1">Por pagar</p>
                    <p className="text-lg font-bold text-destructive font-mono">
                      {formatCurrency(mockDashboardStats.payables)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <span className="font-medium">Balance Neto</span>
                  <span className="text-xl font-bold font-mono text-success">
                    {formatCurrency(
                      mockDashboardStats.cashBalance +
                        mockDashboardStats.receivables -
                        mockDashboardStats.payables
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
