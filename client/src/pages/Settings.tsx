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
} from "lucide-react";
import { mockModules } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Settings() {
  return (
    <AppLayout title="Configuración ERP" subtitle="Personaliza la estructura y adaptabilidad del sistema">
      <Tabs defaultValue="generic" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="generic" data-testid="tab-generic">
            <Layout className="w-4 h-4 mr-2" />
            Estructura Genérica
          </TabsTrigger>
          <TabsTrigger value="industries" data-testid="tab-industries">
            <Building2 className="w-4 h-4 mr-2" />
            Adaptación Industrial
          </TabsTrigger>
          <TabsTrigger value="modules" data-testid="tab-modules">
            <Puzzle className="w-4 h-4 mr-2" />
            Módulos SaaS
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            <CreditCard className="w-4 h-4 mr-2" />
            Pago por Uso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generic" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Motor de Configuración Universal
              </CardTitle>
              <CardDescription>
                Define campos personalizados y tipos de datos que se aplicarán a todo el ERP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Tipos de Lugar</Label>
                    <Badge variant="outline">Configurable</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Define si son sucursales, bodegas, plantas o puntos de venta.</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">Almacén</Badge>
                    <Badge variant="secondary" className="text-[10px]">Tienda</Badge>
                    <Badge variant="secondary" className="text-[10px]">Fábrica</Badge>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Atributos de Producto</Label>
                    <Badge variant="outline">Dinámico</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Campos extra según la industria (peso, color, caducidad, serie).</p>
                  <Button variant="ghost" size="sm" className="w-full text-xs h-7">Gestionar Campos</Button>
                </div>

                <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Flujos de Proceso</Label>
                    <Badge variant="outline">Flexible</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Configura qué productos se consumen y cuáles se producen.</p>
                  <Button variant="ghost" size="sm" className="w-full text-xs h-7">Diseñar Workflows</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="industries" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Perfiles de Industria</CardTitle>
                <CardDescription>Selecciona un perfil preconfigurado o crea uno desde cero</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Manufactura / Producción", icon: "Factory", active: true },
                  { name: "Retail / Abarrotes", icon: "ShoppingCart", active: false },
                  { name: "Logística y Distribución", icon: "Truck", active: false },
                  { name: "Servicios Profesionales", icon: "Briefcase", active: false },
                ].map((ind, i) => (
                  <div key={i} className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                    ind.active ? "border-primary bg-primary/5" : "hover:bg-muted"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded flex items-center justify-center", ind.active ? "bg-primary text-white" : "bg-muted")}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-sm">{ind.name}</span>
                    </div>
                    {ind.active && <Check className="w-4 h-4 text-primary" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Personalización Visual</CardTitle>
                <CardDescription>Adapta la interfaz a la marca de cada cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Color Primario</Label>
                  <div className="flex gap-2">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                      <div key={c} className="w-8 h-8 rounded-full cursor-pointer border-2 border-transparent hover:border-white shadow-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estilo de Interfaz</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-20 flex-col gap-1 border-primary bg-primary/5">
                      <Layout className="w-4 h-4" />
                      <span className="text-xs">Moderna (Glass)</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-1">
                      <Type className="w-4 h-4" />
                      <span className="text-xs">Compacta (Data)</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-primary" />
                Catálogo de Módulos SaaS
              </CardTitle>
              <CardDescription>Módulos gratuitos activables según necesidad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockModules.map((module) => (
                  <div key={module.id} className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    module.enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
                  )}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", module.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                          <Check className="w-5 h-5" />
                        </div>
                        <h4 className="font-semibold">{module.name}</h4>
                      </div>
                      <Switch checked={module.enabled} />
                    </div>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                    <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center">
                      <span className="text-xs font-bold text-success">GRATIS</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">Configurar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-accent">
                <Crown className="w-5 h-5" />
                Modelo de Pago por Uso Mensual
              </CardTitle>
              <CardDescription>Sin costos fijos por módulos, paga solo por el volumen de tu operación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-xl bg-card border text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Costo por Transacción</p>
                  <p className="text-3xl font-bold font-display">$0.10 <span className="text-xs font-normal">MXN</span></p>
                  <p className="text-[10px] text-muted-foreground">Ventas, compras, producción</p>
                </div>
                <div className="p-6 rounded-xl bg-card border text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Costo por Empleado</p>
                  <p className="text-3xl font-bold font-display">$5.00 <span className="text-xs font-normal">MXN</span></p>
                  <p className="text-[10px] text-muted-foreground">Activos en el mes</p>
                </div>
                <div className="p-6 rounded-xl bg-card border text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Costo por Kiosko</p>
                  <p className="text-3xl font-bold font-display">$50.00 <span className="text-xs font-normal">MXN</span></p>
                  <p className="text-[10px] text-muted-foreground">Terminales activas</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-dashed flex items-center justify-between">
                <div>
                  <p className="font-semibold">Simulador de Costo Mensual</p>
                  <p className="text-xs text-muted-foreground">Calcula tu inversión según el tamaño de tu empresa</p>
                </div>
                <Button variant="outline" size="sm">Abrir Simulador</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
