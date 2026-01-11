import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import {
  Factory,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  Zap,
  Users,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { mockProcesses, mockProducts } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Production() {
  const [processes] = useState(mockProcesses);

  const stats = {
    activeProcesses: processes.filter((p) => p.status === "active").length,
    pendingProcesses: processes.filter((p) => p.status === "pending").length,
    completedToday: 12,
    efficiency: 87,
  };

  return (
    <AppLayout title="Producción" subtitle="Control de procesos y trazabilidad">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Procesos Activos"
            value={stats.activeProcesses}
            icon={Factory}
            variant="primary"
          />
          <StatCard
            title="En Espera"
            value={stats.pendingProcesses}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Completados Hoy"
            value={stats.completedToday}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Eficiencia"
            value={`${stats.efficiency}%`}
            icon={Zap}
            trend={5.2}
            trendLabel="vs ayer"
          />
        </div>

        <Tabs defaultValue="processes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="processes" data-testid="tab-processes">Procesos</TabsTrigger>
            <TabsTrigger value="flow" data-testid="tab-flow">Flujo de Producción</TabsTrigger>
            <TabsTrigger value="traceability" data-testid="tab-traceability">Trazabilidad</TabsTrigger>
          </TabsList>

          <TabsContent value="processes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Procesos Definidos</h2>
              <Button className="gap-2" data-testid="button-create-process">
                <Plus className="w-4 h-4" />
                Crear Proceso
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {processes.map((process) => (
                <Card
                  key={process.id}
                  className={cn(
                    "overflow-hidden",
                    process.status === "active" && "ring-1 ring-primary/30"
                  )}
                  data-testid={`process-card-${process.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            process.status === "active"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Factory className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{process.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {process.duration}
                            </span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={process.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-2">Insumos</p>
                        <div className="flex flex-wrap gap-1">
                          {process.inputs.map((input) => (
                            <Badge key={input} variant="secondary" className="text-xs">
                              <Package className="w-3 h-3 mr-1" />
                              {input}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-2">Productos</p>
                        <div className="flex flex-wrap gap-1">
                          {process.outputs.map((output) => (
                            <Badge key={output} className="text-xs bg-success/15 text-success border-success/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {output}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {process.status === "active" ? (
                        <Button variant="outline" size="sm" className="flex-1">
                          <Pause className="w-4 h-4 mr-1" />
                          Pausar
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1">
                          <Play className="w-4 h-4 mr-1" />
                          Iniciar
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="flow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Flujo de Producción en Tiempo Real</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 p-6 rounded-xl bg-muted/50 text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
                        <Package className="w-8 h-8 text-primary" />
                      </div>
                      <p className="font-semibold">Materia Prima</p>
                      <p className="text-sm text-muted-foreground">6 productos</p>
                      <div className="mt-3">
                        <Progress value={75} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">75% disponible</p>
                      </div>
                    </div>

                    <ArrowRight className="w-8 h-8 text-muted-foreground flex-shrink-0" />

                    <div className="flex-1 p-6 rounded-xl bg-warning/10 border border-warning/20 text-center">
                      <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-3">
                        <Factory className="w-8 h-8 text-warning" />
                      </div>
                      <p className="font-semibold">En Proceso</p>
                      <p className="text-sm text-muted-foreground">2 activos</p>
                      <div className="mt-3">
                        <Progress value={45} className="h-2 [&>div]:bg-warning" />
                        <p className="text-xs text-muted-foreground mt-1">45% completado</p>
                      </div>
                    </div>

                    <ArrowRight className="w-8 h-8 text-muted-foreground flex-shrink-0" />

                    <div className="flex-1 p-6 rounded-xl bg-success/10 border border-success/20 text-center">
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-8 h-8 text-success" />
                      </div>
                      <p className="font-semibold">Producto Final</p>
                      <p className="text-sm text-muted-foreground">4 productos</p>
                      <div className="mt-3">
                        <Progress value={90} className="h-2 [&>div]:bg-success" />
                        <p className="text-xs text-muted-foreground mt-1">90% en stock</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Personal en Producción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "José Hernández", task: "Elaboración de Pan", progress: 60 },
                      { name: "Ana López", task: "Horneado de Pasteles", progress: 35 },
                      { name: "Diego Torres", task: "Empaquetado", progress: 80 },
                    ].map((worker, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary">
                          {worker.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{worker.name}</p>
                          <p className="text-xs text-muted-foreground">{worker.task}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-semibold">{worker.progress}%</p>
                          <Progress value={worker.progress} className="h-1.5 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Alertas de Producción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { type: "warning", message: "Mantequilla por debajo del mínimo para pasteles", time: "Hace 10 min" },
                      { type: "info", message: "Lote PAP-2026-001 listo para control de calidad", time: "Hace 25 min" },
                      { type: "success", message: "Proceso de empaquetado completado", time: "Hace 1 hr" },
                    ].map((alert, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border-l-4",
                          alert.type === "warning" && "bg-warning/10 border-warning",
                          alert.type === "info" && "bg-primary/10 border-primary",
                          alert.type === "success" && "bg-success/10 border-success"
                        )}
                      >
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="traceability" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Trazabilidad Completa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Sistema de Trazabilidad IA</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Cada producto, proceso y movimiento queda registrado para análisis con TensorFlow.
                    Detección de anomalías, predicciones y resolución automática de problemas.
                  </p>
                  <Button className="mt-6 gap-2" data-testid="button-view-analytics">
                    <Zap className="w-4 h-4" />
                    Ver Analítica IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
