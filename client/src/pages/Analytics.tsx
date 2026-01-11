import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Zap,
  Target,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Lightbulb,
  Shield,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const predictions = [
    {
      title: "Demanda de Pan Blanco",
      prediction: "+25% próxima semana",
      confidence: 87,
      recommendation: "Aumentar producción en 30 unidades diarias",
    },
    {
      title: "Stock de Harina",
      prediction: "Agotamiento en 5 días",
      confidence: 92,
      recommendation: "Realizar pedido a proveedor antes del viernes",
    },
    {
      title: "Pico de Ventas",
      prediction: "Sábado 3-6 PM",
      confidence: 78,
      recommendation: "Programar personal adicional en caja",
    },
  ];

  const anomalies = [
    {
      type: "warning",
      title: "Variación en tiempo de producción",
      description: "El proceso de horneado está tomando 15% más tiempo del promedio",
      action: "Revisar temperatura del horno",
    },
    {
      type: "info",
      title: "Patrón de compra inusual",
      description: "Cliente 'Supermercados del Norte' ordenó 50% menos esta semana",
      action: "Contactar al cliente",
    },
    {
      type: "success",
      title: "Mejora en eficiencia",
      description: "El tiempo de empaquetado mejoró 20% esta semana",
      action: "Documentar proceso",
    },
  ];

  const insights = [
    {
      icon: Target,
      title: "Optimización de Rutas",
      description: "Reorganizar entregas puede ahorrar 2 horas diarias de transporte",
      impact: "Alto",
    },
    {
      icon: Zap,
      title: "Automatización Sugerida",
      description: "El proceso de facturación puede automatizarse para 80% de ventas",
      impact: "Medio",
    },
    {
      icon: TrendingUp,
      title: "Oportunidad de Venta",
      description: "Clientes que compran pan también compran galletas (65% correlación)",
      impact: "Alto",
    },
  ];

  return (
    <AppLayout title="Analítica IA" subtitle="Predicciones, anomalías e insights inteligentes">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precisión del Modelo</p>
                  <p className="text-2xl font-bold font-display">94.2%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Predicciones Acertadas</p>
                  <p className="text-2xl font-bold font-display">127</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/15 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Anomalías Detectadas</p>
                  <p className="text-2xl font-bold font-display">3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Insights Generados</p>
                  <p className="text-2xl font-bold font-display">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="predictions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="predictions" data-testid="tab-predictions">
              <TrendingUp className="w-4 h-4 mr-2" />
              Predicciones
            </TabsTrigger>
            <TabsTrigger value="anomalies" data-testid="tab-anomalies">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Anomalías
            </TabsTrigger>
            <TabsTrigger value="insights" data-testid="tab-insights">
              <Lightbulb className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="traceability" data-testid="tab-traceability">
              <Activity className="w-4 h-4 mr-2" />
              Trazabilidad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {predictions.map((pred, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{pred.title}</CardTitle>
                      <Badge className="bg-primary/15 text-primary border-primary/30">
                        {pred.confidence}% confianza
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-lg font-bold text-primary">{pred.prediction}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Recomendación:</p>
                      <p className="text-sm font-medium">{pred.recommendation}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Nivel de confianza</span>
                        <span className="font-medium">{pred.confidence}%</span>
                      </div>
                      <Progress value={pred.confidence} className="h-1.5" />
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      Aplicar Recomendación
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Detección de Anomalías
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {anomalies.map((anomaly, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-4 rounded-xl border-l-4",
                        anomaly.type === "warning" && "bg-warning/10 border-warning",
                        anomaly.type === "info" && "bg-primary/10 border-primary",
                        anomaly.type === "success" && "bg-success/10 border-success"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{anomaly.title}</h4>
                          <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                          <div className="flex items-center gap-2 pt-2">
                            <Badge variant="secondary">Acción sugerida:</Badge>
                            <span className="text-sm font-medium">{anomaly.action}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          Resolver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <Card key={index} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center group-hover:bg-accent/25 transition-colors">
                          <Icon className="w-6 h-6 text-accent" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{insight.title}</h4>
                            <Badge
                              className={cn(
                                insight.impact === "Alto"
                                  ? "bg-success/15 text-success border-success/30"
                                  : "bg-warning/15 text-warning border-warning/30"
                              )}
                            >
                              Impacto {insight.impact}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                          <Button variant="link" className="h-auto p-0 text-sm">
                            Ver detalles →
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="traceability" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Sistema de Trazabilidad Completa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center glow mx-auto">
                      <Brain className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center text-white text-xs font-bold">
                      IA
                    </div>
                  </div>
                  <h3 className="text-xl font-display font-bold mt-6 mb-2">
                    TensorFlow Integrado
                  </h3>
                  <p className="text-muted-foreground max-w-lg mx-auto mb-6">
                    Cada transacción, movimiento de inventario, proceso de producción y entrega 
                    queda registrado para análisis predictivo y detección automática de patrones.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="p-4 rounded-xl bg-muted/50">
                      <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="font-semibold">Análisis de Datos</p>
                      <p className="text-xs text-muted-foreground">En tiempo real</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <LineChart className="w-8 h-8 text-accent mx-auto mb-2" />
                      <p className="font-semibold">Predicciones</p>
                      <p className="text-xs text-muted-foreground">Machine Learning</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <PieChart className="w-8 h-8 text-success mx-auto mb-2" />
                      <p className="font-semibold">Reportes</p>
                      <p className="text-xs text-muted-foreground">Automatizados</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
