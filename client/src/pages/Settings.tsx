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
          <TabsTrigger value="ethics" data-testid="tab-ethics">
            <Shield className="w-4 h-4 mr-2" />
            Ética IA
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

        <TabsContent value="industries" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Perfiles de Industria</CardTitle>
                <CardDescription>Selecciona un perfil preconfigurado o crea uno desde cero</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: "manufacturing", name: "Manufactura / Producción", icon: "Factory" },
                  { id: "retail", name: "Retail / Abarrotes", icon: "ShoppingCart" },
                  { id: "logistics", name: "Logística y Distribución", icon: "Truck" },
                  { id: "services", name: "Servicios Profesionales", icon: "Briefcase" },
                ].map((ind) => (
                  <div
                    key={ind.id}
                    onClick={() => setIndustry(ind.id as IndustryType)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                      industry === ind.id ? "border-primary bg-primary/5 shadow-[0_0_10px_rgba(59,130,246,0.2)]" : "hover:bg-muted"
                    )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded flex items-center justify-center", industry === ind.id ? "bg-primary text-white" : "bg-muted")}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-sm">{ind.name}</span>
                    </div>
                    {industry === ind.id && <Check className="w-4 h-4 text-primary" />}
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
                      <div
                        key={c}
                        onClick={() => setThemeColor(c)}
                        className={cn(
                          "w-8 h-8 rounded-full cursor-pointer border-2 shadow-sm transition-all",
                          themeColor === c ? "border-white ring-2 ring-primary scale-110" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estilo de Interfaz</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setTheme('glass')}
                      className={cn("h-20 flex-col gap-1", theme === 'glass' ? "border-primary bg-primary/5" : "")}
                    >
                      <Layout className="w-4 h-4" />
                      <span className="text-xs">Moderna (Glass)</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTheme('compact')}
                      className={cn("h-20 flex-col gap-1", theme === 'compact' ? "border-primary bg-primary/5" : "")}
                    >
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
          <ModuleMarketplace />
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
        <TabsContent value="ethics">
          <EthicsPanel />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
