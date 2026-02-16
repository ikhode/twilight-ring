import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Sparkles,
  Zap,
  LayoutDashboard,
  Factory,
  Truck,
  TrendingUp,
  Settings2,
  ChevronRight,
  DollarSign,
  Box,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { aiEngine } from "@/lib/ai/tensorflow";
import { GuardianPanel } from "@/components/GuardianPanel";
import { SystemHealth } from "@/components/cognitive/SystemHealth";
import { dashboardEngine, UserRoleType, DashboardConfig } from "@/lib/ai/dashboard-engine";
import { ActionCards } from "@/components/dashboard/ActionCards";
import { ProcessTimeline } from "@/components/dashboard/ProcessTimeline";
import { OptimizationMap } from "@/components/cognitive/OptimizationMap";
import { useQuery } from "@tanstack/react-query";
import { Process, ProcessInstance } from "../../../shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { CognitiveKPI } from "@/components/dashboard/CognitiveKPI";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";
import { TrustTimeline } from "@/components/dashboard/TrustTimeline";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { DemandForecastingWidget } from "@/components/dashboard/DemandForecastingWidget";
import { FraudAlertWidget } from "@/components/dashboard/FraudAlertWidget";
import {
  Tooltip,


  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DailyBriefing } from "@/components/cognitive/DailyBriefing";
import { useConfiguration } from "@/context/ConfigurationContext";
import { SalesFunnelWidget } from "@/components/widgets/SalesFunnelWidget";
import { TopCustomersWidget } from "@/components/widgets/TopCustomersWidget";
import { MarketTrendsWidget } from "@/components/widgets/MarketTrendsWidget";
import { YieldAnalysis } from "@/components/analytics/YieldAnalysis";

/**
 * Dashboard Component
 * 
 * Central hub for the application, displaying key metrics, AI insights,
 * and navigating to different modules based on the active role.
 * 
 * @returns {JSX.Element} The rendered dashboard page.
 */
