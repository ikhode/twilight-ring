import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  Building2,
  Users,
  CreditCard,
  Bell,
  Shield,
  Palette,
  Globe,
  Puzzle,
  Check,
  Crown,
  Layout,
  Database,
  Type,
  Plus,
  Trash2,
  X,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EthicsPanel } from "@/components/ai/EthicsPanel";
import { Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useToast } from "@/hooks/use-toast";
import { useConfiguration, IndustryType } from "@/context/ConfigurationContext";
import { ERP_MODULES } from "@/lib/modules";

import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BrandingSettings } from "@/components/settings/BrandingSettings";

export default function Settings() {
  const { toast } = useToast();
  const { profile, session } = useAuth();
  const {
    theme, setTheme, themeColor, setThemeColor,
    universalConfig, updateUniversalConfig,
    enabledModules, toggleModule, aiConfig, setAiConfig
  } = useConfiguration();
  const [orgName, setOrgName] = useState(profile?.organization?.name || "Mi Empresa S.A.");
  const [industryState, setIndustryState] = useState(profile?.organization?.industry || "generic");

  // Buffers for coordinates to allow typing "-", ".", etc.
  const [latBuffer, setLatBuffer] = useState(universalConfig.cedisLat?.toString() || "");
  const [lngBuffer, setLngBuffer] = useState(universalConfig.cedisLng?.toString() || "");

  // Sync state with profile changes
  useEffect(() => {
    if (profile?.organization) {
      if (profile.organization.name) setOrgName(profile.organization.name);
      if (profile.organization.industry) setIndustryState(profile.organization.industry);
    }
  }, [profile?.organization]);

  // Sync buffers if config changes externally (e.g. initial load)
  useEffect(() => {
    if (universalConfig.cedisLat !== undefined && universalConfig.cedisLat.toString() !== latBuffer) {
      setLatBuffer(universalConfig.cedisLat.toString());
    }
    if (universalConfig.cedisLng !== undefined && universalConfig.cedisLng.toString() !== lngBuffer) {
      setLngBuffer(universalConfig.cedisLng.toString());
    }
  }, [universalConfig.cedisLat, universalConfig.cedisLng]);

  const commitCoordinates = () => {
    const lat = parseFloat(latBuffer);
    const lng = parseFloat(lngBuffer);
    const updates: any = {};
    if (!isNaN(lat)) updates.cedisLat = lat;
    if (!isNaN(lng)) updates.cedisLng = lng;
    if (Object.keys(updates).length > 0) {
      updateUniversalConfig(updates);
    }
  };

  const updateOrgMutation = useMutation({
    mutationFn: async (payload: { name: string, industry: string, settings?: any }) => {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Error al actualizar organización");
      return res.json();
    },
    onSuccess: () => {
      commitCoordinates(); // Ensure coords are saved
      toast({ title: "Perfil Actualizado", description: "La información de la empresa se ha guardado correctamente." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  return (
    <AppLayout title="Configuración OS" subtitle="Personaliza la estructura y adaptabilidad del sistema">
      <Tabs defaultValue="generic" className="space-y-6 text-slate-200">
        <TabsList className="bg-slate-900/50 border border-slate-800 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="generic" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
            <Globe className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="org" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
            <Building2 className="w-4 h-4" /> Organización
          </TabsTrigger>
          <TabsTrigger value="subscription" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
            <CreditCard className="w-4 h-4" /> Suscripción
          </TabsTrigger>
          <TabsTrigger value="ethics" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
            <Shield className="w-4 h-4" /> Ética AI
          </TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
            <Terminal className="w-4 h-4" /> Avanzado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generic" className="space-y-6 focus:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Módulos Activos
                </CardTitle>
                <CardDescription>Habilita o deshabilita las capas de inteligencia del OS</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <TooltipProvider>
                    {ERP_MODULES.map((mod) => (
                      <Tooltip key={mod.id}>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 transition-all",
                            mod.status === 'coming_soon' ? "opacity-50 cursor-not-allowed" : "hover:border-primary/20 cursor-help"
                          )}>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-900 rounded-lg text-slate-400">
                                {React.createElement(mod.icon as any, { className: "w-4 h-4" })}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-white uppercase italic">{mod.name}</p>
                                  {mod.status === 'beta' && <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/20 text-[8px] h-3 px-1 italic">BETA</Badge>}
                                  {mod.status === 'coming_soon' && <Badge className="bg-slate-800 text-slate-500 border-slate-700 text-[8px] h-3 px-1">PRÓXIMAMENTE</Badge>}
                                </div>
                                <p className="text-[10px] text-slate-500">{mod.description}</p>
                              </div>
                            </div>
                            <Switch
                              checked={enabledModules.includes(mod.id)}
                              onCheckedChange={() => mod.status !== 'coming_soon' && toggleModule(mod.id)}
                              disabled={mod.status === 'coming_soon'}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-white p-3 max-w-xs">
                          <div className="space-y-1">
                            <p className="font-bold text-primary uppercase tracking-widest text-[9px]">Capacidad del Módulo</p>
                            <p>{mod.tooltip || "Habilita funciones avanzadas para este departamento."}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  AI Guardian & Copilots
                </CardTitle>
                <CardDescription>Configura los agentes autónomos del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white uppercase italic tracking-widest">Optimización Autónoma</p>
                    <p className="text-[10px] text-slate-500 italic">Guardian toma decisiones en tiempo real</p>
                  </div>
                  <Switch
                    checked={aiConfig.guardianEnabled}
                    onCheckedChange={(val) => setAiConfig({ guardianEnabled: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-white uppercase italic tracking-widest">Adaptive UI</p>
                    <p className="text-[10px] text-slate-500 italic">La interfaz cambia según el contexto del usuario</p>
                  </div>
                  <Switch
                    checked={aiConfig.adaptiveUiEnabled}
                    onCheckedChange={(val) => setAiConfig({ adaptiveUiEnabled: val })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="org" className="space-y-6 focus:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Perfil de la Organización
                </CardTitle>
                <CardDescription>Información básica de tu cuenta empresarial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la Empresa</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dirección del CEDIS (Base de Operaciones)</Label>
                  <Input
                    value={universalConfig.cedisAddress || ""}
                    onChange={(e) => updateUniversalConfig({ cedisAddress: e.target.value })}
                    placeholder="Ej. Av. Central 123, Ciudad de México"
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Latitud</Label>
                      <Input
                        type="text"
                        value={latBuffer}
                        onChange={(e) => setLatBuffer(e.target.value)}
                        onBlur={commitCoordinates}
                        placeholder="19.4326"
                        className="bg-slate-950 border-slate-800 text-white h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Longitud</Label>
                      <Input
                        type="text"
                        value={lngBuffer}
                        onChange={(e) => setLngBuffer(e.target.value)}
                        onBlur={commitCoordinates}
                        placeholder="-99.1332"
                        className="bg-slate-950 border-slate-800 text-white h-8 text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">Esta ubicación se utilizará como punto de partida para la optimización de rutas.</p>
                </div>

                <Button
                  onClick={() => {
                    const lat = parseFloat(latBuffer);
                    const lng = parseFloat(lngBuffer);
                    const finalConfig = { ...universalConfig };
                    if (!isNaN(lat)) finalConfig.cedisLat = lat;
                    if (!isNaN(lng)) finalConfig.cedisLng = lng;

                    updateOrgMutation.mutate({
                      name: orgName,
                      industry: industryState,
                      settings: finalConfig
                    });
                  }}
                  disabled={updateOrgMutation.isPending}
                  className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 py-6"
                >
                  {updateOrgMutation.isPending ? "Guardando..." : "Guardar Perfil"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Identidad Visual
                </CardTitle>
                <CardDescription>Adapta la marca de tu OS cognitivo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Color de Acento</Label>
                  <div className="flex gap-3">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                      <div
                        key={c}
                        onClick={() => setThemeColor(c)}
                        className={cn(
                          "w-10 h-10 rounded-xl cursor-pointer border-2 transition-all",
                          themeColor === c ? "border-white ring-4 ring-primary/20 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Preset de Interfaz</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setTheme('glass')}
                      className={cn("h-24 flex-col gap-2 border-slate-800 bg-slate-950 hover:border-primary/50", theme === 'glass' ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "")}
                    >
                      <Layout className="w-5 h-5" />
                      <div>
                        <p className="text-xs font-black uppercase italic">Glass OS</p>
                        <p className="text-[10px] text-slate-500">Moderno & Transparente</p>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTheme('compact')}
                      className={cn("h-24 flex-col gap-2 border-slate-800 bg-slate-950 hover:border-primary/50", theme === 'compact' ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "")}
                    >
                      <Type className="w-5 h-5" />
                      <div>
                        <p className="text-xs font-black uppercase italic">Compact OS</p>
                        <p className="text-[10px] text-slate-500">Denso & Analítico</p>
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kiosk Branding Section */}
            <BrandingSettings />
          </div>
        </TabsContent>



        <TabsContent value="ethics">
          <EthicsPanel />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionPanel />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  Terminales & Kioskos
                </CardTitle>
                <CardDescription>Configuración de hardware y puntos de presencia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Identificación Facial</Label>
                    <p className="text-xs text-slate-500">Requerir reconocimiento para terminales T-CAC</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>Intervalo de Heartbeat (ms)</Label>
                  <Input type="number" defaultValue={5000} className="bg-slate-950 border-slate-800" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-rose-500/20 bg-rose-500/5">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-rose-500">
                  <ShieldAlert className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-rose-500/60">Acciones críticas e irreversibles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-rose-200 uppercase">Reiniciar Datos de IA</p>
                    <p className="text-[10px] text-rose-500/70 italic">Elimina el modelo de entrenamiento actual</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20">Reset</Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-rose-200 uppercase">Eliminar Organización</p>
                    <p className="text-[10px] text-rose-500/70 italic">Borrado total de la cuenta y módulos</p>
                  </div>
                  <Button variant="destructive" size="sm" className="bg-rose-500 hover:bg-rose-600">Delete</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function SubscriptionPanel() {
  const { profile, session } = useAuth();
  const org = profile?.organization;

  const checkoutMutation = useMutation({
    mutationFn: async (tier: string) => {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ tier })
      });
      if (!res.ok) throw new Error("Error al iniciar checkout");
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    }
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/subscriptions/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.url) window.location.href = data.url;
    }
  });

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: "$49",
      description: "Ideal para pequeñas plantas y talleres de manufactura.",
      features: ["Hasta 5 terminales", "AI Guardian Básico", "Soporte Estándar"],
      color: "bg-slate-500",
    },
    {
      id: "professional",
      name: "Professional",
      price: "$129",
      description: "Optimización avanzada para empresas en crecimiento.",
      features: ["Terminales ilimitadas", "Suite AI Full", "Soporte Prioritario", "Módulos Avanzados"],
      color: "bg-primary",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$499",
      description: "Control total y adaptabilidad para grandes corporaciones.",
      features: ["Entrenamiento AI Custom", "Account Manager Dedicado", "Soporte 24/7", "API & Webhooks"],
      color: "bg-purple-600",
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-display flex items-center gap-2">
              <Crown className="w-6 h-6 text-primary" />
              Suscripción Actual: <span className="uppercase text-primary">{org?.subscriptionTier || 'Trial'}</span>
            </CardTitle>
            <CardDescription>
              Estado: <span className={cn("font-bold uppercase", org?.subscriptionStatus === 'active' ? "text-success" : "text-warning")}>
                {org?.subscriptionStatus || 'Pendiente'}
              </span>
            </CardDescription>
          </div>
          {org?.stripeCustomerId && (
            <Button variant="outline" onClick={() => portalMutation.mutate()}>
              Gestionar Pagos
            </Button>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={cn(
            "relative flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
            plan.popular ? "border-primary shadow-lg shadow-primary/10" : "border-slate-800"
          )}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest glow-sm">
                Más Popular
              </div>
            )}
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl font-display uppercase italic tracking-tighter">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest">/ mes</span>
              </div>
              <CardDescription className="text-xs leading-relaxed">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="space-y-2">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <DialogFooter className="p-6 pt-0">
              <Button
                className={cn("w-full h-12 font-bold uppercase tracking-widest text-xs", plan.popular ? "bg-primary hover:bg-primary/90" : "bg-slate-800 hover:bg-slate-700")}
                disabled={org?.subscriptionTier === plan.id || checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate(plan.id)}
              >
                {org?.subscriptionTier === plan.id ? 'Plan Actual' : `Mejorar a ${plan.name}`}
              </Button>
            </DialogFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
