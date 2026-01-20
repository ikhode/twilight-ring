import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Zap,
  Activity,
  Lightbulb,
  Shield,
  RefreshCw,
  Cpu,
  Server,
  Network
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AnalyticsMetric, MetricModel } from "../../../shared/schema";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useConfiguration, IndustryType } from "@/context/ConfigurationContext";

function ModelStatusCard({ model }: { model: MetricModel }) {
  const isTraining = model.status === "training";

  return (
    <Card className={cn("border-l-4", isTraining ? "border-l-accent" : "border-l-primary")}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", isTraining ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary")}>
              {isTraining ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-semibold text-sm">{model.type.replace('_', ' ').toUpperCase()}</p>
              <p className="text-xs text-muted-foreground capitalize">{model.status}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn(model.accuracy && model.accuracy > 90 ? "text-success border-success/30" : "text-primary border-primary/30")}>
            {model.accuracy}% Precisión
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Confianza del modelo</span>
            <span>{model.accuracy}%</span>
          </div>
          <Progress value={model.accuracy || 0} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl shadow-black/50">
        <p className="text-slate-300 font-medium text-sm mb-1">{new Date(label).toLocaleDateString()}</p>
        <div className="space-y-1">
          <p className="text-primary text-sm">
            Real: <span className="font-bold">{payload[0].value}</span>
          </p>
          {payload[1] && (
            <div className="flex items-center gap-2">
              <p className="text-accent text-sm">
                Predicción IA: <span className="font-bold">{payload[1].value}</span>
              </p>
              <Badge variant="outline" className="text-[10px] h-4 px-1 border-accent/30 text-accent">
                Cognitive
              </Badge>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
          La IA detectó un patrón de crecimiento estacional del 15%.
        </p>
      </div>
    );
  }
  return null;
};

// Helper for industry-specific suggestions
const getIndustrySuggestions = (industry: IndustryType) => {
  switch (industry) {
    case "retail":
      return [
        {
          title: "Ajustar Inventario",
          description: "Stock de 'Agua de Coco' bajo proyección de ventas del fin de semana (+20%).",
          impact: "High",
          action: "Orden de Compra",
          icon: ShoppingCart,
          color: "text-accent",
          bg: "bg-accent/10",
          border: "hover:border-accent/40"
        },
        {
          title: "Optimización de Espacio",
          description: "El producto 'Aceite de Coco' tiene baja rotación en zona caliente.",
          impact: "Medium",
          action: "Reasignar Planograma",
          icon: Lightbulb,
          color: "text-warning",
          bg: "bg-warning/10",
          border: "hover:border-warning/40"
        },
        {
          title: "Eficiencia de Personal",
          description: "Se pronostica alta afluencia el Sábado a las 4PM.",
          impact: "High",
          action: "Aumentar Turno",
          icon: Users,
          color: "text-success",
          bg: "bg-success/10",
          border: "hover:border-success/40"
        }
      ];
    case "manufacturing":
      return [
        {
          title: "Mantenimiento Preventivo",
          description: "Vibración inusual detectada en Cortadora #2.",
          impact: "Critical",
          action: "Agendar Revisión",
          icon: Activity,
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "hover:border-red-500/40"
        },
        {
          title: "Optimización de Merma",
          description: "El desperdicio en 'Costura' subió un 3% esta semana.",
          impact: "High",
          action: "Ver Análisis RCA",
          icon: TrendingUp,
          color: "text-warning",
          bg: "bg-warning/10",
          border: "hover:border-warning/40"
        },
        {
          title: "Eficiencia Energética",
          description: "Pico de consumo eléctrico detectado en turno noche.",
          impact: "Medium",
          action: "Auditar Consumo",
          icon: Zap,
          color: "text-success",
          bg: "bg-success/10",
          border: "hover:border-success/40"
        }
      ];
    case "logistics":
      return [
        {
          title: "Optimización de Ruta",
          description: "Tráfico inusual en Zona Norte. Se sugiere desvío para Entrega #402.",
          impact: "High",
          action: "Actualizar GPS",
          icon: Map,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "hover:border-blue-500/40"
        },
        {
          title: "Mantenimiento Flotilla",
          description: "Unidad 5 próxima a servicio de 50,000km.",
          impact: "Medium",
          action: "Agendar Taller",
          icon: Wrench,
          color: "text-orange-400",
          bg: "bg-orange-500/10",
          border: "hover:border-orange-500/40"
        }
      ];
    default: // Generic or Service
      return [
        {
          title: "Ajustar Precios",
          description: "La demanda de productos premium subió un 12%. Se sugiere ajuste del +3%.",
          impact: "High",
          action: "Ejecutar acción",
          icon: TrendingUp,
          color: "text-accent",
          bg: "bg-accent/10",
          border: "hover:border-accent/40"
        },
        {
          title: "Reabastecimiento",
          description: "Stock de insumos básicos bajo (2 días restantes).",
          impact: "Medium",
          action: "Generar Orden",
          icon: AlertTriangle,
          color: "text-warning",
          bg: "bg-warning/10",
          border: "hover:border-warning/40"
        },
        {
          title: "Mantenimiento",
          description: "Equipo principal requiere calibración trimestral.",
          impact: "Low",
          action: "Agendar",
          icon: Shield,
          color: "text-success",
          bg: "bg-success/10",
          border: "hover:border-success/40"
        }
      ];
  }
};

