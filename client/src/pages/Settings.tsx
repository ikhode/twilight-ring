import { useState } from "react";
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

import { useToast } from "@/hooks/use-toast";
import { useConfiguration, IndustryType } from "@/context/ConfigurationContext";
import { ERP_MODULES } from "@/lib/modules";
import { ModuleMarketplace } from "@/components/modules/ModuleMarketplace";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";

export default function Settings() {
  const { toast } = useToast();
  const { industry, setIndustry, enabledModules, toggleModule, theme, setTheme, themeColor, setThemeColor, universalConfig, updateUniversalConfig } = useConfiguration();

  return (
    <AppLayout title="Configuración OS" subtitle="Personaliza la estructura y adaptabilidad del sistema">
      <Tabs defaultValue="generic" className="space-y-6">
        {/* ... (TabsList remains same) */}
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="generic" data-testid="tab-generic">
            <Layout className="w-4 h-4 mr-2" />
            Core Configuration
          </TabsTrigger>
          <TabsTrigger value="org" data-testid="tab-org">
            <Building2 className="w-4 h-4 mr-2" />
            Perfil & Identidad
          </TabsTrigger>
          <TabsTrigger value="subscription" data-testid="tab-subscription">
            <CreditCard className="w-4 h-4 mr-2" />
            Suscripción
          </TabsTrigger>
          <TabsTrigger value="modules" data-testid="tab-modules">
            <Puzzle className="w-4 h-4 mr-2" />
            Módulos SaaS
          </TabsTrigger>
          <TabsTrigger value="ethics" data-testid="tab-ethics">
            <Shield className="w-4 h-4 mr-2" />
            Gobernanza IA
          </TabsTrigger>
          <TabsTrigger value="advanced" data-testid="tab-advanced">
            <Zap className="w-4 h-4 mr-2 text-primary" />
            Avanzado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generic" className="space-y-6">
          {/* ...Generic Content... (Assuming no changes needed here for now) */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Motor de Configuración Universal
              </CardTitle>
              <CardDescription>
                Define campos personalizados y tipos de datos que se aplicarán a todo el OS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Categorías de Producto</Label>
                    <Badge variant="outline">Core</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Define las familias de productos para el inventario.</p>
                  <div className="flex flex-wrap gap-1">
                    {(universalConfig?.productCategories?.length > 0 ? universalConfig.productCategories : ["Materia Prima", "Producto Terminado"]).map(cat => (
                      <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
                    ))}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full text-xs h-7">Configurar Categorías</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Categorías de Producto</DialogTitle>
                        <DialogDescription>Define cómo clasificas tus productos o insumos.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nueva categoría (ej. Bebidas)"
                            id="new-category"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = e.currentTarget.value;
                                if (val) {
                                  updateUniversalConfig({
                                    productCategories: [...(universalConfig.productCategories || []), val]
                                  });
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          <Button onClick={() => {
                            const input = document.getElementById('new-category') as HTMLInputElement;
                            if (input.value) {
                              updateUniversalConfig({
                                productCategories: [...(universalConfig.productCategories || []), input.value]
                              });
                              input.value = '';
                            }
                          }}><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(universalConfig.productCategories || []).map(cat => (
                            <div key={cat} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                              {cat}
                              <X
                                className="w-3 h-3 cursor-pointer hover:text-destructive"
                                onClick={() => {
                                  updateUniversalConfig({
                                    productCategories: universalConfig.productCategories.filter(c => c !== cat)
                                  });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Tipos de Lugar</Label>
                    <Badge variant="outline">Configurable</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Define si son sucursales, bodegas, plantas o puntos de venta.</p>
                  <div className="flex flex-wrap gap-1">
                    {(universalConfig?.placeTypes?.length > 0 ? universalConfig.placeTypes : ["Almacén", "Tienda", "Fábrica"]).map(type => (
                      <Badge key={type} variant="secondary" className="text-[10px]">{type}</Badge>
                    ))}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full text-xs h-7">Configurar Tipos</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configurar Tipos de Lugar</DialogTitle>
                        <DialogDescription>Define las categorías de ubicaciones para tu operación.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nuevo tipo (ej. Sucursal)"
                            id="new-place-type"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = e.currentTarget.value;
                                if (val) {
                                  updateUniversalConfig({
                                    placeTypes: [...(universalConfig.placeTypes || []), val]
                                  });
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          <Button onClick={() => {
                            const input = document.getElementById('new-place-type') as HTMLInputElement;
                            if (input.value) {
                              updateUniversalConfig({
                                placeTypes: [...(universalConfig.placeTypes || []), input.value]
                              });
                              input.value = '';
                            }
                          }}><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(universalConfig.placeTypes || []).map(type => (
                            <div key={type} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                              {type}
                              <X
                                className="w-3 h-3 cursor-pointer hover:text-destructive"
                                onClick={() => {
                                  updateUniversalConfig({
                                    placeTypes: universalConfig.placeTypes.filter(t => t !== type)
                                  });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Atributos de Producto</Label>
                    <Badge variant="outline">Dinámico</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Campos extra según la industria (peso, color, caducidad, serie).</p>
                  <Button variant="ghost" size="sm" className="w-full text-xs h-7">Gestionar Campos</Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full text-xs h-7">Gestionar Campos</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Atributos de Producto</DialogTitle>
                        <DialogDescription>Define campos personalizados para tus productos.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-2 items-center">
                          <Input id="new-attr-name" placeholder="Nombre (ej. Color)" className="flex-1" />
                          <select id="new-attr-type" className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="date">Fecha</option>
                          </select>
                          <Button onClick={() => {
                            const nameInput = document.getElementById('new-attr-name') as HTMLInputElement;
                            const typeInput = document.getElementById('new-attr-type') as HTMLSelectElement;
                            if (nameInput.value) {
                              updateUniversalConfig({
                                productAttributes: [...(universalConfig.productAttributes || []), { name: nameInput.value, type: typeInput.value }]
                              });
                              nameInput.value = '';
                            }
                          }}><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="space-y-2">
                          {(universalConfig.productAttributes || []).map((attr, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-muted px-3 py-2 rounded text-sm">
                              <span>{attr.name} <span className="text-xs text-muted-foreground">({attr.type})</span></span>
                              <Trash2 className="w-4 h-4 cursor-pointer hover:text-destructive" onClick={() => {
                                updateUniversalConfig({
                                  productAttributes: universalConfig.productAttributes.filter((_, i) => i !== idx)
                                });
                              }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Flujos de Proceso</Label>
                    <Badge variant="outline">Flexible</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Configura qué productos se consumen y cuáles se producen.</p>
                  <Button variant="ghost" size="sm" className="w-full text-xs h-7">Diseñar Workflows</Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full text-xs h-7">Diseñar Workflows</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Flujos de Proceso</DialogTitle>
                        <DialogDescription>Define los flujos de transformación de tu operación.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-2 items-center">
                          <Input id="new-flow-name" placeholder="Proceso (ej. Empaquetado)" className="flex-1" />
                          <select id="new-flow-type" className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                            <option value="production">Producción</option>
                            <option value="logistics">Logística</option>
                            <option value="qa">Calidad</option>
                          </select>
                          <Button onClick={() => {
                            const nameInput = document.getElementById('new-flow-name') as HTMLInputElement;
                            const typeInput = document.getElementById('new-flow-type') as HTMLSelectElement;
                            if (nameInput.value) {
                              updateUniversalConfig({
                                processFlows: [...(universalConfig.processFlows || []), { name: nameInput.value, type: typeInput.value }]
                              });
                              nameInput.value = '';
                            }
                          }}><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="space-y-2">
                          {(universalConfig.processFlows || []).map((flow, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-muted px-3 py-2 rounded text-sm">
                              <span>{flow.name} <span className="text-xs text-muted-foreground">({flow.type})</span></span>
                              <Trash2 className="w-4 h-4 cursor-pointer hover:text-destructive" onClick={() => {
                                updateUniversalConfig({
                                  processFlows: universalConfig.processFlows.filter((_, i) => i !== idx)
                                });
                              }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="org" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
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
                  <Input defaultValue="Mi Empresa S.A." className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label>Industria Principal</Label>
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-sm">{industry}</span>
                    <Badge variant="outline" className="text-primary border-primary/30">Activo</Badge>
                  </div>
                </div>
                <Button className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20">
                  Guardar Perfil
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
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <ModuleMarketplace />
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
