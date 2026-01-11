import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { mockModules } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Settings() {
  return (
    <AppLayout title="Configuración" subtitle="Personaliza tu ERP">
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="company" data-testid="tab-company">
            <Building2 className="w-4 h-4 mr-2" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="modules" data-testid="tab-modules">
            <Puzzle className="w-4 h-4 mr-2" />
            Módulos
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            <CreditCard className="w-4 h-4 mr-2" />
            Facturación
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="w-4 h-4 mr-2" />
            Seguridad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Información de la Empresa</CardTitle>
              <CardDescription>Configura los datos básicos de tu negocio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input id="companyName" defaultValue="Panadería El Buen Pan" data-testid="input-company-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC</Label>
                  <Input id="rfc" defaultValue="PBP123456789" data-testid="input-rfc" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" defaultValue="contacto@panaderia.com" data-testid="input-email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" defaultValue="555-123-4567" data-testid="input-phone" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" defaultValue="Av. Principal #123, Col. Centro" data-testid="input-address" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Preferencias</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Zona Horaria</Label>
                      <p className="text-sm text-muted-foreground">Ciudad de México (GMT-6)</p>
                    </div>
                    <Button variant="outline" size="sm">Cambiar</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Moneda</Label>
                      <p className="text-sm text-muted-foreground">Peso Mexicano (MXN)</p>
                    </div>
                    <Button variant="outline" size="sm">Cambiar</Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button data-testid="button-save-company">Guardar Cambios</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-primary" />
                Módulos del Sistema
              </CardTitle>
              <CardDescription>
                Activa o desactiva los módulos según las necesidades de tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockModules.map((module) => (
                  <div
                    key={module.id}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all",
                      module.enabled
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-muted/30"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            module.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {module.enabled ? <Check className="w-5 h-5" /> : <Puzzle className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold">{module.name}</h4>
                          {module.id === "analytics" && (
                            <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={module.enabled}
                        disabled={module.id === "analytics"}
                        data-testid={`switch-module-${module.id}`}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Usuarios y Permisos</CardTitle>
              <CardDescription>Gestiona el acceso al sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Gestión de Usuarios</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Crea usuarios, asigna roles y define permisos para cada módulo del sistema.
                </p>
                <Button className="mt-4" data-testid="button-manage-users">
                  Administrar Usuarios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Plan y Facturación</CardTitle>
              <CardDescription>Gestiona tu suscripción</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Badge className="bg-primary text-primary-foreground mb-2">Plan Actual</Badge>
                    <h3 className="text-2xl font-display font-bold">Profesional</h3>
                    <p className="text-muted-foreground">$999 MXN/mes</p>
                  </div>
                  <Button variant="outline">Cambiar Plan</Button>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <p className="text-2xl font-bold">10</p>
                    <p className="text-xs text-muted-foreground">Usuarios</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <p className="text-2xl font-bold">5</p>
                    <p className="text-xs text-muted-foreground">Kioskos</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <p className="text-2xl font-bold">∞</p>
                    <p className="text-xs text-muted-foreground">Transacciones</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Historial de Pagos</h4>
                {[
                  { date: "01/01/2026", amount: "$999.00", status: "Pagado" },
                  { date: "01/12/2025", amount: "$999.00", status: "Pagado" },
                  { date: "01/11/2025", amount: "$999.00", status: "Pagado" },
                ].map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <span className="font-mono text-sm">{payment.date}</span>
                    <span className="font-semibold">{payment.amount}</span>
                    <Badge className="bg-success/15 text-success border-success/30">
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Preferencias de Notificaciones</CardTitle>
              <CardDescription>Configura cómo y cuándo recibir alertas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { title: "Stock bajo", description: "Cuando un producto está por debajo del mínimo" },
                { title: "Nuevas ventas", description: "Resumen diario de ventas" },
                { title: "Empleados", description: "Entradas y salidas del personal" },
                { title: "Entregas", description: "Actualizaciones de estado de entregas" },
                { title: "Anomalías IA", description: "Alertas de patrones inusuales" },
              ].map((notification, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                  </div>
                  <Switch defaultChecked data-testid={`switch-notification-${index}`} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Seguridad</CardTitle>
              <CardDescription>Protege tu cuenta y datos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Autenticación de dos factores</p>
                  <p className="text-sm text-muted-foreground">Añade una capa extra de seguridad</p>
                </div>
                <Switch data-testid="switch-2fa" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Face ID para administradores</p>
                  <p className="text-sm text-muted-foreground">Requiere reconocimiento facial para acciones críticas</p>
                </div>
                <Switch defaultChecked data-testid="switch-face-id-admin" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Registro de actividad</p>
                  <p className="text-sm text-muted-foreground">Mantén un log de todas las acciones del sistema</p>
                </div>
                <Switch defaultChecked data-testid="switch-activity-log" />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Cambiar Contraseña</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <Input id="currentPassword" type="password" data-testid="input-current-password" />
                  </div>
                  <div />
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input id="newPassword" type="password" data-testid="input-new-password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                    <Input id="confirmPassword" type="password" data-testid="input-confirm-password" />
                  </div>
                </div>
                <Button data-testid="button-change-password">Cambiar Contraseña</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