export default function Dashboard() {
  const { role, setRole, industry, enabledModules } = useConfiguration();
  const [config, setConfig] = useState<DashboardConfig>(dashboardEngine.getDashboardConfig(role, industry));

  const { session } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      if (!session?.access_token) return null;
      const res = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
    enabled: !!session?.access_token
  });

  const salesHistory = stats?.salesHistory || [];

  useEffect(() => {
    setConfig(dashboardEngine.getDashboardConfig(role, industry));
  }, [role, industry]);



  const { data: processes } = useQuery<Process[]>({
    queryKey: ["/api/cpe/processes"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/cpe/processes", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch processes");
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // Realtime subscription for processes
  useSupabaseRealtime({
    table: 'processes',
    queryKey: ["/api/cpe/processes"],
  });

  const activeProcessId = processes?.[0]?.id;

  const { data: instances } = useQuery<ProcessInstance[]>({
    queryKey: [`/api/cpe/processes/${activeProcessId}/instances`],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch(`/api/cpe/processes/${activeProcessId}/instances`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch instances");
      return res.json();
    },
    enabled: !!activeProcessId && !!session?.access_token
  });

  // Realtime subscription for process instances
  useSupabaseRealtime({
    table: 'process_instances',
    queryKey: [`/api/cpe/processes/${activeProcessId}/instances`],
    enabled: !!activeProcessId,
  });

  // Comprehensive realtime subscriptions for Dashboard reactivity
  useSupabaseRealtime({ table: 'sales', queryKey: ["/api/dashboard/stats"] });
  useSupabaseRealtime({ table: 'products', queryKey: ["/api/dashboard/stats"] });
  useSupabaseRealtime({ table: 'notifications', queryKey: ["/api/dashboard/stats"] });

  const activeInstanceId = instances?.[0]?.id;

  // Zero-State: System Initialization
  if (enabledModules.length === 0) {
    return (
      <AppLayout title="Núcleo Cognitivo" subtitle="Inicialización del Sistema">
        <div className="flex flex-col items-center justify-center min-h-[85vh] w-full text-center space-y-10 animate-in fade-in duration-1000">

          {/* Visual: Sleeping Brain */}
          <div className="relative">
            <div className="w-40 h-40 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <Brain className="w-20 h-20 text-slate-700" />
            </div>
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-full border border-slate-800 animate-ping opacity-20" />
            <div className="absolute inset-[-15px] rounded-full border border-slate-800 animate-ping opacity-10 [animation-delay:0.5s]" />
          </div>

          <div className="max-w-xl space-y-6">
            <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-slate-200 drop-shadow-lg">Sistema en Espera</h2>
            <p className="text-lg text-slate-500 font-medium leading-relaxed">
              El Núcleo Cognitivo está activo pero no tiene módulos conectados.
              Para comenzar, activa los módulos operativos necesarios para tu industria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl px-4">
            <Link href="/settings" className="w-full block">
              <Button className="w-full h-16 text-lg bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all">
                <Zap className="w-6 h-6 mr-3" />
                Activar Módulos
              </Button>
            </Link>
            <Link href="/workflows" className="w-full block">
              <Button variant="outline" className="w-full h-16 text-lg border-slate-700 hover:bg-slate-800 text-slate-300 font-bold uppercase tracking-widest transition-all">
                <Settings2 className="w-6 h-6 mr-3" />
                Asistente de Configuración
              </Button>
            </Link>
          </div>

          <div className="pt-8 border-t border-slate-800/50 w-full max-w-md">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-bold">
              Estado: <span className="text-amber-500">Standby</span> • Esperando Input
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Núcleo Cognitivo"
      subtitle="Ecosistema de Inteligencia Empresarial Adaptativo"
    >
      <div className="space-y-8 pb-12 text-slate-200">

        {/* Daily Briefing / Audit Log Review */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DailyBriefing />
        </motion.div>

        {/* Role Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <LayoutDashboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Persona Activa</h3>
              <p className="text-xs text-slate-500 font-bold">La interfaz se adapta a tu perfil de negocio</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['admin', 'production', 'logistics', 'sales'] as UserRoleType[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={role === r ? "default" : "outline"}
                onClick={() => setRole(r)}
                className={cn(
                  "text-[10px] font-black uppercase tracking-tighter h-8 rounded-full transition-all",
                  role === r ? "shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "border-slate-800 text-slate-400"
                )}
              >
                {r === 'admin' && 'Administrador'}
                {r === 'production' && 'Producción'}
                {r === 'logistics' && 'Logística'}
                {r === 'sales' && 'Ventas'}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* AI Status Banner with Neural Net */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="md:col-span-2 relative overflow-hidden p-0 rounded-2xl bg-slate-900 border border-white/5 min-h-[180px]">
            <SystemHealth />
            <div className="absolute top-4 left-6 pointer-events-none">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center backdrop-blur-md">
                  <Brain className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black uppercase italic tracking-widest leading-none text-white">
                      Status: <span className="text-primary">{stats?.hasEnoughData ? "ÓPTIMO" : "APRENDIENDO"}</span>
                    </h2>
                    <Badge className={cn(
                      "text-[8px] h-4 border-none",
                      stats?.hasEnoughData ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {stats?.hasEnoughData ? "IA ACTIVA" : "CALIBRANDO RED"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                    <span className="text-slate-500">Estado:</span> {stats?.hasEnoughData ? "Modelo Calibrado" : "Esperando flujo de datos inicial"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Button asChild variant="outline" size="sm" className="h-7 border-primary/20 bg-primary/5 text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all pointer-events-auto">
                  <Link href="/workflows">
                    <Zap className="w-3 h-3 mr-1.5 text-primary" />
                    Configurar Automatización
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Confidence Widget */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-slate-900/50 border-slate-800 flex flex-col justify-center p-6 cursor-help">
                  <div className="text-right mb-4">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Nivel de Confianza (TrustNet)</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">
                      {stats?.trustScore || stats?.dataMaturityScore || 0}<span className="text-lg text-primary">%</span>
                    </p>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats?.trustScore || stats?.dataMaturityScore || 0}%` }}
                      className="h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2 text-right uppercase font-bold tracking-tight">
                    {stats?.hasEnoughData ? "Blockchain verification active - Ledger Sync OK" : "Datos insuficientes para validación completa"}
                  </p>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                <p className="font-bold text-primary uppercase tracking-widest text-[9px] mb-1">Métrica de Integridad</p>
                <p>Calculado mediante la validación sintáctica de transacciones, consistencia en el libro mayor (TrustNet) y madurez de los datos históricos procesados por el motor de IA. Fuente: Protocolo TrustNet / Audit Engine.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>

        {/* Adaptive KPIs (Rewritten to use CognitiveKPI) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <CognitiveKPI
            label="Ingresos Totales"
            value={stats?.revenue || "---"}
            change={stats?.hasEnoughData ? 14.2 : 0}
            trend={stats?.hasEnoughData ? "up" : "neutral"}
            insight={stats?.hasEnoughData
              ? `El modelo detecta un aumento inusual en ventas ${stats?.industry === 'manufacturing' ? 'B2B' : 'directas'}.`
              : "Esperando registros de ventas para análisis de tendencia."}
            explanation="Representa la suma total de órdenes pagadas y facturadas en el periodo actual. Fórmula: SUM(sales_orders.total) WHERE status = 'paid'. Fuente: Ledger de Ventas / TrustNet."
            icon={DollarSign}
          />
          <CognitiveKPI
            label="Eficiencia Producción"
            value={stats?.efficiency || "---"}
            change={stats?.hasEnoughData ? 2.1 : 0}
            trend={stats?.hasEnoughData ? "up" : "neutral"}
            insight={stats?.hasEnoughData
              ? "Calculada en tiempo real basada en las instancias de procesos activas."
              : "Analizando flujos de procesos iniciales."}
            explanation="Indica la relación porcentual entre el tiempo teórico estimado y el tiempo real reportado. Fórmula: (Tiempo_Teórico / Tiempo_Real) * 100. Fuente: Kioskos T-CAC / Motor CPE."
            icon={Factory}
          />
          <CognitiveKPI
            label="Alertas Guardian"
            value={stats?.anomalies ?? "---"}
            change={stats?.anomalies > 0 ? 100 : 0}
            trend={stats?.anomalies > 0 ? "down" : "neutral"}
            insight={stats?.anomalies > 0 ? `Se han detectado ${stats.anomalies} anomalías críticas hoy.` : "No se detectan amenazas activas en el sistema."}
            explanation="Detecciones automáticas de discrepancias en inventario, accesos no autorizados o desviaciones de costos. Fórmula: COUNT(anomalies) WHERE severity >= 'high'. Fuente: AI Guardian / Edge Events."
            icon={Truck}
          />
          <CognitiveKPI
            label="Fuerza Laboral"
            value={stats?.workforce || "---"}
            change={0}
            trend="neutral"
            insight="Asistencia verificada por el módulo de Control de Tiempo."
            explanation="Número total de colaboradores con sesión activa o entrada registrada hoy. Fórmula: COUNT(employees) WHERE status = 'present'. Fuente: Control Asistencia / FaceID."
            icon={Users}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >

                {/* 1. Cognitive Process Section (Traceability & Optimization) */}
                {(role === 'production' || role === 'admin') && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <ProcessTimeline instanceId={activeInstanceId} />
                      <OptimizationMap />
                    </div>
                    {/* Yield Analysis Report */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                      <YieldAnalysis />
                    </div>
                  </div>
                )}

                {/* 2. Forecasting Section w/ Scenario Simulator */}
                {(role === 'admin' || role === 'sales') && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <DemandForecastingWidget
                      historicalData={salesHistory}
                      title="Predicción de Ingresos (7D)"
                    />

                    {/* Simulator */}
                    <ScenarioSimulator baseRevenue={parseFloat(stats?.revenue?.replace(/[^0-9.]/g, '') || "1240000")} />
                  </div>
                )}

                {/* 3. Proactive Actions */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 italic">Acciones Recomendadas por IA</h4>
                  </div>
                  <ActionCards role={role} />
                </div>

                {/* 4. Module Grid - Real Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.layout.filter(w => {
                    const isSystemWidget = w.type !== 'alert' && w.id !== 'revenue_forecast';
                    const isModuleEnabled = w.moduleId ? enabledModules.includes(w.moduleId) : true;
                    return isSystemWidget && isModuleEnabled;
                  }).map((widget) => {
                    // Render real widgets based on ID
                    if (widget.id === 'sales_funnel') {
                      return <SalesFunnelWidget key={widget.id} />;
                    }
                    if (widget.id === 'top_customers') {
                      return <TopCustomersWidget key={widget.id} />;
                    }
                    if (widget.id === 'market_trends') {
                      return <MarketTrendsWidget key={widget.id} />;
                    }
                    if (widget.id === 'sales_opportunities') {
                      // Reuse ActionCards but in card format
                      return (
                        <Card key={widget.id} className="bg-slate-900/40 border-slate-800 hover:border-primary/20 transition-all">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic">{widget.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                <p className="text-xs text-slate-400">Las oportunidades de IA se muestran en la sección "Acciones Recomendadas" arriba</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    // Fallback for other widgets
                    return (
                      <Card key={widget.id} className="bg-slate-900/40 border-slate-800 group hover:border-primary/20 transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h5 className="text-sm font-black uppercase tracking-widest italic">{widget.title}</h5>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:text-white">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="h-32 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-center overflow-hidden">
                            <div className="text-center opacity-20 group-hover:opacity-40 transition-opacity">
                              {widget.type === 'chart' && <TrendingUp className="w-12 h-12 mx-auto mb-2" />}
                              {widget.type === 'table' && <LayoutDashboard className="w-12 h-12 mx-auto mb-2" />}
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Próximamente</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar / Alert Panel */}
          <div className="space-y-6">
            <TrustTimeline />
            <FraudAlertWidget transactions={stats?.recentTransactions || []} />
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
              <CardHeader className="p-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <CardTitle className="text-xs font-black uppercase tracking-widest italic text-white">Insights Contextuales</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[11px] leading-relaxed italic text-slate-300">
                    {role === 'admin' && "Los indicadores clave muestran una optimización del 14% global tras activar el módulo de IA Predictiva en Logística."}
                    {role === 'production' && "La temperatura ambiente en planta está subiendo. Guardian recomienda ajustar la refrigeración de los racks 5-8 preventivamente."}
                    {role === 'logistics' && "La ruta hacia el norte tiene un retraso de 22 min. Sugerimos reasignar el camión B-04 a la ruta Express."}
                    {role === 'sales' && "El ratio de cierre en 'Manufactura' es excepcionalmente alto hoy. Enfocar esfuerzos en prospectos similares."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout >
  );
}
