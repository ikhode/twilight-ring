import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import {
  Truck,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  Navigation,
  Fuel,
  PenTool,
  AlertCircle,
  Route,
  User,
  Phone,
} from "lucide-react";
import { mockDeliveries, mockVehicles } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function Logistics() {
  const stats = {
    activeDeliveries: mockDeliveries.filter((d) => d.status === "in_transit").length,
    completedToday: mockDeliveries.filter((d) => d.status === "delivered").length,
    pendingDeliveries: mockDeliveries.filter((d) => d.status === "pending").length,
    vehiclesInRoute: mockVehicles.filter((v) => v.status === "in_route").length,
  };

  return (
    <AppLayout title="Logística" subtitle="Entregas, vehículos y tracking">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="En Tránsito"
            value={stats.activeDeliveries}
            icon={Truck}
            variant="primary"
          />
          <StatCard
            title="Entregadas Hoy"
            value={stats.completedToday}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Pendientes"
            value={stats.pendingDeliveries}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Vehículos en Ruta"
            value={stats.vehiclesInRoute}
            icon={Navigation}
          />
        </div>

        <Tabs defaultValue="deliveries" className="space-y-6">
          <TabsList>
            <TabsTrigger value="deliveries" data-testid="tab-deliveries">Entregas</TabsTrigger>
            <TabsTrigger value="vehicles" data-testid="tab-vehicles">Vehículos</TabsTrigger>
            <TabsTrigger value="tracking" data-testid="tab-tracking">Tracking en Vivo</TabsTrigger>
          </TabsList>

          <TabsContent value="deliveries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Entregas del Día</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    {
                      key: "order",
                      header: "Orden",
                      render: (item) => (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold font-mono">{item.order}</p>
                            <p className="text-xs text-muted-foreground">{item.items} artículos</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "client",
                      header: "Cliente",
                      render: (item) => (
                        <div>
                          <p className="font-medium">{item.client}</p>
                        </div>
                      ),
                    },
                    {
                      key: "driver",
                      header: "Conductor",
                      render: (item) =>
                        item.driver ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span>{item.driver}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary">Sin asignar</Badge>
                        ),
                    },
                    {
                      key: "eta",
                      header: "ETA",
                      render: (item) =>
                        item.eta ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono">{item.eta}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        ),
                    },
                    {
                      key: "status",
                      header: "Estado",
                      render: (item) => <StatusBadge status={item.status} />,
                    },
                    {
                      key: "signature",
                      header: "Firma",
                      render: (item) =>
                        item.signature ? (
                          <Badge className="bg-success/15 text-success border-success/30">
                            <PenTool className="w-3 h-3 mr-1" />
                            Firmado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pendiente</Badge>
                        ),
                    },
                    {
                      key: "actions",
                      header: "",
                      render: (item) => (
                        <Button variant="outline" size="sm" data-testid={`button-track-${item.id}`}>
                          <MapPin className="w-4 h-4 mr-1" />
                          Rastrear
                        </Button>
                      ),
                    },
                  ]}
                  data={mockDeliveries}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mockVehicles.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className={cn(
                    "overflow-hidden",
                    vehicle.status === "in_route" && "ring-1 ring-primary/30"
                  )}
                  data-testid={`vehicle-card-${vehicle.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            vehicle.status === "in_route"
                              ? "bg-primary/15 text-primary"
                              : vehicle.status === "maintenance"
                              ? "bg-warning/15 text-warning"
                              : "bg-success/15 text-success"
                          )}
                        >
                          <Truck className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-mono">{vehicle.plate}</CardTitle>
                          <p className="text-sm text-muted-foreground">{vehicle.type}</p>
                        </div>
                      </div>
                      <StatusBadge status={vehicle.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {vehicle.driver ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary">
                            {vehicle.driver.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{vehicle.driver}</p>
                            <p className="text-xs text-muted-foreground">Conductor asignado</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-5 h-5" />
                          <span className="text-sm">Sin conductor asignado</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Fuel className="w-4 h-4" />
                          Combustible
                        </span>
                        <span className="font-semibold">{vehicle.fuel}%</span>
                      </div>
                      <Progress
                        value={vehicle.fuel}
                        className={cn(
                          "h-2",
                          vehicle.fuel < 30 && "[&>div]:bg-destructive"
                        )}
                      />
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{vehicle.lastLocation}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-primary" />
                  Tracking en Tiempo Real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-1/4 left-1/3 w-4 h-4 rounded-full bg-primary animate-ping" />
                    <div className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full bg-success animate-ping" style={{ animationDelay: "0.5s" }} />
                    <div className="absolute bottom-1/3 right-1/3 w-4 h-4 rounded-full bg-warning animate-ping" style={{ animationDelay: "1s" }} />
                  </div>
                  <div className="text-center z-10">
                    <Route className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="font-semibold text-lg">Mapa de Tracking GPS</p>
                    <p className="text-sm text-muted-foreground">
                      Visualiza la ubicación de tus vehículos en tiempo real
                    </p>
                    <Button className="mt-4" data-testid="button-open-map">
                      Abrir Mapa Completo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-primary" />
                    Firmas Pendientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockDeliveries
                      .filter((d) => !d.signature && d.status !== "pending")
                      .map((delivery) => (
                        <div
                          key={delivery.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{delivery.order}</p>
                              <p className="text-xs text-muted-foreground">{delivery.client}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <PenTool className="w-4 h-4 mr-1" />
                            Capturar
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Incidentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                    <p className="font-medium text-success">Sin incidentes</p>
                    <p className="text-sm text-muted-foreground">
                      Todas las entregas están en orden
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