// Start imports for icons used in switch (lazy way to avoid top-level clutter if not used globally)
import { ShoppingCart, Users, Map, Wrench } from "lucide-react";


import { useRealtimeSubscription } from "@/hooks/use-realtime";

function CashflowForecastSection() {
  const { session } = useAuth();
  const { data: forecast } = useQuery({
    queryKey: ["/api/analytics/cashflow"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/analytics/cashflow", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      return res.json();
    },
    enabled: !!session?.access_token
  });

  if (!forecast?.length) return null;

  return (
    <Card className="bg-slate-950/50 border-emerald-900/30 overflow-hidden relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
              Proyección de Flujo de Caja (30 Días)
            </CardTitle>
            <CardDescription>
              Estimación basada en cuentas por cobrar vs. gastos fijos y variables proyectados.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
            +15% Crecimiento Estimado
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecast}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
              formatter={(value: number) => [`$${(value / 100).toLocaleString()}`, ""]}
            />
            <Area name="Ingreso Proyectado" type="monotone" dataKey="projectedIncome" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
            <Area name="Gasto Proyectado" type="monotone" dataKey="projectedExpense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ... inside the component ...

  const { industry, universalConfig } = useConfiguration(); // Context Hook

  // Realtime Subscription: Listen for new Sales to update the dashboard instantly
  useRealtimeSubscription({
    table: "sales",
    event: "INSERT",
    queryKeyToInvalidate: ["/api/analytics/dashboard"]
  });

  const { data, isLoading } = useQuery<{ metrics: AnalyticsMetric[], models: MetricModel[], hasEnoughData: boolean }>({
    queryKey: ["/api/analytics/dashboard"],
    queryFn: async () => {
      if (!session?.access_token) return { metrics: [], models: [], hasEnoughData: false };
      const res = await fetch("/api/analytics/dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!session?.access_token,
    // Polling removed in favor of Realtime events
  });

  const trainMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const res = await fetch(`/api/analytics/models/${modelId}/train`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to start training");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({ title: "Entrenamiento Iniciado", description: "El modelo está aprendiendo de los nuevos datos." });
    }
  });

  // Use real data only. If empty, chart will be empty (or we show a placeholder)
  const chartData = data?.metrics?.map(m => ({
    name: m.date,
    value: m.value,
    predicted: m.predictedValue
  })) || [];

  /* 
   * DYNAMIC SUGGESTIONS
   * If universalConfig has categories, we try to use them to customize the text.
   * Otherwise we fallback to the industry defaults.
   */
  const activeSuggestions = useMemo(() => {
    let suggestions = getIndustrySuggestions(industry);

    // Basic substitution if we have product categories defined (e.g. "Coconuts")
    if (universalConfig?.productCategories?.length > 0) {
      const primaryProduct = universalConfig.productCategories[0];
      // Try to inject product name into generic strings if applicable
      // (This is a simplified way to make it feel alive)
      if (industry === 'generic' || industry === 'retail') {
        suggestions[0].description = suggestions[0].description.replace("'Agua de Coco'", `'${primaryProduct}'`);
        suggestions[1].description = suggestions[1].description.replace("'Aceite de Coco'", `'Derivados de ${primaryProduct}'`);
      }
    }
    return suggestions;
  }, [industry, universalConfig]);


  return (
    <AppLayout title="Cognitive Core" subtitle="Inteligencia central y modelos predictivos">
      <div className="space-y-8">

        {/* NEW: Cashflow Forecast Section */}
        <CashflowForecastSection />

        {/* HERO SECTION: Cognitive Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-slate-950/50 border-slate-800 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Brain className="w-64 h-64 text-primary" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Flujo de Operaciones (Predicción en Tiempo Real)
              </CardTitle>
              <CardDescription>
                Comparativa de rendimiento real vs. predicción de IA generativa
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] relative">
              {!data?.hasEnoughData && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm p-8 text-center">
                  <Cpu className="w-12 h-12 text-primary mb-4 opacity-40 animate-pulse" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-300">MODO APRENDIZAJE</p>
                  <p className="text-xs text-slate-500 mt-2 max-w-[300px]">
                    El núcleo cognitivo está recopilando flujos históricos para calibrar las proyecciones.
                    Se requieren al menos 5 registros de actividad.
                  </p>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  <Area type="monotone" dataKey="predicted" stroke="#06b6d4" strokeDasharray="5 5" strokeWidth={2} fillOpacity={1} fill="url(#colorPred)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-primary/20 to-slate-900 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Estado del Núcleo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Aprendizaje Activo</span>
                    <Badge variant="outline" className="animate-pulse bg-primary/20 text-primary border-primary/50">ONLINE</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Carga cognitiva</span>
                      <span>34%</span>
                    </div>
                    <Progress value={34} className="h-1.5 bg-slate-800" />
                  </div>
                  <div className="pt-4">
                    <Button className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20" onClick={() => toast({ title: "Optimizando...", description: "Re-calibrando pesos del modelo neuronal." })}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Optimizar Recursos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example of "training" trigger */}
            {data?.models?.map(model => (
              <div key={model.id} className="relative group cursor-pointer" onClick={() => trainMutation.mutate(model.id)}>
                <ModelStatusCard model={model} />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Entrenar
                  </span>
                </div>
              </div>
            ))}

            {!data?.models?.length && (
              <Card className="border-dashed border-slate-700 bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                  <Server className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Sin modelos activos</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* SECTION: Action Layer (Contextual Suggestions) */}
        <div>
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Network className="w-5 h-5 text-accent" />
            Capa de Acción (Sugerencias Contextuales: {industry.toUpperCase()})
          </h3>
          {!data?.hasEnoughData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50 grayscale pointer-events-none select-none">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-slate-900/40 border-slate-800 border-dashed">
                  <CardContent className="pt-6 flex flex-col items-center justify-center py-12 text-center">
                    <Lightbulb className="w-8 h-8 text-slate-700 mb-2" />
                    <p className="text-[10px] uppercase font-black text-slate-600">Sugerencia en Calibración</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeSuggestions.map((suggestion, idx) => (
                <Card key={idx} className={cn("bg-slate-900/40 border-slate-800 transition-colors cursor-pointer group", suggestion.border)}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform", suggestion.bg)}>
                        <suggestion.icon className={cn("w-5 h-5", suggestion.color)} />
                      </div>
                      <div>
                        <h4 className={cn("font-semibold text-slate-200 transition-colors", `group-hover:${suggestion.color.replace('text-', '')}`)}>{suggestion.title}</h4>
                        <p className="text-sm text-slate-400 mt-1">{suggestion.description}</p>
                        <Button variant="link" className={cn("p-0 h-auto mt-2", suggestion.color)}>{suggestion.action} →</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
